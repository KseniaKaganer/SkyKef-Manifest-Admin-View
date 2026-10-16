(() => {
  const DB="https://skykef-app-default-rtdb.europe-west1.firebasedatabase.app";
  const userProfileSection = document.getElementById("userProfileSection");
  const userProfileStatus = document.getElementById("userProfileStatus");
  const userProfileDetails = document.getElementById("userProfileDetails");
  const userProfileTab = document.getElementById("userProfileTab");
  const userLogbookTab = document.getElementById("userLogbookTab");
  const userProfileView = document.getElementById("userProfileView");
  const userLogbookView = document.getElementById("userLogbookView");
  const userLogbookStatus = document.getElementById("userLogbookStatus");
  const userLogbookBody = document.getElementById("userLogbookBody");
  const exportUserLogbookBtn = document.getElementById("exportUserLogbookBtn");
  let loggedInJumper = null;
  let loggedInLogbookRows = [];
  let logbookLoaded = false;
  function profileLabel(key) {
    return String(key)
      .replace(/[_-]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  async function loadJumperProfile(session) {
    userProfileStatus.textContent = "Loading profile…";
    userProfileDetails.replaceChildren();
    try {
      const response = await fetch(`${DB}/jumpers/${encodeURIComponent(session.jumperKey)}.json`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Profile request failed: HTTP ${response.status}`);
      const jumper = await response.json();
      if (!jumper || typeof jumper !== "object") throw new Error("Profile not found");
      loggedInJumper = jumper;
      document.getElementById("profileName").textContent = `${jumper.Name ?? ""} ${jumper.Surname ?? ""}`.trim() || session.username;

      const hiddenFields = new Set([
        "Id", "ID", "id", "password", "Password",
        "AffLevel", "Aff Level", "License", "Uid", "uid", "WaiverDate", "Waiver Date",
        "Balance", "balance", "NumberOfJumpesToday", "NumberOfJumpsToday"
      ]);
      const preferredOrder = ["Name", "Surname"];
      Object.entries(jumper)
        .sort(([keyA], [keyB]) => {
          const indexA = preferredOrder.indexOf(keyA);
          const indexB = preferredOrder.indexOf(keyB);
          if (indexA !== -1 || indexB !== -1) {
            return (indexA === -1 ? preferredOrder.length : indexA) -
              (indexB === -1 ? preferredOrder.length : indexB);
          }
          return keyA.localeCompare(keyB);
        })
        .forEach(([key, value]) => {
        if (hiddenFields.has(key) || value === null || value === undefined || value === "" || typeof value === "object") return;
        const row = document.createElement("div");
        row.className = "profile-detail-row";
        const term = document.createElement("dt");
        term.textContent = profileLabel(key);
        const description = document.createElement("dd");
        description.textContent = typeof value === "boolean" ? (value ? "Yes" : "No") : /date/i.test(key) ? SkyKefAdminAuth.formatDate(value) : String(value);
        row.append(term, description);
        userProfileDetails.appendChild(row);
      });
      userProfileStatus.textContent = "";
    } catch (error) {
      console.error(error);
      userProfileStatus.textContent = "Could not load your profile.";
    }
  }


  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function flattenHistoryNode(node, path = [], rows = []) {
    if (node === null || node === undefined) return rows;
    if (typeof node !== "object") {
      if (path.length >= 4) {
        const [year, month, day, loadKey] = path;
        rows.push({ year: safeNumber(year), month: safeNumber(month), day: safeNumber(day), loadKey: String(loadKey), value: node });
      }
      return rows;
    }
    Object.entries(node).forEach(([key, value]) => flattenHistoryNode(value, [...path, key], rows));
    return rows;
  }

  function parseLogbookValue(value) {
    if (value === null || value === undefined) return { activity: "—", details: "—" };
    if (typeof value === "object") return { activity: "Record", details: JSON.stringify(value) };
    const parts = String(value).split("|").map(part => part.trim()).filter(Boolean);
    return {
      activity: parts[0] || "—",
      details: parts.slice(1).join(" · ") || "—"
    };
  }

  function loadNumber(loadKey) {
    const match = String(loadKey).match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function renderUserLogbook(data) {
    const allRows=flattenHistoryNode(data);
    renderLogbookAnnualStats(document.getElementById("userLogbookAnnualStats"),allRows,{showTypes:SkyKefAdminAuth.hasWorkerRoles(loggedInJumper)});
    const rows = allRows
      .filter(row => parseLogbookValue(row.value).details !== "—")
      .sort((a, b) =>
      b.year - a.year || b.month - a.month || b.day - a.day || loadNumber(b.loadKey) - loadNumber(a.loadKey)
    );
    userLogbookBody.replaceChildren();
    loggedInLogbookRows = rows;
    exportUserLogbookBtn.disabled = rows.length === 0;

    if (!rows.length) {
      userLogbookStatus.textContent = "No logbook history found.";
      return;
    }

    userLogbookStatus.textContent = `${rows.length} logbook entr${rows.length === 1 ? "y" : "ies"} · newest first`;
    let previousDate = "";

    rows.forEach(row => {
      const tr = document.createElement("tr");
      const parsed = parseLogbookValue(row.value);
      const dateKey = `${row.year}-${row.month}-${row.day}`;
      const values = [
        dateKey === previousDate ? "" : `${String(row.day).padStart(2, "0")}/${String(row.month).padStart(2, "0")}/${row.year}`,
        loadNumber(row.loadKey) ? `Load ${loadNumber(row.loadKey)}` : row.loadKey,
        parsed.activity,
        parsed.details
      ];
      values.forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      userLogbookBody.appendChild(tr);
      previousDate = dateKey;
    });
  }

  async function loadUserLogbook() {
    if (logbookLoaded) return;
    const uid = loggedInJumper?.Uid ?? loggedInJumper?.uid;
    if (uid === null || uid === undefined || String(uid).trim() === "") {
      userLogbookStatus.textContent = "Your profile does not have a UID.";
      return;
    }

    userLogbookStatus.textContent = "Loading your logbook…";
    try {
      const response = await fetch(`${DB}/jumpers_history/${encodeURIComponent(String(uid))}.json`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Logbook request failed: HTTP ${response.status}`);
      renderUserLogbook(await response.json());
      logbookLoaded = true;
    } catch (error) {
      console.error(error);
      userLogbookStatus.textContent = "Could not load your logbook.";
    }
  }


  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function exportUserLogbook() {
    if (!loggedInLogbookRows.length) return;
    const lines = [["Date", "Load", "Activity", "Details"].map(csvCell).join(",")];

    loggedInLogbookRows.forEach(row => {
      const parsed = parseLogbookValue(row.value);
      const date = `${String(row.day).padStart(2, "0")}/${String(row.month).padStart(2, "0")}/${row.year}`;
      const load = loadNumber(row.loadKey) ? `Load ${loadNumber(row.loadKey)}` : row.loadKey;
      lines.push([date, load, parsed.activity, parsed.details].map(csvCell).join(","));
    });

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = String(loggedInJumper?.Name || "jumper").trim().replace(/[^a-z0-9_-]+/gi, "-");
    link.href = url;
    link.download = `${safeName}-logbook.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function selectUserTab(tab) {
    const profileSelected = tab === "profile";
    userProfileTab.classList.toggle("active", profileSelected);
    userLogbookTab.classList.toggle("active", !profileSelected);
    userProfileTab.setAttribute("aria-selected", String(profileSelected));
    userLogbookTab.setAttribute("aria-selected", String(!profileSelected));
    userProfileView.hidden = !profileSelected;
    userLogbookView.hidden = profileSelected;
    if (!profileSelected) loadUserLogbook();
  }

  exportUserLogbookBtn.addEventListener("click", exportUserLogbook);
  userProfileTab.addEventListener("click", () => selectUserTab("profile"));
  userLogbookTab.addEventListener("click", () => selectUserTab("logbook"));

  async function initializeProfile(){
    if(!await SkyKefAdminAuth.ready)return;
    const session=SkyKefAdminAuth.getSession();
    if(session?.role!=="jumper")return;
    userProfileSection.hidden=false;
    await loadJumperProfile(session);
  }
  initializeProfile();
})();
