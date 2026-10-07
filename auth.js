(() => {
  "use strict";

  const DB = "https://skykef-app-default-rtdb.europe-west1.firebasedatabase.app";
  const SESSION_KEY = "skykef_manifest_admin_session";
  const isLoginPage = /(?:^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith("/");

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      return session && session.username && ["admin", "manifest"].includes(session.role) ? session : null;
    } catch {
      return null;
    }
  }

  function requireLogin() {
    if (!isLoginPage && !getSession()) {
      location.replace("index.html");
      return false;
    }
    return true;
  }

  async function verifyUser(username, password, role) {
    const cleanUsername = String(username || "").trim();
    if (!cleanUsername || !password || !["admin", "manifest"].includes(role)) return false;

    const url = `${DB}/users/${role}/${encodeURIComponent(cleanUsername)}.json`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Login check failed: HTTP ${response.status}`);

    const admin = await response.json();
    if (admin === null || admin === undefined) return false;

    if (typeof admin === "string" || typeof admin === "number") {
      return String(admin) === String(password);
    }

    if (typeof admin === "object") {
      const savedPassword =
        admin.password ?? admin.Password ?? admin.pass ?? admin.Pass ?? admin.pwd ?? admin.Pwd;
      return savedPassword !== undefined && String(savedPassword) === String(password);
    }

    return false;
  }

  function createSession(username, role) {
    if (!["admin", "manifest"].includes(role)) throw new Error("Invalid login role");
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      username: String(username).trim(),
      role,
      loggedInAt: Date.now()
    }));
  }

  async function getDayState() {
    const response = await fetch(`${DB}/current_data.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Day state check failed: HTTP ${response.status}`);
    const data = await response.json();
    return {
      active: data?.day_start === true && data?.end_of_day === false,
      data
    };
  }

  async function applyViewOnlyMode() {
    if (!getSession() || isLoginPage) return false;
    let state;
    try {
      state = await getDayState();
    } catch (error) {
      console.error(error);
      return false;
    }
    if (!state.active) return false;

    document.documentElement.classList.add("manifest-view-only");

    const showBanner = () => {
      if (document.getElementById("manifestViewOnlyBanner")) return;
      const banner = document.createElement("div");
      banner.id = "manifestViewOnlyBanner";
      banner.className = "view-only-banner";
      banner.innerHTML = "<strong>JUMPING DAY IS RUNNING LIVE</strong><span>EDIT CAN’T BE MADE — VIEW ONLY</span>";
      document.body.prepend(banner);
    };
    if (document.body) showBanner();
    else document.addEventListener("DOMContentLoaded", showBanner, { once: true });

    return true;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.replace("index.html");
  }

  async function getLoginUsers() {
    const lists = await Promise.all(["admin", "manifest"].map(async role => {
      const response = await fetch(`${DB}/users/${role}.json?shallow=true`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load usernames");
      const keys = await response.json();
      return Object.keys(keys || {}).sort((a, b) => a.localeCompare(b)).map(username => ({ username, role }));
    }));
    return lists.flat();
  }

  function isAdmin() { return getSession()?.role === "admin"; }

  function showSessionRole() {
    const session = getSession();
    if (!session) return;
    const header = document.querySelector(".header-inner");
    if (!header || document.getElementById("sessionRole")) return;
    const badge = document.createElement("span");
    badge.id = "sessionRole";
    badge.textContent = `${session.username} · ${session.role === "admin" ? "Admin" : "Manifest"}`;
    badge.style.cssText = "display:inline-block;padding:6px 10px;border:1px solid currentColor;border-radius:8px;font-size:14px";
    header.appendChild(badge);
  }
  document.addEventListener("DOMContentLoaded", showSessionRole);
  window.SkyKefAdminAuth = { getSession, verifyUser, getLoginUsers, isAdmin, createSession, logout, getDayState, applyViewOnlyMode, showSessionRole };
  if (requireLogin()) {
    applyViewOnlyMode();
  }
})();