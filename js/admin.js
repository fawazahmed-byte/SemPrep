/* =====================================================================
   SemPrep — Admin (7 tabs). Every write is also enforced by RLS.
   ===================================================================== */
const ADMIN_TABS = [
  ['overview', 'Overview'], ['materials', 'Materials'], ['bank', 'Quiz bank'], ['mid', 'Exam material'],
  ['ann', 'Announcements'], ['fb', 'Feedback'], ['students', 'Students']
];
const A = { matSubject: 'ml', matSection: 'all', bankUnit: null, midType: 'mid_answers' };

async function reloadMaterials() {
  const [m, u] = await Promise.all([
    sb.from('materials').select('*').order('sort_order').order('created_at'),
    sb.from('units').select('id,subject_id,unit_no,title,is_visible').order('unit_no')
  ]);
  S.materials = m.data || []; S.units = u.data || [];
}
async function pdfPageCount(file) {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const n = doc.numPages; doc.destroy(); return n;
}
const MAX_PDF_MB = 50;
// Uploads with XHR (not sb.storage.upload) so slow connections show real progress instead of a frozen button.
async function uploadPDF(file, sid, section, onProgress) {
  if (!file || !/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('Choose a PDF file.');
  const mb = file.size / 1048576;
  if (mb > MAX_PDF_MB) throw new Error(`This PDF is ${mb.toFixed(1)} MB; the limit is ${MAX_PDF_MB} MB. Compress it first.`);
  const pages = await pdfPageCount(file);
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Your session expired. Log in again.');
  const path = `${sid}/${section}/${crypto.randomUUID()}.pdf`;
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${CFG.SUPABASE_URL}/storage/v1/object/materials/${path}`);
    xhr.setRequestHeader('Authorization', 'Bearer ' + session.access_token);
    xhr.setRequestHeader('apikey', CFG.SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.timeout = 20 * 60 * 1000;
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.round(e.loaded * 100 / e.total)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Storage error ${xhr.status}`;
      try { const j = JSON.parse(xhr.responseText); msg = j.message || j.error || msg; } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error('Connection dropped during upload. Check your internet and try again.'));
    xhr.ontimeout = () => reject(new Error('Upload took longer than 20 minutes. Try a smaller (compressed) PDF.'));
    xhr.send(file);
  });
  return { path, pages };
}
function progressTo(btn) {
  return p => { btn.textContent = p < 100 ? `Uploading… ${p}%` : 'Saving…'; };
}
function subjOptions(sel) { return SUBJECTS.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${s.code} · ${s.name}</option>`).join(''); }
function unitOptions(sid, sel) { return unitsOf(sid).map(u => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${esc(unitLabel(u))}</option>`).join(''); }
function hbars(obj) {
  const e = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...e.map(x => x[1]));
  return e.length ? e.map(([k, v]) => `<div class="hbar"><span>${esc(SUBJ[k]?.code || k)}</span><div class="bar"><i style="width:${v * 100 / max}%;${SUBJ[k] ? `background:var(--s-${k})` : ''}"></i></div><b>${v}</b></div>`).join('') : '<p class="muted small">No data yet.</p>';
}

VIEWS.admin = async ([tab], alive) => {
  tab = ADMIN_TABS.some(t => t[0] === tab) ? tab : 'overview';
  shell('admin', `
    <div class="page-head"><div><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Admin</h1><p>Manage everything students see. Changes are live immediately.</p></div></div>
    <div class="tabs scroll admin-tabs">${ADMIN_TABS.map(([id, l]) => `<button class="tab ${id === tab ? 'on' : ''}" data-go="#admin/${id}">${l}</button>`).join('')}</div>
    <div id="atab"><div class="loading"><div class="spinner" aria-label="Loading"></div></div></div>`);
  await ADMIN[tab]($('#atab'), alive);
};

const ADMIN = {};

/* ---------- 1. Overview ---------- */
ADMIN.overview = async (el, alive) => {
  const { data: st, error } = await sb.rpc('admin_stats');
  if (!alive()) return;
  if (error) { el.innerHTML = `<div class="form-error">${esc(error.message)}</div>`; return; }
  el.innerHTML = `
    <section class="card"><div class="row wrap"><div style="flex:1;min-width:220px"><h3>Diwali mode</h3><p class="muted small">${S.festiveOffered ? 'Students can switch Diwali mode on or off for themselves.' : 'Off for everyone. Students see the normal theme and no switch.'}</p></div>
      <div class="tabs"><button class="tab ${S.festiveOffered ? 'on' : ''}" data-fest="1">Offer to students</button><button class="tab ${!S.festiveOffered ? 'on' : ''}" data-fest="0">Off for everyone</button></div></div></section>
    ${examCardHTML()}
    <div class="grid g4" style="margin-top:18px">
      <div class="card kpi"><b>${st.verified}</b><span>Verified students</span></div>
      <div class="card kpi"><b>${st.unverified}</b><span>Waiting to verify</span></div>
      <div class="card kpi"><b>${st.active_week}</b><span>Quizzed this week</span></div>
      <div class="card kpi"><b>${st.attempts}</b><span>Quiz attempts</span></div>
      <div class="card kpi"><b>${st.avg_rating ?? '—'}</b><span>Average rating</span></div>
    </div>
    <div class="grid g2" style="margin-top:18px">
      <section class="card"><h3>Students by branch</h3><div style="margin-top:10px">${hbars(st.by_branch)}</div>
        <p class="small muted" style="margin-top:12px">By batch: ${Object.entries(st.by_batch || {}).map(([k, v]) => `${esc(k)} · <b>${v}</b>`).join(' &nbsp; ') || '—'}</p></section>
      <section class="card"><h3>Quiz attempts by subject</h3><div style="margin-top:10px">${hbars(st.by_subject)}</div></section>
    </div>`;
  $$('[data-fest]', el).forEach(b => b.onclick = async () => {
    const on = b.dataset.fest === '1';
    const { error } = await sb.from('app_settings').upsert({ key: 'festive_offered', value: on, updated_at: new Date().toISOString() });
    if (error) return toast(error.message, true);
    S.festiveOffered = on; applyTheme(); toast(on ? 'Diwali mode is offered to students.' : 'Diwali mode is off for everyone.'); route();
  });
  bindExamCard(el);
};

