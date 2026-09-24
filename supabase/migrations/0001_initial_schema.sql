create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  preferred_units text not null default 'kg' check (preferred_units in ('kg','lbs')),
  locale text not null default 'fr-CA',
  source_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  athlete_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_weight_unit text not null default 'kg' check (preferred_weight_unit in ('kg','lbs')),
  timer_sound boolean not null default true,
  notifications_enabled boolean not null default false,
  dark_mode boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  start_date date,
  status text not null default 'active',
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_phases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  name text not null,
  label text,
  start_week integer,
  end_week integer,
  description text,
  sort_order integer not null default 0,
  source_sheet text,
  source_cell text
);

create table if not exists public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  phase_id uuid references public.program_phases(id) on delete set null,
  week_number integer not null,
  name text,
  status text not null default 'available',
  source_sheet text,
  unique(program_id, week_number)
);

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  program_week_id uuid not null references public.program_weeks(id) on delete cascade,
  day_number integer not null,
  title text not null,
  description text,
  estimated_duration_min integer,
  sort_order integer not null default 0,
  source_sheet text,
  source_cell text,
  unique(program_week_id, day_number)
);

create table if not exists public.workout_sections (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  section_type text not null,
  title text not null,
  instructions text,
  sort_order integer not null default 0,
  source_sheet text,
  source_cell text
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  equipment text,
  muscle_group text,
  default_rest_seconds integer,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  media_type text not null check (media_type in ('image','animated_image','video','poster','external_reference')),
  storage_path text,
  external_url text,
  original_source_url text,
  attribution text,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  status text not null default 'reference_only',
  source_sheet text,
  source_cell text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_items (
  id uuid primary key default gen_random_uuid(),
  workout_section_id uuid not null references public.workout_sections(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  item_kind text not null default 'exercise' check (item_kind in ('exercise','cardio','strength_test')),
  strength_test_ref text,
  prescribed_sets integer,
  prescribed_reps numeric(8,2),
  prescribed_duration_sec integer,
  prescription_mode text,
  laterality text,
  target_raw text,
  prescribed_weight numeric(10,2),
  weight_unit text check (weight_unit in ('kg','lbs')),
  weight_quantity integer,
  load_raw text,
  rest_seconds integer,
  rest_raw text,
  intensity text,
  cardio jsonb,
  notes text,
  sort_order integer not null default 0,
  source_sheet text,
  source_cell text,
  source_url text,
  source_location text
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  workout_day_id uuid not null references public.workout_days(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  workout_item_id uuid not null references public.workout_items(id),
  status text not null default 'in_progress',
  notes text not null default '',
  unique(session_id, workout_item_id)
);

create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises(id) on delete cascade,
  set_number integer not null,
  target_reps numeric(8,2),
  actual_reps numeric(8,2),
  target_weight numeric(10,2),
  target_weight_unit text check (target_weight_unit in ('kg','lbs')),
  actual_weight numeric(10,2),
  actual_weight_unit text check (actual_weight_unit in ('kg','lbs')),
  duration_sec integer,
  rpe numeric(4,2),
  completed_at timestamptz,
  unique(session_exercise_id, set_number)
);

create table if not exists public.strength_test_templates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  slug text not null,
  name text not null,
  formula_name text,
  formula_source text,
  source_estimated_1rm numeric(10,4),
  source_sheet text,
  source_cell text,
  unique(program_id, slug)
);

create table if not exists public.strength_test_template_sets (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.strength_test_templates(id) on delete cascade,
  set_number integer not null,
  weight_raw text,
  target_weight numeric(10,2),
  weight_unit text check (weight_unit in ('kg','lbs')),
  target_reps numeric(8,2),
  rest_seconds integer,
  rest_raw text,
  source_cell text,
  unique(template_id, set_number)
);

create table if not exists public.strength_tests (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  template_id uuid references public.strength_test_templates(id) on delete set null,
  performed_at timestamptz not null default now(),
  result_weight numeric(10,2),
  repetitions numeric(8,2),
  weight_unit text check (weight_unit in ('kg','lbs')),
  estimated_1rm numeric(10,2),
  formula text,
  created_at timestamptz not null default now()
);

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  record_type text not null,
  value numeric(12,3) not null,
  unit text not null,
  achieved_at timestamptz not null,
  source_session_id uuid references public.workout_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_athlete_started_idx on public.workout_sessions(athlete_id, started_at desc);
create index if not exists workout_items_section_idx on public.workout_items(workout_section_id, sort_order);
create index if not exists exercise_media_exercise_idx on public.exercise_media(exercise_id, is_primary desc, sort_order);
create index if not exists strength_tests_athlete_exercise_idx on public.strength_tests(athlete_id, exercise_id, performed_at desc);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger user_preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger training_programs_updated_at before update on public.training_programs for each row execute function public.set_updated_at();
create trigger exercises_updated_at before update on public.exercises for each row execute function public.set_updated_at();
create trigger exercise_media_updated_at before update on public.exercise_media for each row execute function public.set_updated_at();
create trigger workout_sessions_updated_at before update on public.workout_sessions for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'athlete'), '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_preferences (athlete_id) values (new.id) on conflict (athlete_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.training_programs enable row level security;
alter table public.program_phases enable row level security;
alter table public.program_weeks enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_sections enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_media enable row level security;
alter table public.workout_items enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.session_sets enable row level security;
alter table public.strength_test_templates enable row level security;
alter table public.strength_test_template_sets enable row level security;
alter table public.strength_tests enable row level security;
alter table public.personal_records enable row level security;

