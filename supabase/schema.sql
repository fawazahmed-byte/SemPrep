-- =====================================================================
-- SemPrep — Supabase schema (re-runnable)
-- =====================================================================
create or replace function public.admin_email() returns text
language sql immutable as $$ select 'syed.fawazahmed789@gmail.com'::text $$;

create or replace function public.college_domain() returns text
language sql immutable as $$ select 'qiscet.edu.in'::text $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  role text not null default 'student' check (role in ('student','admin')),
  batch text, branch text, roll_no text,
  diwali_mode boolean not null default true,
  hidden_from_leaderboard boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id text primary key,
  code text not null,
  name text not null,
  sort_order int not null default 0,
  is_visible boolean not null default true
);

create table if not exists public.units (
  id serial primary key,
  subject_id text not null references public.subjects(id) on delete cascade,
  unit_no int not null check (unit_no between 1 and 10),
  title text,
  is_visible boolean not null default true,
  unique (subject_id, unit_no)
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  subject_id text not null references public.subjects(id) on delete cascade,
  unit_id int references public.units(id) on delete cascade,
  section text not null check (section in ('college','special','mid_answers','mid_bits')),
  title text not null,
  file_path text not null,
  page_count int not null default 0,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  check ((section in ('college','special') and unit_id is not null) or (section in ('mid_answers','mid_bits') and unit_id is null))
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  unit_id int not null references public.units(id) on delete cascade,
  topic text not null default 'General',
  question text not null,
  option_a text not null, option_b text not null, option_c text not null, option_d text not null,
  correct smallint not null check (correct between 0 and 3),
  explanation text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  unit_id int not null references public.units(id) on delete cascade,
  score int not null, total int not null, percent int not null,
  is_practice boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.attempt_answers (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  chosen smallint,
  is_correct boolean not null,
  primary key (attempt_id, question_id)
);

create table if not exists public.reading_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  pages_viewed int[] not null default '{}',
  total_pages int not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, material_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  is_important boolean not null default false,
  end_date date,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  helped text not null check (helped in ('Yes, a lot','Somewhat','Not really')),
  comment text not null default '',
  suggestion text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.subjects (id, code, name, sort_order) values
  ('ml','ML','Machine Learning',1),
  ('flat','FLAT','Formal Languages and Automata Theory',2),
  ('ai','AI','Artificial Intelligence',3),
  ('cnp','CNP','Computer Networks and Protocols',4),
  ('edvc','EDVC','Entrepreneurship Development and Venture Creation',5)
on conflict (id) do nothing;

insert into public.units (subject_id, unit_no)
select s.id, n from public.subjects s cross join generate_series(1,5) n
on conflict (subject_id, unit_no) do nothing;

insert into public.app_settings (key, value) values ('festive_offered', 'true'::jsonb)
on conflict (key) do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.check_signup_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) <> public.admin_email()
     and lower(new.email) not like '%@' || public.college_domain() then
    raise exception 'Please use your college email (@%).', public.college_domain();
  end if;
  return new;
end $$;

drop trigger if exists check_signup_email on auth.users;
create trigger check_signup_email before insert on auth.users
  for each row execute function public.check_signup_email();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  e text := lower(new.email);
  local text := split_part(e, '@', 1);
  uname text := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), local);
  m text[];
begin
  m := regexp_match(local, '^(\d{2})(\d{2})([0-9a-z]{2})(\d{2})([0-9a-z]{2})$');
  if exists (select 1 from public.profiles where lower(username) = lower(uname)) then
    uname := uname || '_' || substr(md5(new.id::text), 1, 4);
  end if;
  insert into public.profiles (id, username, email, role, batch, branch, roll_no)
  values (
    new.id, uname, e,
    case when e = public.admin_email() then 'admin' else 'student' end,
    case when m is not null then '20' || m[1] end,
    case when m is not null then
      case m[4] when '01' then 'CIVIL' when '02' then 'EEE' when '03' then 'MECH' when '04' then 'ECE'
                when '05' then 'CSE' when '12' then 'IT' when '42' then 'CSM' when '44' then 'CSD'
                else 'Code ' || m[4] end end,
    case when m is not null then upper(local) end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
    new.hidden_from_leaderboard := old.hidden_from_leaderboard;
    new.batch := old.batch; new.branch := old.branch; new.roll_no := old.roll_no;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.units enable row level security;
alter table public.materials enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.reading_progress enable row level security;
alter table public.announcements enable row level security;
alter table public.feedback enable row level security;
alter table public.app_settings enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "own profile read"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy "subjects read"  on public.subjects for select using (is_visible or public.is_admin());
create policy "subjects admin" on public.subjects for all using (public.is_admin()) with check (public.is_admin());

create policy "units read"  on public.units for select to authenticated using (is_visible or public.is_admin());
create policy "units admin" on public.units for all using (public.is_admin()) with check (public.is_admin());

create policy "materials read"  on public.materials for select to authenticated using (is_visible or public.is_admin());
create policy "materials admin" on public.materials for all using (public.is_admin()) with check (public.is_admin());

create policy "questions admin" on public.questions for all using (public.is_admin()) with check (public.is_admin());

create policy "own attempts read"  on public.quiz_attempts for select using (user_id = auth.uid() or public.is_admin());
create policy "own answers read"   on public.attempt_answers for select using (
  exists (select 1 from public.quiz_attempts a where a.id = attempt_id and (a.user_id = auth.uid() or public.is_admin())));

create policy "own reading" on public.reading_progress for all
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid());

