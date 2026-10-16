// /loads/{load}/{uid} contains the current manifest day's entries.
function filterTodayJumpers(jumpers, loads) {
  const manifested = new Set();
  for (const load of Object.values(loads || {})) {
    if (!load || typeof load !== "object") continue;
    for (const [uid, activity] of Object.entries(load)) {
      if (activity !== null && activity !== undefined) manifested.add(String(uid));
    }
  }
  const records = new Map(jumpers.map(j => [String(j.Uid ?? j.uid ?? j.key), j]));
  return [...manifested].map(uid => records.get(uid) || {
    key: uid, Uid: uid, Name: `UID ${uid}`, Surname: ""
  });
}

function todayJumperHasWorker(jumper) {
  const entry = Object.entries(jumper).find(([key]) => key.toLowerCase() === "worker");
  const value = entry?.[1];
  if (value === null || value === undefined) return false;
  if (typeof value === "object") return Object.values(value).some(v => v !== null && v !== undefined && String(v).trim() !== "");
  return String(value).trim() !== "";
}

function countTodayJumps(loads) {
  const counts = new Map();
  for (const load of Object.values(loads || {})) {
    if (!load || typeof load !== "object") continue;
    for (const [uid, activity] of Object.entries(load)) {
      if (activity === null || activity === undefined) continue;
      const count = counts.get(String(uid)) || {total: 0, work: 0, fun: 0};
      const raw = String(activity).trim().toLowerCase();
      const type = raw.split("|")[0].trim();
      // Match the Unity daily report: a coach's fun/coaching_0 entry is work.
      const work = (!type.includes("fun") && !raw.includes("level")) ||
        (type.includes("fun") && raw.includes("coaching_0") && !raw.includes("fun_rental"));
      count.total++;
      count[work ? "work" : "fun"]++;
      counts.set(String(uid), count);
    }
  }
  return counts;
}
