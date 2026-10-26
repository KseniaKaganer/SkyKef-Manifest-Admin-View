const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../auth.js'), 'utf8');
const key = 'skykef_manifest_admin_session';
function storage() {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) };
}
function tab(shared, legacy = storage()) {
  const listeners = {};
  const location = { pathname: '/', replace(value) { this.redirect = value; }, reload() { this.reloaded = true; } };
  const window = { addEventListener: (name, fn) => listeners[name] = fn };
  vm.runInNewContext(source, { window, location, localStorage: shared, sessionStorage: legacy,
    document: { documentElement: { dataset: {} }, addEventListener() {} }, console });
  return { auth: window.SkyKefAdminAuth, location, listeners };
}
const shared = storage();
const first = tab(shared);
first.auth.createSession('Admin User', 'admin');
const second = tab(shared);
assert.equal(second.auth.getSession().username, 'Admin User');
assert.equal(second.auth.isAdmin(), true);
first.auth.createJumperSession({ key: 42, Name: 'Test', Surname: 'Jumper' });
const third = tab(shared);
assert.equal(third.auth.getSession().jumperKey, '42');
assert.equal(third.auth.getSession().role, 'jumper');
first.auth.logout();
assert.equal(tab(shared).auth.getSession(), null);
second.listeners.storage({ key });
assert.equal(second.location.reloaded, true);
const legacy = storage();
legacy.setItem(key, JSON.stringify({ username: 'Existing', role: 'manifest' }));
const migrated = tab(shared, legacy);
assert.equal(migrated.auth.getSession().role, 'admin');
assert.equal(legacy.getItem(key), null);
assert.equal(tab(shared).auth.getSession().username, 'Existing');
shared.removeItem(key);
migrated.listeners.storage({ key: null });
assert.equal(migrated.location.reloaded, true);
assert.equal(migrated.auth.getSession(), null);
console.log('Auth session persistence, migration, and cross-tab logout passed');
