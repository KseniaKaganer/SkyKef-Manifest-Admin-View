function registrationFormUrl(profile,embedded=false){
  const url=new URL('https://docs.google.com/forms/d/e/1FAIpQLSeFem8JsrpMqbjNy95eaZVijdfKK-ptlyiDPB2LPLJefuomBg/viewform');
  if(embedded)url.searchParams.set('embedded','true');
  for(const [field,entry] of [['Name','entry.953792869'],['Surname','entry.1004849526']]){
    if(typeof profile?.[field]==='string' && profile[field].trim())url.searchParams.set(entry,profile[field].trim());
  }
  const id=profile?.Id ?? profile?.ID ?? profile?.id;
  if((typeof id==='string' && id.trim()) || (typeof id==='number' && Number.isSafeInteger(id) && id>=0))url.searchParams.set('entry.1788627427',String(id).trim());
  return url.toString();
}
(async()=>{
  const iframe=document.getElementById('registrationFrame');
  const originalLink=document.getElementById('registrationOriginalLink');
  const status=document.getElementById('registrationFormStatus');
  if(SkyKefAdminAuth.isAdmin()){
    const sheet='https://docs.google.com/spreadsheets/d/1iANChJB6OTxoPyjZHFgcLVeen_WEcJzL5V_vBBmzX5o';
    document.querySelector('.registration-page').classList.add('registration-sheet-page');
    document.getElementById('registrationPageTitle').textContent='Registration';
    document.getElementById('registrationPageSubtitle').hidden=true;
    originalLink.href=sheet+'/edit?usp=sharing';originalLink.textContent='Open in Google Sheets ↗';
    iframe.title='Registration spreadsheet';iframe.src=sheet+'/preview';iframe.hidden=false;
    status.textContent='';return;
  }
  let profile=null;
  try{
    const session=SkyKefAdminAuth.getSession();
    if(session?.role==='jumper' && session.jumperKey!==undefined && session.jumperKey!==null){
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),8000);
      try{
        const response=await fetch(`https://skykef-app-default-rtdb.europe-west1.firebasedatabase.app/jumpers/${encodeURIComponent(session.jumperKey)}.json`,{cache:'no-store',signal:controller.signal});
        if(response.ok){const record=await response.json();const current=SkyKefAdminAuth.getSession();if(current?.role==='jumper' && String(current.jumperKey)===String(session.jumperKey))profile=record;}
      }finally{clearTimeout(timeout);}
    }
  }catch{/* Keep the public form usable if the profile cannot be loaded. */}
  originalLink.href=registrationFormUrl(profile);
  iframe.src=registrationFormUrl(profile,true);
  iframe.hidden=false;
  const filled=new URL(registrationFormUrl(profile)).searchParams.size>0;
  status.textContent=filled?'Available details were filled from your profile. You can edit them before submitting.':'';
})();
