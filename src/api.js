// The only file that talks to the backend. Mock data lives at the bottom.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MOCK = import.meta.env.VITE_USE_MOCKS !== 'false';
const FRIENDLY = 'Something went wrong. Please try again.';

export const session = {
  get: () => JSON.parse(localStorage.getItem('ax_user') || 'null'),
  set: (u) => localStorage.setItem('ax_user', JSON.stringify(u)),
  clear: () => localStorage.removeItem('ax_user'),
};

async function call(method, path, body, mock) {
  if (MOCK) return mock;
  const u = session.get();
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(u?.token ? { Authorization: `Bearer ${u.token}` } : {}) },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  }).catch(() => { throw new Error('Cannot reach the server. Check your connection.'); });
  if (res.status === 401) { session.clear(); location.reload(); }
  if (!res.ok) throw new Error(FRIENDLY);
  return res.json();
}

export const api = {
  login: (email, password) => call('POST', '/auth/login', { email, password }, mockLogin(email)),
  claims: () => call('GET', '/claims', null, MOCKS.map(({ id, product, category, serial, status, decision }) => ({ id, product, category, serial, status, decision }))),
  claim: (id) => call('GET', `/claims/${id}`, null, MOCKS.find((c) => c.id === id)),
  submitClaim: async (fields, files) => {
    const c = await call('POST', '/claims', fields, { id: 'AX-1003' });
    if (!MOCK) for (const f of files) { const fd = new FormData(); fd.append('file', f); fd.append('claim_id', c.id); await call('POST', '/documents/upload', fd); }
    return c;
  },
  evaluate: (id) => call('POST', `/claims/${id}/evaluate`, null, { cardUrl: null }),
  tmResult: (id, tm) => call('POST', `/claims/${id}/tm-result`, { tm }, MOCKS.find((c) => c.id === id)),
  reviewQueue: () => call('GET', '/review/queue', null, MOCKS.filter((c) => c.status === 'Manual Review')),
  reviewDecision: (id, d) => call('POST', `/review/${id}/decision`, d, { ok: true }),
  dashboard: () => call('GET', '/admin/dashboard', null, { total: 3, valid: 1, invalid: 1, manual: 1, pending: 1, duplicates: 0, disagreements: 1, avgConf: 0.79 }),
};

function mockLogin(email) {
  const role = { customer: 'customer', employee: 'service_employee', reviewer: 'reviewer', admin: 'admin' }[email.split('@')[0]] || 'customer';
  return { token: 'mock', user: { email, role } };
}

// Mock claims show the response shape the Flask API should return from /tm-result.
const rules = (a) => a.map(([name, passed, reason]) => ({ name, passed, reason }));
const MOCKS = [
  { id: 'AX-1001', product: 'Washing machine', category: 'Appliance', serial: 'WM-1001', status: 'Approved', decision: 'valid',
    python: { cls: 'valid', conf: { valid: 0.91, invalid: 0.05, manual: 0.04 }, version: 'py-1.0' },
    tm: { cls: 'valid', conf: { valid: 0.87, invalid: 0.06, manual: 0.07 }, version: 'tm-1.0' },
    comparison: { match: true, diff: 0.04, status: 'Strong Match' },
    rules: rules([['Warranty active', true, '14 months left'], ['Proof of purchase', true, 'Receipt found'], ['Serial number match', true, 'All sources agree']]),
    contradictions: [], missing: [], duplicates: [], explanation: { for: ['Both models agree', 'All rules passed'], against: [], needed: [] } },
  { id: 'AX-1002', product: 'Laptop', category: 'Electronics', serial: 'LT-1002', status: 'Rejected', decision: 'invalid',
    python: { cls: 'invalid', conf: { valid: 0.07, invalid: 0.88, manual: 0.05 }, version: 'py-1.0' },
    tm: { cls: 'invalid', conf: { valid: 0.1, invalid: 0.79, manual: 0.11 }, version: 'tm-1.0' },
    comparison: { match: true, diff: 0.09, status: 'Acceptable Match' },
    rules: rules([['Warranty active', false, 'Expired 41 days ago'], ['Excluded damage', false, 'Liquid damage reported']]),
    contradictions: [], missing: [], duplicates: [], explanation: { for: ['Warranty expired', 'Excluded damage'], against: [], needed: [] } },
  { id: 'AX-1003', product: 'Phone', category: 'Electronics', serial: 'PH-1003', status: 'Manual Review', decision: 'manual', reason: 'Model disagreement',
    python: { cls: 'valid', conf: { valid: 0.61, invalid: 0.24, manual: 0.15 }, version: 'py-1.0' },
    tm: { cls: 'manual', conf: { valid: 0.22, invalid: 0.2, manual: 0.58 }, version: 'tm-1.0' },
    comparison: { match: false, diff: 0.03, status: 'Model Disagreement' },
    rules: rules([['Warranty active', true, 'Ends in 6 days'], ['Mandatory documents', false, 'Serial number photo missing']]),
    contradictions: ['Fault date is after the claim submission date'], missing: ['Serial number photo'], duplicates: [],
    explanation: { for: ['Warranty still active'], against: ['Models disagree', 'Missing document'], needed: ['Serial number photo'] } },
];
