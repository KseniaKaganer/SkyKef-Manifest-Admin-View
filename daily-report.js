(() => {
  const DB='https://skykef-app-default-rtdb.europe-west1.firebasedatabase.app';
  const status=document.getElementById('dailyReportStatus');
  const reload=document.getElementById('reloadReportBtn');
  const head=document.getElementById('dailyReportHead');
  const body=document.getElementById('dailyReportBody');
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
  async function fetchJson(path){const response=await fetch(`${DB}/${path}.json`,{cache:'no-store'});if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response.json();}
  async function load(){
    reload.disabled=true;status.textContent='Loading daily report…';
    try {
      const [jumpers,loads,current]=await Promise.all(['jumpers','loads','current_data'].map(fetchJson));
      document.getElementById('dailyReportDate').textContent=SkyKefAdminAuth.formatDate(current?.date);
      render(buildDailyReport(jumpers,loads));
    }catch(error){console.error(error);head.replaceChildren();body.replaceChildren();document.getElementById('dailyReportSummary').replaceChildren();document.getElementById('dailyReportDate').textContent='—';status.textContent='Could not load the daily report. Please try again.';}
    finally{reload.disabled=false;}
  }
  reload.addEventListener('click',load);load();
})();
