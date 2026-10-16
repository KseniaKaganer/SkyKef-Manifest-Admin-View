(() => {
  const DB='https://skykef-app-default-rtdb.europe-west1.firebasedatabase.app';
  const status=document.getElementById('dailyReportStatus');
  const reload=document.getElementById('reloadReportBtn');
  const dateInput=document.getElementById('reportDateInput');
  const head=document.getElementById('dailyReportHead');
  const body=document.getElementById('dailyReportBody');
  const calendar=createReportCalendar(dateInput,fetchJson);
  function cell(tag,text,className='') {
    const el=document.createElement(tag);el.textContent=text;el.className=className;
    if(tag==='th') el.scope='col';
    return el;
  }
  function render(report) {
    head.replaceChildren();body.replaceChildren();
    const header=document.createElement('tr');header.appendChild(cell('th','Worker name','worker-column'));
    report.jobs.forEach(job=>header.appendChild(cell('th',job,'job-column')));
    report.loads.forEach((load,i)=>header.appendChild(cell('th',`Load ${load.match(/\d+/)?.[0] ?? load}`,i===0?'load-start':'')));
    head.appendChild(header);
    for(const worker of report.rows) {
      const row=document.createElement('tr');
      const name=cell('th',worker.name,'worker-column');name.scope='row';name.title=`UID: ${worker.uid}`;row.appendChild(name);
      report.jobs.forEach(job=>row.appendChild(cell('td',worker.counts[job] || '','job-column')));
      report.loads.forEach((load,i)=>row.appendChild(cell('td',worker.loads[load] || '',i===0?'load-start':'')));
      body.appendChild(row);
    }
    if(!report.rows.length){const row=document.createElement('tr');const empty=cell('td','No workers found on this day’s loads.');empty.colSpan=1+report.jobs.length+report.loads.length;row.appendChild(empty);body.appendChild(row);}
    const summary=document.getElementById('dailyReportSummary');summary.replaceChildren();
    for(const [label,key] of [['T','T'],['H','H'],['V/S','video'],['AFF','AFF'],['FUN','FUN']]) summary.appendChild(cell('span',`${label}: ${report.totals[key]}`));
    status.textContent=`${report.rows.length} worker${report.rows.length===1?"":"s"} · ${report.loads.length} load${report.loads.length===1?"":"s"}`;
  }
  async function fetchJson(path,shallow=false){const response=await fetch(`${DB}/${path}.json${shallow?"?shallow=true":""}`,{cache:'no-store'});if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response.json();}
  function dateKey(value){
    const formatted=SkyKefAdminAuth.formatDate(value);
    const match=formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match?`${match[3]}-${match[2]}-${match[1]}`:'';
  }
  async function load(refreshDates=false){
    reload.disabled=true;calendar.setBusy(true);status.textContent='Loading daily report…';
    try {
      const current=await fetchJson('current_data');
      const currentDate=dateKey(current?.date);
      if(refreshDates || !dateInput.value){
        const hasDates=await calendar.refresh(currentDate);
        if(!hasDates){head.replaceChildren();body.replaceChildren();document.getElementById('dailyReportSummary').replaceChildren();document.getElementById('dailyReportDate').textContent='—';status.textContent='No work days available in history.';return;}
      }
      const selected=dateInput.value;
      if(!calendar.has(selected)) throw new Error('Select a valid date');
      const [year,month,day]=selected.split('-');
      const historyPath=`loads_history/${Number(year)}/${Number(month)}/${Number(day)}`;
      const live=selected===currentDate;
      const [jumpers,dayLoads]=await Promise.all([fetchJson('jumpers'),fetchJson(live?'loads':historyPath)]);
      const loads=live && dayLoads==null ? await fetchJson(historyPath) : dayLoads;
      document.getElementById('dailyReportDate').textContent=`${day}/${month}/${year}`;
      render(buildDailyReport(jumpers,loads));
      if(!loads || !Object.values(loads).some(v=>v && typeof v==='object')) status.textContent='No loads found for the selected date.';
    }catch(error){console.error(error);head.replaceChildren();body.replaceChildren();document.getElementById('dailyReportSummary').replaceChildren();document.getElementById('dailyReportDate').textContent='—';status.textContent='Could not load the daily report. Please try again.';}
    finally{reload.disabled=false;calendar.setBusy(false);}
  }
  dateInput.addEventListener('change',()=>load());
  reload.addEventListener('click',()=>load(true));load(true);
})();