// datetime-local wants "YYYY-MM-DDTHH:MM" in local time
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function examCardHTML() {
  const e = S.exam || {};
  const p = examPhase();
  const status = !e.at ? 'Not set. Students see no countdown.'
    : !e.show ? 'Hidden from students.'
    : p?.phase === 'before' ? `Showing: ${Math.ceil(p.left / 86400000)} day(s) to go.`
    : p?.phase === 'during' ? 'Showing "exams are on".' : 'The exam period is over, so the countdown is hidden.';
  return `<section class="card" style="margin-top:18px"><h3>Semester exam countdown</h3>
    <p class="muted small" style="margin-top:4px">Shown at the top of every page for students. ${esc(status)}</p>
    <form id="exf" class="stack-sm" style="margin-top:12px">
      <div class="row wrap">
        <label class="field" style="flex:2;min-width:200px"><span>Name</span><input class="input" name="label" maxlength="60" value="${esc(e.label || '3-1 Semester exams')}"></label>
        <label class="field" style="flex:2;min-width:200px"><span>First exam starts</span><input class="input" type="datetime-local" name="at" required value="${toLocalInput(e.at)}"></label>
        <label class="field" style="flex:1;min-width:160px"><span>Last exam day (optional)</span><input class="input" type="date" name="end" value="${esc(e.end || '')}"></label>
      </div>
      <label class="check"><input type="checkbox" name="show" ${e.show !== false ? 'checked' : ''}> Show the countdown to students</label>
      <div class="row wrap"><button class="btn" type="submit">Save countdown</button>${e.at ? '<button class="btn ghost" type="button" id="exreset">Reset (remove countdown)</button>' : ''}</div>
    </form></section>`;
}
async function saveExam(value) {
  const { error } = await sb.from('app_settings').upsert({ key: 'exam_countdown', value, updated_at: new Date().toISOString() });
  if (error) { toast(error.message, true); return false; }
  S.exam = value; return true;
}
function bindExamCard(el) {
  const f = $('#exf', el); if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault();
    if (!f.at.value) return toast('Pick the date and time of the first exam.', true);
    const at = new Date(f.at.value);
    if (f.end.value && new Date(f.end.value + 'T23:59:59') < at) return toast('The last exam day is before the first exam.', true);
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Saving…');
    const ok = await saveExam({ label: f.label.value.trim() || 'Semester exams', at: at.toISOString(), end: f.end.value || null, show: f.show.checked });
    setBusy(btn, false);
    if (ok) { toast('Exam countdown saved.'); route(); }
  };
  $('#exreset', el)?.addEventListener('click', e => confirmTap(e.currentTarget, async () => {
    if (await saveExam({})) { toast('Countdown removed.'); route(); }
  }, 'Tap again to remove'));
}

/* ---------- 2. Materials ---------- */
ADMIN.materials = async (el, alive) => {
  await reloadMaterials();
  if (!alive()) return;
  const sid = A.matSubject;
  const mats = S.materials.filter(m => m.subject_id === sid && ['college', 'special'].includes(m.section) && (A.matSection === 'all' || m.section === A.matSection))
    .sort((a, b) => (unitById(a.unit_id)?.unit_no - unitById(b.unit_id)?.unit_no) || a.section.localeCompare(b.section));
  el.innerHTML = `
    <section class="card">
      <div class="row wrap">
        <label class="field" style="min-width:220px;flex:1"><span>Subject</span><select class="input" id="msub">${subjOptions(sid)}</select></label>
        <div class="field"><span>Section</span><div class="tabs" id="msec">${[['all', 'All'], ['college', 'College'], ['special', 'Special']].map(([k, l]) => `<button class="tab ${A.matSection === k ? 'on' : ''}" data-sec="${k}">${l}</button>`).join('')}</div></div>
      </div>
      <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Unit</th><th>Title</th><th>Section</th><th>Actions</th></tr></thead><tbody>
        ${mats.length ? mats.map(m => `<tr data-id="${m.id}"><td class="nowrap">Unit ${unitById(m.unit_id)?.unit_no ?? '?'}</td>
          <td><div class="ttl"><b>${esc(m.title)}</b><br><small class="muted">${m.page_count} pages${m.is_visible ? '' : ' · hidden'}</small></div></td>
          <td><span class="pill ${m.section === 'special' ? 'good' : 'neutral'}">${m.section === 'special' ? 'Special' : 'College'}</span></td>
          <td><div class="actions-cell"><button class="btn sm ghost" data-a="rename">Rename</button><button class="btn sm ghost" data-a="vis">${m.is_visible ? 'Hide' : 'Show'}</button><button class="btn sm danger" data-a="del">Delete</button></div></td></tr>`).join('')
        : `<tr><td colspan="4"><div class="empty">No material for ${SUBJ[sid].code} yet.</div></td></tr>`}
      </tbody></table></div>
    </section>
    <div class="grid g2" style="margin-top:18px">
      <section class="card"><h3>Unit titles · ${SUBJ[sid].code}</h3><form id="ut" class="stack-sm" style="margin-top:12px">
        ${unitsOf(sid).map(u => `<label class="field"><span>Unit ${u.unit_no}</span><input class="input" data-u="${u.id}" value="${esc(u.title || '')}" placeholder="Unit ${u.unit_no}" maxlength="80"></label>`).join('')}
        <button class="btn" type="submit">Save unit titles</button></form></section>
      <section class="card"><h3>Add material</h3><form id="am" class="stack-sm" style="margin-top:12px">
        <label class="field"><span>Subject</span><select class="input" name="sid">${subjOptions(sid)}</select></label>
        <label class="field"><span>Unit</span><select class="input" name="unit">${unitOptions(sid)}</select></label>
        <label class="field"><span>Section</span><select class="input" name="section"><option value="college">College material</option><option value="special">Special material</option></select></label>
        <label class="field"><span>Title</span><input class="input" name="title" required maxlength="120" placeholder="e.g. Unit 2 notes"></label>
        <label class="field"><span>PDF file</span><input class="input" name="file" type="file" accept="application/pdf,.pdf" required></label>
        <button class="btn" type="submit">${icon('upload', 18)}Upload and publish</button></form></section>
    </div>`;
  $('#msub', el).onchange = e => { A.matSubject = e.target.value; ADMIN.materials(el, alive); };
  $$('#msec [data-sec]', el).forEach(b => b.onclick = () => { A.matSection = b.dataset.sec; ADMIN.materials(el, alive); });
  const am = $('#am', el);
  am.sid.onchange = () => { am.unit.innerHTML = unitOptions(am.sid.value); };
  am.onsubmit = async e => {
    e.preventDefault();
    const file = am.file.files[0], title = am.title.value.trim();
    if (!title || !file) return toast('Add a title and choose a PDF.', true);
    const btn = $('button[type=submit]', am); setBusy(btn, true, 'Uploading…');
    try {
      const { path, pages } = await uploadPDF(file, am.sid.value, am.section.value, progressTo(btn));
      const { error } = await sb.from('materials').insert({ subject_id: am.sid.value, unit_id: Number(am.unit.value), section: am.section.value, title, file_path: path, page_count: pages });
      if (error) { await sb.storage.from('materials').remove([path]); throw error; }
      const u = unitById(am.unit.value);
      toast(`Published to ${SUBJ[am.sid.value].code} Unit ${u?.unit_no} (${pages} pages)`);
      A.matSubject = am.sid.value; ADMIN.materials(el, alive);
    } catch (err) { setBusy(btn, false); toast('Upload failed: ' + errMsg(err), true); }
  };
  $('#ut', el).onsubmit = async e => {
    e.preventDefault();
    const btn = $('button[type=submit]', e.target); setBusy(btn, true, 'Saving…');
    const res = await Promise.all($$('[data-u]', el).map(i => sb.from('units').update({ title: i.value.trim() || null }).eq('id', Number(i.dataset.u))));
    setBusy(btn, false);
    const bad = res.find(r => r.error);
    bad ? toast(bad.error.message, true) : toast('Unit titles saved.');
    await reloadMaterials();
  };
  $$('tr[data-id]', el).forEach(tr => {
    const m = S.materials.find(x => x.id === tr.dataset.id);
    tr.querySelector('[data-a=rename]').onclick = () => {
      const cell = tr.querySelector('.ttl');
      cell.innerHTML = `<form class="inline-edit"><input class="input" value="${esc(m.title)}" maxlength="120" aria-label="New title"><button class="btn sm">Save</button></form>`;
      const f = cell.querySelector('form'); f.querySelector('input').focus();
      f.onsubmit = async ev => {
        ev.preventDefault(); const t = f.querySelector('input').value.trim(); if (!t) return;
        const { error } = await sb.from('materials').update({ title: t }).eq('id', m.id);
        error ? toast(error.message, true) : toast('Renamed.'); ADMIN.materials(el, alive);
      };
    };
    tr.querySelector('[data-a=vis]').onclick = async () => {
      const { error } = await sb.from('materials').update({ is_visible: !m.is_visible }).eq('id', m.id);
      error ? toast(error.message, true) : toast(m.is_visible ? 'Hidden from students.' : 'Visible to students.'); ADMIN.materials(el, alive);
    };
    tr.querySelector('[data-a=del]').onclick = e => confirmTap(e.currentTarget, async () => {
      const { error } = await sb.from('materials').delete().eq('id', m.id);
      if (error) return toast(error.message, true);
      await sb.storage.from('materials').remove([m.file_path]);
      toast('Deleted.'); ADMIN.materials(el, alive);
    }, 'Tap again');
  });
};

