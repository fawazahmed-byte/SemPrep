# SemPrep — project guide for AI assistants

Read this file first. It describes what SemPrep is, how the code is organised, and the rules to follow when changing it. Backend (Supabase) details are in [docs/BACKEND.md](docs/BACKEND.md).

## 1. What SemPrep is

A study website for **QISCET 3‑1 (third year, first semester) students**, built and run by **Fawwaz** (admin). Students sign up with a college email (`@qiscet.edu.in`) and get:

- **Unit material**: 5 subjects × 5 units. Each unit has *College material* and *Special material* PDFs, shown in a view-only reader with a watermark, Read mode (full screen) and Previous/Next page buttons.
- **A quiz per unit**: 25 random questions, 15 minutes, graded on the server, with explanations and optional diagrams. "Revise my mistakes" = practice round of only the wrong answers.
- **Exam material per subject**: Mid answers, 2 marks answers, Mid bits, Cheat sheets, Last minute revision sheets (each its own page).
- **Progress map, leaderboard, announcements (with a bell + live notifications), exam countdown, feedback, About page, Diwali theme.**
- **Admin page** (only for the admin account) to manage all of the above.

Subjects: `ml` Machine Learning, `flat` Formal Languages and Automata Theory, `ai` Artificial Intelligence, `cnp` Computer Networks and Protocols, `edvc` Entrepreneurship Development and Venture Creation.

## 2. Tech stack (deliberately simple)

| Layer | What | Notes |
|---|---|---|
| Frontend | Plain HTML + CSS + vanilla JS | **No build step, no npm, no framework.** Files are served as-is. |
| Libraries (CDN) | `@supabase/supabase-js@2.119.0` (jsDelivr), `pdf.js 3.11.174` (cdnjs), Google Fonts (Bricolage Grotesque, Figtree) | Pinned versions. Loaded in `index.html`. |
| Backend | Supabase: Postgres + Row Level Security, Auth (email/password), Storage (private buckets), Realtime | No custom server. All rules live in `supabase/schema.sql`. |
| Hosting | Cloudflare Pages (Free) | Live at https://qiscet-semprep.pages.dev. Deployed with `bash deploy.sh` (`build.sh` → `dist/` → `wrangler pages deploy`). |

## 3. Files

```
index.html                 Loads fonts, libraries and the JS files in order (config → octo → icons → app → views → admin)
css/style.css              All styles. Colour tokens on :root, Diwali theme on body.diwali, mobile rules at max-width 860px
js/config.js               SEMPREP_CONFIG: Supabase URL + anon key (public), college domain, admin email, quiz size/minutes
js/app.js                  Core: config, global state S, helpers ($, $$, esc, toast…), EXAM_PAGES, routing, app shell
                           (sidebar, phone tab bar + "More" sheet), auth screens, announcements + bell, exam countdown, boot
js/views.js                Student pages: landing, about, home, subject, reader, quiz, result, progress, leaderboard,
                           exam material pages (generated from EXAM_PAGES), feedback
js/admin.js                Admin page (tabs: Overview, Materials, Quiz bank, Exam material, Announcements, Feedback, Students),
                           PDF upload with progress, quiz import from text or from a PDF (with diagram cropping)
js/icons.js                ICON_PATHS + icon(name, size) → inline SVG
js/octo.js                 Octopus mascot SVG strings
supabase/schema.sql        The whole backend: tables, triggers, RLS policies, RPC functions, storage buckets. Re-runnable.
samples/quiz-sample-flat.pdf  Example quiz PDF in the import format (5 questions, 3 with diagrams)
wrangler.jsonc             Cloudflare Pages config (project "qiscet-semprep", output dist/)
deploy.sh                  Builds and uploads the site to Cloudflare Pages
build.sh                   Copies only the public files (index.html, css, js, samples, favicon) + a _headers file into dist/ for deployment
.github/workflows/         supabase-keepalive.yml (daily ping so the free Supabase project isn't paused)
docs/BACKEND.md            Everything about the Supabase backend
content/                   (git-ignored) private drafts of quiz questions — contains answers, never commit
```