create policy "announcements read"  on public.announcements for select to authenticated
  using ((not is_hidden and (end_date is null or end_date >= current_date)) or public.is_admin());
create policy "announcements admin" on public.announcements for all using (public.is_admin()) with check (public.is_admin());

create policy "own feedback"   on public.feedback for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid());

create policy "settings read"  on public.app_settings for select using (true);
create policy "settings admin" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_quiz(p_unit int, p_count int default 25, p_retry uuid default null)
returns table (id uuid, topic text, question text, option_a text, option_b text, option_c text, option_d text)
language sql stable security definer set search_path = public as $$
  select q.id, q.topic, q.question, q.option_a, q.option_b, q.option_c, q.option_d
  from public.questions q
  where q.unit_id = p_unit and q.is_active and auth.uid() is not null
    and (p_retry is null or q.id in (
      select aa.question_id from public.attempt_answers aa
      join public.quiz_attempts a on a.id = aa.attempt_id
      where a.id = p_retry and a.user_id = auth.uid() and not aa.is_correct))
  order by random()
  limit least(greatest(p_count, 1), 100);
$$;

create or replace function public.submit_quiz(p_unit int, p_answers jsonb, p_practice boolean default false)
returns table (attempt_id uuid, score int, total int, percent int,
               question_id uuid, topic text, question text, options text[], chosen smallint, correct smallint, explanation text)
language plpgsql security definer set search_path = public as $$
declare
  v_attempt uuid := gen_random_uuid();
  v_total int; v_score int; v_pct int;
begin
  if auth.uid() is null then raise exception 'Log in to submit a quiz.'; end if;

  create temp table _ans on commit drop as
  select (x->>'question_id')::uuid as qid, nullif(x->>'chosen','')::smallint as chosen
  from jsonb_array_elements(p_answers) x;

  select count(*), count(*) filter (where a.chosen = q.correct)
    into v_total, v_score
  from _ans a join public.questions q on q.id = a.qid and q.unit_id = p_unit;

  if v_total = 0 then raise exception 'No valid answers.'; end if;
  v_pct := round(v_score * 100.0 / v_total);

  insert into public.quiz_attempts (id, user_id, unit_id, score, total, percent, is_practice)
  values (v_attempt, auth.uid(), p_unit, v_score, v_total, v_pct, p_practice);

  insert into public.attempt_answers (attempt_id, question_id, chosen, is_correct)
  select v_attempt, a.qid, a.chosen, coalesce(a.chosen = q.correct, false)
  from _ans a join public.questions q on q.id = a.qid and q.unit_id = p_unit;

  return query
  select v_attempt, v_score, v_total, v_pct, q.id, q.topic, q.question,
         array[q.option_a, q.option_b, q.option_c, q.option_d], a.chosen, q.correct, q.explanation
  from _ans a join public.questions q on q.id = a.qid and q.unit_id = p_unit;
end $$;

create or replace function public.get_attempt(p_attempt uuid)
returns table (attempt_id uuid, unit_id int, score int, total int, percent int, is_practice boolean,
               question_id uuid, topic text, question text, options text[], chosen smallint, correct smallint, explanation text)
language sql stable security definer set search_path = public as $$
  select a.id, a.unit_id, a.score, a.total, a.percent, a.is_practice, q.id, q.topic, q.question,
         array[q.option_a, q.option_b, q.option_c, q.option_d], aa.chosen, q.correct, q.explanation
  from public.quiz_attempts a
  join public.attempt_answers aa on aa.attempt_id = a.id
  join public.questions q on q.id = aa.question_id
  where a.id = p_attempt and (a.user_id = auth.uid() or public.is_admin());
$$;

create or replace function public.unit_progress(p_user uuid)
returns table (unit_id int, subject_id text, unit_no int, read_pct int, has_materials boolean, best int, attempts int)
language sql stable security definer set search_path = public as $$
  with mats as (
    select m.id, m.unit_id, greatest(m.page_count, 1) as pages
    from public.materials m
    where m.is_visible and m.section in ('college','special')
  ),
  seen as (
    select mats.unit_id,
           sum(least(coalesce(cardinality(r.pages_viewed), 0), mats.pages)) as seen_pages,
           sum(mats.pages) as total_pages
    from mats left join public.reading_progress r on r.material_id = mats.id and r.user_id = p_user
    group by mats.unit_id
  ),
  q as (
    select a.unit_id, max(a.percent) as best, count(*) as attempts
    from public.quiz_attempts a where a.user_id = p_user and not a.is_practice
    group by a.unit_id
  )
  select u.id, u.subject_id, u.unit_no,
         case when s.total_pages is null then 0 else floor(s.seen_pages * 100.0 / s.total_pages)::int end,
         s.total_pages is not null,
         q.best::int, coalesce(q.attempts, 0)::int
  from public.units u
  left join seen s on s.unit_id = u.id
  left join q on q.unit_id = u.id
  where (p_user = auth.uid() or public.is_admin()) and u.is_visible;
