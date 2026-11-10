# SemPrep

Study site for QISCET 3-1 students: unit material (view-only PDF reader), a quiz per unit, Mid answers, progress, leaderboard, feedback, Diwali mode, and an in-app Admin page.

- **Frontend:** plain HTML/CSS/JS (no build). Open `index.html` with VS Code Live Server.
- **Backend:** Supabase (Auth + Postgres RLS + private Storage). Schema: `supabase/schema.sql` (re-runnable).
- **Hosting:** Azure Static Web Apps (Free) via `.github/workflows/azure-static-web-apps.yml`.

## Setup
1. Run `supabase/schema.sql` in Supabase → SQL Editor.
2. Put the Project URL and **anon** key in `js/config.js` (never the service_role key).
3. Supabase → Authentication: Email provider on, Confirm email on, min password 8. Add the admin user (Add user → Auto Confirm). Set up custom SMTP (docs/BACKEND.md §H).
4. URL configuration: Site URL = the Azure URL; Redirect URLs = that URL, `http://localhost:5500`, `http://127.0.0.1:5500`.
5. GitHub secrets: `AZURE_STATIC_WEB_APPS_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

## Documentation
- [AGENTS.md](AGENTS.md): how the project is organised (start here, also for AI tools)
- [docs/BACKEND.md](docs/BACKEND.md): the Supabase backend A to Z (users, PDFs, limits, SQL, troubleshooting)

## Files
- `js/app.js` — config, state, routing, auth, app shell, syllabus map
- `js/views.js` — landing, home, subject, reader, quiz, result, progress, leaderboard, Mid, feedback
- `js/admin.js` — Admin (Overview, Materials, Quiz bank, Mid answers, Announcements, Feedback, Students)
- `content/` — drafted quiz question files (git-ignored; contains answers)

## Quiz import format
One question per line:
```
question | A | B | C | D | correct letter | topic | explanation
```
