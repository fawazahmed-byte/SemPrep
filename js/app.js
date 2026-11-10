/* =====================================================================
   SemPrep — core: config, state, helpers, routing, auth, shell, map
   ===================================================================== */
const CFG = window.SEMPREP_CONFIG || {};
const DOMAIN = (CFG.COLLEGE_DOMAIN || 'qiscet.edu.in').toLowerCase();
const ADMIN_EMAIL = (CFG.ADMIN_EMAIL || 'syed.fawazahmed789@gmail.com').toLowerCase();
const QUIZ_SIZE = CFG.QUIZ_SIZE || 25;
const QUIZ_MINUTES = CFG.QUIZ_MINUTES || 15;
const SUBJECTS = [
  { id: 'ml', code: 'ML', name: 'Machine Learning' },
  { id: 'flat', code: 'FLAT', name: 'Formal Languages and Automata Theory' },
  { id: 'ai', code: 'AI', name: 'Artificial Intelligence' },
  { id: 'cnp', code: 'CNP', name: 'Computer Networks and Protocols' },
  { id: 'edvc', code: 'EDVC', name: 'Entrepreneurship Development and Venture Creation' }
];
const SUBJ = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));
const SECTION_LABEL = { college: 'College material', special: 'Special material', mid_answers: 'Mid answers', mid_bits: 'Mid bits' };

const sb = (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { flowType: 'implicit', persistSession: true, detectSessionInUrl: true } })
  : null;

if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const S = {
  session: null, profile: null, festiveOffered: true,
  units: [], materials: [], reading: {}, progress: {}, myRank: null,
  cleanup: null, lastResult: null, authNotice: null, recovery: false
};
const VIEWS = {};
const PUBLIC = new Set(['landing', 'login', 'signup', 'forgot', 'newpass', 'inbox']);

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, bad = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (bad ? ' bad' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), bad ? 5200 : 3200);
}
function errMsg(e) { return (e && (e.message || e.error_description)) || 'Something went wrong. Try again.'; }
// Non-blocking confirm: first tap arms the button, second tap within 3 s runs fn
function confirmTap(btn, fn, label = 'Tap again to confirm') {
  if (btn.dataset.armed) { delete btn.dataset.armed; clearTimeout(btn._t); btn.textContent = btn.dataset.orig; fn(); return; }
  btn.dataset.armed = '1'; btn.dataset.orig = btn.textContent; btn.textContent = label;
  btn._t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = btn.dataset.orig; }, 3000);
}
function octoSVG(cls = 'octo', plain = !isDiwali()) {
  return `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true">${plain ? OCTO_PLAIN : OCTO}</svg>`;
}
function logoHTML(href = '#landing') {
  return `<a class="logo" href="${href}" aria-label="SemPrep home">${octoSVG('')}<span>SemPrep</span></a>`;
}
function isAdmin() { return S.profile?.role === 'admin'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''; }
function fmtTime(d) { return d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''; }
function needSb() { if (!sb) { toast('Supabase is not connected yet (js/config.js).', true); return false; } return true; }
function unitLabel(u) { return u?.title ? `Unit ${u.unit_no} · ${u.title}` : `Unit ${u?.unit_no}`; }

/* ---------- Diwali mode ---------- */
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
function diwaliPref() {
  if (S.profile) return S.profile.diwali_mode !== false;
  return lsGet('semprep_diwali') !== 'off';
}
function isDiwali() { return S.festiveOffered && diwaliPref(); }
function applyTheme() { document.body.classList.toggle('diwali', isDiwali()); }
function switchHTML(compact = false) {
  if (!S.festiveOffered) return '';
  const on = isDiwali();
  return `<button class="switch" role="switch" aria-checked="${on}" data-act="diwali" aria-label="Diwali mode"><span class="track"></span><span class="lbl">${compact ? '' : 'Diwali mode'}</span></button>`;
}
async function toggleDiwali() {
  const next = !isDiwali();
  if (S.profile) {
    S.profile.diwali_mode = next;
    if (sb) sb.from('profiles').update({ diwali_mode: next }).eq('id', S.profile.id).then(({ error }) => error && toast('Could not save Diwali mode.', true));
  } else lsSet('semprep_diwali', next ? 'on' : 'off');
  applyTheme();
  route();
}