/* ---------- 3. Quiz bank ---------- */
function parseImport(text) {
  const ok = [], bad = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return;
    const p = raw.split('|').map(x => x.trim());
    const n = i + 1;
    if (p.length < 6) return bad.push(`Line ${n}: needs at least question | A | B | C | D | correct letter`);
    const [question, a, b, c, d, letter, topic, ...rest] = p;
    const correct = 'ABCD'.indexOf((letter || '').toUpperCase());
    if (!question || !a || !b || !c || !d) return bad.push(`Line ${n}: question or an option is empty`);
    if (correct < 0 || letter.length !== 1) return bad.push(`Line ${n}: correct letter must be A, B, C or D`);
    ok.push({ question, option_a: a, option_b: b, option_c: c, option_d: d, correct, topic: topic || 'General', explanation: rest.join(' | ') || '' });
  });
  return { ok, bad };
}
/* ---------- quiz import from a PDF (text + diagrams) ----------
   Document format, one block per question:
     1. Question text (can wrap onto more lines)
        [diagram as a picture, optional — between the question and option A]
     A) option   B) option   C) option   D) option   (each on its own line; "A." "(A)" also work)
     Answer: B
     Topic: Finite automata            (optional)
     Explanation: why B is right        (optional, can wrap)
*/
const PQ = {
  start: /^\s*(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.):]\s*(.*)$/i,
  opt: /^\s*\(?([A-D])(?:\)\s*|[.:]\s+)(.*)$/i,
  ans: /^\s*(?:correct\s+)?(?:answer|ans)\s*[:.\-]?\s*\(?([A-D])\b/i,
  topic: /^\s*topic\s*[:\-]\s*(.*)$/i,
  expl: /^\s*(?:explanation|reason|why)\s*[:\-]\s*(.*)$/i,
  pageNo: /^\s*(?:page\s*)?\d{1,3}(?:\s*(?:of|\/)\s*\d{1,3})?\s*$/i
};
const PDF_SCALE = 2;

async function pdfReadLines(doc) {
  const lines = [], pages = [];
  for (let pn = 1; pn <= doc.numPages; pn++) {
    const page = await doc.getPage(pn);
    const vp = page.getViewport({ scale: PDF_SCALE });
    pages.push({ page, vp });
    const rows = [];
    for (const it of (await page.getTextContent()).items) {
      if (!it.str || !it.str.trim()) continue;
      const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
      const fs = Math.max(6, Math.hypot(it.transform[2], it.transform[3]) * PDF_SCALE);
      let r = rows.find(r => Math.abs(r.base - y) < Math.min(r.fs, fs) * 0.5);
      if (!r) rows.push(r = { base: y, fs, parts: [] });
      r.fs = Math.max(r.fs, fs);
      r.parts.push({ x, w: (it.width || 0) * PDF_SCALE, str: it.str });
    }
    rows.sort((a, b) => a.base - b.base).forEach(r => {
      r.parts.sort((a, b) => a.x - b.x);
      let text = '', end = null;
      r.parts.forEach(p => {
        const gap = end != null && p.x - end > r.fs * 0.15 && !/\s$/.test(text) && !/^\s/.test(p.str);
        text += (gap ? ' ' : '') + p.str; end = p.x + p.w;
      });
      text = text.replace(/\s+/g, ' ').trim();
      // a bare number is a page number only in the top/bottom margin (diagram labels like "0" stay)
      const inMargin = r.base < vp.height * 0.08 || r.base > vp.height * 0.92;
      lines.push({ pi: pn - 1, x: r.parts[0].x, top: r.base - r.fs, bottom: r.base + r.fs * 0.3, fs: r.fs, text, skip: inMargin && PQ.pageNo.test(text) });
    });
  }
  return { lines, pages };
}

function pdfParseQuestions(lines) {
  const qs = [], bad = [];
  let q = null, field = null;
  const close = () => {
    if (!q) return;
    const n = q.num;
    if (q.opts.length < 4) bad.push(`Q${n}: found ${q.opts.length} of 4 options (A–D).`);
    else if (q.correct < 0) bad.push(`Q${n}: no "Answer: A/B/C/D" line.`);
    else if (!q.question.trim()) bad.push(`Q${n}: the question text is empty.`);
    else qs.push(q);
  };
  lines.forEach((ln, idx) => {
    if (ln.skip) return;
    const t = ln.text; let m;
    // a numbered line starts a new question only if it is the next number, or the current one is complete
    if ((m = t.match(PQ.start)) && (!q || Number(m[1]) === q.num + 1 || (q.correct >= 0 && Number(m[1]) > q.num))) {
      close();
      q = { num: Number(m[1]), question: m[2], qParts: [{ idx, text: m[2] }], opts: [], correct: -1, topic: 'General', explanation: '', start: idx, optA: null };
      field = 'question'; return;
    }
    if (!q) return; // title / instructions before question 1 are ignored
    if ((m = t.match(PQ.opt)) && 'ABCD'.indexOf(m[1].toUpperCase()) === q.opts.length && q.correct < 0) {
      if (!q.opts.length) q.optA = idx;
      q.opts.push(m[2]); field = 'opt'; return;
    }
    if ((m = t.match(PQ.ans)) && q.opts.length === 4) { q.correct = 'ABCD'.indexOf(m[1].toUpperCase()); field = null; return; }
    if ((m = t.match(PQ.topic))) { q.topic = m[1].trim() || 'General'; field = null; return; }
    if ((m = t.match(PQ.expl))) { q.explanation = m[1]; field = 'expl'; return; }
    if (field === 'question') {
      // wrapped question lines start at the question's left edge; anything else is a diagram label
      const qx = lines[q.start].x;
      if (ln.x != null && qx != null && Math.abs(ln.x - qx) > 3 * ln.fs) return;
      q.question += ' ' + t; q.qParts.push({ idx, text: t });
    }
    else if (field === 'opt') q.opts[q.opts.length - 1] += ' ' + t;
    else if (field === 'expl') q.explanation += ' ' + t;
  });
  close();
  return { qs, bad };
}

