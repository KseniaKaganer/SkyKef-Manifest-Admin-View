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
