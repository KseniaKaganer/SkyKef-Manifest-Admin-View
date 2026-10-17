function logbookActivityType(value) {
  if(typeof value !== 'string') return 'Record';
  const parts=value.split('|').map(part=>part.trim());
  const type=parts[0].toUpperCase();
  if(type==='INSTRUCTOR')return 'AFF';
  if(type==='FUN' && parts.slice(1).some(part=>part.toLowerCase()==='coaching_0'))return 'C';
  return type || '—';
}
function filterLogbookRows(rows,{types=null,from='',to='',order='newest'}={}) {
  if(from && to && from>to) throw new Error('Start date must be on or before end date.');
  const selected=types===null?null:new Set(types);
  const direction=order==='oldest'?1:-1;
  const key=row=>`${String(row.year).padStart(4,'0')}-${String(row.month).padStart(2,'0')}-${String(row.day).padStart(2,'0')}`;
  const load=row=>Number(String(row.loadKey).match(/\d+/)?.[0] || 0);
  return rows.filter(row=>(selected===null || selected.has(logbookActivityType(row.value))) && (!from || key(row)>=from) && (!to || key(row)<=to))
    .sort((a,b)=>direction*(key(a).localeCompare(key(b)) || load(a)-load(b)));
}