/* ---------- data ---------- */
async function loadSettings() {
  if (!sb) return;
  const { data } = await sb.from('app_settings').select('key,value');
  const f = (data || []).find(r => r.key === 'festive_offered');
  S.festiveOffered = f ? f.value !== false : true;
}
async function loadCore() {
  const uid = S.session.user.id;
  const [prof, units, mats, reading] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('units').select('id,subject_id,unit_no,title,is_visible').order('unit_no'),
    sb.from('materials').select('*').order('sort_order').order('created_at'),
    sb.from('reading_progress').select('material_id,pages_viewed,total_pages').eq('user_id', uid)
  ]);
  S.profile = prof.data || null;
  S.units = units.data || [];
  S.materials = mats.data || [];
  S.reading = Object.fromEntries((reading.data || []).map(r => [r.material_id, r]));
  await refreshProgress();
}
async function refreshProgress() {
  if (!S.session) return;
  const { data } = await sb.rpc('unit_progress', { p_user: S.session.user.id });
  S.progress = Object.fromEntries((data || []).map(r => [r.unit_id, r]));
}
async function loadRank() {
  const { data } = await sb.rpc('get_leaderboard', { p_subject: null });
  const i = (data || []).findIndex(r => r.is_me);
  const me = (data || [])[i];
  S.myRank = me && me.points > 0 ? i + 1 : null;
}
function visibleMats(filter) { return S.materials.filter(m => m.is_visible && Object.entries(filter).every(([k, v]) => m[k] === v)); }
function unitsOf(sid) { return S.units.filter(u => u.subject_id === sid && u.is_visible).sort((a, b) => a.unit_no - b.unit_no); }
function unitById(id) { return S.units.find(u => u.id === Number(id)); }
function matPct(m) {
  const r = S.reading[m.id]; const n = Math.max(m.page_count || 0, 1);
  return r ? Math.min(100, Math.floor(Math.min(r.pages_viewed.length, n) * 100 / n)) : 0;
}
function unitState(u) {
  const p = S.progress[u.id] || {};
  const pct = p.read_pct || 0;
  return { pct, best: p.best ?? null, attempts: p.attempts || 0, has: !!p.has_materials, state: pct >= 100 ? 'done' : pct > 0 ? 'part' : 'none' };
}
function unitsReadCount() { return S.units.filter(u => u.is_visible && unitState(u).state === 'done').length; }
function nextUpUnit() {
  const all = SUBJECTS.flatMap(s => unitsOf(s.id));
  return all.find(u => unitState(u).state === 'part')
    || all.find(u => unitState(u).has && unitState(u).state !== 'done')
    || all.find(u => unitState(u).state !== 'done') || all[0];
}

