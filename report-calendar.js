function createReportCalendar(input, fetchJson, options={}) {
  const historyRoot=options.historyRoot || "loads_history";
  const trigger=document.getElementById('reportCalendarButton');
  const popup=document.getElementById('reportCalendarPopup');
  const monthSelect=document.getElementById('reportCalendarMonth');
  const yearSelect=document.getElementById('reportCalendarYear');
  const grid=document.getElementById('reportCalendarDays');
  const message=document.getElementById('reportCalendarMessage');
  const previous=document.getElementById('reportCalendarPrev');
  const next=document.getElementById('reportCalendarNext');
  let available=new Set(), month=0, year=0;
  const key=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const numericKeys=(node,min,max)=>Object.keys(node || {}).filter(k=>/^\d+$/.test(k) && Number(k)>=min && Number(k)<=max);
  const close=()=>{popup.hidden=true;trigger.setAttribute('aria-expanded','false');};
  function draw(){
    monthSelect.value=String(month);yearSelect.value=String(year);grid.replaceChildren();
    const offset=new Date(year,month-1,1).getDay();
    for(let i=0;i<offset;i++)grid.appendChild(document.createElement('span'));
    const days=new Date(year,month,0).getDate();
    let active=0;
    for(let day=1;day<=days;day++){
      const value=key(year,month,day),button=document.createElement('button');
      button.type='button';button.textContent=day;button.disabled=!available.has(value);
      button.setAttribute('aria-label',`${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`);
      button.setAttribute('aria-pressed',String(value===input.value));
      if(!button.disabled)active++;
      button.onclick=()=>{if(!available.has(value))return;input.value=value;updateLabel();close();trigger.focus();input.dispatchEvent(new Event('change'));};
      grid.appendChild(button);
    }
    message.textContent=active?'Only days with saved data can be selected.':'No work days available in this month.';
    const years=[...yearSelect.options].map(o=>Number(o.value));
    previous.disabled=year===Math.min(...years) && month===1;
    next.disabled=year===Math.max(...years) && month===12;
  }
  function updateLabel(){trigger.textContent=input.value?input.value.split('-').reverse().join('/')+' ▾':'Choose work day ▾';}
  for(let i=1;i<=12;i++){const option=document.createElement('option');option.value=String(i);option.textContent=new Intl.DateTimeFormat('en',{month:'long'}).format(new Date(2020,i-1,1));monthSelect.appendChild(option);}
  trigger.onclick=()=>{if(!popup.hidden){close();return;}popup.hidden=false;trigger.setAttribute('aria-expanded','true');draw();(grid.querySelector('button[aria-pressed="true"]:not(:disabled)') || grid.querySelector('button:not(:disabled)') || monthSelect).focus();};
  monthSelect.onchange=()=>{month=Number(monthSelect.value);draw();};
  yearSelect.onchange=()=>{year=Number(yearSelect.value);draw();};
  function move(delta){const date=new Date(year,month-1+delta,1);year=date.getFullYear();month=date.getMonth()+1;draw();}
  previous.onclick=()=>move(-1);next.onclick=()=>move(1);
  document.addEventListener('click',event=>{if(!popup.hidden && !popup.contains(event.target) && !trigger.contains(event.target))close();});
  popup.addEventListener('keydown',event=>{if(event.key==='Escape'){close();trigger.focus();}});
  return {
    async refresh(currentDate){
      close();
      const historyYears=await fetchJson(historyRoot,true);
      const yearKeys=numericKeys(historyYears,1900,9999);
      const months=await Promise.all(yearKeys.map(async y=>({year:y,months:await fetchJson(`${historyRoot}/${y}`,true)})));
      const dateGroups=await Promise.all(months.flatMap(({year:y,months:ms})=>numericKeys(ms,1,12).map(async m=>{
        const days=await fetchJson(`${historyRoot}/${y}/${m}`,true);
        return numericKeys(days,1,new Date(Number(y),Number(m),0).getDate()).map(d=>key(Number(y),Number(m),Number(d)));
      })));
      available=new Set(dateGroups.flat());
      if(currentDate){const live=await fetchJson('loads',true);if(live && Object.keys(live).length)available.add(currentDate);}
      if(!available.has(input.value))input.value=available.has(currentDate)?currentDate:[...available].sort().at(-1) || '';
      updateLabel();yearSelect.replaceChildren();
      const years=[...new Set([...available].map(d=>Number(d.slice(0,4))))].sort((a,b)=>b-a);
      for(const y of years){const option=document.createElement('option');option.value=String(y);option.textContent=y;yearSelect.appendChild(option);}
      if(input.value){[year,month]=input.value.split('-').map(Number);draw();}
      return available.size>0;
    },
    setBusy(busy){trigger.disabled=busy || !available.size;if(busy)close();},
    has(value){return available.has(value);}
  };
}