// The diagram is everything from the first break below the question text (a big blank gap, or a gap
// with drawn lines in it) down to option A. That covers pasted pictures and drawings whose labels
// are real text, across a page break if needed.
async function pdfPageCanvas(pages, cache, pi) {
  if (!cache[pi]) {
    const { page, vp } = pages[pi];
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    cache[pi] = cv;
  }
  return cache[pi];
}
// bounding box of non-white pixels in a horizontal band of a page, or null
async function pdfInk(pages, cache, pi, y0, y1) {
  const cv = await pdfPageCanvas(pages, cache, pi);
  y0 = Math.max(0, Math.floor(y0) + 2); const h = Math.min(cv.height, Math.ceil(y1) - 2) - y0;
  if (h < 4) return null;
  const px = cv.getContext('2d').getImageData(0, y0, cv.width, h).data;
  let minX = cv.width, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < cv.width; x++) {
    const k = (y * cv.width + x) * 4;
    if (px[k] < 235 || px[k + 1] < 235 || px[k + 2] < 235) {
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { cv, x0: minX, x1: maxX, y0: y0 + minY, y1: y0 + maxY };
}
async function pdfCropDiagram(q, lines, pages, cache) {
  if (q.optA == null) return null;
  const fs = lines[q.start].fs;
  // g = last line of the question text before the diagram starts
  const qIdx = new Set(q.qParts.map(p => p.idx));
  let g = -1;
  for (let i = q.start; i < q.optA; i++) {
    const a = lines[i], b = lines[i + 1];
    if (a.skip) continue;
    if (!qIdx.has(i + 1) && !b.skip || a.pi !== b.pi || b.top - a.bottom >= fs * 1.4 || (b.top - a.bottom > 4 && await pdfInk(pages, cache, a.pi, a.bottom, b.top))) { g = i; break; }
  }
  if (g < 0) return null;
  // bands from line g down to option A, skipping page numbers/headers
  const optA = lines[q.optA], bands = [];
  let pi = lines[g].pi, y0 = lines[g].bottom;
  for (let i = g + 1; i <= q.optA; i++) {
    const ln = lines[i];
    if (ln.pi !== pi) { bands.push({ pi, y0, y1: pages[pi].vp.height }); pi = ln.pi; y0 = 0; }
    if (ln.skip) { bands.push({ pi, y0, y1: ln.top }); y0 = ln.bottom; }
  }
  bands.push({ pi, y0, y1: optA.top });
  let best = null;
  for (const r of bands) {
    const ink = await pdfInk(pages, cache, r.pi, r.y0, r.y1);
    if (!ink || ink.x1 - ink.x0 < 16 || ink.y1 - ink.y0 < 16) continue; // blank, or just a stray mark
    const area = (ink.x1 - ink.x0) * (ink.y1 - ink.y0);
    if (!best || area > best.area) best = { ...ink, area };
  }
  if (!best) return null;
  // text inside the diagram (state labels etc.) is not part of the question
  q.question = q.qParts.filter(p => p.idx <= g).map(p => p.text).join(' ');
  const pad = 10, cv = best.cv;
  const x = Math.max(0, best.x0 - pad), y = Math.max(0, best.y0 - pad);
  const w = Math.min(cv.width, best.x1 + pad) - x, h = Math.min(cv.height, best.y1 + pad) - y;
  const k = Math.min(1, 1400 / w);
  const out = document.createElement('canvas');
  out.width = Math.round(w * k); out.height = Math.round(h * k);
  const octx = out.getContext('2d');
  octx.fillStyle = '#fff'; octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(cv, x, y, w, h, 0, 0, out.width, out.height);
  return new Promise(res => out.toBlob(res, 'image/png'));
}

async function pdfImportQuestions(file, onStatus) {
  onStatus('Reading the PDF…');
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    const { lines, pages } = await pdfReadLines(doc);
    if (!lines.length) throw new Error('No text found. If this PDF is a scan or photo, export it from Word or Google Docs instead.');
    const { qs, bad } = pdfParseQuestions(lines);
    const cache = {};
    for (let i = 0; i < qs.length; i++) {
      onStatus(`Looking for diagrams… ${i + 1}/${qs.length}`);
      qs[i].image = await pdfCropDiagram(qs[i], lines, pages, cache);
    }
    return { qs, bad };
  } finally { doc.destroy(); }
}

async function uploadQuizImage(blob, unitId) {
  const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
  const path = `${unitId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('quiz-images').upload(path, blob, { contentType: blob.type || 'image/png', upsert: false });
  if (error && /bucket not found/i.test(error.message || '')) throw new Error('Diagram storage is not set up yet. Run supabase/schema.sql in the Supabase SQL Editor, then try again.');
  if (error) throw error;
  return path;
}

ADMIN.bank = async (el, alive) => {
  const all = SUBJECTS.flatMap(s => unitsOf(s.id));
  const counts = await Promise.all(all.map(u => sb.from('questions').select('id', { count: 'exact', head: true }).eq('unit_id', u.id)));
  if (!alive()) return;
  const cnt = Object.fromEntries(all.map((u, i) => [u.id, counts[i].count || 0]));
  const sel = A.bankUnit && unitById(A.bankUnit) ? unitById(A.bankUnit) : all[0];
  el.innerHTML = `
    <section class="card"><h3>Questions per unit</h3>
      <div class="table-wrap" style="margin-top:10px"><table class="bank-grid"><thead><tr><th>Subject</th>${[1, 2, 3, 4, 5].map(n => `<th>Unit ${n}</th>`).join('')}</tr></thead><tbody>
      ${SUBJECTS.map(s => `<tr><td><b class="code-${s.id}">${s.code}</b></td>${unitsOf(s.id).map(u => `<td><div class="small"><b>${cnt[u.id]}</b>/100</div><div class="bar" style="margin:4px 0 6px"><i style="width:${Math.min(100, cnt[u.id])}%;background:var(--s-${s.id})"></i></div><button class="btn sm ghost" data-view="${u.id}">View</button></td>`).join('')}</tr>`).join('')}
      </tbody></table></div></section>
    <section class="card" style="margin-top:18px"><h3>Import a quiz from a PDF</h3>
      <p class="muted small" style="margin-top:4px">Write the questions in Word or Google Docs, save as PDF and upload it here. Diagrams are picked up automatically: put the picture between the question and option A. You'll see a preview before anything is saved.</p>
      <details class="fmt-help"><summary>Show the document format</summary>
<pre>1. Which language does the DFA below accept?
   [paste the diagram picture here]
A) Strings ending in 01
B) Strings with an even number of 0s
C) All strings over {0,1}
D) The empty language
Answer: A
Topic: DFA                       (optional)
Explanation: Only 0 then 1 reaches the final state.   (optional)

