function splitLoadDetails(details){
  const parts=String(details ?? '—').split('·').map(part=>part.trim());
  return {first:parts.shift() || '—',extra:parts.filter(Boolean).join(' · ')};
}
function loadActivityPriority(activity){
  const value=String(activity ?? '').trim().toUpperCase();
  return value.startsWith('T')?0:value.startsWith('AFF')?1:2;
}
function appendLoadNameDetails(nameCell,details){
  const {extra}=splitLoadDetails(details);
  if(extra){const text=document.createElement('div');text.className='load-jumper-extra';text.textContent=extra;nameCell.appendChild(text);}
}

function loadActivityLabel(activity){
  const value=String(activity ?? '').trim();
  if(value.toUpperCase()==='FUN')return '';
  if(value.toUpperCase()==='FUN_RENTAL')return 'Rental';
  return value;
}
