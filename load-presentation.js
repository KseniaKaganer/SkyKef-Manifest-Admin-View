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

function orderAttachedVideoFlyers(entries,nameForEntry){
  const normalize=value=>String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[_\s]+/g,' ');
  const isVideo=entry=>String(entry.activity ?? '').trim().toUpperCase()==='V';
  const attachments=new Map(),attached=new Set();
  for(const video of entries.filter(isVideo)){
    const reference=String(video.details ?? '').split('·')[0].trim();
    if(!reference || reference==='—')continue;
    const candidates=entries.filter(entry=>entry!==video && !isVideo(entry));
    const uidReference=reference.replace(/^uid\s*:?\s*/i,'');
    let matches=candidates.filter(entry=>String(entry.uid)===uidReference);
    if(!matches.length)matches=candidates.filter(entry=>normalize(nameForEntry(entry))===normalize(reference));
    // Ambiguous names stay in their normal position rather than attaching to the wrong jumper.
    if(matches.length!==1)continue;
    const target=matches[0];
    if(!attachments.has(target))attachments.set(target,[]);
    attachments.get(target).push(video);attached.add(video);
  }
  const ordered=[];
  for(const entry of entries){if(attached.has(entry))continue;ordered.push(entry,...(attachments.get(entry)||[]));}
  return ordered;
}
