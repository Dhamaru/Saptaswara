-- Ensure the onboarding preferences table exists in environments where the
-- original migration was never applied. Safe to run repeatedly.
create table if not exists public.user_preferences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  skill_level     text check (skill_level in ('Beginner', 'Student', 'Musician')),
  onboarding_mood text,
  preferred_ragas text[] default '{}',
  preferred_instruments text[] default '{}',
  onboarding_done boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.user_preferences enable row level security;

-- Preferences are private to the signed-in learner.
revoke all on public.user_preferences from anon;
grant select, insert, update, delete on public.user_preferences to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_preferences'
      and policyname = 'users own preferences'
  ) then
    create policy "users own preferences"
      on public.user_preferences
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
