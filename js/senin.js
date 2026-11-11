/* =====================================================================
   SemPrep — Senin AI: the doubt chatbot (floating panel on every page + the #senin page)
   Answers come from the Supabase Edge Function "senin" (supabase/functions/senin/index.ts),
   which calls Google Gemini. Markdown, sanitising and diagrams load only when Senin is opened.
   ===================================================================== */
const SENIN_FN = `${CFG.SUPABASE_URL}/functions/v1/senin`;
const SN_LIBS = {
  marked: 'https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js',
  purify: 'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js',
  mermaid: 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js',
  katex: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js'
};
const SN_KATEX_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css';
const SN_MAX_FILES = 3, SN_MAX_MB = 10;
const SN_SUGG = {
  ml: ['Bias vs variance, with a simple example', 'Explain gradient descent step by step with a diagram', 'Bagging vs boosting in 5 points for 5 marks', 'How does k-NN classify a new point?'],
  flat: ['Design a DFA for binary strings ending in 01', 'Explain the pumping lemma for regular languages', 'Difference between DFA, NFA and ε-NFA', 'How do I convert an NFA to a DFA?'],
  ai: ['A* search vs best-first search, with a diagram', 'Explain minimax with alpha-beta pruning', 'What is a PEAS description? Give an example', 'Forward chaining vs backward chaining'],
  cnp: ['Draw the TCP 3-way handshake', 'OSI vs TCP/IP layers in a table', 'Explain the sliding window protocol with a diagram', 'How does CSMA/CD work?'],
  edvc: ['Explain all 9 blocks of the business model canvas', 'Steps in the entrepreneurial process', 'Sources of funding for a startup', 'What makes a good startup idea? 5 marks answer']
};
const SN_FOLLOW = ['Explain it simpler', 'Give me an example', 'Make it a 5-mark answer', 'Quiz me on this'];

const SN = {
  chatId: null, title: '', subject: null, msgs: [], busy: false, loading: false,
  remaining: null, pending: [], chats: null, where: null, urls: {}, mm: {}, sugg: null
};

/* ---------- small helpers ---------- */
const snLoaded = {};
function snLoad(name) {
  if (!snLoaded[name]) snLoaded[name] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = SN_LIBS[name]; s.async = true;
    s.onload = res; s.onerror = () => { delete snLoaded[name]; rej(new Error('Could not load ' + name + '. Check your internet.')); };
    document.head.appendChild(s);
  });
  return snLoaded[name];
}
async function snLibs() {
  await Promise.all([snLoad('marked'), snLoad('purify')]);
  if (!snLibs.done) { window.marked.setOptions({ gfm: true, breaks: true }); snLibs.done = true; }
}
function snTodayIST() { return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10); }
function snSubjCode(id) { return SUBJ[id]?.code || ''; }
function snOn() { return isAdmin() || (S.senin?.enabled !== false); }
let snUid = 0;
// the SemPrep octopus, shaded so it looks round; waving = the hello animation
function snOcto(size = 150, waving = true) {
  const u = 'sno' + (++snUid);
  return `<svg class="sn-octo${waving ? ' waving' : ''}" viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true">
  <defs>
    <radialGradient id="${u}b" cx="38%" cy="28%" r="78%"><stop offset="0" stop-color="#FFF7C2"/><stop offset=".32" stop-color="#FFE34D"/><stop offset=".7" stop-color="#FFC700"/><stop offset="1" stop-color="#D99A00"/></radialGradient>
    <linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD21F"/><stop offset="1" stop-color="#E5A100"/></linearGradient>
    <radialGradient id="${u}e" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".75" stop-color="#F1EFF7"/><stop offset="1" stop-color="#CFCBDD"/></radialGradient>
    <filter id="${u}f"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <ellipse cx="100" cy="190" rx="56" ry="7" fill="#17142B" opacity=".18" filter="url(#${u}f)"/>
  <g class="o-bob">
    <g fill="none" stroke="url(#${u}a)" stroke-width="15" stroke-linecap="round">
      <path d="M70 120 C50 140 34 140 30 158 C27 172 42 176 45 166"/><path d="M84 128 C78 150 64 160 66 176 C67 186 80 186 79 176"/>
      <path d="M100 130 C100 152 96 166 100 180 C103 190 114 188 112 178"/><path d="M116 128 C122 150 136 160 134 176 C133 186 120 186 121 176"/>
    </g>
    <g fill="#FFF0A6" opacity=".9"><circle cx="40" cy="150" r="2.4"/><circle cx="33" cy="163" r="2.4"/><circle cx="73" cy="158" r="2.4"/><circle cx="67" cy="171" r="2.4"/><circle cx="98" cy="158" r="2.4"/><circle cx="99" cy="171" r="2.4"/><circle cx="127" cy="158" r="2.4"/><circle cx="133" cy="171" r="2.4"/></g>
    <g class="o-wave"><path d="M132 116 C152 110 164 94 166 72" fill="none" stroke="url(#${u}a)" stroke-width="15" stroke-linecap="round"/><circle cx="166" cy="68" r="9" fill="#FFD21F"/><circle cx="152" cy="104" r="2.4" fill="#FFF0A6"/><circle cx="161" cy="89" r="2.4" fill="#FFF0A6"/></g>
    <path d="M58 124 C44 80 62 30 100 30 C138 30 156 80 142 124 C132 136 68 136 58 124 Z" fill="url(#${u}b)"/>
    <path d="M60 116 C80 128 120 128 140 116 C140 120 141 122 142 124 C132 136 68 136 58 124 Z" fill="#C98A00" opacity=".25"/>
    <g fill="#F2C200" opacity=".75"><circle cx="76" cy="50" r="5"/><circle cx="90" cy="40" r="3"/><circle cx="124" cy="46" r="4"/><circle cx="133" cy="62" r="2.6"/></g>
    <ellipse cx="80" cy="54" rx="17" ry="10" transform="rotate(-32 80 54)" fill="#FFFFFF" opacity=".6"/><circle cx="66" cy="74" r="3.5" fill="#FFFFFF" opacity=".45"/>
    <g class="o-eyes"><circle cx="84" cy="90" r="14" fill="url(#${u}e)"/><circle cx="116" cy="90" r="14" fill="url(#${u}e)"/>
      <circle cx="87" cy="87" r="7.5" fill="#17142B"/><circle cx="119" cy="87" r="7.5" fill="#17142B"/>
      <circle cx="90" cy="84" r="2.8" fill="#FFFFFF"/><circle cx="122" cy="84" r="2.8" fill="#FFFFFF"/></g>
    <ellipse cx="70" cy="106" rx="7" ry="4" fill="#FF7A93" opacity=".5"/><ellipse cx="130" cy="106" rx="7" ry="4" fill="#FF7A93" opacity=".5"/>
    <path d="M91 106 Q100 118 109 106 Z" fill="#17142B"/><path d="M95 111 Q100 116 105 111 Q100 109 95 111 Z" fill="#FF6F8E"/>
  </g></svg>`;
}
// small flat octopus for message avatars (no gradients: cheap to repeat)
function snAvatar() {
  return `<span class="sn-av" aria-hidden="true"><svg viewBox="0 0 200 200" width="32" height="32"><g fill="none" stroke="#F0B800" stroke-width="15" stroke-linecap="round"><path d="M70 120 C50 140 34 140 30 158"/><path d="M84 128 C78 150 64 160 66 176"/><path d="M100 130 C100 152 96 166 100 180"/><path d="M116 128 C122 150 136 160 134 176"/><path d="M132 116 C152 110 164 94 166 72"/></g><path d="M58 124 C44 80 62 30 100 30 C138 30 156 80 142 124 C132 136 68 136 58 124 Z" fill="#FFD21F"/><ellipse cx="80" cy="54" rx="15" ry="9" transform="rotate(-32 80 54)" fill="#FFF6C8"/><circle cx="84" cy="90" r="14" fill="#fff"/><circle cx="116" cy="90" r="14" fill="#fff"/><circle cx="87" cy="87" r="7.5" fill="#17142B"/><circle cx="119" cy="87" r="7.5" fill="#17142B"/><path d="M91 106 Q100 118 109 106 Z" fill="#17142B"/></svg></span>`;
}

