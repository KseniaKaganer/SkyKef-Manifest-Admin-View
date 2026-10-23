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
function appendLoadSpecialDetails(nameCell,details){
  const value=String(details??'').split('·').map(part=>part.trim()).filter(part=>part&&part!=='—').join(' · ');
  if(value){const text=document.createElement('div');text.className='load-jumper-extra';text.textContent=value;nameCell.appendChild(text);}
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


function organizeLoadManifest(entries,nameForEntry){
  const ordered=orderAttachedVideoFlyers(entries.map(entry=>({...entry})),nameForEntry);
  const tandems=ordered.filter(entry=>String(entry.activity??'').trim().toUpperCase().startsWith('T'));
  const tandemUids=new Set(tandems.map(entry=>String(entry.uid)));
  const videosByTandem=new Map();
  for(const entry of ordered){
    if(String(entry.activity??'').trim().toUpperCase()!=='V' || !entry.videoConnection)continue;
    const targetUid=String(entry.videoConnection.uid);
    if(!tandemUids.has(targetUid))continue;
    if(!videosByTandem.has(targetUid))videosByTandem.set(targetUid,[]);
    videosByTandem.get(targetUid).push(entry);
  }
  const pairedVideoUids=new Set([...videosByTandem.values()].flat().map(entry=>String(entry.uid)));
  const tandemRows=tandems.map(entry=>({entry,videos:videosByTandem.get(String(entry.uid))||[]}));
  const remaining=ordered.filter(entry=>!String(entry.activity??'').trim().toUpperCase().startsWith('T')&&!pairedVideoUids.has(String(entry.uid)));
  return {tandemRows,remaining};
}
function loadSummaryLabel(entries,jumperCount){
  const tandems=entries.filter(entry=>String(entry.activity??'').trim().toUpperCase().startsWith('T')).length;
  const rentals=entries.filter(entry=>String(entry.activity??'').trim().toUpperCase().includes('RENTAL')).length;
  return jumperCount+' Jumpers · '+entries.length+' Canopies · T:'+tandems+' · R:'+rentals;
}
function renderLoadManifest(container,entries,jumpersByUid){
  container.replaceChildren();
  const nameForEntry=entry=>{
    const jumper=jumpersByUid.get(String(entry.uid));
    return jumper?(String(jumper.Name??'')+' '+String(jumper.Surname??'')).trim()||'Unknown jumper':'Unknown jumper';
  };
  if(!entries.length){
    const empty=document.createElement('div');
    empty.className='load-manifest-empty-message';
    empty.textContent='No jumper records in this load.';
    container.appendChild(empty);
    return;
  }
  const organized=organizeLoadManifest(entries,nameForEntry);
  const cameraIcon=()=>{
    const camera=document.createElement('span');
    camera.className='load-manifest-camera';
    camera.setAttribute('role','img');
    camera.setAttribute('aria-label','Video camera');
    camera.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h11a2 2 0 0 1 2 2v1.1l4-2.6v11l-4-2.6V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><path d="m8 9 5 3-5 3z" fill="#fff"/></svg>';
    return camera;
  };
  const createCard=(entry,kind)=>{
    const card=document.createElement('div');
    card.className='load-manifest-card '+kind;
    if(isLoggedInLoadJumper(entry,jumpersByUid))card.classList.add('my-jumper');
    const main=document.createElement('div');
    main.className='load-manifest-main';
    const name=document.createElement('div');
    name.className='load-manifest-name';
    name.textContent=nameForEntry(entry);
    main.appendChild(name);
    if(kind==='tandem')appendLoadNameDetails(main,entry.details);
    else if(kind==='jumper')appendLoadSpecialDetails(main,entry.details);
    card.appendChild(main);
    const activity=String(entry.activity??'').trim().toUpperCase();
    if(kind==='tandem'||kind==='video'||activity==='V'){
      const meta=document.createElement('div');
      meta.className='load-manifest-meta';
      if(kind==='tandem'){
        const top=document.createElement('div');
        top.className='load-manifest-top-meta';
        if(activity.includes('H'))top.appendChild(cameraIcon());
        const altitude=loadAltitudeValue(entry.details,entry.activity);
        if(altitude&&altitude!=='—'){
          const value=document.createElement('span');value.className='load-manifest-altitude';value.textContent=altitude;top.appendChild(value);
        }
        meta.appendChild(top);
        const type=loadActivityLabel(entry.activity);
        if(type){const value=document.createElement('span');value.className='load-manifest-type';value.textContent=type;meta.appendChild(value);}
      }else{
        const value=document.createElement('span');value.className='load-manifest-type';value.textContent=loadActivityLabel(entry.activity)||'V';meta.appendChild(value);
      }
      card.appendChild(meta);
    }else if(activity.includes('H'))card.appendChild(cameraIcon());
    if(activity.includes('RENTAL'))card.classList.add('rental');
    return card;
  };
  if(organized.tandemRows.length){
    const pairs=document.createElement('div');pairs.className='load-manifest-pairs';
    for(const row of organized.tandemRows){
      const pair=document.createElement('div');pair.className='load-manifest-pair';
      pair.appendChild(createCard(row.entry,'tandem'));
      if(row.videos.length){
        const videos=document.createElement('div');videos.className='load-manifest-video-stack';
        row.videos.forEach(video=>videos.appendChild(createCard(video,'video')));
        pair.appendChild(videos);
      }else{
        const blank=document.createElement('div');blank.className='load-manifest-empty-cell';blank.setAttribute('aria-hidden','true');pair.appendChild(blank);
      }
      pairs.appendChild(pair);
    }
    container.appendChild(pairs);
  }
  if(organized.remaining.length){
    const rest=document.createElement('div');rest.className='load-manifest-rest';
    organized.remaining.forEach(entry=>rest.appendChild(createCard(entry,'jumper')));
    container.appendChild(rest);
  }
}
