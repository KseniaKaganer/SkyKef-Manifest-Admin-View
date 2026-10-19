(async () => {
  'use strict';
  const $=id=>document.getElementById(id);
  if(!await SkyKefAdminAuth.ready || !SkyKefAdminAuth.isDeveloper()){
    $('accessStatus').textContent='Only DEV can access Merge History.';
    return;
  }
  $('accessStatus').textContent='';$('mergeWorkspace').hidden=false;
  let jumpers=[],source=null,destination=null;
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
    for(const side of ['source','destination']){
      const list=$(side+'List'),q=$(side+'Search').value.trim().toLowerCase();list.replaceChildren();
      const selected=side==='source'?source:destination,other=side==='source'?destination:source;
      const filtered=jumpers.filter(j=>`${name(j)} ${uid(j)}`.toLowerCase().includes(q));
      for(const j of filtered){
        const b=document.createElement('button');b.type='button';b.className='jumper-row'+(selected?.key===j.key?' active':'');
        b.setAttribute('aria-pressed',String(selected?.key===j.key));
        const n=document.createElement('div');n.className='jumper-name';n.textContent=name(j);
        const u=document.createElement('div');u.className='jumper-sub';u.textContent=`UID: ${uid(j)||'Missing'}`;b.append(n,u);
        b.disabled=!uid(j)||Boolean(same(j,other));
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
  for(const side of ['source','destination'])$(side+'Search').addEventListener('input',render);
  $('clearMergeSelection').addEventListener('click',()=>{source=null;destination=null;render();});
  $('reloadMergeJumpers').addEventListener('click',load);
  await load();
})();
