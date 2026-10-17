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
  for(const entry of entries){delete entry.videoConnection;delete entry.hasAttachedVideo;}
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
    video.videoConnection={uid:target.uid,name:nameForEntry(target)};target.hasAttachedVideo=true;
    if(!attachments.has(target))attachments.set(target,[]);
    attachments.get(target).push(video);attached.add(video);
  }
  const ordered=[];
  for(const entry of entries){if(attached.has(entry))continue;ordered.push(entry,...(attachments.get(entry)||[]));}
  return ordered;
}

function decorateLoadConnection(row,nameCell,entry){
  nameCell.classList.add('load-name-column');
  if(entry.hasAttachedVideo)row.classList.add('video-group-parent');
  if(entry.videoConnection){
    row.classList.add('video-group-child');
    const connection=document.createElement('div');connection.className='load-video-connection';
    const label=document.createElement('span');label.textContent='Video for';
    const target=document.createElement('bdi');target.textContent=entry.videoConnection.name;
    connection.append(document.createTextNode('↳ '),label,document.createTextNode(': '),target);
    nameCell.appendChild(connection);
  }
}
function loadAltitudeValue(details,activity,{jumperView=false}={}){
  if(String(activity ?? '').trim().toUpperCase()==='V')return '';
  const first=splitLoadDetails(details).first;
  return first;
}
function compareTandemAltitude(a,b){
  if(!String(a.activity ?? '').trim().toUpperCase().startsWith('T') || !String(b.activity ?? '').trim().toUpperCase().startsWith('T'))return 0;
  const altitude=entry=>{
    const first=splitLoadDetails(entry.details).first;
    if(!/^\d+(?:\.\d+)?$/.test(first))return Infinity;
    const number=Number(first);return number>1000?number/1000:number;
  };
  const av=altitude(a),bv=altitude(b);
  return av===bv?0:av<bv?-1:1;
}

function isLoggedInLoadJumper(entry,jumpersByUid){
  const session=SkyKefAdminAuth.getSession();
  if(session?.role!=='jumper' || session.jumperKey==null)return false;
  const record=jumpersByUid.get(String(session.jumperKey));
  const uid=String(record?.Uid ?? record?.uid ?? session.jumperKey);
  return String(entry.uid)===uid;
}
function highlightPersonalLoad(button,entries,jumpersByUid){
  if(entries.some(entry=>isLoggedInLoadJumper(entry,jumpersByUid))){
    button.classList.add('my-load');
    const badge=document.createElement('span');badge.className='my-load-badge';badge.textContent='Your load';
    button.appendChild(badge);
  }
}
