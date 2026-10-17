(() => {
  const button=document.getElementById('printLoadBtn');
  let printArea=null;
  function clearPrintArea(){printArea?.remove();printArea=null;}
  window.addEventListener('afterprint',clearPrintArea);
  button.addEventListener('click',()=>{
    const session=SkyKefAdminAuth.getSession();
    if(!['admin','manifest'].includes(session?.role) || button.disabled)return;
    clearPrintArea();
    printArea=document.createElement('section');printArea.id='loadPrintArea';
    printArea.dir=document.documentElement.dir || 'ltr';
    const title=document.createElement('h1');title.textContent='SkyKef Manifest';
    const load=document.createElement('h2');load.textContent=document.getElementById('loadTitle').textContent;
    const date=document.createElement('p');date.textContent=document.getElementById('todayLabel').textContent;
    const summary=document.createElement('p');summary.textContent=document.getElementById('loadSummary').textContent;
    const table=document.querySelector('#loadDetail table').cloneNode(true);
    table.removeAttribute('class');
    // The live table may contain a UID cell; print only the three visible headings.
    for(const row of table.tBodies[0].rows)if(row.cells.length===4)row.deleteCell(1);
    table.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
    if(table.tBodies[0].rows.length>28)printArea.classList.add('compact-load-print');
    printArea.append(title,load,date,summary,table);document.body.appendChild(printArea);
    window.print();
  });
})();
