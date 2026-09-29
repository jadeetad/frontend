import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import { api, session } from './api';
import { FEATURES } from './features';
import { classify } from './tm';

const CLASSES = { valid: 'Valid Claim', invalid: 'Invalid Claim', manual: 'Manual Review' };
const DECISION = { valid: ['Likely Valid', 'ok'], invalid: ['Likely Invalid', 'bad'], manual: ['Manual Review Required', 'warn'] };
const STEPS = ['Draft', 'Submitted', 'Under Evaluation', 'Additional Information Required', 'Manual Review', 'Approved', 'Rejected', 'Closed'];
const OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function useLoad(fn, deps) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { setData(null); fn().then(setData).catch((e) => setErr(e.message)); }, deps); // eslint-disable-line
  return [data, err];
}
const pct = (n) => `${Math.round(n * 100)}%`;
const Badge = ({ d }) => (d ? <span className={`badge ${DECISION[d][1]}`}>{DECISION[d][0]}</span> : null);

function Login({ onLogin }) {
  const [email, setEmail] = useState('customer@demo.com');
  const [pw, setPw] = useState('demo');
  const [err, setErr] = useState('');
  const go = async (e) => {
    e.preventDefault();
    try { const r = await api.login(email, pw); onLogin({ ...r.user, token: r.token }); } catch (x) { setErr(x.message); }
  };
  return (
    <main className="login">
      <form onSubmit={go} className="panel">
        <h1>AssureX Claim Engine</h1>
        <p>Sign in to check and track warranty claims.</p>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        {err && <p className="err">{err}</p>}
        <button>Sign in</button>
        <small>Demo mode: customer@, employee@, reviewer@ or admin@ demo.com</small>
      </form>
    </main>
  );
}

function Shell({ user, onLogout, children }) {
  const visible = FEATURES.filter((f) => !f.hidden && f.roles.includes(user.role));
  const groups = [...new Set(visible.map((f) => f.group))];
  return (
    <div className="shell">
      <nav aria-label="Main">
        <strong className="brand">AssureX</strong>
        {groups.map((g) => (
          <div key={g}>
            <h2>{g}</h2>
            {visible.filter((f) => f.group === g).map((f) => <NavLink key={f.id} to={f.route} end>{f.label}</NavLink>)}
          </div>
        ))}
        <button className="link" onClick={onLogout}>Sign out ({user.role.replace('_', ' ')})</button>
      </nav>
      <main>{children}</main>
    </div>
  );
}

function Claims() {
  const [q, setQ] = useState('');
  const [rows, err] = useLoad(() => api.claims(), []);
  const list = (rows || []).filter((c) => `${c.id} ${c.serial} ${c.category}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1>All claims</h1>
      <input className="search" placeholder="Search by claim ID, serial number or category" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="err">{err}</p>}
      {rows && !list.length && <p>No claims match. Try a different search, or create a new claim.</p>}
      {list.length > 0 && (
        <table>
          <thead><tr><th>Claim</th><th>Product</th><th>Serial</th><th>Status</th><th>AI result</th></tr></thead>
          <tbody>{list.map((c) => (
            <tr key={c.id}>
              <td><Link to={`/claims/${c.id}/result`}>{c.id}</Link></td><td>{c.product}</td><td>{c.serial}</td>
              <td><Link to={`/claims/${c.id}/status`}>{c.status}</Link></td><td><Badge d={c.decision} /></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}

function NewClaim() {
  const nav = useNavigate();
  const [f, setF] = useState({ product: '', category: 'Appliance', serial: '', purchased: '', faultDate: '', damage: 'Manufacturing defect', desc: '' });
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pick = (e) => {
    const all = [...e.target.files];
    const bad = all.find((x) => !OK_TYPES.includes(x.type) || x.size > 10e6);
    if (bad) return setErr(`${bad.name} can't be uploaded. Use a PDF, JPG or PNG under 10 MB.`);
    setErr(''); setFiles(all);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!f.product || !f.serial || !f.purchased || !f.faultDate) return setErr('Enter the product, serial number, purchase date and fault date.');
    if (f.faultDate < f.purchased) return setErr('The fault date is before the purchase date. Check both dates.');
    try { const c = await api.submitClaim(f, files); nav(`/claims/${c.id}/result`); } catch (x) { setErr(x.message); }
  };
  return (
    <form onSubmit={submit} className="panel form">
      <h1>New claim</h1>
      <label>Product<input value={f.product} onChange={set('product')} /></label>
      <label>Category<select value={f.category} onChange={set('category')}><option>Appliance</option><option>Electronics</option><option>Furniture</option></select></label>
      <label>Serial number<input value={f.serial} onChange={set('serial')} /></label>
      <label>Purchase date<input type="date" value={f.purchased} onChange={set('purchased')} /></label>
      <label>Fault date<input type="date" value={f.faultDate} onChange={set('faultDate')} /></label>
      <label>Damage type<select value={f.damage} onChange={set('damage')}><option>Manufacturing defect</option><option>Accidental damage</option><option>Liquid damage</option><option>Wear and tear</option></select></label>
      <label>What went wrong<textarea rows="3" value={f.desc} onChange={set('desc')} /></label>
      <label>Receipt, warranty card and photos<input type="file" multiple onChange={pick} /></label>
      {files.length > 0 && <small>{files.length} file(s) ready to upload</small>}
      {err && <p className="err">{err}</p>}
      <button>Submit claim</button>
    </form>
  );
}

