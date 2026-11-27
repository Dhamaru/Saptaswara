-- Migration: Practice progress (sessions, raga progress, lesson progress)
-- Additive only: no existing tables are modified. Safe to run repeatedly.

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raga_id uuid references public.ragas(id) on delete set null,
  raga_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  lesson_id text,
  stage text,
  session_stats jsonb not null default '{}'::jsonb,
  score integer not null default 0 check (score between 0 and 100),
  feedback jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_raga_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raga_id uuid not null references public.ragas(id) on delete cascade,
  raga_name text not null,
  sessions_count integer not null default 0,
  best_score integer not null default 0,
  latest_score integer not null default 0,
  mastery_level text not null default 'Exploring'
    check (mastery_level in ('Exploring', 'Developing', 'Proficient', 'Strong')),
  last_practiced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, raga_id)
);

create table if not exists public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed boolean not null default false,
  best_score integer not null default 0 check (best_score between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.practice_sessions enable row level security;
alter table public.user_raga_progress enable row level security;
alter table public.user_lesson_progress enable row level security;

-- Progress is private to the signed-in learner.
revoke all on public.practice_sessions from anon;
revoke all on public.user_raga_progress from anon;
revoke all on public.user_lesson_progress from anon;
grant select, insert, update, delete on public.practice_sessions to authenticated;
grant select, insert, update, delete on public.user_raga_progress to authenticated;
grant select, insert, update, delete on public.user_lesson_progress to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'practice_sessions'
      and policyname = 'users own practice sessions'
  ) then
    create policy "users own practice sessions"
      on public.practice_sessions
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_raga_progress'
      and policyname = 'users own raga progress'
  ) then
    create policy "users own raga progress"
      on public.user_raga_progress
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_lesson_progress'
      and policyname = 'users own lesson progress'
  ) then
    create policy "users own lesson progress"
      on public.user_lesson_progress
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists practice_sessions_user_id_created_at_idx
  on public.practice_sessions (user_id, created_at desc);

create index if not exists user_raga_progress_user_id_last_practiced_at_idx
  on public.user_raga_progress (user_id, last_practiced_at desc);

-- The unique (user_id, lesson_id) constraint already provides this index.
create index if not exists user_lesson_progress_user_id_lesson_id_idx
  on public.user_lesson_progress (user_id, lesson_id);