## 4. How the frontend works

- **Global state** `S` (in `app.js`): `session`, `profile`, `units`, `materials`, `reading` (page progress), `progress`, `anns`, `exam`, `festiveOffered`, `cleanup` (function run when leaving a page).
- **Routing**: hash based. `#name/arg1/arg2` → `VIEWS[name](args, alive)`. `alive()` returns false once the user navigated away (check it after every `await`). `route()` runs `S.cleanup` first.
  - Public routes (no login): `landing, about, login, signup, forgot, newpass, inbox` (the `PUBLIC` set).
  - Logged-in routes: `home, perf, leaderboard, subject/<sid>/<unitNo>, reader/<materialId>, quiz/<unitId>[/revise/<attemptId>], result/<attemptId>, mid2, twomarks, midbits, cheats, lastmin (each /<sid>), feedback, about, admin/<tab>`.
- **Shell**: `shell(activeNavId, innerHTML)` renders sidebar + phone header + tab bar + exam countdown and returns `#content`.
- **Exam material sections** are defined once in `EXAM_PAGES` (app.js). Each entry = nav id, DB `section` value, labels, suggested titles. The sidebar, the student pages, the reader's back link and the Admin "Exam material" tab are all generated from it. **To add a new section:** add an entry to `EXAM_PAGES` *and* add the section value to the two `materials` CHECK constraints in `schema.sql`.
- **Security in the browser is cosmetic.** Every real rule is enforced by Postgres RLS / SECURITY DEFINER functions. Never rely on JS checks alone.

## 5. Data flow (short)

- Login → `loadSettings()` (app_settings: Diwali flag, exam countdown) → `loadCore()` (profile, units, materials, reading progress, announcements) → Realtime channel on `announcements`.
- Reader: `storage.createSignedUrl(file_path, 600)` → pdf.js loads with range requests (only viewed pages) → pages seen are saved to `reading_progress` (debounced upsert).
- Quiz: `rpc('get_quiz')` (no answers sent) → user answers → `rpc('submit_quiz')` grades on the server and returns correct answers + explanations. Diagrams: `storage('quiz-images').createSignedUrls`.
- Admin uploads: PDFs go to bucket `materials` by XHR (to show progress), then a row is inserted in `materials`. Quiz diagrams go to bucket `quiz-images`.

## 6. Rules for making changes

1. **No build tools.** Keep it plain JS that runs directly in the browser. Check syntax with `node --check js/<file>.js`.
2. **Escape all user/DB text** with `esc()` before putting it in HTML.
3. **Database changes go in `supabase/schema.sql`** and must stay re-runnable (`if not exists`, `drop … if exists`, `create or replace`). The owner applies it in the Supabase SQL Editor. A function whose return columns change needs `drop function if exists` first.
4. **Never put the Supabase `service_role` key** in the frontend or in git. Only the anon (public) key belongs in `js/config.js`.
5. **Never commit `content/`** (contains quiz answers).
6. Keep pages working on phones (≤ 860px: sidebar hidden, bottom tab bar + "More" sheet) and in both themes (normal and `body.diwali`).
7. Pin CDN library versions.
8. The admin is the account whose email equals `admin_email()` in schema.sql **and** is email-confirmed.

## 7. Run locally

Open the folder in VS Code → right-click `index.html` → **Open with Live Server** (`http://127.0.0.1:5500`). It talks to the real Supabase project in `js/config.js`. Those URLs must be in Supabase → Authentication → URL Configuration → Redirect URLs.

## 8. Deploy

Run `bash deploy.sh` (needs a one-time `npx wrangler login`). It runs `build.sh` and uploads `dist/` to the Cloudflare Pages project `qiscet-semprep` → https://qiscet-semprep.pages.dev. Pushing to GitHub does not deploy by itself (docs/, supabase/, AGENTS.md, README.md are never published). Routing is hash-based, so no server rewrites are needed. The keep-alive workflow reads the Supabase URL and anon key from `js/config.js`; it runs daily from the default branch (`main`).