create policy profiles_self_all on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy preferences_self_all on public.user_preferences for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy programs_owner_all on public.training_programs for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

create policy phases_owner_select on public.program_phases for select to authenticated using (exists (select 1 from public.training_programs p where p.id = program_id and p.athlete_id = auth.uid()));
create policy weeks_owner_select on public.program_weeks for select to authenticated using (exists (select 1 from public.training_programs p where p.id = program_id and p.athlete_id = auth.uid()));
create policy days_owner_select on public.workout_days for select to authenticated using (exists (select 1 from public.program_weeks w join public.training_programs p on p.id = w.program_id where w.id = program_week_id and p.athlete_id = auth.uid()));
create policy sections_owner_select on public.workout_sections for select to authenticated using (exists (select 1 from public.workout_days d join public.program_weeks w on w.id = d.program_week_id join public.training_programs p on p.id = w.program_id where d.id = workout_day_id and p.athlete_id = auth.uid()));
create policy items_owner_select on public.workout_items for select to authenticated using (exists (select 1 from public.workout_sections s join public.workout_days d on d.id = s.workout_day_id join public.program_weeks w on w.id = d.program_week_id join public.training_programs p on p.id = w.program_id where s.id = workout_section_id and p.athlete_id = auth.uid()));

create policy exercises_read on public.exercises for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy exercises_owner_write on public.exercises for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy media_read on public.exercise_media for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy media_owner_write on public.exercise_media for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy sessions_owner_all on public.workout_sessions for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy session_exercises_owner_all on public.session_exercises for all to authenticated using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.athlete_id = auth.uid())) with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.athlete_id = auth.uid()));
create policy session_sets_owner_all on public.session_sets for all to authenticated using (exists (select 1 from public.session_exercises se join public.workout_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.athlete_id = auth.uid())) with check (exists (select 1 from public.session_exercises se join public.workout_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.athlete_id = auth.uid()));

create policy test_templates_owner_select on public.strength_test_templates for select to authenticated using (exists (select 1 from public.training_programs p where p.id = program_id and p.athlete_id = auth.uid()));
create policy test_template_sets_owner_select on public.strength_test_template_sets for select to authenticated using (exists (select 1 from public.strength_test_templates t join public.training_programs p on p.id = t.program_id where t.id = template_id and p.athlete_id = auth.uid()));
create policy strength_tests_owner_all on public.strength_tests for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy personal_records_owner_all on public.personal_records for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