$$;

create or replace function public.get_leaderboard(p_subject text default null)
returns table (username text, batch text, branch text, units_read int, quizzes int, points int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with mats as (
    select m.id, m.unit_id, greatest(m.page_count, 1) as pages
    from public.materials m where m.is_visible and m.section in ('college','special')
  ),
  unit_pages as (select unit_id, sum(pages) as total from mats group by unit_id),
  user_seen as (
    select r.user_id, mats.unit_id, sum(least(cardinality(r.pages_viewed), mats.pages)) as seen
    from public.reading_progress r join mats on mats.id = r.material_id
    group by r.user_id, mats.unit_id
  ),
  best as (
    select user_id, unit_id, max(percent) as best
    from public.quiz_attempts where not is_practice group by user_id, unit_id
  ),
  per_unit as (
    select p.id as user_id, u.id as unit_id,
           (up.total is not null and coalesce(us.seen, 0) >= up.total) as is_read,
           up.total is null as no_materials,
           b.best
    from public.profiles p
    cross join public.units u
    left join unit_pages up on up.unit_id = u.id
    left join user_seen us on us.user_id = p.id and us.unit_id = u.id
    left join best b on b.user_id = p.id and b.unit_id = u.id
    where p.role = 'student' and not p.hidden_from_leaderboard and u.is_visible
      and (p_subject is null or u.subject_id = p_subject)
  )
  select p.username, p.batch, p.branch,
         count(*) filter (where pu.is_read)::int,
         count(pu.best)::int,
         (sum(case when pu.is_read then 20 else 0 end)
          + sum(case when pu.best is not null and (pu.is_read or pu.no_materials) then pu.best else 0 end))::int,
         p.id = auth.uid()
  from per_unit pu join public.profiles p on p.id = pu.user_id
  where auth.uid() is not null
  group by p.id, p.username, p.batch, p.branch
  having sum(case when pu.is_read then 20 else 0 end)
         + sum(case when pu.best is not null and (pu.is_read or pu.no_materials) then pu.best else 0 end) > 0
      or p.id = auth.uid()
  order by 6 desc, 4 desc;
$$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  select jsonb_build_object(
    'verified', (select count(*) from auth.users u join public.profiles p on p.id = u.id where p.role='student' and u.email_confirmed_at is not null),
    'unverified', (select count(*) from auth.users u join public.profiles p on p.id = u.id where p.role='student' and u.email_confirmed_at is null),
    'active_week', (select count(distinct user_id) from public.quiz_attempts where created_at > now() - interval '7 days'),
    'attempts', (select count(*) from public.quiz_attempts),
    'avg_rating', (select round(avg(rating)::numeric, 1) from public.feedback),
    'by_branch', (select coalesce(jsonb_object_agg(k, c), '{}') from (select coalesce(branch,'Unknown') k, count(*) c from public.profiles where role='student' group by 1) t),
    'by_batch',  (select coalesce(jsonb_object_agg(k, c), '{}') from (select coalesce(batch,'Unknown') k, count(*) c from public.profiles where role='student' group by 1) t),
    'by_subject',(select coalesce(jsonb_object_agg(k, c), '{}') from (select u.subject_id k, count(*) c from public.quiz_attempts a join public.units u on u.id = a.unit_id group by 1) t)
  ) into r;
  return r;
end $$;

create or replace function public.admin_students()
returns table (id uuid, username text, email text, batch text, branch text, verified boolean, hidden boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.email, p.batch, p.branch, u.email_confirmed_at is not null, p.hidden_from_leaderboard, p.created_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.role = 'student' and public.is_admin()
  order by p.created_at desc;
$$;

grant execute on function public.get_quiz, public.submit_quiz, public.get_attempt, public.unit_progress,
  public.get_leaderboard, public.admin_stats, public.admin_students, public.is_admin to authenticated;

insert into storage.buckets (id, name, public) values ('materials', 'materials', false)
on conflict (id) do nothing;

drop policy if exists "materials read" on storage.objects;
drop policy if exists "materials admin write" on storage.objects;
drop policy if exists "materials admin update" on storage.objects;
drop policy if exists "materials admin delete" on storage.objects;
create policy "materials read" on storage.objects for select to authenticated using (bucket_id = 'materials');
create policy "materials admin write"  on storage.objects for insert to authenticated with check (bucket_id = 'materials' and public.is_admin());
create policy "materials admin update" on storage.objects for update to authenticated using (bucket_id = 'materials' and public.is_admin());
create policy "materials admin delete" on storage.objects for delete to authenticated using (bucket_id = 'materials' and public.is_admin());
