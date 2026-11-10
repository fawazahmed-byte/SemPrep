# SemPrep backend (Supabase): A to Z

Everything about how SemPrep's backend is built, how it works, and where to look for things (users, PDFs, quiz questions, usage, errors). Dashboard links go straight to the SemPrep project.

---

## A. The project at a glance

| Item | Value |
|---|---|
| Supabase project name | **Semprep** |
| Project ref / ID | `mmaljrfahdhbkiovnnlm` |
| Project URL (API) | `https://mmaljrfahdhbkiovnnlm.supabase.co` |
| Region | `ap-northeast-1` (Tokyo) |
| Plan | **Free** (organization "fawaz'orgn") |
| Dashboard | https://supabase.com/dashboard/project/mmaljrfahdhbkiovnnlm |
| Admin account | `syed.fawazahmed789@gmail.com` (must be email-confirmed) |
| Allowed student emails | anything ending in `@qiscet.edu.in` |
| The whole backend in one file | [`supabase/schema.sql`](../supabase/schema.sql) (safe to run again) |

**Keys.** The frontend uses the **anon (public) key** in `js/config.js`. It is meant to be public: it can only do what the security rules allow. The **service_role key** (Project Settings → API Keys) bypasses every rule. Never put it in code, GitHub or chat.

---

## B. How it is built

Supabase gives SemPrep four services. There is no other server.

1. **Postgres database**: all data (tables below).
2. **Auth**: sign up / log in with email + password, email verification, password reset.
3. **Storage**: the PDF files and quiz diagram images, in **private** buckets.
4. **Realtime**: pushes new announcements to open browsers (the bell).

The browser talks to Supabase directly with the anon key + the logged-in user's token. **Row Level Security (RLS)** decides, row by row, what each user can read or change, so even someone calling the API by hand can't see answers or edit material.

Everything was created by running `supabase/schema.sql` in **SQL Editor**. To change the backend: edit that file → paste the whole file into the SQL Editor → Run.

---

## C. Where to check things (quick map)

| I want to… | Go to |
|---|---|
| See how many users signed up, who verified, delete a user, send a password reset | **Authentication → Users**: https://supabase.com/dashboard/project/mmaljrfahdhbkiovnnlm/auth/users |
| See student details (username, batch, branch, roll no, hidden from leaderboard) | **Table Editor → profiles**: https://supabase.com/dashboard/project/mmaljrfahdhbkiovnnlm/editor |
| See where the PDFs are saved | **Storage → `materials` bucket**: https://supabase.com/dashboard/project/mmaljrfahdhbkiovnnlm/storage/buckets/materials |
| See quiz diagram images | **Storage → `quiz-images` bucket** |
| See which PDF belongs to which subject/unit/section | **Table Editor → materials** (`file_path` = path inside the bucket) |
| See quiz questions / attempts | **Table Editor → questions / quiz_attempts / attempt_answers** |
| See feedback | **Table Editor → feedback** (or the Admin page → Feedback) |
| Check usage (downloads, storage, users) against free limits | **Organization → Usage**: https://supabase.com/dashboard/org/fzyxmxvqdjrpklvclziu/usage |
| See errors / API calls | **Logs**: https://supabase.com/dashboard/project/mmaljrfahdhbkiovnnlm/logs/explorer |
| Security / performance warnings | **Advisors**: https://supabase.com/dashboard/project/mmaljrfahdhbkiovnnlm/advisors/security |
| Run SQL (counts, fixes, schema updates) | **SQL Editor**: https://supabase.com/dashboard/project/mmaljrfahdhbkiovnnlm/sql/new |
| Email sending, URLs, password rules | **Authentication → Emails / URL Configuration / Providers / Rate Limits** |

Most day-to-day things (uploading PDFs, quizzes, announcements, countdown, students list, hiding a student from the leaderboard) are easier from the **Admin page inside SemPrep**. The dashboard is for checking and fixing.

---

## D. Database tables

All in the `public` schema. RLS is **on** for every table.

