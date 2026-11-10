/* =====================================================================
   SemPrep — student views
   ===================================================================== */

/* ---------- landing ---------- */
VIEWS.landing = () => {
  const d = isDiwali();
  document.getElementById('app').innerHTML = `
  <header class="topbar"><div class="wrap">
    ${logoHTML('#landing')}
    <nav aria-label="Sections"><a href="#how" data-scroll="how">How it works</a><a href="#inside" data-scroll="inside">What's inside</a><a href="#about">About</a></nav>
    <div class="actions">${switchHTML()}<a class="btn ghost sm login" href="#login">Log in</a><a class="btn sm" href="#signup">Sign up</a></div>
  </div></header>
  <main>
    <section class="wrap hero">
      <div>
        <h1>${d ? 'Light up your 3‑1 syllabus before the exams.' : 'Prepare for 3‑1, one unit at a time.'}</h1>
        <p class="lead">SemPrep puts every unit of your 3‑1 subjects in one place: the college notes, short notes made for the exam, a quiz for every unit with an explanation for every answer, and the Mid answers and bits. Read a unit, test yourself, and see exactly which topics need another look.</p>
        <div class="cta"><a class="btn" href="#signup">Sign up with your college email</a><a class="btn ghost" href="#login">I have an account</a></div>
        <p class="note">Free for QISCET students. You'll need your @${DOMAIN} email.</p>
      </div>
      <div class="card map-card">
        ${octoSVG('octo mascot')}
        <h3>${d ? 'Every unit you finish lights a diya' : 'Every unit you finish fills a stop'}</h3>
        <span class="example">An example syllabus map</span>
        ${mapHTML(EXAMPLE_MAP)}
        ${legendHTML()}
      </div>
    </section>
    <section class="band"><div class="wrap">
      <span class="label">This semester</span>
      ${SUBJECTS.map(s => `<span class="subj"><span class="dot" style="background:var(--s-${s.id})"></span><b>${s.code}</b> ${s.name}</span>`).join('')}
    </div></section>
    <section class="section" id="how"><div class="wrap">
      <h2>How it works</h2>
      <div class="grid g3 steps">
        <div class="card step"><div class="num">1</div><h3>Read</h3><p>Open a unit and read the college material and the special short notes, right in your browser. Every page you see is saved.</p></div>
        <div class="card step"><div class="num">2</div><h3>Take the quiz</h3><p>25 questions from the unit, 15 minutes. You get the right answer and a one-line reason for every question, plus your weak topics.</p></div>
        <div class="card step"><div class="num">3</div><h3>Climb</h3><p>Finished units and your best quiz scores earn points on the class leaderboard. Retake as often as you like.</p></div>
      </div>
    </div></section>
    <section class="section" id="inside"><div class="wrap">
      <h2>What's inside</h2>
      <div class="grid inside">
        <div class="card dark wide">
          <div><h3 style="font-size:1.6rem">A quiz for every unit</h3><p>Questions drawn from a bank of up to 100 per unit, easy to medium, graded the moment you submit. Wrong ones go into a "Revise my mistakes" round.</p></div>
          <div class="sample-q" aria-label="Example question">
            <span class="chip dark">Example · ML Unit 1</span>
            <p class="q">Which type of learning uses labelled training data?</p>
            <div class="opt"><b>A</b> Unsupervised learning</div>
            <div class="opt right"><b>B</b> Supervised learning ${icon('check', 18)}</div>
            <div class="opt"><b>C</b> Reinforcement learning</div>
            <p class="why">Why: supervised learning learns a mapping from inputs to known labels.</p>
          </div>
        </div>
        <div class="card"><h3>College and special material</h3><p>The college's notes and question banks for every unit, plus short notes and cheat sheets made for revision.</p></div>
        <div class="card"><h3>Mid answers and bits</h3><p>Full answers to the important Mid questions and the one-mark bits, for every subject.</p></div>
        <div class="card"><h3>Leaderboard</h3><p>See where you stand in the class, overall and per subject.</p></div>
        <div class="card"><h3>Read anywhere</h3><p>Works on your phone. Material is view only, so it stays within SemPrep.</p></div>
      </div>
    </div></section>
    <section class="final on-gold"><div class="wrap">
      <svg class="octo" viewBox="0 0 120 120" aria-hidden="true">${d ? OCTO : OCTO_PLAIN}</svg>
      <h2>Exams are close. Start with one unit tonight.</h2>
      <a class="btn" href="#signup">Create your account</a>
    </div></section>
  </main>
  <footer class="foot">SemPrep · made by Fawwaz for QISCET students · <a href="#about">About SemPrep</a></footer>`;
  $$('[data-scroll]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.getElementById(a.dataset.scroll).scrollIntoView({ behavior: 'smooth' }); }));
};

/* ---------- about (public; also inside the app for logged-in students) ---------- */
function aboutHTML() {
  const inApp = !!S.session;
  const cta = inApp
    ? `<a class="btn" href="#home">Go to my units</a><a class="btn ghost" href="#mid2">Open Mid answers</a>`
    : `<a class="btn" href="#signup">Sign up with your college email</a><a class="btn ghost" href="#login">I have an account</a>`;
  return `
  <article class="about">
    <header class="about-hero">
      <span class="chip">About SemPrep</span>
      <h1>One place to prepare for every 3‑1 exam.</h1>
      <p class="lead">SemPrep is a free study website for QISCET 3‑1 students. It brings together everything you need for the semester and Mid exams, unit by unit, so you spend your time studying instead of searching WhatsApp groups for the right PDF.</p>
      <div class="cta">${cta}</div>
    </header>

    <section class="about-block">
      <h2>Why SemPrep exists</h2>
      <div class="about-text">
        <p>Before every exam, the same thing happens: notes are scattered across groups and drives, nobody is sure which version is the right one, and there's no easy way to check whether you actually understood a unit.</p>
        <p>SemPrep fixes that. Every subject of the semester (${SUBJECTS.map(s => s.code).join(', ')}) is split into its five units, and each unit has its notes, its short revision notes and its own quiz, all in one place.</p>
      </div>
    </section>

    <section class="about-block">
      <h2>How it helps for the semester exams</h2>
      <div class="grid g2 about-grid">
        <div class="card"><span class="about-ico">${icon('book', 22)}</span><h3>Unit-wise material</h3><p>The college notes and question banks for every unit, plus special short notes and cheat sheets made for quick revision before the exam.</p></div>
        <div class="card"><span class="about-ico">${icon('quiz', 22)}</span><h3>A quiz for every unit</h3><p>25 questions in 15 minutes, with diagrams where the topic needs them. Every answer comes with a one-line explanation, so you learn from each mistake.</p></div>
        <div class="card"><span class="about-ico">${icon('progress', 22)}</span><h3>Know your weak topics</h3><p>After each quiz you see which topics went wrong, and a "Revise my mistakes" round asks you only the questions you missed.</p></div>
        <div class="card"><span class="about-ico">${icon('layers', 22)}</span><h3>See what's left</h3><p>Your syllabus map fills up as you read and pass units, so you always know exactly what's done and what still needs time.</p></div>
        <div class="card"><span class="about-ico">${icon('expand', 22)}</span><h3>Read without distractions</h3><p>Read mode opens the notes full screen with page-by-page buttons, so you can focus on one page at a time.</p></div>
        <div class="card"><span class="about-ico">${icon('clock', 22)}</span><h3>Exam countdown</h3><p>A countdown to the first exam is always at the top, so you can plan how many units to finish each day.</p></div>
      </div>
    </section>

    <section class="about-block">
      <h2>How it helps for the Mid exams and last-minute revision</h2>
      <div class="grid g3 about-grid">
        <div class="card dark"><h3>Mid answers</h3><p>Full answers to the important questions for Mid 1 and Mid 2, for every subject.</p></div>
        <div class="card"><h3>2 marks answers</h3><p>Short, exam-ready answers for the 2-mark questions, so you can score the easy marks quickly.</p></div>
        <div class="card gold on-gold"><h3>Mid bits</h3><p>The one-mark objective questions with their answers, ready for quick practice.</p></div>
        <div class="card"><h3>Cheat sheets</h3><p>Formulas, definitions and key points for each subject on a page or two.</p></div>
        <div class="card dark"><h3>Last minute revision sheets</h3><p>The must-know points to go through the night before and the morning of the exam.</p></div>
      </div>
    </section>

    <section class="about-block">
      <h2>A simple way to use it</h2>
      <ol class="about-steps">
        <li><span><b>Pick one unit a day.</b> Read the college material first, then the short notes.</span></li>
        <li><span><b>Take that unit's quiz.</b> Read the explanation for every question you got wrong.</span></li>
        <li><span><b>Revise your mistakes.</b> Retake only the questions you missed until they stick.</span></li>
        <li><span><b>Before the exam,</b> go through the Mid answers, 2 marks answers, bits, cheat sheets and last minute revision sheets for each subject.</span></li>
      </ol>
    </section>

    <section class="about-block">
      <div class="card dark about-maker">
        ${octoSVG('octo', false)}
        <div>
          <span class="chip dark">Made by</span>
          <h2>Fawwaz</h2>
          <p>Hi, I'm Fawwaz, a student at QISCET. I built SemPrep because I wanted one clear, organised place to prepare for our exams, and I thought every classmate deserved the same. I designed it, built it and keep adding the material.</p>
          <p>If something is missing, wrong, or could be better, please tell me through the Feedback page. I read every message and keep improving SemPrep with your suggestions.</p>
          ${inApp ? '<a class="btn" style="margin-top:14px" href="#feedback">Send feedback to Fawwaz</a>' : ''}
        </div>
      </div>
    </section>

    <section class="about-block">
      <h2>Good to know</h2>
      <div class="grid g3 about-grid">
        <div class="card"><h3>Free for QISCET students</h3><p>Sign up with your @${DOMAIN} college email. There's nothing to pay.</p></div>
        <div class="card"><h3>Works on your phone</h3><p>Use it in any browser, on a phone or a laptop. Your progress is saved to your account.</p></div>
        <div class="card"><h3>View only</h3><p>Material can be read inside SemPrep but not downloaded, so it stays with QISCET students.</p></div>
      </div>
    </section>
  </article>`;
}
VIEWS.about = () => {
  if (S.session) { shell('about', aboutHTML()); return; }
  document.getElementById('app').innerHTML = `
  <header class="topbar"><div class="wrap">
    ${logoHTML('#landing')}
    <nav aria-label="Sections"><a href="#landing">Home</a><a href="#about" aria-current="page">About</a></nav>
    <div class="actions">${switchHTML()}<a class="btn ghost sm login" href="#login">Log in</a><a class="btn sm" href="#signup">Sign up</a></div>
  </div></header>
  <main class="wrap about-public">${aboutHTML()}</main>
  <footer class="foot">SemPrep · made by Fawwaz for QISCET students</footer>`;
};

/* ---------- shared pieces ---------- */
function pdfRowHTML(m, { dark = false } = {}) {
  const n = m.page_count || 0;
  const r = S.reading[m.id];
  const seen = r ? Math.min(r.pages_viewed.length, Math.max(n, 1)) : 0;
  const pct = matPct(m);
  const status = !r ? 'not opened' : `${n} pages · ${seen} of ${n} read`;
  const btn = !r ? 'Read' : pct >= 100 ? 'Read again' : 'Continue';
  return `<div class="pdf-row" style="--c:var(--s-${m.subject_id})">
    <span class="pdf-ico">${icon('pdf', 22)}</span>
    <div class="info"><b>${esc(m.title)}</b><small>${r ? esc(status) : `${n} pages · not opened`}</small>${r ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</div>
    <a class="btn sm ${dark ? '' : 'ghost'}" href="#reader/${m.id}">${btn}</a>
  </div>`;
}
// Home-page announcement box (data + bell logic live in app.js)
function annBoxHTML(showAll = false) {
  const anns = S.anns || [];
  const unseen = new Set(unseenAnns().map(a => a.id));
  const shown = showAll ? anns : anns.slice(0, 3);
  return `<section class="card ann-box" id="annbox" aria-labelledby="annbox-h">
    <div class="ann-box-head">
      <span class="ann-box-ico">${icon('megaphone', 22)}</span>
      <div><h3 id="annbox-h">Announcements</h3><p class="small muted">${anns.length ? `${anns.length} active` : 'Updates from the admin show up here'}</p></div>
      ${unseen.size ? `<span class="ann-newpill">${unseen.size} new</span>` : ''}
      <span class="spacer"></span>
      ${unseen.size ? '<button class="linkbtn small ann-markread" data-act="ann-read">Mark all read</button>' : ''}
    </div>
    ${anns.length ? `<div class="ann-list">${shown.map(a => annItemHTML(a, unseen)).join('')}</div>` : '<div class="ann-empty">No announcements right now. You will get a notification here when there is one.</div>'}
    ${anns.length > 3 ? `<button class="linkbtn small ann-more" data-annall="${showAll ? 0 : 1}">${showAll ? 'Show less' : `Show all ${anns.length}`}</button>` : ''}
  </section>`;
}
function annBoxEl(showAll = false) {
  const t = document.createElement('template'); t.innerHTML = annBoxHTML(showAll).trim();
  const el = t.content.firstChild;
  el.querySelector('[data-annall]')?.addEventListener('click', e => el.replaceWith(annBoxEl(e.currentTarget.dataset.annall === '1')));
  return el;
}
// used by the Admin announcement preview
function annHTML(a) { return `<div class="ann-box ann-preview"><div class="ann-list">${annItemHTML(a, new Set())}</div></div>`; }

/* ---------- home ---------- */
VIEWS.home = async (args, alive) => {
  const c = shell('home');
  await Promise.all([loadAnnouncements(), refreshProgress(), loadRank()]);
  if (!alive()) return;
  shell('home'); // re-render sidebar with fresh progress
  const d = isDiwali();
  const name = esc(S.profile?.username || 'there');
  const read = unitsReadCount();
  const quizzed = S.units.filter(u => u.is_visible && unitState(u).attempts > 0).length;
  const nu = nextUpUnit();
  const nuS = nu ? unitState(nu) : null;
  const nuSub = nu ? SUBJ[nu.subject_id] : null;
  $('#content').innerHTML = `
    <section class="card home-hero">
      <div class="mapside">
        <h1>${d ? `Happy Diwali, ${name}. ${read} of 25 diyas are lit.` : `Hi ${name}, you've covered ${read} of 25 units.`}</h1>
        ${mapHTML(myMapRows(), { clickable: true })}
        ${legendHTML()}
      </div>
      <aside class="nextup" aria-label="Next up">
        ${RANGOLI}
        <span class="muted small" style="color:var(--panel-muted)">Next up</span>
        ${nu ? `<span class="chip dark" style="align-self:flex-start"><span class="dot" style="background:var(--s-${nu.subject_id})"></span>${nuSub.code} · Unit ${nu.unit_no}</span>
        <h3>${esc(nu.title || nuSub.name)}</h3>
        <div><div class="bar"><i style="width:${nuS.pct}%"></i></div><small style="color:var(--panel-muted)">${nuS.has ? `${nuS.pct}% read` : 'Material coming soon'}</small></div>
        <a class="btn" href="#subject/${nu.subject_id}/${nu.unit_no}">${nuS.pct > 0 ? 'Continue reading' : 'Start reading'}</a>` : '<p>All caught up.</p>'}
        <div class="stat"><span>Units quizzed</span><b>${quizzed}/25</b></div>
        <div class="stat"><span>Leaderboard rank</span><b>${S.myRank ? '#' + S.myRank : '—'}</b></div>
      </aside>
    </section>
    <section class="stack" style="margin-top:22px">
      <div id="annslot"></div>
      ${d ? `<div class="card greet">${octoSVG('octo', false)}<div><h3>Happy Diwali from SemPrep</h3><p class="muted" style="margin-top:4px">Take tonight off and celebrate. Your progress will be right here when you're back.</p></div></div>` : ''}
      <div class="grid g2">
        <div class="card"><h3>Exam-ready material</h3><p class="muted">Mid answers, 2 marks answers, Mid bits, cheat sheets and last minute revision sheets for every subject.</p><div class="row wrap" style="margin-top:16px;gap:8px">${EXAM_PAGES.map(x => `<a class="btn sm ghost" href="#${x.nav}">${x.label}</a>`).join('')}</div></div>
        <div class="card gold on-gold"><h3>Is SemPrep helping?</h3><p style="margin-top:6px">Tell Fawwaz what works and what should be added. It takes a minute.</p><a class="btn" style="margin-top:16px" href="#feedback">Give feedback</a></div>
      </div>
    </section>`;
  $('#annslot').replaceWith(annBoxEl());
};

/* ---------- subject ---------- */
VIEWS.subject = async ([sid, unitNo], alive) => {
  if (!SUBJ[sid]) return go('#home');
  const s = SUBJ[sid];
  shell('', '');
  await refreshProgress();
  if (!alive()) return;
  shell('');
  const units = unitsOf(sid);
  const u = units.find(x => x.unit_no === Number(unitNo)) || units[0];
  if (!u) { $('#content').innerHTML = '<div class="empty">This subject has no units yet.</div>'; return; }
  const st = unitState(u);
  const college = visibleMats({ unit_id: u.id, section: 'college' });
  const special = visibleMats({ unit_id: u.id, section: 'special' });
  const list = (ms, dark) => ms.length ? ms.map(m => pdfRowHTML(m, { dark })).join('') : `<div class="empty">Nothing uploaded for this unit yet.</div>`;
  $('#content').innerHTML = `
    <section class="card" style="--c:var(--s-${sid})">
      <span class="code-${sid}" style="font-family:var(--font-h);font-weight:800;font-size:1.1rem">${s.code}</span>
      <h1 style="font-size:clamp(1.6rem,3.6vw,2.4rem);margin-top:4px">${s.name}</h1>
      <div class="unit-tabs" role="tablist">${units.map(x => { const xs = unitState(x); return `<button role="tab" class="unit-tab ${x.id === u.id ? 'on' : ''}" aria-selected="${x.id === u.id}" data-go="#subject/${sid}/${x.unit_no}"><b>Unit ${x.unit_no}</b><span>${esc(x.title || '')}&nbsp;</span><div class="bar"><i style="width:${xs.pct}%"></i></div></button>`; }).join('')}</div>
    </section>
    <h2 style="margin:26px 0 14px;font-size:1.5rem">${esc(unitLabel(u))}</h2>
    <div class="grid g2">
      <section class="card"><h3>College material</h3><p class="muted small" style="margin-bottom:8px">Notes and question banks from the college</p>${list(college, false)}</section>
      <section class="card dark special"><h3>Special material</h3><p class="small" style="color:var(--panel-muted);margin:6px 0 8px">Short notes and cheat sheets for revision</p>${list(special, true)}</section>
    </div>
    <section class="card quiz-band" style="margin-top:18px;--c:var(--s-${sid})">
      <div class="ring" style="--p:${st.best ?? 0};--c:var(--s-${sid})"><b>${st.best != null ? st.best + '%' : '—'}</b></div>
      <div class="info"><h3>Unit ${u.unit_no} quiz</h3><p>${QUIZ_SIZE} random questions from the unit's bank · ${QUIZ_MINUTES} minutes · easy to medium</p>
        ${st.has && st.state !== 'done' ? '<p class="small muted">Finish reading this unit for your score to count on the leaderboard.</p>' : ''}</div>
      <a class="btn" href="#quiz/${u.id}">${st.attempts ? 'Retake quiz' : 'Start quiz'}</a>
    </section>`;
};

/* ---------- PDF reader ---------- */
VIEWS.reader = async ([mid], alive) => {
  const m = S.materials.find(x => x.id === mid && (x.is_visible || isAdmin()));
  if (!m) { shell('', '<div class="empty">This PDF is not available.</div>'); return; }
  const u = m.unit_id ? unitById(m.unit_id) : null;
  const s = SUBJ[m.subject_id];
  const ep = EXAM_BY_SECTION[m.section] || EXAM_PAGES[0];
  const back = u ? `#subject/${m.subject_id}/${u.unit_no}` : `#${ep.nav}/${m.subject_id}`;
  const backLabel = u ? `Back to ${s.code} Unit ${u.unit_no}` : `Back to ${ep.label}`;
  const nav = u ? '' : ep.nav;
  const c = shell(nav, `
    <a class="back row" href="${back}" style="text-decoration:none;font-weight:600;color:var(--text2);min-height:44px">${icon('back', 18)}${backLabel}</a>
    <div class="page-head"><div style="flex:1;min-width:0"><h1 style="font-size:clamp(1.5rem,3.4vw,2.2rem)">${esc(m.title)}</h1><p>${s.code} · ${u ? 'Unit ' + u.unit_no + ' · ' : ''}${SECTION_LABEL[m.section]}</p></div>
      <button class="btn" type="button" id="rmBtn" title="Full screen, just the pages">${icon('expand', 18)}Read mode</button></div>
    <div class="reader">
      <div class="desk" id="desk"><div class="loading"><div class="spinner" aria-label="Loading PDF"></div></div></div>
      <aside class="card reader-side" id="rside"></aside>
    </div>`);
  const uid = S.session.user.id;
  const prev = S.reading[m.id];
  const seen = new Set(prev ? prev.pages_viewed : []);
  let total = m.page_count || 0, saveT = null, dirty = false, doc = null, renderObs = null, seenObs = null, wraps = [];

  /* --- read mode: full screen, only the pages, an exit button --- */
  let reading = false, rmRaf = 0, rmStart = 1;
  const curPage = () => {
    const mid = innerHeight * 0.4; let p = 1;
    for (const w of wraps) { if (w.getBoundingClientRect().top <= mid) p = Number(w.dataset.page); else break; }
    return p;
  };
  const updateRmBar = () => {
    const bar = $('.rm-bar'); if (!bar) return;
    const pct = Math.min(100, Math.floor(seen.size * 100 / Math.max(total, 1)));
    $('.rm-page', bar).textContent = `Page ${wraps.length ? curPage() : 1} of ${total || '…'}`;
    $('.rm-pct', bar).textContent = `${pct}% read`;
    $('.rm-fill', bar).style.width = pct + '%';
  };
  /* --- previous / next page (both normal view and read mode) --- */
  const updatePager = () => {
    const pg = $('#pager'); if (!pg) return;
    const p = curPage();
    $('.pager-num', pg).textContent = `${p} / ${total}`;
    $('[data-pg="-1"]', pg).disabled = p <= 1;
    $('[data-pg="1"]', pg).disabled = p >= total;
  };
  const onRmScroll = () => { cancelAnimationFrame(rmRaf); rmRaf = requestAnimationFrame(() => { updateRmBar(); updatePager(); }); };
  const goPage = (p, smooth = false) => requestAnimationFrame(() => wraps[p - 1]?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' }));
  const stepPage = d => {
    if (!wraps.length) return;
    goPage(Math.min(total, Math.max(1, curPage() + d)), true);
  };
  const enterRead = () => {
    if (reading) return;
    const p = wraps.length ? curPage() : 1;
    reading = true; rmStart = p;
    document.body.classList.add('read-mode');
    const bar = document.createElement('div');
    bar.className = 'rm-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Read mode');
    bar.innerHTML = `<div class="rm-title">${esc(m.title)}</div><span class="rm-page"></span><span class="rm-pct"></span>
      <button class="btn sm rm-exit" type="button">${icon('x', 16)}Exit read mode</button><div class="rm-track"><i class="rm-fill"></i></div>`;
    document.body.appendChild(bar);
    $('.rm-exit', bar).onclick = () => exitRead();
    document.documentElement.requestFullscreen?.().catch(() => {}); // works without it too
    goPage(p); updateRmBar();
    $('.rm-exit', bar).focus({ preventScroll: true });
  };
  const exitRead = (fromFullscreen = false) => {
    if (!reading) return;
    const p = wraps.length ? curPage() : 1;
    reading = false;
    $('.rm-bar')?.remove();
    document.body.classList.remove('read-mode');
    if (!fromFullscreen && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    goPage(p);
    $('#rmBtn')?.focus({ preventScroll: true });
  };
  const onFsChange = () => {
    if (!reading) return;
    if (document.fullscreenElement) goPage(rmStart); // layout changed when fullscreen kicked in
    else exitRead(true);                             // Esc / browser exit also leaves read mode
  };
  const onRmKey = e => {
    if (e.key === 'Escape' && reading) { e.preventDefault(); exitRead(); return; }
    if (e.target.closest?.('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); stepPage(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stepPage(-1); }
  };

  const drawSide = () => {
    const n = Math.max(total, 1);
    const pct = Math.min(100, Math.floor(seen.size * 100 / n));
    $('#rside').innerHTML = `<div class="big-pct">${pct}%</div><p class="muted">read · ${Math.min(seen.size, total)} of ${total} pages seen</p>
      <div class="page-grid" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${seen.has(i + 1) ? 'on' : ''}"></i>`).join('')}</div>
      ${u ? `<a class="btn block" style="margin-top:18px" href="#quiz/${u.id}">Take the Unit ${u.unit_no} quiz</a>` : ''}
      <p class="small muted" style="margin-top:14px">View only. Your name is on every page.</p>`;
    updateRmBar();
  };
  const save = async () => {
    if (!dirty) return; dirty = false;
    const pages = [...seen].sort((a, b) => a - b);
    const row = { user_id: uid, material_id: m.id, pages_viewed: pages, total_pages: total, completed: pages.length >= total, updated_at: new Date().toISOString() };
    S.reading[m.id] = row;
    const { error } = await sb.from('reading_progress').upsert(row);
    if (error) { dirty = true; console.warn(error); }
  };
  const queueSave = () => { dirty = true; clearTimeout(saveT); saveT = setTimeout(save, 1000); };
  const block = e => {
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'c'].includes(e.key.toLowerCase())) { e.preventDefault(); toast('Saving, printing and copying are off for this material.'); }
  };
  const noCtx = e => { if (e.target.closest('#desk')) e.preventDefault(); };
  document.addEventListener('keydown', block);
  document.addEventListener('contextmenu', noCtx);
  document.addEventListener('keydown', onRmKey);
  document.addEventListener('fullscreenchange', onFsChange);
  window.addEventListener('pagehide', save);
  window.addEventListener('scroll', onRmScroll, { passive: true });
  $('#rmBtn').onclick = enterRead;
  S.cleanup = () => {
    exitRead();
    window.removeEventListener('scroll', onRmScroll);
    $('#pager')?.remove();
    document.removeEventListener('keydown', onRmKey);
    document.removeEventListener('fullscreenchange', onFsChange);
    clearTimeout(saveT); save();
    document.removeEventListener('keydown', block);
    document.removeEventListener('contextmenu', noCtx);
    window.removeEventListener('pagehide', save);
    renderObs?.disconnect(); seenObs?.disconnect(); doc?.destroy();
  };
  drawSide();

  const { data: signed, error } = await sb.storage.from('materials').createSignedUrl(m.file_path, 600);
  if (!alive()) return;
  if (error || !signed) { $('#desk').innerHTML = '<div class="empty" style="color:#ccc">Could not open this PDF. Try again in a moment.</div>'; return; }
  try {
    // fetch only the byte ranges of pages being viewed (saves Supabase egress); falls back to a full download if ranges aren't supported
    doc = await pdfjsLib.getDocument({ url: signed.signedUrl, disableAutoFetch: true, disableStream: true, rangeChunkSize: 262144 }).promise;
  } catch (e) { if (alive()) $('#desk').innerHTML = '<div class="empty" style="color:#ccc">Could not load this PDF.</div>'; return; }
  if (!alive()) { doc.destroy(); return; }
  total = doc.numPages;
  drawSide();
  const desk = $('#desk'); desk.innerHTML = '';
  const label = `${S.profile?.username || ''} · ${S.profile?.email || S.session.user.email}`;
  const wm = `<div class="wm"><div>${Array.from({ length: 36 }, () => `<span>${esc(label)}</span>`).join('')}</div></div>`;
  const first = await doc.getPage(1);
  const vp1 = first.getViewport({ scale: 1 });
  for (let i = 1; i <= total; i++) {
    const w = document.createElement('div');
    w.className = 'page-wrap'; w.dataset.page = i;
    w.style.aspectRatio = `${vp1.width} / ${vp1.height}`;
    w.innerHTML = wm + `<span class="pg">${i} / ${total}</span>`;
    desk.appendChild(w); wraps.push(w);
  }
  const rendering = new Set();
  const renderPage = async w => {
    const i = Number(w.dataset.page);
    if (rendering.has(i) || !doc) return; rendering.add(i);
    try {
      const page = await doc.getPage(i);
      const vp0 = page.getViewport({ scale: 1 });
      w.style.aspectRatio = `${vp0.width} / ${vp0.height}`;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = (w.clientWidth * dpr) / vp0.width;
      const vp = page.getViewport({ scale });
      const cv = document.createElement('canvas');
      cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
      cv.setAttribute('aria-label', `Page ${i}`);
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      w.prepend(cv);
    } catch (e) { rendering.delete(i); }
  };
  renderObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { renderPage(e.target); renderObs.unobserve(e.target); } }), { rootMargin: '1200px 0px' });
  seenObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const rootH = e.rootBounds ? e.rootBounds.height : window.innerHeight;
    if (e.intersectionRatio >= 0.4 || e.intersectionRect.height >= rootH * 0.6) {
      const i = Number(e.target.dataset.page);
      if (!seen.has(i)) { seen.add(i); drawSide(); queueSave(); }
    }
  }), { threshold: [0, .1, .2, .3, .4, .5, .6, .8, 1] });
  wraps.forEach(w => { renderObs.observe(w); seenObs.observe(w); });
  if (total > 1) {
    const pg = document.createElement('nav');
    pg.id = 'pager'; pg.className = 'pager'; pg.setAttribute('aria-label', 'Pages');
    pg.innerHTML = `<button class="pager-btn" type="button" data-pg="-1" aria-label="Previous page">${icon('back', 18)}<span>Previous</span></button>
      <span class="pager-num" aria-live="polite">1 / ${total}</span>
      <button class="pager-btn" type="button" data-pg="1" aria-label="Next page"><span>Next</span>${icon('next', 18)}</button>`;
    document.body.appendChild(pg);
    $$('[data-pg]', pg).forEach(b => b.onclick = () => stepPage(Number(b.dataset.pg)));
    updatePager();
  }
  if (total && (!m.page_count || m.page_count !== total) && isAdmin()) sb.from('materials').update({ page_count: total }).eq('id', m.id);
};

/* ---------- quiz diagrams (private bucket → short-lived signed URLs) ---------- */
async function signQuizImages(paths) {
  const list = [...new Set((paths || []).filter(Boolean))];
  if (!list.length) return {};
  const { data } = await sb.storage.from('quiz-images').createSignedUrls(list, 3600);
  return Object.fromEntries((data || []).filter(x => x.signedUrl).map(x => [x.path, x.signedUrl]));
}
function qImgHTML(url) {
  return url ? `<figure class="qimg"><a href="${esc(url)}" target="_blank" rel="noopener" title="Open full size"><img src="${esc(url)}" alt="Diagram for this question" loading="lazy"></a></figure>` : '';
}

/* ---------- quiz ---------- */
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
VIEWS.quiz = async ([unitId, mode, attemptId], alive) => {
  const u = unitById(unitId);
  if (!u) return go('#home');
  const s = SUBJ[u.subject_id];
  const practice = mode === 'revise' && !!attemptId;
  shell('');
  const { data, error } = await sb.rpc('get_quiz', { p_unit: u.id, p_count: QUIZ_SIZE, p_retry: practice ? attemptId : null });
  if (!alive()) return;
  if (error) { $('#content').innerHTML = `<div class="empty">Could not load the quiz. ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) {
    $('#content').innerHTML = `<div class="card" style="max-width:640px;margin:0 auto;text-align:center">${octoSVG('octo')}<h2>${practice ? 'Nothing to revise' : 'No questions yet'}</h2><p class="muted" style="margin:8px 0 18px">${practice ? 'You got every question right in that attempt.' : `The ${s.code} Unit ${u.unit_no} quiz isn't ready yet. Check back soon.`}</p><a class="btn" href="#subject/${u.subject_id}/${u.unit_no}">Back to Unit ${u.unit_no}</a></div>`;
    return;
  }
  const imgs = await signQuizImages(data.map(q => q.image_path));
  if (!alive()) return;
  const qs = data.map(q => ({ ...q, opts: [q.option_a, q.option_b, q.option_c, q.option_d], order: shuffle([0, 1, 2, 3]) }));
  const ans = {}; let cur = 0, submitting = false;
  const endAt = Date.now() + QUIZ_MINUTES * 60000;
  const c = $('#content');

  const answeredCount = () => Object.keys(ans).length;
  const draw = () => {
    const q = qs[cur];
    const last = cur === qs.length - 1;
    c.innerHTML = `<div class="quiz">
      <div class="quiz-top"><span class="chip"><span class="dot" style="background:var(--s-${u.subject_id})"></span>${s.code} · Unit ${u.unit_no} ${practice ? 'practice' : 'quiz'}</span>
        <span class="muted small">Question ${cur + 1} of ${qs.length} · ${answeredCount()} answered</span>
        <span class="timer" id="timer" aria-live="off">${icon('clock', 18)}<span id="tt">--:--</span></span></div>
      <div class="qbars" role="navigation" aria-label="Questions">${qs.map((x, i) => `<button type="button" data-q="${i}" class="${i === cur ? 'cur' : ''} ${ans[x.id] !== undefined ? 'ans' : ''}" aria-label="Question ${i + 1}${ans[x.id] !== undefined ? ', answered' : ''}"></button>`).join('')}</div>
      <div class="card">
        <span class="chip">${esc(q.topic)}</span>
        <p class="qtext">${esc(q.question)}</p>
        ${qImgHTML(imgs[q.image_path])}
        <div class="opts" role="radiogroup" aria-label="Options">${q.order.map((orig, i) => `<button type="button" role="radio" aria-checked="${ans[q.id] === orig}" class="opt ${ans[q.id] === orig ? 'sel' : ''}" data-o="${orig}"><span class="k">${'ABCD'[i]}</span><span>${esc(q.opts[orig])}</span></button>`).join('')}</div>
      </div>
      <div class="quiz-nav">
        <button class="btn ghost" id="prev" ${cur === 0 ? 'disabled' : ''}>${icon('back', 18)}Previous</button>
        <span class="spacer"></span>
        ${last ? `<button class="btn" id="submit">Submit quiz</button>` : `<button class="btn" id="next">Next question${icon('next', 18)}</button>`}
      </div>
      ${!last ? `<p style="text-align:right;margin-top:10px"><button class="linkbtn small" id="submit2">Submit now</button></p>` : ''}
      <p class="kbd-hint">Keyboard: A, B, C, D to answer · Enter for next</p>
    </div>`;
    tick();
    $$('.qbars button', c).forEach(b => b.onclick = () => { cur = Number(b.dataset.q); draw(); });
    $$('.opt', c).forEach(b => b.onclick = () => choose(Number(b.dataset.o)));
    $('#prev', c).onclick = () => { if (cur > 0) { cur--; draw(); } };
    if ($('#next', c)) $('#next', c).onclick = () => { cur++; draw(); };
    const sub = $('#submit', c) || $('#submit2', c);
    const subHandler = e => {
      const left = qs.length - answeredCount();
      if (left > 0) confirmTap(e.currentTarget, submit, `${left} unanswered — tap again to submit`); else submit();
    };
    if ($('#submit', c)) $('#submit', c).onclick = subHandler;
    if ($('#submit2', c)) $('#submit2', c).onclick = subHandler;
  };
  const choose = orig => { ans[qs[cur].id] = orig; draw(); };
  const tick = () => {
    const left = Math.max(0, endAt - Date.now());
    const mm = String(Math.floor(left / 60000)).padStart(2, '0'), ss = String(Math.floor(left / 1000) % 60).padStart(2, '0');
    const t = $('#tt'); if (t) t.textContent = `${mm}:${ss}`;
    $('#timer')?.classList.toggle('low', left < 60000);
    if (left <= 0 && !submitting) { toast("Time's up — submitting your answers."); submit(); }
  };
  const timer = setInterval(tick, 1000);
  const onKey = e => {
    if (e.target.matches('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const i = 'abcd'.indexOf(k);
    if (i >= 0 && k.length === 1) { e.preventDefault(); choose(qs[cur].order[i]); }
    else if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); if (cur < qs.length - 1) { cur++; draw(); } }
    else if (e.key === 'ArrowRight' && cur < qs.length - 1) { cur++; draw(); }
    else if (e.key === 'ArrowLeft' && cur > 0) { cur--; draw(); }
  };
  const beforeUnload = e => { if (!submitting) { e.preventDefault(); e.returnValue = ''; } };
  document.addEventListener('keydown', onKey);
  window.addEventListener('beforeunload', beforeUnload);
  S.cleanup = () => { clearInterval(timer); document.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', beforeUnload); };

  async function submit() {
    if (submitting) return; submitting = true;
    clearInterval(timer);
    c.innerHTML = '<div class="loading"><div class="spinner" aria-label="Grading"></div><p class="muted" style="margin-top:12px">Grading your answers…</p></div>';
    const payload = qs.map(q => ({ question_id: q.id, chosen: ans[q.id] ?? null }));
    const { data: rows, error } = await sb.rpc('submit_quiz', { p_unit: u.id, p_answers: payload, p_practice: practice });
    if (error || !rows?.length) {
      submitting = false; toast('Could not submit: ' + errMsg(error) + ' Try again.', true); draw();
      return;
    }
    const byId = Object.fromEntries(rows.map(r => [r.question_id, r]));
    S.lastResult = { attemptId: rows[0].attempt_id, unitId: u.id, score: rows[0].score, total: rows[0].total, percent: rows[0].percent, practice,
      items: qs.map(q => byId[q.id]).filter(Boolean) };
    refreshProgress();
    go('#result/' + rows[0].attempt_id);
  }
  draw();
};

/* ---------- result ---------- */
VIEWS.result = async ([attemptId], alive) => {
  shell('');
  let R = S.lastResult && S.lastResult.attemptId === attemptId ? S.lastResult : null;
  if (!R) {
    if (!attemptId) return go('#perf');
    const { data, error } = await sb.rpc('get_attempt', { p_attempt: attemptId });
    if (!alive()) return;
    if (error || !data?.length) { $('#content').innerHTML = '<div class="empty">This attempt could not be found.</div>'; return; }
    const r0 = data[0];
    R = { attemptId, unitId: r0.unit_id, score: r0.score, total: r0.total, percent: r0.percent, practice: r0.is_practice, items: data };
  }
  const imgs = await signQuizImages(R.items.map(x => x.image_path));
  if (!alive()) return;
  const u = unitById(R.unitId); const s = SUBJ[u?.subject_id] || SUBJECTS[0];
  const wrong = R.items.filter(x => x.chosen !== x.correct).length;
  const head = R.percent >= 80 ? 'Strong unit. Keep it fresh with a retake later.' : R.percent >= 50 ? 'Good base — the weak topics below are where your marks are.' : 'Reread the weak topics, then try again.';
  const topics = {};
  R.items.forEach(x => { const t = topics[x.topic] ||= { n: 0, ok: 0 }; t.n++; if (x.chosen === x.correct) t.ok++; });
  let filter = 'all';
  const L = 'ABCD';
  const answersHTML = () => R.items.map((x, i) => ({ x, i })).filter(({ x }) => filter === 'all' || x.chosen !== x.correct).map(({ x, i }) => {
    const ok = x.chosen === x.correct;
    return `<div class="answer"><div class="row"><span class="mark ${ok ? 'ok' : 'no'}" aria-label="${ok ? 'Correct' : 'Wrong'}">${icon(ok ? 'check' : 'x', 16)}</span><b>Q${i + 1}</b><span class="chip">${esc(x.topic)}</span></div>
      <p class="q">${esc(x.question)}</p>
      ${qImgHTML(imgs[x.image_path])}
      <p class="small">Your answer: <span class="yours ${ok ? '' : 'wrong'}">${x.chosen == null ? 'Skipped' : `${L[x.chosen]}. ${esc(x.options[x.chosen])}`}</span></p>
      ${ok ? '' : `<p class="small right">Correct answer: ${L[x.correct]}. ${esc(x.options[x.correct])}</p>`}
      ${x.explanation ? `<p class="why">Why: ${esc(x.explanation)}</p>` : ''}</div>`;
  }).join('') || '<div class="empty">No wrong answers. Nice.</div>';
  $('#content').innerHTML = `
    <section class="card dark res-head">
      <div class="res-score">${R.score}<small>/${R.total}</small></div>
      ${isDiwali() ? octoSVG('octo', false) : ''}
      <div class="txt"><span class="chip dark">${s.code} · Unit ${u?.unit_no ?? ''} ${R.practice ? 'practice round' : 'quiz'}</span>
        <h2 style="margin-top:10px;font-size:clamp(1.3rem,2.8vw,1.8rem)">${head}</h2>
        <p>${R.percent}% · ${wrong} to review${R.practice ? ' · Practice rounds don\'t change the leaderboard.' : ''}</p>
        <div class="row wrap" style="margin-top:16px">
          <a class="btn" href="#quiz/${R.unitId}">Retake quiz</a>
          ${wrong ? `<a class="btn on-dark" href="#quiz/${R.unitId}/revise/${R.attemptId}">Revise my mistakes</a>` : ''}
          <a class="btn on-dark" href="#subject/${u?.subject_id}/${u?.unit_no}">Back to Unit ${u?.unit_no ?? ''}</a>
        </div></div>
    </section>
    <section class="card" style="margin-top:18px"><h3>By topic</h3><div style="margin-top:10px">${Object.entries(topics).map(([t, v]) => { const p = Math.round(v.ok * 100 / v.n); return `<div class="topic-row ${p < 60 ? 'weak' : ''}"><span>${esc(t)}</span><div class="bar"><i style="width:${Math.max(p, 2)}%"></i></div><span class="small"><b>${v.ok}/${v.n}</b> ${p < 60 ? '<span class="weak-tag">weak</span>' : ''}</span></div>`; }).join('')}</div></section>
    <section class="card" style="margin-top:18px"><div class="row wrap"><h3>Your answers</h3><span class="spacer"></span><div class="tabs" id="flt"><button class="tab on" data-f="all">All</button><button class="tab" data-f="wrong">Wrong (${wrong})</button></div></div><div id="alist" style="margin-top:8px">${answersHTML()}</div></section>`;
  $$('#flt .tab').forEach(b => b.onclick = () => { filter = b.dataset.f; $$('#flt .tab').forEach(x => x.classList.toggle('on', x === b)); $('#alist').innerHTML = answersHTML(); });
};

/* ---------- my progress ---------- */
VIEWS.perf = async ([tabSid], alive) => {
  shell('perf');
  const [, lb, att] = await Promise.all([
    refreshProgress(),
    sb.rpc('get_leaderboard', { p_subject: null }),
    sb.from('quiz_attempts').select('id,unit_id,score,total,percent,is_practice,created_at').eq('user_id', S.session.user.id).order('created_at', { ascending: false }).limit(15)
  ]);
  if (!alive()) return;
  shell('perf');
  const me = (lb.data || []).find(r => r.is_me);
  const vis = S.units.filter(u => u.is_visible);
  const quizzed = vis.filter(u => unitState(u).attempts > 0);
  const avg = quizzed.length ? Math.round(quizzed.reduce((a, u) => a + (unitState(u).best || 0), 0) / quizzed.length) : null;
  const sid = SUBJ[tabSid] ? tabSid : 'ml';
  $('#content').innerHTML = `
    <div class="page-head"><div><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">My progress</h1><p>Where you stand across all 25 units.</p></div></div>
    <div class="grid g4">
      <div class="card kpi"><b>${me?.points ?? 0}</b><span>Leaderboard points</span></div>
      <div class="card kpi"><b>${unitsReadCount()}/25</b><span>Units read</span></div>
      <div class="card kpi"><b>${quizzed.length}/25</b><span>Units quizzed</span></div>
      <div class="card kpi"><b>${avg != null ? avg + '%' : '—'}</b><span>Average best score</span></div>
    </div>
    <section class="card" style="margin-top:18px">
      <div class="tabs scroll" role="tablist">${SUBJECTS.map(s => `<button class="tab ${s.id === sid ? 'on' : ''}" data-go="#perf/${s.id}">${s.code}</button>`).join('')}</div>
      <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Unit</th><th>Reading</th><th>Best quiz</th><th>Attempts</th><th></th></tr></thead><tbody>
      ${unitsOf(sid).map(u => { const st = unitState(u); return `<tr><td><b>${esc(unitLabel(u))}</b></td><td style="min-width:120px"><div class="bar" style="--c:var(--s-${sid})"><i style="width:${st.pct}%;background:var(--s-${sid})"></i></div><small class="muted">${st.has ? st.pct + '%' : 'No material yet'}</small></td><td>${st.best != null ? st.best + '%' : '—'}</td><td>${st.attempts}</td><td><a class="btn sm ghost" href="#subject/${sid}/${u.unit_no}">Open</a></td></tr>`; }).join('')}
      </tbody></table></div>
    </section>
    <section class="card" style="margin-top:18px"><h3>Recent quizzes</h3>
      ${(att.data || []).length ? `<div class="table-wrap" style="margin-top:8px"><table><thead><tr><th>Quiz</th><th>Score</th><th>When</th><th></th></tr></thead><tbody>
      ${att.data.map(a => { const u = unitById(a.unit_id); return `<tr><td><b>${SUBJ[u?.subject_id]?.code || ''} Unit ${u?.unit_no || ''}</b>${a.is_practice ? ' <span class="pill neutral">practice</span>' : ''}</td><td>${a.score}/${a.total} · ${a.percent}%</td><td class="small muted">${fmtTime(a.created_at)}</td><td><a class="btn sm ghost" href="#result/${a.id}">Review</a></td></tr>`; }).join('')}
      </tbody></table></div>` : '<div class="empty" style="margin-top:10px">No quizzes yet. Open a unit and take its quiz.</div>'}
    </section>`;
};

/* ---------- leaderboard ---------- */
VIEWS.leaderboard = async ([tab], alive) => {
  shell('leaderboard');
  const sid = SUBJ[tab] ? tab : null;
  let rows, split = {};
  if (sid) {
    const { data } = await sb.rpc('get_leaderboard', { p_subject: sid });
    rows = data || [];
  } else {
    const res = await Promise.all([null, ...SUBJECTS.map(s => s.id)].map(p => sb.rpc('get_leaderboard', { p_subject: p })));
    rows = res[0].data || [];
    SUBJECTS.forEach((s, i) => (res[i + 1].data || []).forEach(r => { (split[r.username] ||= {})[s.id] = r.points; }));
  }
  if (!alive()) return;
  const real = rows.filter(r => r.points > 0);
  const meRow = rows.find(r => r.is_me && r.points === 0);
  const max = Math.max(1, ...rows.map(r => r.points));
  const rowHTML = (r, i) => {
    const bar = sid ? `<div class="split"><i style="width:${r.points * 100 / max}%;background:var(--s-${sid})"></i></div>`
      : `<div class="split" aria-label="Points by subject">${SUBJECTS.map(s => { const p = split[r.username]?.[s.id] || 0; return p ? `<i style="width:${p * 100 / max}%;background:var(--s-${s.id})" title="${s.code}: ${p}"></i>` : ''; }).join('')}</div>`;
    return `<div class="lb-row ${r.is_me ? 'me' : ''} ${i < 3 && r.points > 0 ? 'top' : ''}"><span class="rank">${r.points > 0 ? i + 1 : '—'}</span><div class="name"><b>${esc(r.username)}${r.is_me ? ' (you)' : ''}</b><small>${esc([r.batch, r.branch].filter(Boolean).join(' · '))}</small></div>${bar}<span class="pts">${r.points}</span></div>`;
  };
  $('#content').innerHTML = `
    <div class="page-head"><div><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Leaderboard</h1><p>Points come from your best quiz score in every unit you've finished reading, plus 20 for each unit read.</p></div></div>
    <div class="tabs scroll" style="margin-bottom:16px"><button class="tab ${!sid ? 'on' : ''}" data-go="#leaderboard">Overall</button>${SUBJECTS.map(s => `<button class="tab ${sid === s.id ? 'on' : ''}" data-go="#leaderboard/${s.id}">${s.code}</button>`).join('')}</div>
    ${!sid ? `<div class="legend" style="margin:0 0 12px">${SUBJECTS.map(s => `<span><span class="dot" style="background:var(--s-${s.id})"></span>${s.code}</span>`).join('')}</div>` : ''}
    <section class="card" style="padding:12px">
      ${real.length ? real.map(rowHTML).join('') : '<div class="empty">No scores yet. Read a unit and take its quiz to be the first on the board.</div>'}
      ${meRow ? `<div style="margin-top:8px">${rowHTML(meRow, real.length)}</div>` : ''}
    </section>`;
};

/* ---------- Mid answers ---------- */
// Subject-level exam material pages: one page per EXAM_PAGES entry (Mid answers, 2 marks, Mid bits, cheat sheets, last minute)
function examMatPage(pg, tab) {
  const sid = SUBJ[tab] ? tab : 'ml';
  const s = SUBJ[sid];
  const ms = visibleMats({ subject_id: sid, section: pg.section })
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'en', { numeric: true }));
  const dark = pg.cls === 'dark';
  shell(pg.nav, `
    <div class="page-head"><div><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">${pg.label}</h1><p>${pg.intro}</p></div></div>
    <div class="tabs scroll" style="margin-bottom:16px">${SUBJECTS.map(x => `<button class="tab ${x.id === sid ? 'on' : ''}" data-go="#${pg.nav}/${x.id}">${x.code}</button>`).join('')}</div>
    <h2 style="font-size:1.3rem;margin-bottom:14px"><span class="code-${sid}">${s.code}</span> · ${s.name}</h2>
    <div class="mid-grid"><section class="card mid-card ${pg.cls}" style="--c:var(--s-${sid})">
      <div><h2 style="font-size:1.5rem">${pg.label}</h2><p class="mid-blurb">${pg.blurb}</p></div>
      ${ms.length ? `<div class="mid-list">${ms.map(m => pdfRowHTML(m, { dark })).join('')}</div>`
        : `<div class="empty mid-empty">No ${s.code} ${pg.label.toLowerCase()} yet. They'll appear here as soon as they're added.</div>`}
    </section></div>`);
}
EXAM_PAGES.forEach(pg => { VIEWS[pg.nav] = ([tab]) => examMatPage(pg, tab); });

/* ---------- my profile ---------- */
VIEWS.profile = async (args, alive) => {
  shell('profile');
  const u = S.session.user;
  const { data: prof } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
  if (!alive()) return;
  if (prof) S.profile = prof;
  const p = S.profile || {};
  shell('profile', `
    <div class="page-head"><div><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">My profile</h1><p>Your account details. You can change your username and password here.</p></div></div>
    <div class="profile-grid">
      <section class="card profile-card">
        <div class="avatar big">${esc((p.username || '?')[0].toUpperCase())}</div>
        <h2>${esc(p.username || '')}</h2>
        <p class="muted">${esc(p.email || u.email)}</p>
        ${p.role === 'admin' ? '<span class="pill good" style="margin-top:8px">Admin</span>' : ''}
        <dl class="profile-facts">
          ${p.roll_no ? `<div><dt>Roll number</dt><dd>${esc(p.roll_no)}</dd></div>` : ''}
          ${p.branch ? `<div><dt>Branch</dt><dd>${esc(p.branch)}</dd></div>` : ''}
          ${p.batch ? `<div><dt>Batch</dt><dd>${esc(p.batch)}</dd></div>` : ''}
          <div><dt>Joined</dt><dd>${fmtDate(u.created_at)} ${new Date(u.created_at).getFullYear()}</dd></div>
        </dl>
        <button class="btn ghost block" data-act="logout" style="margin-top:18px">${icon('logout', 18)}Log out</button>
      </section>
      <div class="stack">
        <section class="card">
          <h3>Username</h3>
          <p class="muted small" style="margin-top:4px">Shown on the leaderboard and around SemPrep.</p>
          <form id="unf" class="stack-sm" style="margin-top:12px" novalidate>
            <label class="field"><span>Username</span><input class="input" name="username" maxlength="40" required value="${esc(p.username || '')}" autocomplete="username"></label>
            <button class="btn" type="submit">Save username</button>
          </form>
        </section>
        <section class="card">
          <h3>Email</h3>
          <p class="muted small" style="margin-top:4px">Your account is linked to your college email, so it can't be changed here. If it's wrong, ask the admin.</p>
          <div class="input readonly" style="margin-top:12px" aria-label="Email">${esc(p.email || u.email)}</div>
        </section>
        <section class="card">
          <h3>Password</h3>
          <p class="muted small" style="margin-top:4px">For your safety, passwords are stored encrypted and can't be shown to anyone, not even the admin. You can set a new one here.</p>
          <form id="pwf" class="stack-sm" style="margin-top:12px" novalidate>
            <label class="field"><span>Current password</span><input class="input" name="cur" type="password" autocomplete="current-password" required></label>
            <label class="field"><span>New password</span><input class="input" name="p1" type="password" autocomplete="new-password" minlength="8" required><small>At least 8 characters</small></label>
            <label class="field"><span>Repeat new password</span><input class="input" name="p2" type="password" autocomplete="new-password" required></label>
            <button class="btn" type="submit">Change password</button>
          </form>
          <p class="small muted" style="margin-top:12px">Forgot your current password? <a href="#" id="pwreset">Email me a reset link</a></p>
        </section>
      </div>
    </div>`);
  addPasswordToggles($('#content'));

  const unf = $('#unf');
  unf.onsubmit = async e => {
    e.preventDefault();
    const name = unf.username.value.trim();
    if (!name) return showFormError(unf, 'Enter a username.');
    if (name === p.username) return toast('That is already your username.');
    const btn = $('button[type=submit]', unf); setBusy(btn, true, 'Saving…');
    const { data, error } = await sb.from('profiles').update({ username: name }).eq('id', u.id).select().maybeSingle();
    setBusy(btn, false);
    if (error) return showFormError(unf, error.code === '23505' ? 'That username is already taken. Try another one.' : error.message);
    if (data) S.profile = data;
    toast('Username updated.'); route();
  };

  const pwf = $('#pwf');
  pwf.onsubmit = async e => {
    e.preventDefault();
    const email = p.email || u.email;
    if (!pwf.cur.value) return showFormError(pwf, 'Enter your current password.');
    if (pwf.p1.value.length < 8) return showFormError(pwf, 'The new password must be at least 8 characters.');
    if (pwf.p1.value !== pwf.p2.value) return showFormError(pwf, "The two new passwords don't match.");
    if (pwf.p1.value === pwf.cur.value) return showFormError(pwf, 'The new password is the same as the current one.');
    const btn = $('button[type=submit]', pwf); setBusy(btn, true, 'Checking…');
    const chk = await sb.auth.signInWithPassword({ email, password: pwf.cur.value }); // confirms it's really you
    if (chk.error) { setBusy(btn, false); return showFormError(pwf, 'Your current password is not correct.'); }
    btn.textContent = 'Saving…';
    const { error } = await sb.auth.updateUser({ password: pwf.p1.value });
    setBusy(btn, false);
    if (error) return showFormError(pwf, /same/i.test(error.message) ? 'The new password must be different from the current one.' : error.message);
    pwf.reset(); $('.form-error', pwf)?.remove();
    toast('Password changed. Use the new one next time you log in.');
  };

  $('#pwreset').onclick = async e => {
    e.preventDefault();
    const { error } = await sb.auth.resetPasswordForEmail(p.email || u.email, { redirectTo: redirectURL() });
    toast(error ? (/rate/i.test(error.message) ? 'Please wait a minute before asking again.' : error.message) : `Reset link sent to ${p.email || u.email}. Check Spam too.`, !!error);
  };
};

/* ---------- feedback ---------- */
VIEWS.feedback = async (args, alive) => {
  shell('feedback');
  const { data: fb } = await sb.from('feedback').select('*').eq('user_id', S.session.user.id).maybeSingle();
  if (!alive()) return;
  const st = { rating: fb?.rating || 0, helped: fb?.helped || '' };
  const RL = ['Not useful', 'Barely', 'Okay', 'Helpful', 'Very helpful'];
  const HL = ['Yes, a lot', 'Somewhat', 'Not really'];
  $('#content').innerHTML = `
    <div style="max-width:720px">
    <div class="page-head"><div><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Did SemPrep help you prepare?</h1><p>${fb ? `You sent feedback on ${fmtDate(fb.updated_at)}. You can update it any time.` : 'Your answers go straight to Fawwaz.'}</p></div></div>
    <form class="card stack" id="f">
      <fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:700;margin-bottom:10px">How useful is SemPrep?</legend>
        <div class="rate">${RL.map((l, i) => `<button type="button" data-r="${i + 1}" aria-pressed="${st.rating === i + 1}" class="${st.rating === i + 1 ? 'on' : ''}"><b>${i + 1}</b><span>${l}</span></button>`).join('')}</div></fieldset>
      <fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:700;margin-bottom:10px">Did it help in your exam preparation?</legend>
        <div class="choice">${HL.map(h => `<button type="button" data-h="${h}" aria-pressed="${st.helped === h}" class="${st.helped === h ? 'on' : ''}">${h}</button>`).join('')}</div></fieldset>
      <label class="field"><span>What helped the most?</span><textarea class="input" name="comment" maxlength="2000">${esc(fb?.comment || '')}</textarea></label>
      <label class="field"><span>What should be added or fixed?</span><textarea class="input" name="suggestion" maxlength="2000">${esc(fb?.suggestion || '')}</textarea></label>
      <button class="btn" type="submit">${fb ? 'Update feedback' : 'Send feedback'}</button>
    </form></div>`;
  const f = $('#f');
  $$('[data-r]', f).forEach(b => b.onclick = () => { st.rating = Number(b.dataset.r); $$('[data-r]', f).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); });
  $$('[data-h]', f).forEach(b => b.onclick = () => { st.helped = b.dataset.h; $$('[data-h]', f).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (!st.rating) return toast('Pick a rating from 1 to 5.', true);
    if (!st.helped) return toast('Tell us if it helped in your preparation.', true);
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Sending…');
    const { error } = await sb.from('feedback').upsert({ user_id: S.session.user.id, rating: st.rating, helped: st.helped, comment: f.comment.value.trim(), suggestion: f.suggestion.value.trim(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setBusy(btn, false);
    if (error) return toast('Could not send: ' + error.message, true);
    toast('Thanks! Your feedback was sent.');
    btn.textContent = 'Update feedback';
  });
};
