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
  let allLogbookRows = [];
  const collapsedLogbookYears=new Set();
  const logbookFilters = document.getElementById("logbookFilters");
  const typeOptions = document.getElementById("logbookTypeOptions");
  const fromDate = document.getElementById("logbookFromDate");
  const toDate = document.getElementById("logbookToDate");
  const sortOrder = document.getElementById("logbookSortOrder");
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
    allLogbookRows = flattenHistoryNode(data).filter(row => parseLogbookValue(row.value).details !== "—");
    typeOptions.replaceChildren();
    const types = [...new Set(allLogbookRows.map(row => logbookActivityType(row.value)))].sort();
    for(const type of types) {
      const label=document.createElement("label");
      const input=document.createElement("input");input.type="checkbox";input.value=type;input.checked=true;
      label.append(input,document.createTextNode(type));typeOptions.appendChild(label);
    }
    logbookFilters.disabled=false;
    applyLogbookFilters();
  }

  function applyLogbookFilters() {
    let rows;
    fromDate.removeAttribute("aria-invalid");toDate.removeAttribute("aria-invalid");
    try {
      rows=filterLogbookRows(allLogbookRows,{
        types:[...typeOptions.querySelectorAll("input:checked")].map(input=>input.value),
        from:fromDate.value,to:toDate.value,order:sortOrder.value
      });
    } catch(error) {
      userLogbookBody.replaceChildren();loggedInLogbookRows=[];exportUserLogbookBtn.disabled=true;
      document.getElementById("userLogbookAnnualStats").hidden=true;
      fromDate.setAttribute("aria-invalid","true");toDate.setAttribute("aria-invalid","true");
      userLogbookStatus.textContent=error.message;return;
    }
    renderLogbookAnnualStats(document.getElementById("userLogbookAnnualStats"),rows,{showTypes:SkyKefAdminAuth.hasWorkerRoles(loggedInJumper),collapsible:true});
    userLogbookBody.replaceChildren();
    loggedInLogbookRows = rows;
    exportUserLogbookBtn.disabled = rows.length === 0;

    if (!rows.length) {
      userLogbookStatus.textContent = allLogbookRows.length ? "No jumps match the selected filters." : "No logbook history found.";
      return;
    }

    userLogbookStatus.textContent = `${rows.length} logbook entr${rows.length === 1 ? "y" : "ies"} · ${sortOrder.value === "oldest" ? "oldest first" : "newest first"}`;
    let previousDate = "";
    let previousYear=null;
    const counts=new Map();for(const row of rows)counts.set(row.year,(counts.get(row.year)||0)+1);
    rows.forEach(row => {
      if(row.year!==previousYear){
        const separator=document.createElement("tr");separator.className="logbook-year-separator";
        const cell=document.createElement("th");cell.colSpan=4;cell.scope="rowgroup";
        const toggle=document.createElement("button");toggle.type="button";toggle.className="logbook-year-toggle";
        toggle.setAttribute("aria-expanded",String(!collapsedLogbookYears.has(row.year)));
        const arrow=document.createElement("span");arrow.className="logbook-year-arrow";arrow.setAttribute("aria-hidden","true");arrow.textContent=collapsedLogbookYears.has(row.year)?"▸":"▾";
        const year=document.createElement("span");year.textContent=String(row.year);
        const count=document.createElement("span");count.textContent=`(${counts.get(row.year)})`;count.className="logbook-year-count";
        toggle.append(arrow,year,count);cell.appendChild(toggle);separator.appendChild(cell);userLogbookBody.appendChild(separator);
        toggle.addEventListener("click",()=>{
          if(collapsedLogbookYears.has(row.year))collapsedLogbookYears.delete(row.year);else collapsedLogbookYears.add(row.year);
          const collapsed=collapsedLogbookYears.has(row.year);toggle.setAttribute("aria-expanded",String(!collapsed));arrow.textContent=collapsed?"▸":"▾";
          for(const item of userLogbookBody.querySelectorAll("tr[data-logbook-year]"))if(item.dataset.logbookYear===String(row.year))item.hidden=collapsed;
        });
        previousYear=row.year;previousDate="";
      }
      const tr = document.createElement("tr");
      tr.dataset.logbookYear=String(row.year);tr.hidden=collapsedLogbookYears.has(row.year);
      const parsed = parseLogbookValue(row.value);
      const dateKey = `${row.year}-${row.month}-${row.day}`;
      const values = [
        dateKey === previousDate ? "" : `${String(row.day).padStart(2, "0")}/${String(row.month).padStart(2, "0")}/${row.year}`,
        loadNumber(row.loadKey) ? `Load ${loadNumber(row.loadKey)}` : row.loadKey,
        logbookActivityType(row.value),
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
      lines.push([date, load, logbookActivityType(row.value), parsed.details].map(csvCell).join(","));
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

  logbookFilters.addEventListener("change", applyLogbookFilters);
  document.getElementById("resetLogbookFilters").addEventListener("click", () => {
    for(const input of typeOptions.querySelectorAll("input"))input.checked=true;
    fromDate.value="";toDate.value="";sortOrder.value="newest";applyLogbookFilters();
  });
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
