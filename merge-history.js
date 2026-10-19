(async () => {
  'use strict';
  const $=id=>document.getElementById(id);
  if(!await SkyKefAdminAuth.ready || !SkyKefAdminAuth.isDeveloper()){
    $('accessStatus').textContent='Only DEV can access Merge History.';
    return;
  }
  $('accessStatus').textContent='';$('mergeWorkspace').hidden=false;
  let jumpers=[],source=null,destination=null,busy=false;
  const name=j=>`${j.Name??''} ${j.Surname??''}`.trim()||'Unnamed jumper';
  const uid=j=>String(j.Uid??j.uid??'').trim();
  const label=j=>`${name(j)} (UID: ${uid(j)||'Missing'})`;
  const same=(a,b)=>a&&b&&(a.key===b.key||(uid(a)&&uid(a)===uid(b)));
  function selection(id,j,empty){
    $(id).replaceChildren();
    if(!j){$(id).textContent=empty;return;}
    const n=document.createElement('div');n.className='merge-selected-name';n.textContent=name(j);
    const u=document.createElement('div');u.className='jumper-sub';u.textContent=`UID: ${uid(j)}`;$(id).append(n,u);
  }
  function render(){
    $('mergeHistoryBtn').disabled=busy||!source||!destination||Boolean(same(source,destination));
    $('clearMergeSelection').disabled=busy;
    $('reloadMergeJumpers').disabled=busy;
    for(const side of ['source','destination']){
      const list=$(side+'List'),q=$(side+'Search').value.trim().toLowerCase();list.replaceChildren();
      const selected=side==='source'?source:destination,other=side==='source'?destination:source;
      const filtered=jumpers.filter(j=>j.key!==selected?.key && `${name(j)} ${uid(j)}`.toLowerCase().includes(q));
      if(selected)filtered.unshift(selected);
      for(const j of filtered){
        const b=document.createElement('button');b.type='button';b.className='jumper-row'+(selected?.key===j.key?' active':'');
        b.setAttribute('aria-pressed',String(selected?.key===j.key));
        const n=document.createElement('div');n.className='jumper-name';n.textContent=name(j);
        const u=document.createElement('div');u.className='jumper-sub';u.textContent=`UID: ${uid(j)||'Missing'}`;b.append(n,u);
        b.disabled=busy||!uid(j)||Boolean(same(j,other));
        if(b.disabled)b.title=!uid(j)?'Cannot select a jumper without a UID.':'Already selected on the other side.';
        b.addEventListener('click',()=>{if(side==='source')source=j;else destination=j;render();});list.appendChild(b);
      }
      if(!filtered.length){const empty=document.createElement('div');empty.className='detail-empty';empty.textContent='No jumpers match your search.';list.appendChild(empty);}
    }
    selection('sourceSelection',source,'No source selected.');selection('destinationSelection',destination,'No destination selected.');
    $('mergeSummary').textContent=source&&destination?`From ${label(source)} → To ${label(destination)}`:'Choose two different jumpers.';
  }
  async function load(){
    if(!SkyKefAdminAuth.isDeveloper())return;
    $('reloadMergeJumpers').disabled=true;$('mergeListStatus').textContent='Loading jumpers…';
    jumpers=[];source=null;destination=null;render();
    try{
      const r=await fetch('https://skykef-app-default-rtdb.europe-west1.firebasedatabase.app/jumpers.json',{cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      jumpers=Object.entries(data||{}).filter(([,j])=>j&&typeof j==='object').map(([key,j])=>({...j,key}));
      jumpers.sort((a,b)=>name(a).localeCompare(name(b),undefined,{sensitivity:'base'})||uid(a).localeCompare(uid(b),undefined,{numeric:true}));
      $('mergeListStatus').textContent=`${jumpers.length} jumpers`;render();
    }catch(e){console.error(e);$('mergeListStatus').textContent='Could not load jumpers. Try Reload Data.';}
    finally{$('reloadMergeJumpers').disabled=false;}
  }

  const db='https://skykef-app-default-rtdb.europe-west1.firebasedatabase.app';
  const nameKey=j=>String(j.Name??'').replaceAll(' ','_')+'_'+String(j.Surname??'').replaceAll(' ','-');
  const validKey=k=>k&&!/[.#$\[\]\/\u0000-\u001f\u007f]/.test(k);
  async function read(path){
    const response=await fetch(db+'/'+path.split('/').map(encodeURIComponent).join('/')+'.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Could not read '+path+' (HTTP '+response.status+').');
    return response.json();
  }
  function leaves(node,path=[],out=new Map()){
    if(node===null||node===undefined)return out;
    if(typeof node==='object'){
      for(const [key,value] of Object.entries(node))leaves(value,[...path,key],out);
    }else{
      if(path.length!==4||path.some(k=>!validKey(k)))throw new Error('Unexpected history structure. Merge stopped.');
      out.set(path.join('/'),node);
    }
    return out;
  }
  async function transfer(){
    if(busy||!source||!destination||same(source,destination)||!SkyKefAdminAuth.isDeveloper())return;
    const from=source,to=destination;
    const fromName=nameKey(from),toName=nameKey(to);
    const status=$('mergeResult');
    if(![uid(from),uid(to),fromName,toName].every(validKey)){
      status.textContent='A UID or name contains an invalid database key. Merge stopped.';return;
    }
    if(!window.confirm('Are you sure you want to merge history from '+label(from)+' into '+label(to)+'?\n\nHistory will be copied in jumpers_history and jumpers_history_by_name. Source history and jumper records will remain unchanged. Existing destination entries will not be overwritten.'))return;
    busy=true;render();status.textContent='Checking history…';
    try{
      const day=await read('current_data');
      if(day?.day_start===true&&day?.end_of_day===false)throw new Error('End the live jumping day before merging history.');
      const paths=[
        ['jumpers_history/'+uid(from),'jumpers_history/'+uid(to)],
        ['jumpers_history_by_name/'+fromName,'jumpers_history_by_name/'+toName]
      ];
      const patch=Object.create(null);let duplicates=0;
      for(const [fromPath,toPath] of paths){
        if(fromPath===toPath)continue;
        const [fromData,toData]=await Promise.all([read(fromPath),read(toPath)]);
        const src=leaves(fromData),dst=leaves(toData);
        for(const [key,value] of src){
          if(dst.has(key)){
            if(dst.get(key)!==value)throw new Error('Conflicting history at '+toPath+'/'+key+'. Nothing was transferred.');
            duplicates++;continue;
          }
          patch[toPath+'/'+key]=value;
        }
      }
      const count=Object.keys(patch).length;
      if(!count){status.textContent='No new history to copy. '+duplicates+' identical entries already exist.';return;}
      if(!SkyKefAdminAuth.isDeveloper())throw new Error('DEV access is required.');
      const finalDay=await read('current_data');
      if(finalDay?.day_start===true&&finalDay?.end_of_day===false)throw new Error('A jumping day is running. Merge stopped.');
      status.textContent='Copying history…';
      const response=await fetch(db+'/.json',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
      if(!response.ok)throw new Error('Transfer failed (HTTP '+response.status+').');
      status.textContent='History merged from '+label(from)+' into '+label(to)+'. Copied '+count+' entries across the two history branches; skipped '+duplicates+' identical entries. Source records remain unchanged.';
    }catch(error){
      console.error(error);status.textContent=error.message+' If the connection failed during transfer, reload and retry; identical entries are skipped.';
    }finally{busy=false;render();}
  }
  $('mergeHistoryBtn').addEventListener('click',transfer);

  for(const side of ['source','destination'])$(side+'Search').addEventListener('input',render);
  $('clearMergeSelection').addEventListener('click',()=>{source=null;destination=null;render();});
  $('reloadMergeJumpers').addEventListener('click',load);
  await load();
})();