/* ---------- markdown + citations + diagrams ---------- */
function snSrcLabel(s) {
  return [snSubjCode(s.subject_id), s.unit_no ? 'Unit ' + s.unit_no : '', SECTION_LABEL[s.section] || ''].filter(Boolean).join(' · ');
}
function snMd(m) {
  const blocks = [];
  let src = (m.content || '').replace(/```mermaid[ \t]*\n([\s\S]*?)(```|$)/g, (_, code, end) => {
    blocks.push({ code: code.trim(), done: !!end });
    return `\n\n<div class="sn-mm" data-mm="${blocks.length - 1}"></div>\n\n`;
  });
  // [S1] / [S1, S2] → small numbered links to the exact PDF page
  src = src.replace(/\[(S\d+(?:\s*[,;]\s*S?\d+)*)\]/g, (_, list) => list.split(/[,;]/).map(x => {
    const n = Number(x.replace(/\D/g, '')), s = (m.sources || []).find(y => y.n === n);
    return s ? `<a class="sn-cite" href="#reader/${esc(s.material_id)}/${s.page_no}" title="${esc(snSrcLabel(s) + ' · ' + s.title + ' · page ' + s.page_no)}">${n}</a>` : '';
  }).join(''));
  m._mm = blocks;
  const math = [];
  src = snPullMath(src, math);
  if (!window.marked || !window.DOMPurify) return `<p>${esc(snPutMath(src, math, false)).replace(/\n/g, '<br>')}</p>`;
  return snPutMath(DOMPurify.sanitize(marked.parse(src), { ADD_ATTR: ['target'] }), math, true);
}
// Maths written in LaTeX ($…$, $$…$$, \(…\), \[…\]) is drawn with KaTeX, loaded the first time it's needed.
// Code spans are left alone, and money like "$5 and $10" is not treated as maths.
function snPullMath(src, math) {
  const code = [];
  src = src.replace(/```[\s\S]*?(```|$)|`[^`\n]*`/g, c => { code.push(c); return `\u0000C${code.length - 1}\u0000`; });
  const keep = (tex, display) => { math.push({ tex: tex.trim(), display }); return `@@SNM${math.length - 1}@@`; };
  src = src
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(t, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => keep(t, true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => keep(t, false))
    .replace(/\$(?=[^\s$\d])([^$\n]*?[^\s$\\])\$(?!\d)/g, (_, t) => keep(t, false))
    .replace(/\$(?=[^\s$])([^$\n]*?[\\^_{][^$\n]*?[^\s$])\$(?!\d)/g, (_, t) => keep(t, false)); // e.g. $2^n$
  return src.replace(/\u0000C(\d+)\u0000/g, (_, i) => code[Number(i)]);
}
function snPutMath(html, math, isHtml) {
  if (!math.length) return html;
  if (!window.katex) snNeedKatex();
  return html.replace(/@@SNM(\d+)@@/g, (_, i) => {
    const x = math[Number(i)];
    if (!x) return '';
    if (window.katex && isHtml) {
      try { return katex.renderToString(x.tex, { displayMode: x.display, throwOnError: false, output: 'html', trust: false, strict: 'ignore' }); }
      catch { /* fall through to plain text */ }
    }
    return isHtml ? `<code class="sn-tex">${esc(x.tex)}</code>` : x.tex;
  });
}
function snNeedKatex() {
  if (snNeedKatex.p) return;
  if (!document.querySelector(`link[href="${SN_KATEX_CSS}"]`)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = SN_KATEX_CSS; document.head.appendChild(l);
  }
  snNeedKatex.p = snLoad('katex').then(() => { if (!SN.busy) snRenderAll(); }).catch(() => { snNeedKatex.p = null; });
}
let snMermaidReady = false, snMmSeq = 0;
function snDrawMermaid(code) {
  if (!SN.mm[code]) SN.mm[code] = (async () => {
    await snLoad('mermaid');
    if (!snMermaidReady) {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDiwali() ? 'dark' : 'default',
        fontFamily: 'Figtree, system-ui, sans-serif', flowchart: { htmlLabels: false, curve: 'basis' } });
      snMermaidReady = true;
    }
    const id = 'snmm' + (++snMmSeq);
    try { const { svg } = await mermaid.render(id, code); return { svg }; }
    catch (e) { document.getElementById('d' + id)?.remove(); document.getElementById(id)?.remove(); return { error: true }; }
  })();
  return SN.mm[code];
}
function snFigure(res, code) {
  const fig = document.createElement('figure');
  if (res.error) {
    fig.className = 'sn-fig err';
    fig.innerHTML = `<div class="sn-fig-err">${icon('image', 18)}Senin's diagram could not be drawn. <details><summary>Show the diagram code</summary><pre></pre></details></div>`;
    $('pre', fig).textContent = code;
  } else {
    fig.className = 'sn-fig';
    fig.innerHTML = `<div class="sn-fig-bar"><b>Diagram</b><span class="sn-fig-by">drawn by Senin</span>
      <button type="button" class="sn-ib" data-sn-fig="full" aria-label="Open diagram full size" title="Full size">${icon('expand', 18)}</button>
      <button type="button" class="sn-ib" data-sn-fig="dl" aria-label="Download diagram" title="Download">${icon('download', 18)}</button></div>
      <div class="sn-fig-svg">${res.svg}</div>`;
  }
  return fig;
}
function snFillMermaid(root, m) {
  $$('.sn-mm', root).forEach(ph => {
    const b = (m._mm || [])[Number(ph.dataset.mm)];
    if (!b) return ph.remove();
    if (!b.done) { ph.innerHTML = `<div class="sn-mm-wait">${icon('image', 18)}Drawing diagram…</div>`; return; }
    const p = snDrawMermaid(b.code);
    ph.innerHTML = `<div class="sn-mm-wait">${icon('image', 18)}Drawing diagram…</div>`;
    p.then(res => { if (ph.isConnected) ph.replaceWith(snFigure(res, b.code)); });
  });
}