function Bars({ m }) {
  if (!m) return <p className="muted">Model unavailable. The result below uses the other checks only.</p>;
  return (
    <>
      <p className="pick">{CLASSES[m.cls]}</p>
      {Object.keys(CLASSES).map((k) => (
        <div className="bar" key={k}>
          <span>{CLASSES[k]}</span>
          <i><b className={k === m.cls ? 'top' : ''} style={{ width: pct(m.conf[k]) }} /></i>
          <em>{pct(m.conf[k])}</em>
        </div>
      ))}
      <small>Version {m.version}</small>
    </>
  );
}

function Result() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('rules');
  useEffect(() => {
    (async () => {
      try {
        const ev = await api.evaluate(id); // Python result + Claim Summary Card URL
        const tm = await classify(ev.cardUrl); // browser-side Teachable Machine
        setR({ ...ev, ...(await api.tmResult(id, tm)) }); // backend compares and decides
      } catch (x) { setErr(x.message); }
    })();
  }, [id]);
  if (err) return <p className="err">{err}</p>;
  if (!r) return <p>Analysing claim…</p>;
  const [label, tone] = DECISION[r.decision];
  return (
    <>
      <header className={`verdict ${tone}`}><div><small>Claim {r.id}</small><h1>{label}</h1></div><Link to={`/claims/${id}/status`}>Track status</Link></header>
      {r.cardUrl && <img className="card" src={r.cardUrl} alt="Claim Summary Card" />}
      <section className="duel">
        <div className="panel"><h2>Python model</h2><Bars m={r.python} /></div>
        <div className="gap">
          <b>{r.comparison.match ? 'Models agree' : 'Models disagree'}</b>
          <span>Difference {pct(r.comparison.diff)}</span>
          <em>{r.comparison.status}</em>
        </div>
        <div className="panel"><h2>Google Teachable Machine</h2><Bars m={r.tm} /></div>
      </section>
      <div className="tabs" role="tablist">
        {[['rules', 'Rules'], ['issues', 'Problems found'], ['why', 'Why this decision']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="panel">
        {tab === 'rules' && <ul>{r.rules.map((x) => <li key={x.name} className={x.passed ? 'ok' : 'bad'}>{x.passed ? 'Passed' : 'Failed'}: {x.name}. {x.reason}</li>)}</ul>}
        {tab === 'issues' && (
          <>
            {[['Contradictions', r.contradictions], ['Missing documents', r.missing], ['Duplicates', r.duplicates]].map(([t, a]) => (
              <div key={t}><h3>{t}</h3>{a.length ? <ul>{a.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="muted">None found.</p>}</div>
            ))}
          </>
        )}
        {tab === 'why' && [['Supporting', r.explanation.for], ['Against', r.explanation.against], ['Evidence still needed', r.explanation.needed]].map(([t, a]) => (
          <div key={t}><h3>{t}</h3>{a.length ? <ul>{a.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="muted">Nothing.</p>}</div>
        ))}
      </div>
    </>
  );
}

function Status() {
  const { id } = useParams();
  const [c, err] = useLoad(() => api.claim(id), [id]);
  if (err) return <p className="err">{err}</p>;
  if (!c) return <p>Loading…</p>;
  const at = STEPS.indexOf(c.status);
  return (
    <>
      <h1>Claim {c.id}</h1>
      <ol className="steps">{STEPS.map((s, i) => <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''}>{s}</li>)}</ol>
      <Link to={`/claims/${id}/result`}>View AI analysis</Link>
    </>
  );
}

function ReviewItem({ c, done }) {
  const [comment, setComment] = useState('');
  const [ov, setOv] = useState(false);
  const [why, setWhy] = useState('');
  const [err, setErr] = useState('');
  const act = async (action) => {
    if (ov && !why.trim()) return setErr('Write a reason before overriding the AI result.');
    try { await api.reviewDecision(c.id, { action, comment, override: ov, reason: why }); done(c.id); } catch (x) { setErr(x.message); }
  };
  return (
    <article className="panel">
      <h3><Link to={`/claims/${c.id}/result`}>{c.id}</Link> {c.product}</h3>
      <p>Sent to review: {c.reason || 'Low confidence'}. AI result: <Badge d={c.decision} /></p>
      <textarea rows="2" placeholder="Comment" value={comment} onChange={(e) => setComment(e.target.value)} />
      <label className="inline"><input type="checkbox" checked={ov} onChange={(e) => setOv(e.target.checked)} /> Override the AI result</label>
      {ov && <input placeholder="Reason for override" value={why} onChange={(e) => setWhy(e.target.value)} />}
      {err && <p className="err">{err}</p>}
      <div className="row"><button onClick={() => act('approve')}>Approve</button><button className="alt" onClick={() => act('reject')}>Reject</button><button className="alt" onClick={() => act('request_info')}>Request information</button></div>
    </article>
  );
}

function Review() {
  const [rows, err] = useLoad(() => api.reviewQueue(), []);
  const [gone, setGone] = useState([]);
  const list = (rows || []).filter((c) => !gone.includes(c.id));
  return (
    <>
      <h1>Review queue</h1>
      {err && <p className="err">{err}</p>}
      {rows && !list.length && <p>The queue is empty. New claims that need a person will appear here.</p>}
      {list.map((c) => <ReviewItem key={c.id} c={c} done={(id) => setGone([...gone, id])} />)}
    </>
  );
}

function Admin() {
  const [d, err] = useLoad(() => api.dashboard(), []);
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p>Loading…</p>;
  const stats = [['Total claims', d.total], ['Pending', d.pending], ['Duplicate alerts', d.duplicates], ['Model disagreements', d.disagreements], ['Average confidence', pct(d.avgConf)]];
  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">{stats.map(([l, v]) => <div className="panel" key={l}><strong>{v}</strong><span>{l}</span></div>)}</div>
      <div className="panel"><h2>Outcomes</h2>
        {[['valid', 'Valid'], ['invalid', 'Invalid'], ['manual', 'Manual review']].map(([k, l]) => (
          <div className="bar" key={k}><span>{l}</span><i><b className="top" style={{ width: pct(d[k] / (d.total || 1)) }} /></i><em>{d[k]}</em></div>
        ))}
      </div>
    </>
  );
}

const Placeholder = ({ f }) => (
  <>
    <h1>{f.label}</h1>
    <p>This module is registered and waiting for its screen. It will use <code>{f.endpoint}</code>.</p>
  </>
);

const PAGES = { claims: <Claims />, new: <NewClaim />, status: <Status />, result: <Result />, review: <Review />, admin: <Admin /> };

export default function App() {
  const [user, setUser] = useState(session.get());
  if (!user) return <Login onLogin={(u) => { session.set(u); setUser(u); }} />;
  return (
    <BrowserRouter>
      <Shell user={user} onLogout={() => { session.clear(); setUser(null); }}>
        <Routes>
          {FEATURES.map((f) => (
            <Route key={f.id} path={f.route} element={f.roles.includes(user.role) ? (PAGES[f.page] || <Placeholder f={f} />) : <Navigate to="/claims" />} />
          ))}
          <Route path="*" element={<Navigate to="/claims" />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
