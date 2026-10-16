(() => {
  "use strict";

  const DB = "https://skykef-app-default-rtdb.europe-west1.firebasedatabase.app";
  const SESSION_KEY = "skykef_manifest_admin_session";
  const pagePath = location.pathname.replace(/\/$/, "").replace(/\.html$/, "");
  const isLoginPage = /(?:^|\/)index$/.test(pagePath) || location.pathname.endsWith("/");
  const isProfilePage = pagePath.endsWith("/my-profile");
  const isPublicPage = isLoginPage || pagePath.endsWith("/loads-today");

  function formatDate(value) {
    if (value === null || value === undefined || String(value).trim() === "") return "—";
    const raw = String(value).trim();
    let match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    let year, month, day;
    if (match) { [, year, month, day] = match; } else {
      match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
      if (!match) return raw;
      const monthFirst = /\b(?:AM|PM)\b/i.test(raw) || Number(match[2]) > 12;
      year = match[3]; month = match[monthFirst ? 1 : 2]; day = match[monthFirst ? 2 : 1];
    }
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      return session && session.username && ["admin", "manifest", "jumper"].includes(session.role) ? session : null;
    } catch {
      return null;
    }
  }

  function hasWorkerRoles(jumper) {
    const value=Object.entries(jumper || {}).find(([key])=>key.toLowerCase()==="worker")?.[1];
    return value!==null && typeof value==="object" && Object.values(value).some(role=>role!==null && role!==undefined && String(role).trim()!=="");
  }

  let reportAccess;
  function canViewDailyReport() {
    const session=getSession();
    if(["admin","manifest"].includes(session?.role))return Promise.resolve(true);
    if(session?.role!=="jumper" || session.jumperKey===undefined || session.jumperKey===null)return Promise.resolve(false);
    if(!reportAccess)reportAccess=(async()=>{
      try {
        const response=await fetch(`${DB}/jumpers/${encodeURIComponent(session.jumperKey)}.json`,{cache:"no-store"});
        if(!response.ok)return false;
        return hasWorkerRoles(await response.json());
      }catch(error){console.error(error);return false;}
    })();
    return reportAccess;
  }

  async function requireLogin() {
    const session = getSession();
    if (isPublicPage) return true;
    if (pagePath.endsWith("/daily-report")) {
      const allowed=await canViewDailyReport();
      if(!allowed)location.replace("index.html");
      return allowed;
    }
    if (isProfilePage) {
      if (!session || session.role !== "jumper") {
        location.replace("index.html");
        return false;
      }
      return true;
    }
    if (!session || !["admin", "manifest"].includes(session.role)) {
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

  function createJumperSession(jumper) {
    const username = `${jumper?.Name ?? ""} ${jumper?.Surname ?? ""}`.trim() || String(jumper?.Name || "Jumper");
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      username,
      role: "jumper",
      jumperKey: String(jumper.key),
      loggedInAt: Date.now()
    }));
  }

  async function verifyJumper(username, password) {
    const cleanUsername = String(username || "").trim().toLowerCase();
    if (!cleanUsername || password === null || password === undefined || String(password) === "") return null;
    const response = await fetch(`${DB}/jumpers.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Jumper login failed: HTTP ${response.status}`);
    const data = await response.json();
    const records = Array.isArray(data)
      ? data.map((value, key) => value && typeof value === "object" ? { key, ...value } : null).filter(Boolean)
      : Object.entries(data || {}).filter(([, value]) => value && typeof value === "object").map(([key, value]) => ({ key, ...value }));

    return records.find(jumper => {
      const firstName = String(jumper.Name ?? "").trim().toLowerCase();
      const fullName = `${jumper.Name ?? ""} ${jumper.Surname ?? ""}`.trim().toLowerCase();
      const id = jumper.Id ?? jumper.ID ?? jumper.id;
      return (cleanUsername === firstName || cleanUsername === fullName) &&
        id !== undefined && id !== null && String(id).trim() === String(password).trim();
    }) || null;
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
    if (!["admin", "manifest"].includes(getSession()?.role) || isPublicPage || isProfilePage) return false;
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
  function isDeveloper() {
    const session=getSession();
    return session?.role==="admin" && String(session.username).trim().toLowerCase()==="dev";
  }
  function canEdit() { return isDeveloper(); }

  function addDatabaseDownload(account) {
    if (!isAdmin()) return;
    account.style.flexWrap = "wrap";
    const downloadDbBtn = document.createElement("button");
    downloadDbBtn.id = "downloadDbBtn";
    downloadDbBtn.type = "button";
    downloadDbBtn.className = "small-btn";
    downloadDbBtn.textContent = "Download DB JSON";
    const downloadDbStatus = document.createElement("span");
    downloadDbStatus.id = "downloadDbStatus";
    downloadDbStatus.setAttribute("role", "status");
    downloadDbStatus.setAttribute("aria-live", "polite");
    downloadDbStatus.style.cssText = "font-size:14px;flex-basis:100%";
async function downloadDatabaseJson() {
  if (!SkyKefAdminAuth.isAdmin() || downloadDbBtn.disabled) return;
  downloadDbBtn.disabled = true;
  downloadDbBtn.textContent = "Downloading…";
  downloadDbStatus.textContent = "Preparing database export…";
  try {
    const response = await fetch(DB + "/.json?format=export", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const text = await response.text();
    // Validate the response and retain Firebase export metadata such as priorities.
    const data = JSON.parse(text);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const exportDate = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric"
    }).format(new Date()).replace(/\//g, "-");
    link.download = "skykef-app-db-" + exportDate + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    downloadDbStatus.textContent = "Database JSON download started.";
  } catch (error) {
    console.error("Database export failed:", error);
    downloadDbStatus.textContent = "Could not download the database JSON. Please try again.";
  } finally {
    downloadDbBtn.disabled = false;
    downloadDbBtn.textContent = "Download DB JSON";
  }
}

    downloadDbBtn.addEventListener("click", downloadDatabaseJson);
    account.append(downloadDbBtn, downloadDbStatus);
  }

  async function showSessionRole() {
    const session=getSession();
    const header=document.querySelector(".header-inner");
    if(!header)return;
    const title=header.querySelector("h1") || document.createElement("h1");
    title.textContent=isDeveloper()?"SkyKef Manifest DEVELOPER":session?.role==="admin"?"SkyKef Manifest Admin":"SkyKef Manifest";
    if(isDeveloper())title.classList.add("developer-title");
    if(!session)return;
    document.querySelectorAll("#logoutBtn, #jumperLogoutBtn, #welcomeAdmin").forEach(element=>{
      element.hidden=true;element.style.display="none";
    });
    if(document.getElementById("sessionAccount"))return;
    header.classList.add("unified-header");
    const top=document.createElement("div");top.className="header-top";
    const account=document.createElement("div");account.id="sessionAccount";account.className="session-account";
    const badge=document.createElement("span");badge.id="sessionRole";badge.className="session-role-badge";
    badge.textContent=isDeveloper()?session.username:`${session.username} · ${session.role==="admin"?"Admin":session.role==="manifest"?"Manifest":"Jumper"}`;
    if(isDeveloper())badge.classList.add("developer-badge");
    const logoutButton=document.createElement("button");logoutButton.id="sessionLogoutBtn";
    logoutButton.type="button";logoutButton.className="small-btn";logoutButton.textContent="Logout";
    logoutButton.addEventListener("click",logout);
    const home=document.createElement("a");home.href="index.html";home.className="small-btn header-home-button";
    home.setAttribute("aria-label","Home");home.title="Home";
    home.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>';
    account.append(badge,logoutButton,home);top.append(title,account);
    const nav=document.createElement("nav");nav.className="nav header-navigation";nav.setAttribute("aria-label","Main navigation");
    // Attach synchronously: repeated calls during worker verification must see one header.
    header.replaceChildren(top,nav);
    function link(href,label){
      const item=document.createElement("a");item.href=href;item.textContent=label;
      const target=href.split("#")[0].replace(/\.html$/,"");
      if(pagePath.endsWith("/"+target) || (isLoginPage && href==="index.html") || (pagePath.endsWith("/loads-today") && href==="index.html"))item.classList.add("active");
      nav.appendChild(item);
    }
    if(["admin","manifest"].includes(session.role)){
      for(const [href,label] of [["jumpers-data.html","Jumpers Data"],["today-jumpers.html","Today Jumpers"],["loads.html","Loads"],["loads-history.html","Loads History"],["daily-report.html","Daily Report"],["reports.html","Reports"]])link(href,label);
      if(isDeveloper()){
        const database=document.createElement("a");database.id="developerDbLink";
        database.href=DB+"/";database.textContent="DB";database.className="developer-db-link";
        database.target="_blank";database.rel="noopener noreferrer";
        nav.appendChild(database);
      }
      addDatabaseDownload(nav);
    }else{
      link("index.html","Loads");
      link("my-profile.html","My Profile");
      const register=document.createElement("a");register.id="headerRegistrationLink";
      register.href="https://docs.google.com/forms/d/1Zdrh-JbO2c9PQmyEsvIHwPxv80kXYozxFXfZT3Jerz4/viewform";
      register.className="small-btn";register.textContent="Register for Jumping";
      register.target="_blank";register.rel="noopener noreferrer";
      nav.appendChild(register);
      function updateRegistration(){
        const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jerusalem",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
        register.hidden=hour<8 || hour>=17;
      }
      updateRegistration();
      window.setInterval(updateRegistration,10000);
      window.addEventListener("focus",updateRegistration);
      document.addEventListener("visibilitychange",updateRegistration);
      if(await canViewDailyReport())link("daily-report.html","Daily Report");
    }
  }
  document.addEventListener("DOMContentLoaded", showSessionRole);
  window.SkyKefAdminAuth = { formatDate, getSession, verifyUser, verifyJumper, getLoginUsers, isAdmin, isDeveloper, canEdit, createSession, createJumperSession, logout, getDayState, applyViewOnlyMode, showSessionRole };
  window.SkyKefAdminAuth.hasWorkerRoles=hasWorkerRoles;
  window.SkyKefAdminAuth.canViewDailyReport=canViewDailyReport;
  window.SkyKefAdminAuth.ready=requireLogin().then(allowed=>{
    if(allowed)applyViewOnlyMode();
    return allowed;
  });
})();