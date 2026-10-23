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
    let printRows=0;
    manifest.querySelectorAll('.load-manifest-pair').forEach(pair=>{
      const videoRows=pair.querySelectorAll('.load-manifest-video-stack .load-manifest-card').length;
      printRows+=Math.max(1,videoRows);
    });
    const remainingCards=manifest.querySelectorAll('.load-manifest-rest > .load-manifest-card').length;
    printRows+=Math.ceil(remainingCards/2);
    printRows=Math.max(1,printRows);
    const cardHeight=Math.min(17,(264-0.6*(printRows+2))/printRows);
    const cardFont=Math.max(5,Math.min(10.5,cardHeight*0.58));
    const cardPadding=Math.max(0.45,Math.min(1.4,cardHeight*0.075));
    printArea.style.setProperty('--load-print-card-height',cardHeight.toFixed(2)+'mm');
    printArea.style.setProperty('--load-print-card-font',cardFont.toFixed(2)+'pt');
    printArea.style.setProperty('--load-print-card-padding',cardPadding.toFixed(2)+'mm');
    printArea.style.setProperty('--load-print-gap','0.6mm');
    if(cardHeight<17)printArea.classList.add('compact-load-print');
    printArea.append(printHeader,load,summary,manifest);document.body.appendChild(printArea);
    originalTitle=document.title;document.title='SkyKef Manifest';
    window.print();
  });
})();