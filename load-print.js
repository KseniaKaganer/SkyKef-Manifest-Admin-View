(() => {
  const button=document.getElementById('printLoadBtn');
  let printArea=null;
  let originalTitle=null;
  function clearPrintArea(){printArea?.remove();printArea=null;if(originalTitle!==null){document.title=originalTitle;originalTitle=null;}}
  function collectAltitudeLines(manifest){
    let hasHopAndPop=false;
    const altitudes=new Set();
    const addAltitude=value=>{
      const match=String(value??'').trim().match(/^(\\d+(?:\\.\\d+)?)/);
      if(!match)return;
      let number=Number(match[1]);
      if(number>1000)number/=1000;
      if(number>=4&&number<=20)altitudes.add(number);
    };
    manifest.querySelectorAll('.load-manifest-card').forEach(card=>{
      card.querySelectorAll('.load-manifest-altitude').forEach(node=>addAltitude(node.textContent));
      card.querySelectorAll('.load-jumper-extra').forEach(node=>{
        const detail=String(node.textContent??'');
        if(/\\bH\\s*&\\s*P\\b/i.test(detail))hasHopAndPop=true;
        detail.split('·').forEach(part=>{
          const value=part.trim();
          if(/^(?:altitude|height)\\s*:?\\s*\\d/i.test(value))addAltitude(value.replace(/^(?:altitude|height)\\s*:?\\s*/i,''));
          else if(/^\\d+(?:\\.\\d+)?$/.test(value))addAltitude(value);
        });
      });
    });
    return {hasHopAndPop,altitudes:[...altitudes].sort((a,b)=>a-b).map(value=>String(value))};
  }
  window.addEventListener('afterprint',clearPrintArea);
  button.addEventListener('click',()=>{
    const session=SkyKefAdminAuth.getSession();
    if(!['admin','manifest'].includes(session?.role) || button.disabled)return;
    clearPrintArea();
    printArea=document.createElement('section');printArea.id='loadPrintArea';
    printArea.dir=document.documentElement.dir || 'ltr';
    const {hasHopAndPop,altitudes}=collectAltitudeLines(manifest);
    const altitudeHeader=document.createElement('div');altitudeHeader.className='load-print-altitudes';
    const title=document.createElement('h1');title.textContent='Altitudes';
    const altitudeList=document.createElement('div');altitudeList.className='load-print-altitude-list';
    const altitudeLines=[...(hasHopAndPop?['H&P']:[]),...altitudes];
    if(altitudeLines.length)altitudeLines.forEach(value=>{const line=document.createElement('div');line.textContent=value;altitudeList.appendChild(line);});
    else altitudeList.textContent='—';
    altitudeHeader.append(title,altitudeList);
    const timestamp=document.createElement('time');timestamp.className='load-print-timestamp';
    const printedAt=new Date();timestamp.dateTime=printedAt.toISOString();
    timestamp.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(printedAt);
    const printHeader=document.createElement('div');printHeader.className='load-print-top';printHeader.append(timestamp,altitudeHeader);
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
    const headerLineCount=altitudes.length+(hasHopAndPop?1:0);
    const availableHeight=264-Math.max(0,headerLineCount-1)*3.4;
    const cardHeight=Math.min(26,(availableHeight-0.6*(printRows+2))/printRows);
    const cardFont=Math.max(5,Math.min(12,cardHeight*0.58));
    const cardPadding=Math.max(0.45,Math.min(1.8,cardHeight*0.075));
    printArea.style.setProperty('--load-print-card-height',cardHeight.toFixed(2)+'mm');
    printArea.style.setProperty('--load-print-card-font',cardFont.toFixed(2)+'pt');
    printArea.style.setProperty('--load-print-card-padding',cardPadding.toFixed(2)+'mm');
    printArea.style.setProperty('--load-print-gap','0.6mm');
    if(cardHeight<17)printArea.classList.add('compact-load-print');
    const footer=document.createElement('footer');footer.className='load-print-footer';footer.textContent='SkyKef Manifest';
    printArea.append(printHeader,load,summary,manifest,footer);document.body.appendChild(printArea);
    originalTitle=document.title;document.title='SkyKef Manifest';
    window.print();
  });
})();