2. Next question…</pre>
        <p class="small" style="margin:0 0 6px"><a href="samples/quiz-sample-flat.pdf" target="_blank" rel="noopener">Download a sample quiz PDF</a> (FLAT, 5 questions, 3 with diagrams) to see the layout.</p>
        <p class="small muted">Number every question (1. 2. 3.). Options can be written A) A. or (A). "Ans: B" also works. Text before question 1 (like a title) is ignored. Keep each diagram as a picture, not a scanned page.</p></details>
      <form id="pimp" class="stack-sm" style="margin-top:12px">
        <div class="row wrap"><label class="field" style="flex:1;min-width:200px"><span>Subject</span><select class="input" name="sid">${subjOptions(sel.subject_id)}</select></label>
          <label class="field" style="flex:1;min-width:200px"><span>Unit</span><select class="input" name="unit">${unitOptions(sel.subject_id, sel.id)}</select></label></div>
        <label class="field"><span>Quiz PDF</span><input class="input" type="file" name="file" accept="application/pdf,.pdf" required></label>
        <button class="btn" type="submit">${icon('upload', 18)}Read PDF</button>
      </form>
      <div id="pprev"></div></section>
    <details class="card" style="margin-top:18px"><summary><h3 style="display:inline">Or paste questions as text</h3></summary>
      <p class="muted small" style="margin-top:8px">One question per line: <code>question | A | B | C | D | correct letter | topic | explanation</code>. Don't use | inside the text. Lines starting with # are ignored. Add diagrams afterwards with "Add diagram" in the list below.</p>
      <form id="imp" class="stack-sm" style="margin-top:12px">
        <div class="row wrap"><label class="field" style="flex:1;min-width:200px"><span>Subject</span><select class="input" name="sid">${subjOptions(sel.subject_id)}</select></label>
          <label class="field" style="flex:1;min-width:200px"><span>Unit</span><select class="input" name="unit">${unitOptions(sel.subject_id, sel.id)}</select></label></div>
        <label class="field"><span>Questions</span><textarea class="input" name="text" rows="10" style="min-height:220px;font-family:ui-monospace,monospace;font-size:.85rem" placeholder="Which learning uses labelled data? | Unsupervised | Supervised | Reinforcement | Clustering | B | Types of learning | Supervised learning learns from labelled examples."></textarea></label>
        <button class="btn" type="submit">Import</button>
        <div id="impres"></div>
      </form></details>
    <section class="card" style="margin-top:18px" id="qlist"><h3>${SUBJ[sel.subject_id].code} ${esc(unitLabel(sel))} · ${cnt[sel.id]} questions</h3><div id="qrows" style="margin-top:10px"><div class="loading"><div class="spinner"></div></div></div></section>`;

  /* --- PDF import: read → preview → confirm --- */
  const pf = $('#pimp', el);
  pf.sid.onchange = () => { pf.unit.innerHTML = unitOptions(pf.sid.value); };
  let previewURLs = [];
  const clearPreview = () => { previewURLs.forEach(URL.revokeObjectURL); previewURLs = []; $('#pprev').innerHTML = ''; };
  pf.onsubmit = async e => {
    e.preventDefault();
    const file = pf.file.files[0];
    if (!file) return toast('Choose the quiz PDF.', true);
    const unitId = Number(pf.unit.value), u = unitById(unitId);
    const btn = $('button[type=submit]', pf); setBusy(btn, true, 'Reading…');
    clearPreview();
    let res;
    try { res = await pdfImportQuestions(file, msg => { btn.textContent = msg; }); }
    catch (err) { setBusy(btn, false); return toast('Could not read the PDF: ' + errMsg(err), true); }
    setBusy(btn, false);
    if (!alive()) return;
    const { qs, bad } = res;
    const room = Math.max(0, 100 - (cnt[unitId] || 0));
    if (qs.length > room) bad.push(`${qs.length - room} question(s) won't fit — the bank holds 100 per unit (${room} free).`);
    const take = qs.slice(0, room);
    const withImg = take.filter(q => q.image).length;
    const L = 'ABCD';
    $('#pprev').innerHTML = `<div class="pdf-preview">
      <div class="row wrap pp-sum"><b>Found ${qs.length} question${qs.length === 1 ? '' : 's'}</b>
        <span class="pill neutral">${icon('image', 14)} ${withImg} with diagram${withImg === 1 ? '' : 's'}</span>
        ${bad.length ? `<span class="pill bad">${bad.length} problem${bad.length === 1 ? '' : 's'}</span>` : ''}</div>
      ${bad.length ? `<div class="form-error" style="margin-top:10px">${bad.map(esc).join('<br>')}<br><small>Fix these in the document and read it again, or import the rest now.</small></div>` : ''}
      <div class="pp-list">${take.map((q, i) => {
        const url = q.image ? URL.createObjectURL(q.image) : null; if (url) previewURLs.push(url);
        return `<div class="answer" data-i="${i}"><div class="row"><b>Q${q.num}</b><span class="chip">${esc(q.topic)}</span>${url ? `<span class="spacer"></span><button class="linkbtn small" type="button" data-noimg>Remove diagram</button>` : ''}</div>
          <p class="q">${esc(q.question)}</p>${url ? `<figure class="qimg"><img src="${url}" alt="Diagram for question ${q.num}"></figure>` : ''}
          <p class="small">${q.opts.map((o, k) => `<span class="${k === q.correct ? 'right' : 'muted'}">${L[k]}. ${esc(o)}</span>`).join(' &nbsp; ')}</p>${q.explanation ? `<p class="why">${esc(q.explanation)}</p>` : ''}</div>`;
      }).join('')}</div>
      ${take.length ? `<div class="row wrap" style="margin-top:14px"><button class="btn" id="pgo">Import ${take.length} question${take.length === 1 ? '' : 's'} to ${SUBJ[u.subject_id].code} Unit ${u.unit_no}</button><button class="btn ghost" id="pcancel" type="button">Cancel</button></div>` : ''}
    </div>`;
    $$('#pprev [data-noimg]').forEach(b => b.onclick = () => {
      const box = b.closest('[data-i]'); take[Number(box.dataset.i)].image = null;
      box.querySelector('.qimg')?.remove(); b.remove();
    });
    $('#pcancel')?.addEventListener('click', clearPreview);
    $('#pgo')?.addEventListener('click', async ev => {
      const go = ev.currentTarget; go.disabled = true; $('#pcancel').disabled = true;
      const uploaded = [];
      try {
        const rows = [];
        const imgs = take.filter(q => q.image).length; let n = 0;
        for (const q of take) {
          let image_path = null;
          if (q.image) { go.textContent = `Uploading diagrams… ${++n}/${imgs}`; image_path = await uploadQuizImage(q.image, unitId); uploaded.push(image_path); }
          rows.push({ unit_id: unitId, question: q.question.trim(), option_a: q.opts[0].trim(), option_b: q.opts[1].trim(), option_c: q.opts[2].trim(), option_d: q.opts[3].trim(), correct: q.correct, topic: q.topic, explanation: q.explanation.trim(), image_path });
        }
        go.textContent = 'Saving questions…';
        const { error } = await sb.from('questions').insert(rows);
        if (error) throw error;
        toast(`Imported ${rows.length} question${rows.length === 1 ? '' : 's'}${imgs ? ` with ${imgs} diagram${imgs === 1 ? '' : 's'}` : ''}.`);
        clearPreview(); A.bankUnit = unitId; ADMIN.bank(el, alive);
      } catch (err) {
        if (uploaded.length) await sb.storage.from('quiz-images').remove(uploaded);
        go.disabled = false; $('#pcancel').disabled = false; go.textContent = 'Try again';
        toast('Import failed: ' + errMsg(err), true);
      }
    });
    $('#pprev').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* --- text import (unchanged) --- */
  const f = $('#imp', el);
  f.sid.onchange = () => { f.unit.innerHTML = unitOptions(f.sid.value); };
  f.onsubmit = async e => {
    e.preventDefault();
    const unitId = Number(f.unit.value);
    const { ok, bad } = parseImport(f.text.value);
    const room = Math.max(0, 100 - (cnt[unitId] || 0));
    const take = ok.slice(0, room);
    if (ok.length > room) bad.push(`${ok.length - room} question(s) not imported — the bank holds 100 per unit.`);
    if (!take.length) { $('#impres').innerHTML = `<div class="form-error">Nothing imported.${bad.length ? '<br>' + bad.map(esc).join('<br>') : ''}</div>`; return; }
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Importing…');
    let done = 0, err = null;
    for (let i = 0; i < take.length; i += 50) {
      const { error } = await sb.from('questions').insert(take.slice(i, i + 50).map(q => ({ ...q, unit_id: unitId })));
      if (error) { err = error; break; }
      done += Math.min(50, take.length - i);
    }
    setBusy(btn, false);
    toast(`Imported ${done} question${done === 1 ? '' : 's'}.`, !!err);
    A.bankUnit = unitId;
    await ADMIN.bank(el, alive);
    $('#impres').innerHTML = `<div class="${err || bad.length ? 'form-error' : 'form-ok'}">Imported ${done}. ${err ? 'Stopped: ' + esc(err.message) : ''}${bad.length ? `<br>Skipped:<br>${bad.map(esc).join('<br>')}` : ''}</div>`;
  };
  $$('[data-view]', el).forEach(b => b.onclick = () => { A.bankUnit = Number(b.dataset.view); ADMIN.bank(el, alive).then(() => $('#qlist')?.scrollIntoView({ behavior: 'smooth' })); });

  /* --- question list with diagram controls --- */
  const { data: qs } = await sb.from('questions').select('*').eq('unit_id', sel.id).order('created_at');
  const imgs = await signQuizImages((qs || []).map(q => q.image_path));
  if (!alive() || !$('#qrows')) return;
  $('#qrows').innerHTML = (qs || []).length ? qs.map((q, i) => `<div class="answer" data-q="${q.id}"><div class="row wrap"><b>Q${i + 1}</b><span class="chip">${esc(q.topic)}</span><span class="spacer"></span>
      <button class="btn sm ghost" data-img>${icon('image', 16)}${q.image_path ? 'Replace diagram' : 'Add diagram'}</button>
      ${q.image_path ? '<button class="btn sm ghost" data-noimg>Remove diagram</button>' : ''}
      <button class="btn sm danger" data-del>Delete</button></div>
    <p class="q">${esc(q.question)}</p>${qImgHTML(imgs[q.image_path])}<p class="small">${['A', 'B', 'C', 'D'].map((L, k) => `<span class="${k === q.correct ? 'right' : 'muted'}">${L}. ${esc(q['option_' + L.toLowerCase()])}</span>`).join(' &nbsp; ')}</p>${q.explanation ? `<p class="why">${esc(q.explanation)}</p>` : ''}</div>`).join('')
    : '<div class="empty">No questions in this unit yet. Import some above.</div>';
  const qOf = b => qs.find(x => x.id === b.closest('[data-q]').dataset.q);
  $$('#qrows [data-img]').forEach(b => b.onclick = () => {
    const q = qOf(b);
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      if (file.size > 5 * 1048576) return toast('Images can be up to 5 MB.', true);
      setBusy(b, true, 'Uploading…');
      try {
        const path = await uploadQuizImage(file, q.unit_id);
        const { error } = await sb.from('questions').update({ image_path: path }).eq('id', q.id);
        if (error) { await sb.storage.from('quiz-images').remove([path]); throw error; }
        if (q.image_path) await sb.storage.from('quiz-images').remove([q.image_path]);
        toast('Diagram saved.'); ADMIN.bank(el, alive);
      } catch (err) { setBusy(b, false); toast('Upload failed: ' + errMsg(err), true); }
    };
    inp.click();
  });
  $$('#qrows [data-noimg]').forEach(b => b.onclick = e => confirmTap(e.currentTarget, async () => {
    const q = qOf(b);
    const { error } = await sb.from('questions').update({ image_path: null }).eq('id', q.id);
    if (error) return toast(error.message, true);
    await sb.storage.from('quiz-images').remove([q.image_path]);
    toast('Diagram removed.'); ADMIN.bank(el, alive);
  }, 'Tap again'));
  $$('#qrows [data-del]').forEach(b => b.onclick = e => confirmTap(e.currentTarget, async () => {
    const q = qOf(b);
    const { error } = await sb.from('questions').delete().eq('id', q.id);
    if (error) return toast(error.message, true);
    if (q.image_path) await sb.storage.from('quiz-images').remove([q.image_path]);
    toast('Question deleted.'); ADMIN.bank(el, alive);
  }, 'Tap again'));
};