/* ---------- syllabus map ---------- */
// rows: [{sid, stops:[{state:'none'|'part'|'done', best, unitId, next}]}]
function mapHTML(rows, { clickable = false } = {}) {
  return `<div class="map">${rows.map(r => {
    const s = SUBJ[r.sid];
    let last = -1; r.stops.forEach((st, i) => { if (st.state === 'done') last = i; });
    const fill = last < 0 ? 0 : last * 25;
    const stops = r.stops.map((st, i) => {
      const lbl = `${s.code} Unit ${i + 1}: ${st.state === 'done' ? 'read' : st.state === 'part' ? 'reading' : 'not started'}${st.best != null ? ', best quiz ' + st.best + '%' : ''}`;
      const tag = clickable ? 'button' : 'span';
      const attrs = clickable ? `type="button" data-go="#subject/${r.sid}/${i + 1}" aria-label="${esc(lbl)}"` : `role="img" aria-label="${esc(lbl)}"`;
      return `<${tag} class="stop ${st.state}${st.next ? ' next' : ''}" style="left:${i * 25}%" ${attrs}><span class="flame"></span>${st.best != null ? `<span class="pct">${st.best}%</span>` : ''}</${tag}>`;
    }).join('');
    const code = clickable ? `<button class="code" style="color:var(--c)" data-go="#subject/${r.sid}/1">${s.code}</button>` : `<span class="code" style="color:var(--c)">${s.code}</span>`;
    return `<div class="map-row" style="--c:var(--s-${r.sid})">${code}<div class="track"><span class="line"></span><span class="fill" style="width:${fill}%"></span>${stops}</div></div>`;
  }).join('')}</div>`;
}
function legendHTML() {
  const d = isDiwali();
  return `<div class="legend"><span><i></i>${d ? 'Not lit yet' : 'Not started'}</span><span><i class="part"></i>${d ? 'Lighting up' : 'Reading'}</span><span><i class="done"></i>${d ? 'Lit (read)' : 'Read'}</span><span><i class="next"></i>Next up</span><span>% = best quiz score</span></div>`;
}
const EXAMPLE_MAP = [
  { sid: 'ml', stops: ['done', 'done', 'part', 'none', 'none'], best: [84, 72] },
  { sid: 'flat', stops: ['done', 'part', 'none', 'none', 'none'], best: [68] },
  { sid: 'ai', stops: ['done', 'done', 'done', 'none', 'none'], best: [90, 76, 80] },
  { sid: 'cnp', stops: ['part', 'none', 'none', 'none', 'none'], best: [] },
  { sid: 'edvc', stops: ['done', 'none', 'none', 'none', 'none'], best: [88] }
].map(r => ({ sid: r.sid, stops: r.stops.map((st, i) => ({ state: st, best: r.best[i] ?? null, next: r.sid === 'ml' && i === 2 })) }));
function myMapRows() {
  const nu = nextUpUnit();
  return SUBJECTS.map(s => ({ sid: s.id, stops: [1, 2, 3, 4, 5].map(n => {
    const u = S.units.find(x => x.subject_id === s.id && x.unit_no === n);
    if (!u) return { state: 'none', best: null };
    const st = unitState(u);
    return { state: st.state, best: st.best, next: nu && nu.id === u.id };
  }) }));
}
const RANGOLI = `<svg class="rangoli" viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke-width="3">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path transform="rotate(${a} 100 100)" d="M100 100 C 85 70, 92 40, 100 22 C 108 40, 115 70, 100 100Z" stroke="#FFC22E"/><circle transform="rotate(${a + 22.5} 100 100)" cx="100" cy="36" r="6" stroke="#E8407A"/>`).join('')}<circle cx="100" cy="100" r="18" stroke="#FF8A1F"/><circle cx="100" cy="100" r="88" stroke="#FFC22E" stroke-dasharray="4 10"/></g></svg>`;

/* ---------- routing ---------- */
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (/(^|&)(access_token|error|type)=/.test(h)) return { name: 'auth-callback', args: [] };
  const [name, ...args] = h.split('/').map(decodeURIComponent);
  return { name: name || '', args };
}
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
let routeSeq = 0;
async function route() {
  const seq = ++routeSeq;
  if (S.cleanup) { try { S.cleanup(); } catch {} S.cleanup = null; }
  let { name, args } = parseHash();
  if (name === 'auth-callback') return;
  applyTheme();
  if (S.recovery && name !== 'newpass') { name = 'newpass'; history.replaceState(null, '', '#newpass'); }
  if (!S.session) {
    if (!PUBLIC.has(name)) { name = name && VIEWS[name] ? 'login' : 'landing'; history.replaceState(null, '', '#' + name); }
  } else if (['landing', 'login', 'signup', 'forgot', 'inbox', ''].includes(name) || !VIEWS[name]) {
    name = 'home'; history.replaceState(null, '', '#home');
  }
  if (name === 'admin' && !isAdmin()) { name = 'home'; history.replaceState(null, '', '#home'); }
  const view = VIEWS[name];
  window.scrollTo(0, 0);
  try { await view(args, () => seq === routeSeq); }
  catch (e) { console.error(e); toast(errMsg(e), true); }
}

/* ---------- app shell ---------- */
const NAV = [
  { id: 'home', label: 'Home', short: 'Home', icon: 'home' },
  { id: 'perf', label: 'My progress', short: 'Progress', icon: 'progress' },
  { id: 'leaderboard', label: 'Leaderboard', short: 'Ranks', icon: 'trophy' },
  { id: 'mid2', label: 'Mid answers', short: 'Mid', icon: 'book' },
  { id: 'feedback', label: 'Feedback', short: 'Feedback', icon: 'chat' }
];
function shell(active, inner) {
  const p = S.profile || {};
  const nav = NAV.concat(isAdmin() ? [{ id: 'admin', label: 'Admin', short: 'Admin', icon: 'shield' }] : []);
  const subj = SUBJECTS.map(s => {
    const us = unitsOf(s.id); const read = us.filter(u => unitState(u).state === 'done').length;
    return `<a class="side-subj" href="#subject/${s.id}/1" style="--c:var(--s-${s.id})"><div class="top"><b style="color:var(--c)">${s.code}</b><span>${read}/5 read</span></div><div class="segs">${[1, 2, 3, 4, 5].map(n => { const u = us.find(x => x.unit_no === n); const st = u ? unitState(u).state : 'none'; return `<i class="${st === 'done' ? 'on' : st === 'part' ? 'half' : ''}"></i>`; }).join('')}</div></a>`;
  }).join('');
  const tabs = (isAdmin() ? nav.filter(n => n.id !== 'feedback') : nav).slice(0, 5);
  const meta = [p.batch, p.branch].filter(Boolean).join(' · ') || (isAdmin() ? 'Admin' : '');
  document.getElementById('app').innerHTML = `
  <div class="shell">
    <aside class="side" aria-label="Main">
      ${logoHTML('#home')}
      <nav class="nav">${nav.map(n => `<a href="#${n.id}" class="${n.id === active ? 'on' : ''}" ${n.id === active ? 'aria-current="page"' : ''}>${icon(n.icon)}${n.label}</a>`).join('')}</nav>
      <div><h4>Your subjects</h4>${subj}</div>
      <div class="user">
        <div class="who"><div class="avatar">${esc((p.username || '?')[0].toUpperCase())}</div><div><b>${esc(p.username)}</b><small>${esc(meta)}</small></div></div>
        ${switchHTML()}
        <button class="logout" data-act="logout">${icon('logout')}Log out</button>
      </div>
    </aside>
    <header class="mtop">${logoHTML('#home')}<span class="spacer"></span>${switchHTML(true)}<button class="logout" data-act="logout" aria-label="Log out">${icon('logout')}</button></header>
    <div class="main">
      <div class="toran" aria-hidden="true"></div>
      <main class="content" id="content">${inner || '<div class="loading"><div class="spinner" aria-label="Loading"></div></div>'}</main>
    </div>
    <nav class="tabbar" aria-label="Main">${tabs.map(n => `<a href="#${n.id}" class="${n.id === active ? 'on' : ''}">${icon(n.icon, 22)}${n.short}</a>`).join('')}</nav>
  </div>`;
  return $('#content');
}

/* ---------- auth ---------- */
const USERNAME_RE = /^[A-Za-z0-9_.]{3,20}$/;
function isCollegeEmail(e) { e = e.trim().toLowerCase(); return e.endsWith('@' + DOMAIN) && e.split('@')[0].length > 0; }
function redirectURL() { return location.origin + location.pathname; }

function authLayout(formHTML) {
  const d = isDiwali();
  document.getElementById('app').innerHTML = `
  <div class="auth">
    <section class="auth-side">
      ${logoHTML('#landing')}
      ${octoSVG('octo big-octo')}
      <h2>${d ? 'Light up every unit of 3‑1 this Diwali.' : 'Every unit of 3‑1, one stop at a time.'}</h2>
      <div class="mapwrap"><b>An example syllabus map</b>${mapHTML(EXAMPLE_MAP)}</div>
      <p>Read a unit, take its quiz, and watch your map ${d ? 'light up' : 'fill up'} before the exams.</p>
    </section>
    <section class="auth-main">
      <div class="row"><a class="back" href="#landing">${icon('back', 18)}Back to home</a><span class="spacer"></span>${switchHTML()}</div>
      <div class="auth-form">${formHTML}</div>
    </section>
  </div>`;
}
function showFormError(form, msg, extraHTML = '') {
  let box = $('.form-error', form);
  if (!box) { box = document.createElement('div'); box.className = 'form-error'; box.setAttribute('role', 'alert'); form.prepend(box); }
  box.innerHTML = esc(msg) + extraHTML;
}
function setBusy(btn, busy, text) {
  if (busy) { btn.dataset.orig = btn.textContent; btn.textContent = text || 'Please wait…'; btn.disabled = true; }
  else { btn.textContent = btn.dataset.orig || btn.textContent; btn.disabled = false; }
}

VIEWS.signup = () => {
  authLayout(`
    <h1>Create your account</h1>
    <p class="sub">Use your <b>@${DOMAIN}</b> email. We'll send a link to verify it.</p>
    <form id="f" novalidate>
      <label class="field"><span>Username</span><input class="input" name="username" autocomplete="username" required maxlength="20" placeholder="e.g. fawwaz_05"><small>3–20 letters, numbers, _ or .</small></label>
      <label class="field"><span>College email</span><input class="input" name="email" type="email" autocomplete="email" required placeholder="24491A055E@${DOMAIN}"></label>
      <label class="field"><span>Password</span><input class="input" name="password" type="password" autocomplete="new-password" required minlength="8"><small>At least 8 characters</small></label>
      <button class="btn block" type="submit">Create account</button>
    </form>
    <p class="alt">Already have an account? <a href="#login">Log in</a></p>`);
  const f = $('#f');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const username = f.username.value.trim(), email = f.email.value.trim().toLowerCase(), password = f.password.value;
    if (!USERNAME_RE.test(username)) return showFormError(f, 'Username must be 3–20 letters, numbers, _ or .');
    if (!isCollegeEmail(email)) return showFormError(f, `Please use your college email (@${DOMAIN}).`);
    if (password.length < 8) return showFormError(f, 'Password must be at least 8 characters.');
    if (!needSb()) return;
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Creating account…');
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: redirectURL() } });
    setBusy(btn, false);
    if (error) {
      f.password.value = '';
      const m = /database error|college email/i.test(error.message) ? `Please use your college email (@${DOMAIN}).`
        : /already registered|exists/i.test(error.message) ? 'An account with this email already exists. Log in instead.'
        : /rate limit/i.test(error.message) ? 'Too many emails sent just now. Wait a few minutes and try again.'
        : error.message;
      return showFormError(f, m);
    }
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      f.password.value = '';
      return showFormError(f, 'An account with this email already exists. Log in instead.');
    }
    S.pendingEmail = email;
    if (data.session) { return; } // auto-confirm projects: auth listener handles it
    go('#inbox');
  });
};

VIEWS.inbox = () => {
  const email = S.pendingEmail || '';
  authLayout(`<div class="inbox">
    ${octoSVG('octo')}
    <h1>Check your college inbox</h1>
    <p class="sub">We sent a verification link${email ? ` to <b>${esc(email)}</b>` : ''}. Open it to finish creating your account.</p>
    <p class="muted">Not there? Look in Spam.</p>
    <div class="stack-sm" style="margin-top:22px">
      <button class="btn block" id="resend" ${email ? '' : 'disabled'}>Send the link again</button>
      <a class="btn ghost block" href="#login">Go to log in</a>
    </div></div>`);
  $('#resend').onclick = e => resendLink(email, e.currentTarget);
};
async function resendLink(email, btn) {
  if (!email || !needSb()) return;
  setBusy(btn, true, 'Sending…');
  const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectURL() } });
  setBusy(btn, false);
  error ? toast(/rate/i.test(error.message) ? 'Please wait a minute before asking again.' : error.message, true) : toast('Link sent again. Check your inbox and Spam.');
}

VIEWS.login = () => {
  const notice = S.authNotice; S.authNotice = null;
  authLayout(`
    <h1>Welcome back</h1>
    <p class="sub">Log in with your college email.</p>
    <form id="f" novalidate>
      ${notice ? `<div class="${notice.bad ? 'form-error' : 'form-ok'}" role="alert">${esc(notice.msg)}</div>` : ''}
      <label class="field"><span>College email</span><input class="input" name="email" type="email" autocomplete="email" required value="${esc(S.pendingEmail || '')}"></label>
      <label class="field"><span>Password</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn block" type="submit">Log in</button>
      <p class="small" style="text-align:right"><a href="#forgot">Forgot password?</a></p>
    </form>
    <p class="alt">New here? <a href="#signup">Sign up with your college email</a></p>`);
  const f = $('#f');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const email = f.email.value.trim().toLowerCase(), password = f.password.value;
    if (!email || !password) return showFormError(f, 'Enter your email and password.');
    if (!needSb()) return;
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Logging in…');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(btn, false);
    if (error) {
      f.password.value = '';
      if (/not confirmed/i.test(error.message)) {
        showFormError(f, 'Verify your email first — check your college inbox. ', '<button type="button" class="linkbtn" id="rs">Send the link again</button>');
        $('#rs').onclick = ev => resendLink(email, ev.currentTarget);
      } else showFormError(f, /invalid/i.test(error.message) ? 'Wrong email or password.' : error.message);
    }
  });
};

VIEWS.forgot = () => {
  authLayout(`
    <h1>Reset your password</h1>
    <p class="sub">Enter your email and we'll send a link to set a new password.</p>
    <form id="f" novalidate>
      <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" required value="${esc(S.pendingEmail || '')}"></label>
      <button class="btn block" type="submit">Send reset link</button>
    </form>
    <p class="alt"><a href="#login">Back to log in</a></p>`);
  const f = $('#f');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const email = f.email.value.trim().toLowerCase();
    if (!email) return showFormError(f, 'Enter your email.');
    if (!needSb()) return;
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Sending…');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectURL() });
    setBusy(btn, false);
    if (error) return showFormError(f, /rate/i.test(error.message) ? 'Please wait a minute before asking again.' : error.message);
    f.innerHTML = `<div class="form-ok" role="status">If an account exists for ${esc(email)}, a reset link is on its way. Check Spam too.</div>`;
  });
};

VIEWS.newpass = () => {
  authLayout(`
    <h1>Set a new password</h1>
    <p class="sub">Choose a new password for your SemPrep account.</p>
    <form id="f" novalidate>
      <label class="field"><span>New password</span><input class="input" name="p1" type="password" autocomplete="new-password" minlength="8" required><small>At least 8 characters</small></label>
      <label class="field"><span>Repeat new password</span><input class="input" name="p2" type="password" autocomplete="new-password" required></label>
      <button class="btn block" type="submit">Save new password</button>
    </form>`);
  const f = $('#f');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (!S.session) return showFormError(f, 'This reset link has expired. Ask for a new one from "Forgot password".');
    if (f.p1.value.length < 8) return showFormError(f, 'Password must be at least 8 characters.');
    if (f.p1.value !== f.p2.value) return showFormError(f, "The two passwords don't match.");
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Saving…');
    const { error } = await sb.auth.updateUser({ password: f.p1.value });
    setBusy(btn, false);
    if (error) return showFormError(f, error.message);
    S.recovery = false; toast('Password updated.'); go('#home');
  });
};

async function logout() {
  if (sb) await sb.auth.signOut();
  S.session = null; S.profile = null; S.progress = {}; S.reading = {};
  go('#landing');
}

/* ---------- global events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-go]');
  if (!t) return;
  if (t.dataset.go) { e.preventDefault(); go(t.dataset.go); return; }
  if (t.dataset.act === 'diwali') toggleDiwali();
  if (t.dataset.act === 'logout') logout();
});
window.addEventListener('hashchange', route);

/* ---------- boot ---------- */
async function boot() {
  const hashErr = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (hashErr.get('error')) {
    S.authNotice = { bad: true, msg: /expired|invalid/i.test(hashErr.get('error_description') || '') ? 'That link has expired. Log in, or ask for a new link.' : (hashErr.get('error_description') || 'That link did not work.').replace(/\+/g, ' ') };
    history.replaceState(null, '', '#login');
  }
  if (!sb) { await route(); return; }
  await loadSettings();
  const isRecoveryLink = /type=recovery/.test(location.hash);
  const { data } = await sb.auth.getSession();
  S.session = data.session;
  if (isRecoveryLink) S.recovery = true;
  if (S.session) { await loadCore(); if (/access_token/.test(location.hash)) history.replaceState(null, '', S.recovery ? '#newpass' : '#home'); }
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') { S.recovery = true; S.session = session; history.replaceState(null, '', '#newpass'); route(); return; }
    if (event === 'SIGNED_IN' && !S.session && session) {
      S.session = session; await loadSettings(); await loadCore();
      if (/access_token/.test(location.hash)) history.replaceState(null, '', S.recovery ? '#newpass' : '#home');
      route();
    } else if (event === 'SIGNED_OUT') { S.session = null; S.profile = null; }
    else if (session) S.session = session;
  });
  await route();
}
document.addEventListener('DOMContentLoaded', boot);
