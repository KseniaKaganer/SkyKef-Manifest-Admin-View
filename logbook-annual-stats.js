function buildLogbookAnnualStats(rows){
  const years=new Map(),types=new Set();
  for(const row of rows){
    const year=Number(row.year);
    if(!Number.isInteger(year) || year<1 || typeof row.value!=='string')continue;
    const parts=row.value.split('|').map(part=>part.trim());
    // Balance adjustments have no activity details and are not jumps.
    if(!parts.slice(1).some(part=>part && part!=='—'))continue;
    let type=parts[0].toUpperCase();
    if(!type || type==='—')continue;
    if(type==='INSTRUCTOR')type='AFF';
    if(type==='FUN' && parts.slice(1).some(part=>part.toLowerCase()==='coaching_0'))type='C';
    if(!years.has(year))years.set(year,{year,total:0,counts:{}});
    const summary=years.get(year);summary.total++;summary.counts[type]=(summary.counts[type]||0)+1;types.add(type);
  }
  return {years:[...years.values()].sort((a,b)=>b.year-a.year),types:[...types].sort((a,b)=>a.localeCompare(b))};
}
function renderLogbookAnnualStats(container,rows,{showTypes=true}={}){
  container.replaceChildren();
  const stats=buildLogbookAnnualStats(rows);container.hidden=!stats.years.length;
  if(!stats.years.length)return;
  const visibleTypes=showTypes?stats.types:[];
  const heading=document.createElement('h3');heading.textContent='Annual Jump Statistics';
  const scroll=document.createElement('div');scroll.className='annual-stats-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Annual jump statistics');
  const table=document.createElement('table');table.className='annual-stats-table';
  const head=document.createElement('thead'),header=document.createElement('tr');
  for(const text of ['Year','Total',...visibleTypes]){const th=document.createElement('th');th.scope='col';th.textContent=text;header.appendChild(th);}head.appendChild(header);
  const body=document.createElement('tbody');
  for(const summary of stats.years){
    const row=document.createElement('tr');
    const year=document.createElement('th');year.scope='row';year.textContent=summary.year;row.appendChild(year);
    for(const value of [summary.total,...visibleTypes.map(type=>summary.counts[type]||0)]){const cell=document.createElement('td');cell.textContent=value;row.appendChild(cell);}
    body.appendChild(row);
  }
  table.append(head,body);scroll.appendChild(table);container.append(heading,scroll);
}