/* ---------- 4. Mid answers ---------- */
// One Admin tab for all subject-level exam material (types come from EXAM_PAGES in app.js)
ADMIN.mid = async (el, alive) => {
  await reloadMaterials();
  if (!alive()) return;
  const pg = EXAM_BY_SECTION[A.midType] || EXAM_PAGES[0];
  A.midType = pg.section;
  const filesOf = (sid, sec) => S.materials.filter(m => m.subject_id === sid && m.section === sec)
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'en', { numeric: true }));
  const count = sec => S.materials.filter(m => m.section === sec).length;
  el.innerHTML = `
    <div class="tabs scroll" style="margin-bottom:16px" role="tablist">${EXAM_PAGES.map(x => `<button class="tab ${x.section === pg.section ? 'on' : ''}" role="tab" aria-selected="${x.section === pg.section}" data-mt="${x.section}">${x.label} <span class="muted small">${count(x.section)}</span></button>`).join('')}</div>
    <section class="card"><h3>${pg.label}</h3><p class="muted small" style="margin-top:4px">${pg.blurb} Students find these under "${pg.label}" in the menu.</p>
      <div class="table-wrap" style="margin-top:10px"><table class="mid-table"><thead><tr><th>Subject</th><th>Files</th><th></th></tr></thead><tbody>
      ${SUBJECTS.map(s => {
        const ms = filesOf(s.id, pg.section);
        return `<tr><td><b class="code-${s.id}">${s.code}</b></td><td><div class="mid-files">${ms.map(m => `<div class="mid-file" data-id="${m.id}">
            <div class="mid-file-info"><b class="small ttl">${esc(m.title)}</b><small class="muted">${m.page_count} pages${m.is_visible ? '' : ' · hidden'}</small></div>
            <div class="actions-cell"><a class="btn sm ghost" href="#reader/${m.id}">Open</a><button class="btn sm ghost" data-a="rename">Rename</button><button class="btn sm ghost" data-a="vis">${m.is_visible ? 'Hide' : 'Show'}</button><button class="btn sm danger" data-a="del">Delete</button></div>
          </div>`).join('') || '<span class="muted small">Nothing yet</span>'}</div></td>
          <td><button class="btn sm" data-add="${s.id}">${icon('upload', 14)}Add</button></td></tr>`;
      }).join('')}
      </tbody></table></div></section>
    <section class="card" style="margin-top:18px" id="midup"><h3>Upload a PDF</h3>
      <p class="muted small">Each upload is added as its own file, so several can sit side by side (Mid 1 and Mid 2, Units 1–2 and 3–5…). Students see the title you give.</p>
      <form id="mf" class="stack-sm" style="margin-top:12px">
        <div class="row wrap"><label class="field" style="flex:1;min-width:200px"><span>Subject</span><select class="input" name="sid">${subjOptions('ml')}</select></label>
        <label class="field" style="flex:1;min-width:200px"><span>Section</span><select class="input" name="sec">${EXAM_PAGES.map(x => `<option value="${x.section}" ${x.section === pg.section ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label></div>
        <label class="field"><span>Title</span><input class="input" name="title" required maxlength="120" list="midtitles" value="${esc(pg.titles[0])}"><small>Students see this name. Pick a suggestion or type your own.</small></label>
        <datalist id="midtitles">${pg.titles.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
        <label class="field"><span>PDF file</span><input class="input" type="file" name="file" accept="application/pdf,.pdf" required></label>
        <button class="btn" type="submit">${icon('upload', 18)}Upload and publish</button></form></section>`;
  $$('[data-mt]', el).forEach(b => b.onclick = () => { A.midType = b.dataset.mt; ADMIN.mid(el, alive); });
  const f = $('#mf', el);
  const allTitles = EXAM_PAGES.flatMap(x => x.titles);
  f.sec.onchange = () => {
    const x = EXAM_BY_SECTION[f.sec.value];
    $('#midtitles').innerHTML = x.titles.map(t => `<option value="${esc(t)}">`).join('');
    if (!f.title.value.trim() || allTitles.includes(f.title.value.trim())) f.title.value = x.titles[0];
  };
  $$('[data-add]', el).forEach(b => b.onclick = () => {
    f.sid.value = b.dataset.add; f.sec.value = pg.section; f.sec.onchange();
    $('#midup').scrollIntoView({ behavior: 'smooth' }); f.title.focus(); f.title.select();
  });
  f.onsubmit = async e => {
    e.preventDefault();
    const file = f.file.files[0], title = f.title.value.trim();
    if (!title) return toast('Give the PDF a title.', true);
    if (!file) return toast('Choose a PDF.', true);
    const sid = f.sid.value, sec = f.sec.value;
    if (filesOf(sid, sec).some(m => m.title.toLowerCase() === title.toLowerCase())) return toast(`${SUBJ[sid].code} already has "${title}" here. Use a different title, or delete the old one first.`, true);
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Uploading…');
    try {
      const { path, pages } = await uploadPDF(file, sid, sec, progressTo(btn));
      const { error } = await sb.from('materials').insert({ subject_id: sid, unit_id: null, section: sec, title, file_path: path, page_count: pages });
      if (error) { await sb.storage.from('materials').remove([path]); throw error; }
      toast(`Published ${SUBJ[sid].code} · ${title} (${pages} pages) in ${EXAM_BY_SECTION[sec].label}`);
      A.midType = sec; ADMIN.mid(el, alive);
    } catch (err) {
      setBusy(btn, false);
      const msg = /materials_(section_)?check/.test(errMsg(err)) ? 'The database needs updating first: run supabase/schema.sql in the SQL Editor.' : errMsg(err);
      toast('Upload failed: ' + msg, true);
    }
  };
  $$('.mid-file', el).forEach(row => {
    const m = S.materials.find(x => x.id === row.dataset.id);
    row.querySelector('[data-a=rename]').onclick = () => {
      const cellEl = row.querySelector('.ttl');
      cellEl.innerHTML = `<form class="inline-edit"><input class="input" value="${esc(m.title)}" maxlength="120" list="midtitles" aria-label="New title"><button class="btn sm">Save</button></form>`;
      const fm = cellEl.querySelector('form'); fm.querySelector('input').focus();
      fm.onsubmit = async ev => {
        ev.preventDefault(); const t = fm.querySelector('input').value.trim(); if (!t) return;
        const { error } = await sb.from('materials').update({ title: t }).eq('id', m.id);
        error ? toast(error.message, true) : toast('Renamed.'); ADMIN.mid(el, alive);
      };
    };
    row.querySelector('[data-a=vis]').onclick = async () => {
      const { error } = await sb.from('materials').update({ is_visible: !m.is_visible }).eq('id', m.id);
      error ? toast(error.message, true) : toast(m.is_visible ? 'Hidden from students.' : 'Visible to students.'); ADMIN.mid(el, alive);
    };
    row.querySelector('[data-a=del]').onclick = e => confirmTap(e.currentTarget, async () => {
      const { error } = await sb.from('materials').delete().eq('id', m.id);
      if (error) return toast(error.message, true);
      await sb.storage.from('materials').remove([m.file_path]);
      toast('Deleted.'); ADMIN.mid(el, alive);
    }, 'Tap again');
  });
};

/* ---------- 5. Announcements ---------- */
ADMIN.ann = async (el, alive) => {
  const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
  if (!alive()) return;
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `
    <div class="grid g2">
      <section class="card"><h3>New announcement</h3><form id="af" class="stack-sm" style="margin-top:12px">
        <label class="field"><span>Title</span><input class="input" name="title" required maxlength="120"></label>
        <label class="field"><span>Message</span><textarea class="input" name="message" required maxlength="2000"></textarea></label>
        <label class="check"><input type="checkbox" name="imp">Pin as important</label>
        <label class="field"><span>Hide after (optional)</span><input class="input" type="date" name="end" min="${today}"></label>
        <button class="btn" type="submit">Publish</button></form></section>
      <section class="card"><h3>Preview</h3><div class="preview-ann" id="prev"></div></section>
    </div>
    <section class="card" style="margin-top:18px"><h3>All announcements</h3><div style="margin-top:10px">
      ${(data || []).length ? data.map(a => { const expired = a.end_date && a.end_date < today; return `<div class="pdf-row" data-id="${a.id}"><span class="pdf-ico" style="--c:var(--s-ai)">${icon(a.is_important ? 'pin' : 'megaphone', 20)}</span><div class="info"><b>${esc(a.title)}</b><small>${fmtDate(a.created_at)}${a.is_important ? ' · pinned' : ''}${a.end_date ? ' · until ' + fmtDate(a.end_date) : ''}${a.is_hidden ? ' · hidden' : ''}${expired ? ' · ended' : ''}</small></div><div class="actions-cell"><button class="btn sm ghost" data-vis>${a.is_hidden ? 'Show' : 'Hide'}</button><button class="btn sm danger" data-del>Remove</button></div></div>`; }).join('')
      : '<div class="empty">No announcements yet.</div>'}</div></section>`;
  const f = $('#af', el);
  const prev = () => { $('#prev').innerHTML = annHTML({ title: f.title.value || 'Title', message: f.message.value || 'Your message appears here.', is_important: f.imp.checked, created_at: new Date() }); };
  f.oninput = prev; prev();
  f.onsubmit = async e => {
    e.preventDefault();
    if (!f.title.value.trim() || !f.message.value.trim()) return toast('Add a title and a message.', true);
    const { error } = await sb.from('announcements').insert({ title: f.title.value.trim(), message: f.message.value.trim(), is_important: f.imp.checked, end_date: f.end.value || null });
    if (error) return toast(error.message, true);
    toast('Announcement published.'); loadAnnouncements(); ADMIN.ann(el, alive);
  };
  $$('[data-id]', el).forEach(row => {
    const a = data.find(x => x.id === row.dataset.id);
    row.querySelector('[data-vis]').onclick = async () => {
      const { error } = await sb.from('announcements').update({ is_hidden: !a.is_hidden }).eq('id', a.id);
      error ? toast(error.message, true) : toast(a.is_hidden ? 'Shown.' : 'Hidden.'); loadAnnouncements(); ADMIN.ann(el, alive);
    };
    row.querySelector('[data-del]').onclick = e => confirmTap(e.currentTarget, async () => {
      const { error } = await sb.from('announcements').delete().eq('id', a.id);
      error ? toast(error.message, true) : toast('Removed.'); loadAnnouncements(); ADMIN.ann(el, alive);
    }, 'Tap again');
  });
};

/* ---------- 6. Feedback ---------- */
ADMIN.fb = async (el, alive) => {
  const { data, error } = await sb.from('feedback').select('*, profiles(username)').order('updated_at', { ascending: false });
  if (!alive()) return;
  if (error) { el.innerHTML = `<div class="form-error">${esc(error.message)}</div>`; return; }
  const n = data.length;
  const avg = n ? (data.reduce((a, f) => a + f.rating, 0) / n).toFixed(1) : '—';
  const lot = n ? Math.round(data.filter(f => f.helped === 'Yes, a lot').length * 100 / n) + '%' : '—';
  el.innerHTML = `
    <div class="grid g3"><div class="card kpi"><b>${avg}</b><span>Average rating</span></div><div class="card kpi"><b>${n}</b><span>Responses</span></div><div class="card kpi"><b>${lot}</b><span>Said "helped a lot"</span></div></div>
    <section class="card" style="margin-top:18px"><h3>Responses</h3>
      ${n ? data.map(f => `<div class="answer"><div class="row wrap"><b>${esc(f.profiles?.username || 'Student')}</b><span class="pill neutral">${f.rating}/5</span><span class="pill ${f.helped === 'Yes, a lot' ? 'good' : f.helped === 'Not really' ? 'bad' : 'neutral'}">${esc(f.helped)}</span><span class="spacer"></span><small class="muted">${fmtTime(f.updated_at)}</small></div>
        ${f.comment ? `<p style="margin-top:8px"><b class="small">Helped most:</b> ${esc(f.comment)}</p>` : ''}${f.suggestion ? `<p style="margin-top:6px"><b class="small">Add or fix:</b> ${esc(f.suggestion)}</p>` : ''}</div>`).join('')
      : '<div class="empty" style="margin-top:10px">No feedback yet.</div>'}</section>`;
};

/* ---------- 7. Students ---------- */
ADMIN.students = async (el, alive) => {
  const { data, error } = await sb.rpc('admin_students');
  if (!alive()) return;
  if (error) { el.innerHTML = `<div class="form-error">${esc(error.message)}</div>`; return; }
  el.innerHTML = `<section class="card"><div class="row wrap"><h3>${data.length} student${data.length === 1 ? '' : 's'}</h3><span class="spacer"></span><input class="input" id="sq" placeholder="Search username or email" style="max-width:280px" aria-label="Search students"></div>
    <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Username</th><th>Email</th><th>Batch · branch</th><th>Status</th><th>Leaderboard</th></tr></thead><tbody id="stb"></tbody></table></div></section>`;
  const draw = (q = '') => {
    q = q.toLowerCase();
    const rows = data.filter(s => !q || s.username.toLowerCase().includes(q) || s.email.includes(q));
    $('#stb').innerHTML = rows.length ? rows.map(s => `<tr data-id="${s.id}"><td><b>${esc(s.username)}</b></td><td class="small">${esc(s.email)}</td><td class="small">${esc([s.batch, s.branch].filter(Boolean).join(' · ') || '—')}</td>
      <td><span class="pill ${s.verified ? 'good' : 'bad'}">${s.verified ? 'Verified' : 'Not verified'}</span></td>
      <td><label class="check" style="min-height:44px"><input type="checkbox" ${s.hidden ? 'checked' : ''} data-hide>Hide</label></td></tr>`).join('')
      : '<tr><td colspan="5"><div class="empty">No students yet.</div></td></tr>';
    $$('[data-hide]', el).forEach(cb => cb.onchange = async () => {
      const id = cb.closest('tr').dataset.id;
      const { error } = await sb.from('profiles').update({ hidden_from_leaderboard: cb.checked }).eq('id', id);
      if (error) { cb.checked = !cb.checked; return toast(error.message, true); }
      data.find(s => s.id === id).hidden = cb.checked;
      toast(cb.checked ? 'Hidden from the leaderboard.' : 'Shown on the leaderboard.');
    });
  };
  $('#sq').oninput = e => draw(e.target.value);
  draw();
};
