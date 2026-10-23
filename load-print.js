(() => {
  const button=document.getElementById('printLoadBtn');
  let printArea=null;
  let originalTitle=null;
  function clearPrintArea(){printArea?.remove();printArea=null;if(originalTitle!==null){document.title=originalTitle;originalTitle=null;}}
  window.addEventListener('afterprint',clearPrintArea);
  button.addEventListener('click',()=>{
    const session=SkyKefAdminAuth.getSession();
    if(!['admin','manifest'].includes(session?.role) || button.disabled)return;
    clearPrintArea();
    printArea=document.createElement('section');printArea.id='loadPrintArea';
    printArea.dir=document.documentElement.dir || 'ltr';
    const title=document.createElement('h1');title.textContent='SkyKef Manifest';
    const timestamp=document.createElement('time');timestamp.className='load-print-timestamp';
    const printedAt=new Date();timestamp.dateTime=printedAt.toISOString();
    timestamp.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(printedAt);
    const printHeader=document.createElement('div');printHeader.className='load-print-top';printHeader.append(timestamp,title);
    const load=document.createElement('h2');load.textContent=document.getElementById('loadTitle').textContent.split('·')[0].trim();
    const summary=document.createElement('p');summary.className='load-print-counts';summary.textContent=document.getElementById('loadSummary').textContent;
    const manifest=document.getElementById('loadBody').cloneNode(true);
    manifest.removeAttribute('id');
    if(manifest.querySelectorAll('.load-manifest-card').length>28)printArea.classList.add('compact-load-print');
    printArea.append(printHeader,load,summary,manifest);document.body.appendChild(printArea);
    originalTitle=document.title;document.title='SkyKef Manifest';
    window.print();
  });
})();