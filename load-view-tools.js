(() => {
  let lastUpdated=null,refreshing=false,failed=false;
  let status,updated,onlyMine,empty,selectionKey='',dataDate='';
  function ensureStatus(){
    if(status)return;
    const anchor=document.getElementById('loadsStatus');if(!anchor)return;
    const bar=document.createElement('div');bar.className='load-refresh-info';
    status=document.createElement('span');status.className='load-connection-status';status.setAttribute('role','status');
    updated=document.createElement('span');bar.append(status,updated);anchor.before(bar);
  }
  function showStatus(){
    ensureStatus();if(!status)return;
    const offline=navigator.onLine===false;
    status.textContent=offline?'Offline — showing last loaded data.':refreshing?'Refreshing…':failed?'Could not refresh — showing last loaded data.':lastUpdated?'Up to date':'Waiting for data…';
    if(!lastUpdated && (offline || failed))status.textContent=offline?'Offline — no data loaded yet.':'Could not load data.';
    status.classList.toggle('stale',offline || failed);
    updated.replaceChildren();
    if(lastUpdated){const label=document.createElement('span');label.textContent='Last updated';const time=document.createElement('time');time.dateTime=lastUpdated.toISOString();time.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(lastUpdated);updated.append(label,document.createTextNode(': '),time);if(dataDate){const dateLabel=document.createElement('span');dateLabel.textContent='Data date';updated.append(document.createTextNode(' · '),dateLabel,document.createTextNode(': '+dataDate));}}
  }
  async function fetchJson(url){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}finally{clearTimeout(timeout);}
  }
  window.LoadViewTools={fetchJson,
    start(){refreshing=true;showStatus();},
    success(){refreshing=false;failed=false;lastUpdated=new Date();dataDate=document.getElementById('reportDateInput')?.value || '';const list=document.getElementById('loadsList');if(list && dataDate)list.dataset.loadedDate=dataDate;showStatus();},
    failure(){refreshing=false;failed=true;showStatus();}
  };
  function storageKey(){
    const session=SkyKefAdminAuth.getSession();
    const date=document.getElementById('loadsList')?.dataset.loadedDate || document.getElementById('reportDateInput')?.value || new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date());
    return ['skykef_selected_load',location.pathname,session?.jumperKey ?? session?.username ?? 'public',date].join(':');
  }
  function readSelection(){try{return sessionStorage.getItem(storageKey()) || '';}catch{return selectionKey;}}
  function saveSelection(key){selectionKey=key;try{sessionStorage.setItem(storageKey(),key);}catch{}}
  function initialize(){
    const list=document.getElementById('loadsList');if(!list)return;
    const control=document.createElement('label');control.className='only-my-loads';
    onlyMine=document.createElement('input');onlyMine.type='checkbox';
    const text=document.createElement('span');text.textContent='Only my loads';control.append(onlyMine,text);
    list.before(control);
    empty=document.createElement('p');empty.className='detail-empty';empty.textContent='You are not on any loads in this view.';empty.hidden=true;list.after(empty);
    let adjusting=false;
    function updateList(restore=false){
      if(adjusting)return;adjusting=true;
      try{
        const personal=SkyKefAdminAuth.getSession()?.role==='jumper';control.hidden=!personal;
        if(!personal)onlyMine.checked=false;
        const buttons=[...list.querySelectorAll('.load-row')];
        for(const button of buttons)button.hidden=onlyMine.checked && !button.classList.contains('my-load');
        const visible=buttons.filter(button=>!button.hidden);
        empty.hidden=!(onlyMine.checked && buttons.length && !visible.length);
        const detail=document.getElementById('loadDetail');
        if(!visible.length && onlyMine.checked){if(detail)detail.hidden=true;return;}
        if(visible.length && detail)detail.hidden=false;
        const remembered=restore?visible.find(button=>button.dataset.key===readSelection()):null;
        const active=visible.find(button=>button.classList.contains('active'));
        const target=remembered || active || visible[0];
        if(target && (restore || !active)){target.click();}
      }finally{adjusting=false;}
    }
    list.addEventListener('click',event=>{const button=event.target.closest('.load-row');if(button && list.contains(button))saveSelection(button.dataset.key);});
    onlyMine.addEventListener('change',()=>updateList());
    new MutationObserver(()=>updateList(true)).observe(list,{childList:true});
    updateList(true);showStatus();
  }
  window.addEventListener('offline',showStatus);
  window.addEventListener('online',()=>{failed=true;showStatus();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
