const DAILY_REPORT_JOBS = ['V','VS','S','T','TH','TF','TFH','TFF','TFFH','TFFF','TFFFH','AFF','FUN','C'];

function dailyReportJob(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase();
  if (!raw || raw.includes('fun_rental') || raw.includes('level')) return null;
  const type = raw.split('|')[0].trim().toUpperCase();
  if (type === 'FUN' && raw.includes('coaching_0')) return 'C';
  return type === 'INSTRUCTOR' ? 'AFF' : type;
}

function buildDailyReport(jumpers, loads) {
  const records = new Map(Object.entries(jumpers || {}).filter(([,j])=>j && typeof j==='object')
    .map(([key,j])=>[String(j.Uid ?? j.uid ?? key),j]));
  const loadEntries = Object.entries(loads || {}).filter(([,v])=>v && typeof v==='object')
    .sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}));
  const rows = new Map();
  const totals = {T:0,H:0,video:0,AFF:0,FUN:0};
  const extraJobs = new Set();
  for (const [loadKey, load] of loadEntries) {
    for (const [uid,value] of Object.entries(load)) {
      if (value === null || value === undefined) continue;
      const raw = typeof value==='string' ? value.toLowerCase() : '';
      const job = dailyReportJob(value);
      // FUN summary includes all fun jumpers; coached students remain FUN.
      if (raw.split('|')[0].trim()==='fun' && job!=='C') totals.FUN++;
      if (job?.startsWith('T')) { totals.T++; if(job.includes('H')) totals.H++; }
      if (['V','VS','S'].includes(job)) totals.video++;
      if (job==='AFF') totals.AFF++;
      const jumper = records.get(String(uid));
      if (!jumper || !todayJumperHasWorker(jumper)) continue;
      if (!rows.has(uid)) rows.set(uid,{uid,name:`${jumper.Name ?? ''} ${jumper.Surname ?? ''}`.trim() || `UID ${uid}`,counts:{},loads:{}});
      if (!job) continue;
      if (!DAILY_REPORT_JOBS.includes(job)) extraJobs.add(job);
      const row=rows.get(uid);
      row.counts[job]=(row.counts[job] || 0)+1;
      row.loads[loadKey]=job;
    }
  }
  return {jobs:[...DAILY_REPORT_JOBS,...[...extraJobs].sort()],loads:loadEntries.map(([key])=>key),
    rows:[...rows.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'})),totals};
}