| Table | What it stores | Who can read / write |
|---|---|---|
| `profiles` | One row per user: `username`, `email`, `role` (`student`/`admin`), `batch`, `branch`, `roll_no` (decoded from the roll-number email), `diwali_mode`, `hidden_from_leaderboard` | User reads/updates **own** row (can't change role/email/batch/branch/hidden); admin all |
| `subjects` | The 5 subjects (`ml, flat, ai, cnp, edvc`) | Everyone reads visible ones; admin edits |
| `units` | 5 units per subject (`unit_no`, optional `title`, `is_visible`) | Logged-in users read visible; admin edits |
| `materials` | One row per PDF: `subject_id`, `unit_id` (only for unit material), `section`, `title`, `file_path`, `page_count`, `is_visible` | Logged-in users read visible; admin edits |
| `questions` | Quiz bank: question, 4 options, `correct` (0–3), `topic`, `explanation`, `image_path` (diagram) | **Admin only.** Students never read this table (that's how answers stay secret) |
| `quiz_attempts` | Each finished quiz: score, total, percent, `is_practice` | User reads own; written only by `submit_quiz` |
| `attempt_answers` | Each answer inside an attempt | User reads own; written only by `submit_quiz` |
| `reading_progress` | Pages each user has seen per PDF (`pages_viewed`) | User reads/writes own |
| `announcements` | Title, message, `is_important` (pinned), `end_date`, `is_hidden` | Logged-in users read active ones; admin edits |
| `feedback` | One feedback per user: rating, helped, comment, suggestion | User reads/writes own; admin reads all |
| `app_settings` | Key/value settings: `festive_offered` (Diwali), `exam_countdown` ({label, at, end, show}) | Everyone reads; admin edits |

**`materials.section` values**

| Value | Shown as | Linked to |
|---|---|---|
| `college` | College material | a unit |
| `special` | Special material | a unit |
| `mid_answers` | Mid answers | a subject |
| `two_marks` | 2 marks answers | a subject |
| `mid_bits` | Mid bits | a subject |
| `cheat_sheets` | Cheat sheets | a subject |
| `last_minute` | Last minute revision sheets | a subject |

Two CHECK constraints enforce this (`materials_section_check`, `materials_check`). Adding a new section means updating both (in schema.sql) and `EXAM_PAGES` in `js/app.js`.

---

## E. Where the PDFs are saved

- **Bucket `materials`** (private). Path inside the bucket: `<subject>/<section>/<random-id>.pdf`, e.g. `ml/college/de80734a-….pdf`.
- The matching row in the **`materials` table** has that path in `file_path`, plus the title, section, subject/unit and page count. **The table row is what makes a PDF appear on the site.** A file with no row is invisible; a row whose file is missing shows an error.
- **Bucket `quiz-images`** (private, max 5 MB, PNG/JPEG/WebP/GIF): quiz diagrams, path `<unit-id>/<random-id>.png`, linked from `questions.image_path`.
- Students get **signed URLs** that expire after 10 minutes (PDFs) or 1 hour (diagrams). Files are never public.
- Storage rules: logged-in users can read a PDF **only if its `materials` row is visible**; only the admin can upload/replace/delete. Any logged-in user can view quiz diagrams.
- Deleting in the Admin page removes both the row and the file. If you delete in the dashboard, delete both yourself.

---

## F. How the important parts work

**Sign up and roles**
1. Student signs up on the site → Supabase Auth creates the user.
2. Trigger `check_signup_email` rejects any email that isn't `@qiscet.edu.in` (except the admin email). It also runs when someone changes their email later.
3. Trigger `handle_new_user` creates the `profiles` row: username, and for roll-number emails like `24491a055e@…` it fills batch (`2024`), branch (`05` → CSE) and roll no. The admin email gets `role = 'admin'`.
4. The student must click the verification email before they can log in.
5. `is_admin()` = role is admin **and** email is confirmed.

**Quiz (cheat-proof)**
- `get_quiz(unit, count, retry)` returns random questions **without** the correct answers.
- `submit_quiz(unit, answers, practice)` grades on the server, saves the attempt, and only then returns correct answers + explanations. A ranked attempt must include the full quiz (25 questions, or all questions if the unit has fewer); practice rounds can be partial and don't count.
- `get_attempt(id)` re-opens a past result (own attempts only).

**Progress and leaderboard**
- `unit_progress(user)`: % read per unit (from `reading_progress` vs `page_count` of visible College + Special PDFs) and best quiz score.
- `get_leaderboard(subject)`: 20 points per fully-read unit + best quiz % per unit (a quiz only counts once the unit is read, or if the unit has no material). Admin-hidden students are excluded.

**Admin functions**: `admin_stats()` (numbers on the Overview tab) and `admin_students()` (Students tab). Both refuse non-admins.

**Realtime**: the `announcements` table is in the `supabase_realtime` publication; browsers subscribe and refresh the bell when an announcement is added/changed. RLS still applies.

**Security summary (tested 10 Nov 2026)**: a student cannot read questions/answers, make themselves admin, upload or edit material, write settings, see other users' data, open hidden PDFs, or submit a 1-question "ranked" quiz. A logged-out visitor sees only the subject list and settings.

---

## G. Auth settings (Authentication menu)

| Setting | Should be |
|---|---|
| Sign In / Providers → Email | **On**, **Confirm email on**, minimum password length 8 |
| Phone, social logins, anonymous sign-ins | Off |
| URL Configuration → Site URL | Your live site URL (the `semprep.<your-name>.workers.dev` address from Cloudflare) |
| URL Configuration → Redirect URLs | The live URL, `http://localhost:5500`, `http://127.0.0.1:5500` |
| **Emails → SMTP Settings** | **Custom SMTP must be set up before launch** (see H) |
| Rate Limits → emails per hour | Raise to ~100–200 after custom SMTP is set up (default 30) |
| Leaked password protection | Turn on if your plan offers it (Advisors warns about it) |

---

## H. Email sending (required before launch)

Supabase's built-in email service **only sends to members of your Supabase team** and only a few emails per hour. Students would never receive their verification emails. Set up free custom SMTP:

**Option 1, Gmail (easiest, ~500 emails/day)**
1. On the Gmail account you'll send from: Google Account → Security → turn on **2-Step Verification** → **App passwords** → create one ("SemPrep").
2. Supabase → Authentication → Emails → **SMTP Settings** → Enable custom SMTP:
   - Host `smtp.gmail.com`, Port `587`, Username = the Gmail address, Password = the 16-letter app password
   - Sender email = the Gmail address, Sender name = `SemPrep`
3. Save → Authentication → **Rate Limits** → set emails per hour to 100+.

**Option 2, Brevo (free 300 emails/day)**: create an account at brevo.com → SMTP & API → copy host/port/login/key into the same SMTP form.

Test: sign up with a second college email and check that the email arrives (also check Spam).

---

## I. Free plan limits (and what they mean for SemPrep)

| Limit (per month unless noted) | Free plan | SemPrep note |
|---|---|---|
| Egress (data downloaded from Supabase) | **5 GB uncached + 5 GB cached** | The tightest limit. PDFs are the main cost. Compress PDFs; the reader downloads only the pages viewed. |
| File storage | 1 GB | ~55 MB used (Nov 2026) |
| Database size | 500 MB | ~12 MB used |
| Monthly active users | 50,000 | Far above a college batch |
| Realtime concurrent connections | 200 | Each open SemPrep tab = 1. Above 200, live bell updates stop for extra users; the site still works |
| Realtime messages | 2 million | Plenty |
| Auth emails | 30/hour by default with custom SMTP (raise it) | Plan around exam-week signup rush |
| Inactivity pause | Paused after 7 days of no activity | The GitHub "Supabase keep-alive" workflow pings it daily |
| Backups | Daily, not downloadable on Free | Export important tables yourself (see K) |

When a free limit is exceeded Supabase emails you and gives a grace period; after that, requests can be restricted. **Pro plan ($25/month)** raises egress to 250 GB, removes pausing and adds support.

Check usage any time: https://supabase.com/dashboard/org/fzyxmxvqdjrpklvclziu/usage

---

## J. Useful SQL (SQL Editor)

```sql
-- How many users, verified or not
select count(*) total, count(email_confirmed_at) verified from auth.users;

-- Students by branch and batch
select branch, batch, count(*) from public.profiles where role = 'student' group by 1, 2 order by 3 desc;

-- Newest sign-ups
select p.username, p.email, p.branch, u.created_at, u.email_confirmed_at is not null as verified
from public.profiles p join auth.users u on u.id = p.id order by u.created_at desc limit 20;

-- All PDFs with their file paths
select subject_id, section, title, page_count, is_visible, file_path from public.materials order by subject_id, section, title;

-- Storage used per bucket (MB)
select bucket_id, count(*) files, round(sum((metadata->>'size')::bigint) / 1048576.0, 1) mb
from storage.objects group by 1;

-- Questions per unit
select u.subject_id, u.unit_no, count(q.id) from public.units u left join public.questions q on q.unit_id = u.id
group by 1, 2 order by 1, 2;

-- Quiz activity in the last 7 days
select count(*) attempts, count(distinct user_id) students from public.quiz_attempts where created_at > now() - interval '7 days';

-- Files without a row / rows without a file (should both be 0)
select count(*) from storage.objects o where bucket_id = 'materials' and not exists (select 1 from public.materials m where m.file_path = o.name);
select count(*) from public.materials m where not exists (select 1 from storage.objects o where o.bucket_id = 'materials' and o.name = m.file_path);

-- Move the exam countdown (or use Admin → Overview)
update public.app_settings set value = jsonb_set(value, '{at}', '"2026-11-24T04:30:00.000Z"') where key = 'exam_countdown';
```

---

## K. Common tasks

- **Make someone else admin**: change `admin_email()` at the top of `schema.sql`, run the file, and set that user's `profiles.role` to `admin` in the Table Editor. Only one admin email is supported.
- **Change the college domain**: `college_domain()` in schema.sql + `COLLEGE_DOMAIN` in `js/config.js`.
- **Student forgot password**: they use "Forgot password" on the login page, or Authentication → Users → … → Send password recovery.
- **Student didn't get the verification email**: check SMTP (H), Spam folder, or Authentication → Users → … → Send magic link / confirm manually.
- **Remove a student**: Authentication → Users → Delete user (their profile, progress, attempts and feedback are deleted with them).
- **Back up data** (free plan has no downloadable backups): Table Editor → each table → Export → CSV (`profiles`, `materials`, `questions`, `quiz_attempts`, `feedback`, `announcements`). Keep your original PDFs on your computer/Drive.
- **Apply a backend change**: edit `supabase/schema.sql` → SQL Editor → paste all → Run → check Advisors.

---

## L. Troubleshooting

| Error seen | Cause → fix |
|---|---|
| `Bucket not found` (quiz import) | `quiz-images` bucket missing → run schema.sql |
| `violates check constraint "materials_check"` / "database needs updating" | New section type not allowed yet → run schema.sql |
| `permission denied for function …` | Not logged in, or the function was recreated without its grants → run schema.sql (grants are at the end) |
| `new row violates row-level security policy` | Logged-in user isn't admin (or admin email not confirmed). Log out and in again |
| `Please use your college email` | Signup with a non-`@qiscet.edu.in` address (by design) |
| `email rate limit exceeded` / `Email address not authorized` | No custom SMTP / limit too low → section H |
| Upload stuck at a low % | Slow internet (Tokyo region). Compress the PDF; keep the tab open |
| Site shows nothing / "Failed to fetch" after a quiet week | Project paused → Dashboard → Restore project. Check the keep-alive workflow on GitHub |
| PDF opens for admin but not students | Its `materials` row is hidden (`is_visible = false`) |
