/* =====================================================================
   SemPrep — Admin (7 tabs). Every write is also enforced by RLS.
   ===================================================================== */
const ADMIN_TABS = [
  ['overview', 'Overview'], ['materials', 'Materials'], ['bank', 'Quiz bank'], ['mid', 'Mid answers'],
  ['ann', 'Announcements'], ['fb', 'Feedback'], ['students', 'Students']
];
const A = { matSubject: 'ml', matSection: 'all', bankUnit: null };

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
async function uploadPDF(file, sid, section) {
  if (!file || !/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('Choose a PDF file.');
  const pages = await pdfPageCount(file);
  const path = `${sid}/${section}/${crypto.randomUUID()}.pdf`;
  const { error } = await sb.storage.from('materials').upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (error) throw error;
  return { path, pages };
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
};

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
        <label class="field"><span>Section</span><select class="input" name="section"><option value="college">College material</option><option value="special">Special material (by Fawwaz)</option></select></label>
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
      const { path, pages } = await uploadPDF(file, am.sid.value, am.section.value);
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
    <section class="card" style="margin-top:18px"><h3>Import questions</h3>
      <p class="muted small" style="margin-top:4px">One question per line: <code>question | A | B | C | D | correct letter | topic | explanation</code>. Don't use | inside the text. Lines starting with # are ignored.</p>
      <form id="imp" class="stack-sm" style="margin-top:12px">
        <div class="row wrap"><label class="field" style="flex:1;min-width:200px"><span>Subject</span><select class="input" name="sid">${subjOptions(sel.subject_id)}</select></label>
          <label class="field" style="flex:1;min-width:200px"><span>Unit</span><select class="input" name="unit">${unitOptions(sel.subject_id, sel.id)}</select></label></div>
        <label class="field"><span>Questions</span><textarea class="input" name="text" rows="10" style="min-height:220px;font-family:ui-monospace,monospace;font-size:.85rem" placeholder="Which learning uses labelled data? | Unsupervised | Supervised | Reinforcement | Clustering | B | Types of learning | Supervised learning learns from labelled examples."></textarea></label>
        <button class="btn" type="submit">Import</button>
        <div id="impres"></div>
      </form></section>
    <section class="card" style="margin-top:18px" id="qlist"><h3>${SUBJ[sel.subject_id].code} ${esc(unitLabel(sel))} · ${cnt[sel.id]} questions</h3><div id="qrows" style="margin-top:10px"><div class="loading"><div class="spinner"></div></div></div></section>`;
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
  const { data: qs } = await sb.from('questions').select('*').eq('unit_id', sel.id).order('created_at');
  if (!alive() || !$('#qrows')) return;
  $('#qrows').innerHTML = (qs || []).length ? qs.map((q, i) => `<div class="answer" data-q="${q.id}"><div class="row"><b>Q${i + 1}</b><span class="chip">${esc(q.topic)}</span><span class="spacer"></span><button class="btn sm danger" data-del>Delete</button></div>
    <p class="q">${esc(q.question)}</p><p class="small">${['A', 'B', 'C', 'D'].map((L, k) => `<span class="${k === q.correct ? 'right' : 'muted'}">${L}. ${esc(q['option_' + L.toLowerCase()])}</span>`).join(' &nbsp; ')}</p>${q.explanation ? `<p class="why">${esc(q.explanation)}</p>` : ''}</div>`).join('')
    : '<div class="empty">No questions in this unit yet. Import some above.</div>';
  $$('#qrows [data-del]').forEach(b => b.onclick = e => confirmTap(e.currentTarget, async () => {
    const id = b.closest('[data-q]').dataset.q;
    const { error } = await sb.from('questions').delete().eq('id', id);
    if (error) return toast(error.message, true);
    toast('Question deleted.'); ADMIN.bank(el, alive);
  }, 'Tap again'));
};

/* ---------- 4. Mid answers ---------- */
ADMIN.mid = async (el, alive) => {
  await reloadMaterials();
  if (!alive()) return;
  const find = (sid, sec) => S.materials.find(m => m.subject_id === sid && m.section === sec);
  const cell = (sid, sec) => {
    const m = find(sid, sec);
    return m ? `<td data-id="${m.id}"><b class="small">${esc(m.title)}</b><br><small class="muted">${m.page_count} pages${m.is_visible ? '' : ' · hidden'}</small>
      <div class="actions-cell" style="margin-top:6px"><button class="btn sm ghost" data-rep="${sid}|${sec}">Replace</button><button class="btn sm ghost" data-vis>${m.is_visible ? 'Hide' : 'Show'}</button><button class="btn sm danger" data-del>Delete</button></div></td>`
      : `<td><span class="muted small">Not uploaded</span><div style="margin-top:6px"><button class="btn sm" data-rep="${sid}|${sec}">Upload</button></div></td>`;
  };
  el.innerHTML = `
    <section class="card"><div class="table-wrap"><table><thead><tr><th>Subject</th><th>Answers</th><th>Bits</th></tr></thead><tbody>
      ${SUBJECTS.map(s => `<tr><td><b class="code-${s.id}">${s.code}</b></td>${cell(s.id, 'mid_answers')}${cell(s.id, 'mid_bits')}</tr>`).join('')}
    </tbody></table></div></section>
    <section class="card" style="margin-top:18px" id="midup"><h3>Upload a Mid PDF</h3><p class="muted small">Uploading replaces the old file for that subject and type.</p>
      <form id="mf" class="stack-sm" style="margin-top:12px">
        <div class="row wrap"><label class="field" style="flex:1;min-width:200px"><span>Subject</span><select class="input" name="sid">${subjOptions('ml')}</select></label>
        <label class="field" style="flex:1;min-width:160px"><span>Type</span><select class="input" name="sec"><option value="mid_answers">Answers</option><option value="mid_bits">Bits</option></select></label></div>
        <label class="field"><span>PDF file</span><input class="input" type="file" name="file" accept="application/pdf,.pdf" required></label>
        <button class="btn" type="submit">${icon('upload', 18)}Upload</button></form></section>`;
  const f = $('#mf', el);
  $$('[data-rep]', el).forEach(b => b.onclick = () => { const [sid, sec] = b.dataset.rep.split('|'); f.sid.value = sid; f.sec.value = sec; $('#midup').scrollIntoView({ behavior: 'smooth' }); f.file.focus(); });
  f.onsubmit = async e => {
    e.preventDefault();
    const file = f.file.files[0]; if (!file) return toast('Choose a PDF.', true);
    const sid = f.sid.value, sec = f.sec.value, old = find(sid, sec);
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Uploading…');
    try {
      const { path, pages } = await uploadPDF(file, sid, sec);
      const title = `${SUBJ[sid].code} Mid ${sec === 'mid_answers' ? 'answers' : 'bits'}`;
      const q = old ? sb.from('materials').update({ file_path: path, page_count: pages, title }).eq('id', old.id)
        : sb.from('materials').insert({ subject_id: sid, unit_id: null, section: sec, title, file_path: path, page_count: pages });
      const { error } = await q;
      if (error) { await sb.storage.from('materials').remove([path]); throw error; }
      if (old) await sb.storage.from('materials').remove([old.file_path]);
      toast(`${old ? 'Replaced' : 'Published'} ${title} (${pages} pages)`);
      ADMIN.mid(el, alive);
    } catch (err) { setBusy(btn, false); toast('Upload failed: ' + errMsg(err), true); }
  };
  $$('td[data-id]', el).forEach(td => {
    const m = S.materials.find(x => x.id === td.dataset.id);
    td.querySelector('[data-vis]').onclick = async () => {
      const { error } = await sb.from('materials').update({ is_visible: !m.is_visible }).eq('id', m.id);
      error ? toast(error.message, true) : toast(m.is_visible ? 'Hidden.' : 'Visible.'); ADMIN.mid(el, alive);
    };
    td.querySelector('[data-del]').onclick = e => confirmTap(e.currentTarget, async () => {
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
    toast('Announcement published.'); ADMIN.ann(el, alive);
  };
  $$('[data-id]', el).forEach(row => {
    const a = data.find(x => x.id === row.dataset.id);
    row.querySelector('[data-vis]').onclick = async () => {
      const { error } = await sb.from('announcements').update({ is_hidden: !a.is_hidden }).eq('id', a.id);
      error ? toast(error.message, true) : toast(a.is_hidden ? 'Shown.' : 'Hidden.'); ADMIN.ann(el, alive);
    };
    row.querySelector('[data-del]').onclick = e => confirmTap(e.currentTarget, async () => {
      const { error } = await sb.from('announcements').delete().eq('id', a.id);
      error ? toast(error.message, true) : toast('Removed.'); ADMIN.ann(el, alive);
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
