const PROFILE_EDIT_FIELDS = Object.freeze(['Weight', 'Phone', 'Emergency']);
function validateProfileEdit(field, raw, original) {
  if (!PROFILE_EDIT_FIELDS.includes(field)) throw new Error('This field cannot be edited.');
  const text = String(raw ?? '').trim();
  if (field === 'Weight') {
    if (!/^\d+$/.test(text) || Number(text) < 20 || Number(text) > 250) throw new Error('Weight must be a whole number between 20 and 250 kg.');
    if (typeof original !== 'number' && typeof original !== 'string') throw new Error('Unsupported weight format. Contact the administrator.');
    return typeof original === 'number' ? Number(text) : text;
  }
  if (typeof original !== 'string') throw new Error('Unsupported contact format. Contact the administrator.');
  if (!text || text.length > (field === 'Phone' ? 40 : 120) || /[\u0000-\u001f\u007f<>]/.test(text)) throw new Error('Enter valid contact details without markup or control characters.');
  if (field === 'Phone' && !/^\d+$/.test(text)) throw new Error('Phone must contain digits only, without +, spaces or separators.');
  if (field === 'Emergency' && !/^[A-Za-z0-9 ]+$/.test(text)) throw new Error('Emergency contact may contain English letters, digits and spaces only.');
  const digits = text.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15 || /^0+$/.test(digits)) throw new Error('Enter a phone number containing 7–15 digits.');
  return text;
}
function buildProfileEditPatch(baseline, fresh, byName, session, changes) {
  const uid = String(baseline?.Uid ?? baseline?.uid ?? '');
  if (session?.role !== 'jumper' || !/^\d+$/.test(uid) || String(session.jumperKey) !== uid) throw new Error('Your login does not match this profile. Please log in again.');
  if (!fresh || String(fresh.Uid ?? fresh.uid ?? '') !== uid || fresh.Name !== baseline.Name || fresh.Surname !== baseline.Surname || String(fresh.Id ?? fresh.ID ?? fresh.id ?? '') !== String(baseline.Id ?? baseline.ID ?? baseline.id ?? '')) throw new Error('Profile identity changed. Cancel and reopen Edit.');
  const records = Object.entries(byName || {}).filter(([, record]) => record && typeof record === 'object');
  let matches = records.filter(([, record]) => String(record.Uid ?? record.uid ?? '') === uid);
  if (!matches.length) {
    const canonical = `${String(baseline.Name ?? '').replace(/ /g, '_')}_${String(baseline.Surname ?? '').replace(/ /g, '-')}`;
    matches = records.filter(([key, record]) => key === canonical && record.Name === baseline.Name && record.Surname === baseline.Surname && record.Uid == null && record.uid == null);
  }
  if (matches.length !== 1) throw new Error('Could not identify one matching name record. Nothing was saved.');
  const [nameKey, mirror] = matches[0];
  if (/[.#$\[\]/\u0000-\u001f\u007f]/.test(nameKey) || mirror.Name !== fresh.Name || mirror.Surname !== fresh.Surname) throw new Error('The two profile records do not match. Contact the administrator.');
  const patch = {};
  for (const [field, value] of Object.entries(changes)) {
    if (!PROFILE_EDIT_FIELDS.includes(field) || !Object.hasOwn(baseline, field) || !Object.hasOwn(mirror, field)) throw new Error('Only existing Weight, Phone and Emergency fields can be edited.');
    const checked = validateProfileEdit(field, value, baseline[field]);
    if (JSON.stringify(checked) === JSON.stringify(baseline[field])) continue;
    if (JSON.stringify(fresh[field]) !== JSON.stringify(baseline[field]) || JSON.stringify(mirror[field]) !== JSON.stringify(baseline[field])) throw new Error(`${field} changed or differs between records. Cancel and reopen Edit, or contact the administrator.`);
    patch[`jumpers/${uid}/${field}`] = checked;
    patch[`jumpers_by_name/${nameKey}/${field}`] = checked;
  }
  return patch;
}