/* ---------- rendering the conversation ---------- */
function snAttHTML(a) {
  if (a.kind === 'material') {
    return `<a class="sn-chip doc" href="#reader/${esc(a.material_id)}"><span class="sn-chip-ic note">${icon('book', 18)}</span><span><b>${esc(a.name)}</b><small>From SemPrep</small></span></a>`;
  }
  if (/^image\//.test(a.mime || '')) {
    const url = SN.urls[a.path];
    return url ? `<a class="sn-img" href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(a.name || 'Attached photo')}" loading="lazy"></a>`
      : `<span class="sn-chip doc"><span class="sn-chip-ic img">${icon('image', 18)}</span><span><b>${esc(a.name)}</b><small>Photo</small></span></span>`;
  }
  const mb = a.size ? ` · ${(a.size / 1048576).toFixed(1)} MB` : '';
  const url = SN.urls[a.path];
  return `<${url ? `a href="${esc(url)}" target="_blank" rel="noopener"` : 'span'} class="sn-chip doc"><span class="sn-chip-ic pdf">PDF</span><span><b>${esc(a.name)}</b><small>PDF${mb}</small></span></${url ? 'a' : 'span'}>`;
}
function snMsgHTML(m, i) {
  if (m.role === 'user') {
    const atts = (m.attachments || []).map(snAttHTML).join('');
    return `<div class="sn-msg user">${atts ? `<div class="sn-atts">${atts}</div>` : ''}${m.content ? `<div class="sn-bubble">${esc(m.content)}</div>` : ''}</div>`;
  }
  const last = i === SN.msgs.length - 1;
  let body;
  if (m.error) {
    body = `<div class="sn-err">${icon('info', 18)}<span>${esc(m.error)}</span>${m.retry ? `<button type="button" class="btn sm ghost" data-sn-retry="${i}">Try again</button>` : ''}</div>`;
  } else if (!m.content) {
    const reading = (SN.msgs[i - 1]?.attachments || []).length;
    body = `<div class="sn-think"><span class="sn-dots"><i></i><i></i><i></i></span>${reading ? 'Reading your attachment…' : 'Thinking…'}</div>`;
  } else {
    body = `<div class="sn-md">${snMd(m)}</div>`;
    const cited = [...new Set([...(m.content.matchAll(/\[(S\d+(?:\s*[,;]\s*S?\d+)*)\]/g))].flatMap(x => x[1].match(/\d+/g).map(Number)))];
    const srcs = (m.sources || []).filter(s => cited.includes(s.n));
    if (srcs.length && !m.streaming) body += `<div class="sn-srcs">${srcs.map(s => `<a class="sn-src" href="#reader/${esc(s.material_id)}/${s.page_no}">
      <span class="sn-src-ic" style="--c:var(--s-${esc(s.subject_id)})">${icon('book', 18)}</span>
      <span class="sn-src-t"><b>${s.n}. ${esc(snSrcLabel(s))}</b><small>${esc(s.title)} · page ${s.page_no}</small></span><span class="sn-src-go">Open in reader →</span></a>`).join('')}</div>`;
    if (!m.streaming) body += `<div class="sn-acts">${last ? SN_FOLLOW.map(f => `<button type="button" class="sn-act" data-sn-ask="${esc(f)}">${esc(f)}</button>`).join('') : ''}
      <span class="sn-sp"></span><button type="button" class="sn-ib" data-sn-copy="${i}" aria-label="Copy answer" title="Copy">${icon('copy', 18)}</button></div>`;
  }
  return `<article class="sn-msg bot">${snAvatar()}<div class="sn-body">${body}</div></article>`;
}
function snHelloHTML() {
  const name = (S.profile?.username || '').split(/[\s._]/)[0];
  if (!SN.sugg || SN.sugg.subject !== SN.subject) {
    const pool = SN.subject ? SN_SUGG[SN.subject].map(t => [SN.subject, t])
      : Object.entries(SN_SUGG).map(([k, a]) => [k, a[Math.floor(Math.random() * a.length)]]);
    SN.sugg = { subject: SN.subject, list: pool.sort(() => Math.random() - .5).slice(0, 3) };
  }
  const off = !snOn();
  return `<div class="sn-hello">
    <div class="sn-hello-art">${snOcto(150, true)}<span class="sn-hi">Hi!</span></div>
    <h2>Hi${name ? ' ' + esc(name) : ''}, I'm Senin</h2>
    <p>${off ? 'Senin is taking a break right now. Check back later!' : "Your doubt buddy for all 5 subjects. Type a question, snap a photo, or drop a PDF, and I'll explain it step by step, with diagrams."}</p>
    ${off ? '' : `<div class="sn-subjs" role="group" aria-label="Subject">
      <button type="button" class="sn-sc" data-sn-subj="" aria-pressed="${!SN.subject}">All subjects</button>
      ${SUBJECTS.map(s => `<button type="button" class="sn-sc" data-sn-subj="${s.id}" aria-pressed="${SN.subject === s.id}" style="--c:var(--s-${s.id})"><i></i>${s.code}</button>`).join('')}
    </div>
    <div class="sn-sugg">${SN.sugg.list.map(([k, t]) => `<button type="button" data-sn-ask="${esc(t)}"><b style="color:var(--s-${k})">${SUBJ[k].code}</b>${esc(t)}</button>`).join('')}</div>`}
  </div>`;
}
function snRenderAll() {
  const log = $('#snLog'); if (!log) return;
  if (SN.loading) log.innerHTML = '<div class="loading"><div class="spinner" aria-label="Loading chat"></div></div>';
  else if (!SN.msgs.length) log.innerHTML = snHelloHTML();
  else {
    log.innerHTML = SN.msgs.map(snMsgHTML).join('');
    [...log.children].forEach((el, i) => {
      const md = SN.msgs[i]?.role === 'assistant' && $('.sn-md', el);
      if (md) snFillMermaid(md, SN.msgs[i]);
    });
  }
  snRenderPending(); snHeader();
  const send = $('#snSend'); if (send) send.disabled = SN.busy || !snOn();
}
let snUpdT = 0;
function snUpdateBot(m) {
  if (snUpdT) return;
  snUpdT = setTimeout(() => {
    snUpdT = 0;
    const log = $('#snLog'), el = log && log.lastElementChild;
    if (!el || !el.classList.contains('bot')) return;
    const stick = snNearBottom();
    const body = $('.sn-body', el);
    let md = $('.sn-md', body);
    if (!md) { body.innerHTML = '<div class="sn-md"></div>'; md = $('.sn-md', body); }
    md.innerHTML = snMd(m); snFillMermaid(md, m);
    if (stick) snScroll();
  }, 60);
}
function snNearBottom() { const l = $('#snLog'); return !l || l.scrollHeight - l.scrollTop - l.clientHeight < 140; }
function snScroll() { const l = $('#snLog'); if (l) l.scrollTop = l.scrollHeight; }
function snHeader() {
  const sub = $('#snSub');
  if (sub) sub.innerHTML = `<i class="sn-live"></i>${!snOn() ? 'Switched off by the admin' : isAdmin() ? 'Admin · no daily limit' :
    SN.remaining == null ? 'Knows your 5 subjects' : `${SN.remaining} doubt${SN.remaining === 1 ? '' : 's'} left today`}`;
  const t = $('#snTitle'); if (t) t.textContent = SN.chatId ? (SN.title || 'Chat') : 'New chat';
  const tag = $('#snTag');
  if (tag) tag.innerHTML = SN.subject ? `<span class="sn-tag" style="--c:var(--s-${SN.subject})"><i></i>${SUBJ[SN.subject].code}</span>` : '';
}
function snRenderPending() {
  const el = $('#snPend'); if (!el) return;
  el.innerHTML = SN.pending.map(p => `<span class="sn-pend ${p.status}">
    ${p.local ? `<img src="${esc(p.local)}" alt="">` : `<span class="sn-chip-ic ${p.kind === 'material' ? 'note' : 'pdf'}">${p.kind === 'material' ? icon('book', 16) : 'PDF'}</span>`}
    <span class="sn-pend-n">${esc(p.name)}${p.status === 'up' ? ' · uploading…' : ''}</span>
    <button type="button" class="sn-ib" data-sn-rm="${p.id}" aria-label="Remove ${esc(p.name)}">${icon('x', 16)}</button></span>`).join('');
  el.hidden = !SN.pending.length;
}

