function jumperManifestProgress(loads, uid, airNumber, dayEnded=false) {
  const manifested=loads.filter(load=>load.entries.some(entry=>entry.uid===String(uid)));
  const past=manifested.filter(load=>dayEnded || (airNumber>0 && load.number>0 && load.number<airNumber));
  const current=manifested.filter(load=>!past.includes(load));
  const counts={total:past.length,work:0,fun:0};
  for(const load of past){
    const entry=load.entries.find(entry=>entry.uid===String(uid));
    const type=String(entry.activity || '').trim().toLowerCase();
    const details=String(entry.details || '').toLowerCase();
    const work=(!type.includes('fun') && !details.includes('level')) ||
      (type.includes('fun') && details.includes('coaching_0') && !type.includes('fun_rental'));
    counts[work?'work':'fun']++;
  }
  return {past,current,counts};
}