/* ---------- the chat box (same for the panel and the page) ---------- */
function snUIHTML() {
  return `<div class="sn-log" id="snLog" aria-live="polite"></div>
  <div class="sn-compose">
    <div class="sn-pends" id="snPend" hidden></div>
    <div class="sn-box">
      <div class="sn-attachw">
        <button type="button" class="sn-attach" data-sn="attach" aria-label="Attach a photo or PDF" aria-haspopup="menu" aria-expanded="false">${icon('clip', 20)}</button>
        <div class="sn-menu" role="menu" hidden>
          ${matchMedia('(pointer: coarse)').matches ? `<button type="button" role="menuitem" data-sn-pick="camera"><span class="sn-mi" style="background:var(--hl);color:var(--hl-ink)">${icon('camera', 20)}</span>Camera</button>` : ''}
          <button type="button" role="menuitem" data-sn-pick="photo"><span class="sn-mi img">${icon('image', 20)}</span>Photo</button>
          <button type="button" role="menuitem" data-sn-pick="pdf"><span class="sn-mi pdf">${icon('pdf', 20)}</span>PDF</button>
          <button type="button" role="menuitem" data-sn-pick="notes"><span class="sn-mi note">${icon('book', 20)}</span>SemPrep notes</button>
        </div>
      </div>
      <label class="sr-only" for="snInput">Your doubt</label>
      <textarea id="snInput" rows="1" maxlength="4000" placeholder="Ask a doubt…" enterkeyhint="send"></textarea>
      <button type="button" class="sn-send" id="snSend" data-sn="send" aria-label="Send">${icon('send', 20)}</button>
    </div>
    <p class="sn-fine">Senin can make mistakes. Check important answers with your material.</p>
  </div>`;
}
function snBind(root) {
  const ta = $('#snInput', root);
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; };
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer: fine)').matches) { e.preventDefault(); snSend(); }
  });
  ta.addEventListener('paste', e => {
    const files = [...(e.clipboardData?.files || [])].filter(f => /^image\/|pdf$/.test(f.type));
    if (files.length) { e.preventDefault(); snAddFiles(files); }
  });
  root.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); root.classList.add('sn-drop'); } });
  root.addEventListener('dragleave', e => { if (!root.contains(e.relatedTarget)) root.classList.remove('sn-drop'); });
  root.addEventListener('drop', e => { e.preventDefault(); root.classList.remove('sn-drop'); snAddFiles([...(e.dataTransfer?.files || [])]); });
  root.addEventListener('click', snClick);
}
function snMenu(open) {
  const menu = $('.sn-menu'), btn = $('[data-sn="attach"]');
  if (!menu) return;
  menu.hidden = !open; btn?.setAttribute('aria-expanded', String(open));
}
async function snClick(e) {
  const t = e.target.closest('[data-sn],[data-sn-pick],[data-sn-subj],[data-sn-ask],[data-sn-rm],[data-sn-copy],[data-sn-retry],[data-sn-fig],[data-sn-chat],[data-sn-del],a.sn-cite,a.sn-src');
  if (!e.target.closest('.sn-attachw')) snMenu(false);
  if (!t) return;
  const d = t.dataset;
  if (t.matches('a.sn-cite,a.sn-src') && SN.where === 'panel' && matchMedia('(max-width: 860px)').matches) { snClosePanel(); return; }
  if (d.sn === 'send') return snSend();
  if (d.sn === 'attach') return snMenu($('.sn-menu').hidden);
  if (d.sn === 'close') return snClosePanel();
  if (d.sn === 'expand') { snClosePanel(); return go('#senin' + (SN.chatId ? '/' + SN.chatId : '')); }
  if (d.sn === 'new') return snNewChat();
  if (d.sn === 'hist') return snToggleHist();
  if (d.snPick) { snMenu(false); return snPick(d.snPick); }
  if (d.snSubj !== undefined) { SN.subject = d.snSubj || null; snRenderAll(); return; }
  if (d.snAsk) return snSend(d.snAsk);
  if (d.snRm) { SN.pending = SN.pending.filter(p => p.id !== d.snRm); return snRenderPending(); }
  if (d.snCopy) {
    const m = SN.msgs[Number(d.snCopy)];
    try { await navigator.clipboard.writeText(m.content.replace(/\[(S\d+(?:\s*[,;]\s*S?\d+)*)\]/g, '')); toast('Answer copied.'); } catch { toast('Could not copy.', true); }
    return;
  }
  if (d.snRetry) {
    const i = Number(d.snRetry), m = SN.msgs[i];
    SN.msgs.splice(i - 1, 2);
    return snSend(m.retry.text, m.retry.atts);
  }
  if (d.snFig) {
    const svg = t.closest('.sn-fig')?.querySelector('svg'); if (!svg) return;
    if (d.snFig === 'full') return snLightbox(svg);
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'senin-diagram.svg';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return;
  }
  if (d.snChat) { $('.sn-histpop')?.remove(); return snOpenChat(d.snChat); }
  if (d.snDel) return confirmTap(t, () => snDeleteChat(d.snDel), 'Delete?');
}
function snLightbox(svg) {
  const lb = document.createElement('div');
  lb.className = 'sn-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Diagram');
  lb.innerHTML = `<button type="button" class="sn-lb-x" aria-label="Close">${icon('x', 22)}</button><div class="sn-lb-in"></div>`;
  $('.sn-lb-in', lb).appendChild(svg.cloneNode(true));
  const close = () => { lb.remove(); document.removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.sn-lb-x')) close(); });
  document.addEventListener('keydown', key, true);
  document.body.appendChild(lb); $('.sn-lb-x', lb).focus();
}

/* ---------- attachments ---------- */
function snPick(kind) {
  if (kind === 'notes') return snNotesPicker();
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = kind === 'pdf' ? 'application/pdf,.pdf' : 'image/*';
  if (kind === 'camera') inp.capture = 'environment'; else inp.multiple = true;
  inp.onchange = () => snAddFiles([...inp.files]);
  inp.click();
}
// phone photos are often 4–8 MB: shrink to ~1800 px so they upload fast and still read clearly
async function snShrink(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1.5 * 1048576) { bmp.close?.(); return file; }
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  const out = await new Promise(r => c.toBlob(r, 'image/jpeg', .86));
  return out && out.size < file.size ? out : file;
}
async function snAddFiles(files) {
  for (const f of files) {
    if (SN.pending.length >= SN_MAX_FILES) { toast(`You can attach up to ${SN_MAX_FILES} files to one doubt.`, true); break; }
    const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
    const isImg = /^image\//.test(f.type);
    if (!isPdf && !isImg) { toast('Only photos and PDFs can be attached.', true); continue; }
    const item = { id: crypto.randomUUID(), kind: 'file', name: f.name || (isPdf ? 'document.pdf' : 'photo.jpg'), mime: isPdf ? 'application/pdf' : f.type, status: 'up' };
    if (isImg) item.local = URL.createObjectURL(f);
    SN.pending.push(item); snRenderPending();
    let blob = f;
    if (isImg) { try { blob = await snShrink(f); item.mime = blob.type || item.mime; } catch { /* keep the original */ } }
    if (blob.size > SN_MAX_MB * 1048576) {
      SN.pending = SN.pending.filter(x => x !== item); snRenderPending();
      toast(`${item.name} is over ${SN_MAX_MB} MB. Try a smaller file.`, true); continue;
    }
    const ext = item.mime === 'application/pdf' ? 'pdf' : (item.mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${S.session.user.id}/${item.id}.${ext}`;
    const { error } = await sb.storage.from('senin-uploads').upload(path, blob, { contentType: item.mime, upsert: false });
    if (!SN.pending.includes(item)) { if (!error) sb.storage.from('senin-uploads').remove([path]); continue; }
    if (error) {
      SN.pending = SN.pending.filter(x => x !== item);
      toast('Upload failed: ' + (/bucket/i.test(error.message) ? 'Senin storage is not set up yet (run supabase/schema.sql).' : errMsg(error)), true);
    } else { item.path = path; item.size = blob.size; item.status = 'ok'; if (item.local) SN.urls[path] = item.local; }
    snRenderPending();
  }
}
function snNotesPicker() {
  const list = S.materials.filter(m => m.is_visible || isAdmin());
  const ov = document.createElement('div');
  ov.className = 'sn-pick'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Pick SemPrep notes');
  const row = m => {
    const u = m.unit_id ? unitById(m.unit_id) : null;
    return `<button type="button" data-mid="${esc(m.id)}" data-q="${esc((SUBJ[m.subject_id]?.code + ' ' + m.title + ' ' + (SECTION_LABEL[m.section] || '')).toLowerCase())}">
      <span class="sn-chip-ic note" style="--c:var(--s-${esc(m.subject_id)})">${icon('book', 18)}</span>
      <span><b>${esc(m.title)}</b><small>${esc([SUBJ[m.subject_id]?.code, u ? 'Unit ' + u.unit_no : '', SECTION_LABEL[m.section]].filter(Boolean).join(' · '))}</small></span></button>`;
  };
  ov.innerHTML = `<div class="sn-pick-in">
    <div class="sn-pick-h"><h3>Attach SemPrep notes</h3><button type="button" class="sn-ib" data-x aria-label="Close">${icon('x', 20)}</button></div>
    <p class="muted small">Senin will read the whole PDF and answer from it.</p>
    <label class="sr-only" for="snPickQ">Search notes</label>
    <input class="input" id="snPickQ" placeholder="Search, e.g. FLAT unit 2" autocomplete="off">
    <div class="sn-pick-list">${list.length ? SUBJECTS.map(s => {
      const ms = list.filter(m => m.subject_id === s.id);
      return ms.length ? `<h4>${s.code} · ${esc(s.name)}</h4>${ms.map(row).join('')}` : '';
    }).join('') : '<p class="empty">No PDFs on SemPrep yet.</p>'}</div></div>`;
  const close = () => { ov.remove(); document.removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-x]')) return close();
    const b = e.target.closest('[data-mid]'); if (!b) return;
    const m = list.find(x => x.id === b.dataset.mid);
    if (SN.pending.length >= SN_MAX_FILES) { toast(`You can attach up to ${SN_MAX_FILES} files to one doubt.`, true); return close(); }
    SN.pending.push({ id: crypto.randomUUID(), kind: 'material', material_id: m.id, name: `${SUBJ[m.subject_id]?.code} · ${m.title}`, status: 'ok' });
    snRenderPending(); close(); $('#snInput')?.focus();
  });
  $('#snPickQ', ov).addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase().split(/\s+/);
    $$('[data-mid]', ov).forEach(b => b.hidden = !q.every(w => b.dataset.q.includes(w)));
  });
  document.addEventListener('keydown', key, true);
  document.body.appendChild(ov); $('#snPickQ', ov).focus();
}

/* ---------- sending a doubt and reading the streamed answer ---------- */
async function snSend(override, attsOverride) {
  if (SN.busy || !snOn()) return;
  const ta = $('#snInput');
  const text = String(override ?? ta?.value ?? '').trim();
  if (!attsOverride && SN.pending.some(p => p.status === 'up')) return toast('Wait a moment, your file is still uploading.');
  const atts = attsOverride || SN.pending.filter(p => p.status === 'ok').map(p => p.kind === 'material'
    ? { kind: 'material', material_id: p.material_id, name: p.name }
    : { kind: 'file', path: p.path, mime: p.mime, name: p.name, size: p.size });
  if (!text && !atts.length) { ta?.focus(); return; }
  if (override == null && ta) { ta.value = ''; ta.style.height = 'auto'; }
  if (!attsOverride) SN.pending = [];
  snMenu(false);
  const bot = { role: 'assistant', content: '', sources: [], streaming: true };
  SN.msgs.push({ role: 'user', content: text, attachments: atts }, bot);
  SN.busy = true; snRenderAll(); snScroll();
  try {
    await snLibs().catch(() => {});
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Your session expired. Log in again.');
    const res = await fetch(SENIN_FN, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + session.access_token, apikey: CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, chat_id: SN.chatId, subject: SN.subject, attachments: atts })
    });
    if (!res.ok || !res.body || !/ndjson/.test(res.headers.get('content-type') || '')) {
      let j = {}; try { j = await res.json(); } catch {}
      if (j.code === 'limit') SN.remaining = 0;
      const err = new Error(j.error || j.message || `Senin could not answer (error ${res.status}).`);
      err.noRetry = j.code === 'limit' || j.code === 'off';
      throw err;
    }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        let ev; try { ev = JSON.parse(line); } catch { continue; }
        if (ev.t === 'meta') {
          if (!SN.chatId && ev.chat_id) {
            SN.chatId = ev.chat_id; SN.title = text.slice(0, 70) || 'New chat'; SN.chats = null;
            if (SN.where === 'page') history.replaceState(null, '', '#senin/' + ev.chat_id);
            snRefreshHist();
          }
          if (typeof ev.remaining === 'number') SN.remaining = ev.remaining;
          bot.sources = ev.sources || []; snHeader();
        } else if (ev.t === 'd') { bot.content += ev.v; snUpdateBot(bot); }
        else if (ev.t === 'done') bot.id = ev.id;
        else if (ev.t === 'error') throw new Error(ev.msg);
      }
    }
    if (!bot.content.trim()) throw new Error('Senin could not answer right now. Try again in a minute.');
  } catch (e) {
    bot.error = /Failed to fetch|NetworkError|Load failed/i.test(e.message || '') ? 'No connection to Senin. Check your internet and try again.' : errMsg(e);
    if (!e.noRetry) bot.retry = { text, atts };
  }
  clearTimeout(snUpdT); snUpdT = 0;
  bot.streaming = false; SN.busy = false;
  const stick = snNearBottom();
  snRenderAll();
  if (stick) snScroll();
}

/* ---------- chats: new, open, history, delete ---------- */
function snNewChat() {
  if (SN.busy) return toast('Wait for Senin to finish answering.');
  SN.chatId = null; SN.title = ''; SN.msgs = []; SN.pending = []; SN.sugg = null;
  if (SN.where === 'page') history.replaceState(null, '', '#senin');
  $('.sn-histpop')?.remove();
  snRenderAll(); snMarkHist(); $('#snInput')?.focus();
}
async function snOpenChat(id) {
  if (SN.busy) return toast('Wait for Senin to finish answering.');
  if (SN.where === 'page') history.replaceState(null, '', '#senin/' + id);
  SN.chatId = id; SN.msgs = []; SN.pending = []; SN.loading = true; snRenderAll(); snMarkHist();
  const [c, m] = await Promise.all([
    sb.from('senin_chats').select('id,title,subject_id').eq('id', id).maybeSingle(),
    sb.from('senin_messages').select('id,role,content,attachments,sources').eq('chat_id', id).order('id'),
    snLibs().catch(() => {})
  ]);
  if (SN.chatId !== id) return;
  SN.loading = false;
  if (!c.data) { toast('That chat was not found.', true); return snNewChat(); }
  SN.title = c.data.title; SN.subject = c.data.subject_id;
  SN.msgs = (m.data || []).map(x => ({ ...x, attachments: x.attachments || [], sources: x.sources || [] }));
  const paths = SN.msgs.flatMap(x => x.attachments).filter(a => a.kind === 'file' && a.path && !SN.urls[a.path]).map(a => a.path);
  if (paths.length) {
    const { data } = await sb.storage.from('senin-uploads').createSignedUrls(paths, 3600);
    (data || []).forEach(x => { if (x.signedUrl) SN.urls[x.path] = x.signedUrl; });
  }
  snRenderAll(); snScroll();
}
async function snLoadChats(force) {
  if (SN.chats && !force) return SN.chats;
  const { data } = await sb.from('senin_chats').select('id,title,subject_id,updated_at').order('updated_at', { ascending: false }).limit(60);
  SN.chats = data || [];
  return SN.chats;
}
function snHistHTML(list) {
  if (!list.length) return '<p class="sn-hist-empty">Your chats with Senin will show up here.</p>';
  return list.map(c => `<div class="sn-hist-row${c.id === SN.chatId ? ' on' : ''}">
    <button type="button" class="sn-hist-open" data-sn-chat="${esc(c.id)}"><i style="background:${c.subject_id ? `var(--s-${esc(c.subject_id)})` : 'var(--muted)'}"></i><span>${esc(c.title)}</span></button>
    <button type="button" class="sn-ib" data-sn-del="${esc(c.id)}" aria-label="Delete chat: ${esc(c.title)}" title="Delete">${icon('trash', 16)}</button></div>`).join('');
}
async function snRefreshHist() {
  const box = $('#snHist'); if (!box) return;
  box.innerHTML = snHistHTML(await snLoadChats(true));
}
function snMarkHist() { $$('.sn-hist-row').forEach(r => r.classList.toggle('on', r.querySelector('[data-sn-chat]')?.dataset.snChat === SN.chatId)); }
async function snToggleHist() {
  const host = $('.sn-panel') || $('.sn-main');
  const old = $('.sn-histpop', host);
  if (old) return old.remove();
  const pop = document.createElement('div');
  pop.className = 'sn-histpop';
  pop.innerHTML = `<div class="sn-histpop-h"><b>Your chats</b><button type="button" class="btn sm" data-sn="new">${icon('plus', 16)}New chat</button></div><div class="sn-hist-list"><div class="loading"><div class="spinner"></div></div></div>`;
  host.appendChild(pop);
  $('.sn-hist-list', pop).innerHTML = snHistHTML(await snLoadChats(true));
}
async function snDeleteChat(id) {
  const { data: msgs } = await sb.from('senin_messages').select('attachments').eq('chat_id', id).eq('role', 'user');
  const paths = (msgs || []).flatMap(m => m.attachments || []).filter(a => a.kind === 'file' && a.path).map(a => a.path);
  const { error } = await sb.from('senin_chats').delete().eq('id', id);
  if (error) return toast(errMsg(error), true);
  if (paths.length) sb.storage.from('senin-uploads').remove(paths);
  SN.chats = (SN.chats || []).filter(c => c.id !== id);
  $$(`[data-sn-del="${CSS.escape(id)}"]`).forEach(b => b.closest('.sn-hist-row')?.remove());
  if (SN.chatId === id) snNewChat();
  toast('Chat deleted.');
}
async function snInitQuota() {
  if (isAdmin() || SN.remaining != null) return;
  const lim = Number(S.senin?.daily_limit ?? 25);
  const { data, error } = await sb.from('senin_usage').select('count').eq('user_id', S.session.user.id).eq('day', snTodayIST()).maybeSingle();
  if (error) return;
  SN.remaining = Math.max(0, lim - (data?.count || 0));
  snHeader();
}

/* ---------- floating button + panel ---------- */
function seninMount(active) {
  if (!sb || !S.session) return;
  let fab = $('.sn-fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'sn-fab'; fab.setAttribute('aria-label', 'Ask Senin AI');
    fab.innerHTML = `${snOcto(46, false)}<span class="sn-fab-tip" aria-hidden="true">Stuck? Ask me!</span>`;
    fab.onclick = snOpenPanel;
    document.body.appendChild(fab);
    if (lsGet('sn_tip') !== '1') { fab.classList.add('tip'); setTimeout(() => fab.classList.remove('tip'), 7000); lsSet('sn_tip', '1'); }
  }
  document.body.classList.toggle('sn-ready', snOn());
  document.body.classList.toggle('sn-page-on', active === 'senin');
  if (active === 'senin') snClosePanel(true);
}
function seninReset() {
  snClosePanel(true); $('.sn-fab')?.remove();
  Object.assign(SN, { chatId: null, title: '', subject: null, msgs: [], busy: false, remaining: null, pending: [], chats: null, urls: {}, sugg: null });
  document.body.classList.remove('sn-ready', 'sn-page-on');
}
function snOpenPanel() {
  if ($('.sn-panel')) return $('#snInput')?.focus();
  const p = document.createElement('section');
  p.className = 'sn-panel sn'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Senin AI');
  p.innerHTML = `<header class="sn-head">
      <span class="sn-head-av">${snOcto(40, false)}</span>
      <div class="sn-head-t"><b>Senin AI</b><span id="snSub"></span></div>
      <button type="button" class="sn-hb" data-sn="new" aria-label="New chat" title="New chat">${icon('plus', 18)}</button>
      <button type="button" class="sn-hb" data-sn="hist" aria-label="Your chats" title="Your chats">${icon('clock', 18)}</button>
      <button type="button" class="sn-hb sn-hide-phone" data-sn="expand" aria-label="Open as a full page" title="Full page">${icon('expand', 18)}</button>
      <button type="button" class="sn-hb" data-sn="close" aria-label="Close Senin AI" title="Close">${icon('x', 20)}</button>
    </header>${snUIHTML()}`;
  document.body.appendChild(p);
  document.body.classList.add('sn-open');
  SN.where = 'panel';
  snBind(p); snRenderAll(); snScroll();
  snLibs().then(() => { if (SN.msgs.length) snRenderAll(); }).catch(() => {});
  snInitQuota();
  if (matchMedia('(pointer: fine)').matches) $('#snInput', p).focus();
}
function snClosePanel(silent) {
  const p = $('.sn-panel'); if (!p) return;
  p.remove(); document.body.classList.remove('sn-open');
  if (SN.where === 'panel') SN.where = null;
  if (!silent) $('.sn-fab')?.focus();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('.sn-panel') && !$('.sn-lb,.sn-pick')) {
    const menu = $('.sn-menu');
    if (menu && !menu.hidden) return snMenu(false);
    if ($('.sn-histpop')) return $('.sn-histpop').remove();
    snClosePanel();
  }
});

/* ---------- the full page: #senin and #senin/<chatId> ---------- */
VIEWS.senin = async ([cid], alive) => {
  snClosePanel(true);
  shell('senin', `<div class="sn-page">
    <aside class="sn-side card" aria-label="Your Senin chats">
      <button type="button" class="btn block" data-sn="new">${icon('plus', 18)}New chat</button>
      <h4>Your chats</h4>
      <div class="sn-hist-list" id="snHist"><div class="loading"><div class="spinner" aria-label="Loading chats"></div></div></div>
    </aside>
    <section class="sn-main sn card">
      <header class="sn-mhead">
        <span class="sn-head-av">${snOcto(44, false)}</span>
        <div class="sn-head-t"><h1 id="snTitle">New chat</h1><span id="snSub"></span></div>
        <span id="snTag"></span>
        <button type="button" class="sn-hb sn-only-phone" data-sn="hist" aria-label="Your chats" title="Your chats">${icon('clock', 18)}</button>
        <button type="button" class="sn-hb sn-only-phone" data-sn="new" aria-label="New chat" title="New chat">${icon('plus', 18)}</button>
      </header>
      ${snUIHTML()}
    </section>
  </div>`);
  const page = $('.sn-page');
  SN.where = 'page';
  snBind(page);
  const prev = S.cleanup;
  S.cleanup = () => { if (SN.where === 'page') SN.where = null; prev && prev(); };
  if (!cid && SN.chatId) history.replaceState(null, '', '#senin/' + SN.chatId);
  if (cid && cid !== SN.chatId) snOpenChat(cid);
  else { snRenderAll(); snScroll(); snLibs().then(() => { if (alive() && SN.msgs.length) { snRenderAll(); snScroll(); } }).catch(() => {}); }
  snInitQuota();
  const list = await snLoadChats(true);
  if (!alive()) return;
  const box = $('#snHist'); if (box) box.innerHTML = snHistHTML(list);
  if (matchMedia('(pointer: fine)').matches) $('#snInput')?.focus();
};

/* ---------- admin: Senin AI tab ---------- */
// Reads a PDF's text page by page (in the admin's browser) and stores it for Senin's search.
async function seninIndexMaterial(m, { file, onProgress } = {}) {
  let doc;
  if (file) doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  else {
    const { data: s, error } = await sb.storage.from('materials').createSignedUrl(m.file_path, 600);
    if (error || !s) throw error || new Error('Could not open the PDF.');
    doc = await pdfjsLib.getDocument({ url: s.signedUrl }).promise;
  }
  const rows = []; let empty = 0;
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      let t = '';
      for (const it of tc.items) if ('str' in it) t += it.str + (it.hasEOL ? '\n' : ' ');
      t = t.replace(/\u0000/g, '').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 20000);
      if (t.length < 20) empty++;
      rows.push({ material_id: m.id, page_no: i, content: t });
      page.cleanup(); onProgress?.(i, doc.numPages);
    }
  } finally { doc.destroy(); }
  const del = await sb.from('material_pages').delete().eq('material_id', m.id);
  if (del.error) throw del.error;
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await sb.from('material_pages').insert(rows.slice(i, i + 50));
    if (error) throw error;
  }
  return { pages: rows.length, empty };
}
// called right after an admin upload: read the new PDF in the background
function seninAutoIndex(row, file) {
  if (!row?.id) return;
  seninIndexMaterial(row, { file })
    .then(r => toast(r.empty === r.pages ? `Senin couldn't find text in "${row.title}" (scanned PDF?).` : `Senin has read "${row.title}".`))
    .catch(e => console.warn('Senin could not read the PDF', e));
}
ADMIN_TABS.push(['senin', 'Senin AI']);
ADMIN.senin = async (el, alive) => {
  const { data: st, error } = await sb.rpc('senin_admin_stats');
  if (!alive()) return;
  if (error) {
    el.innerHTML = `<div class="empty">${/does not exist|schema cache|Could not find/i.test(error.message)
      ? 'Senin is not set up in the database yet. Run <b>supabase/schema.sql</b> in the Supabase SQL Editor, then reload.' : esc(error.message)}</div>`;
    return;
  }
  const cfg = { enabled: true, daily_limit: 25, ...(S.senin || {}) };
  const mats = [...S.materials].sort((a, b) => a.subject_id.localeCompare(b.subject_id) || (a.title || '').localeCompare(b.title || ''));
  const idx = st.indexed || {};
  const unread = mats.filter(m => !idx[m.id]);
  const week = st.week || [];
  const maxW = Math.max(1, ...week.map(w => w.doubts));
  el.innerHTML = `
    <div class="grid g2" style="align-items:start">
      <section class="card">
        <h3>Usage</h3>
        <div class="sn-stats">
          <div><b>${st.today_doubts}</b><span>Doubts today</span></div>
          <div><b>${st.today_students}</b><span>Students today</span></div>
          <div><b>${st.total_chats}</b><span>Chats in total</span></div>
        </div>
        <h4 class="sn-adm-h">Last 7 days</h4>
        ${week.length ? week.map(w => `<div class="hbar"><span>${esc(new Date(w.day + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }))}</span><div class="bar"><i style="width:${w.doubts * 100 / maxW}%"></i></div><b>${w.doubts}</b></div>`).join('') : '<p class="muted small">No doubts asked yet.</p>'}
        <p class="muted small" style="margin-top:12px">Chats are private: only each student can read their own.</p>
      </section>
      <section class="card">
        <h3>Settings</h3>
        <form id="snCfg" class="stack-sm" style="margin-top:12px">
          <label class="sn-toggle"><input type="checkbox" name="enabled" ${cfg.enabled ? 'checked' : ''}><span>Senin is on for students</span></label>
          <label class="field"><span>Doubts per student per day</span><input class="input" type="number" name="limit" min="0" max="500" value="${Number(cfg.daily_limit)}" required>
            <small>Keeps the free Gemini quota fair for everyone. The admin has no limit.</small></label>
          <button class="btn" type="submit">Save settings</button>
        </form>
      </section>
    </div>
    <section class="card" style="margin-top:18px">
      <div class="row" style="flex-wrap:wrap;justify-content:space-between">
        <div><h3>What Senin has read</h3><p class="muted small" style="margin-top:4px">Senin answers from the text inside your PDFs. New uploads are read automatically. ${mats.length - unread.length} of ${mats.length} PDFs read.</p></div>
        <button type="button" class="btn" id="snReadAll" ${unread.length ? '' : 'disabled'}>${icon('book', 18)}${unread.length ? `Read ${unread.length} new PDF${unread.length === 1 ? '' : 's'}` : 'All PDFs read'}</button>
      </div>
      <div id="snProg" class="muted small" style="margin-top:8px" aria-live="polite"></div>
      <div class="sn-mats">${mats.map(m => {
        const x = idx[m.id], u = m.unit_id ? unitById(m.unit_id) : null;
        const status = !x ? '<span class="pill neutral">Not read yet</span>'
          : x.empty >= x.pages ? `<span class="pill bad">No text found (scanned?)</span>`
          : x.empty ? `<span class="pill good">Read · ${x.pages} pages</span> <span class="pill bad">${x.empty} without text</span>`
          : `<span class="pill good">Read · ${x.pages} pages</span>`;
        return `<div class="sn-mat"><div><b>${esc(m.title)}</b><small>${esc([SUBJ[m.subject_id]?.code, u ? 'Unit ' + u.unit_no : '', SECTION_LABEL[m.section], m.is_visible ? '' : 'hidden'].filter(Boolean).join(' · '))}</small></div>
          <div class="sn-mat-r">${status}<button type="button" class="btn sm ghost" data-reread="${esc(m.id)}">${x ? 'Read again' : 'Read now'}</button></div></div>`;
      }).join('') || '<p class="empty">No PDFs uploaded yet.</p>'}</div>
      <p class="muted small" style="margin-top:12px">"No text" pages are scanned images: Senin can't search them, but students can still attach those PDFs or photos to a doubt.</p>
    </section>`;
  const f = $('#snCfg', el);
  f.onsubmit = async e => {
    e.preventDefault();
    const value = { enabled: f.enabled.checked, daily_limit: Math.max(0, Math.min(500, Number(f.limit.value) || 0)) };
    const btn = $('button[type=submit]', f); setBusy(btn, true, 'Saving…');
    const { error } = await sb.from('app_settings').upsert({ key: 'senin', value, updated_at: new Date().toISOString() });
    setBusy(btn, false);
    if (error) return toast(errMsg(error), true);
    S.senin = value; toast('Senin settings saved.');
  };
  const run = async (list, btn) => {
    const prog = $('#snProg', el);
    $$('button', el).forEach(b => b.disabled = true);
    let ok = 0;
    for (const [k, m] of list.entries()) {
      try {
        await seninIndexMaterial(m, { onProgress: (i, n) => { if (prog) prog.textContent = `Reading ${k + 1} of ${list.length}: "${m.title}", page ${i} of ${n}…`; } });
        ok++;
      } catch (e) { toast(`Could not read "${m.title}": ${errMsg(e)}`, true); }
      if (!alive()) return;
    }
    toast(`Senin read ${ok} PDF${ok === 1 ? '' : 's'}.`);
    ADMIN.senin(el, alive);
  };
  $('#snReadAll', el).onclick = e => run(unread, e.currentTarget);
  $$('[data-reread]', el).forEach(b => b.onclick = () => run([mats.find(m => m.id === b.dataset.reread)], b));
};
