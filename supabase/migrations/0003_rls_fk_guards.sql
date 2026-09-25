-- Cross-tenant foreign keys are checked inside RLS, not by a security-definer helper.
-- A subquery on another table runs as the caller, so a row the caller cannot
-- read cannot be stored. Catalog exercises (owner_id is null) stay readable.
-- GLOBAL CATALOG — INTENTIONAL

create index if not exists training_programs_athlete_idx on public.training_programs (athlete_id);
create index if not exists program_phases_program_idx on public.program_phases (program_id);
create index if not exists program_weeks_phase_idx on public.program_weeks (phase_id);
create index if not exists workout_sections_day_idx on public.workout_sections (workout_day_id);
create index if not exists exercises_owner_idx on public.exercises (owner_id) where owner_id is not null;
create index if not exists exercise_media_owner_idx on public.exercise_media (owner_id) where owner_id is not null;
create index if not exists workout_items_exercise_idx on public.workout_items (exercise_id);
create index if not exists workout_sessions_day_idx on public.workout_sessions (workout_day_id);
create index if not exists session_exercises_item_idx on public.session_exercises (workout_item_id);
create index if not exists strength_test_templates_exercise_idx on public.strength_test_templates (exercise_id);
create index if not exists strength_tests_exercise_idx on public.strength_tests (exercise_id);
create index if not exists strength_tests_template_idx on public.strength_tests (template_id);
create index if not exists personal_records_athlete_idx on public.personal_records (athlete_id);
create index if not exists personal_records_exercise_idx on public.personal_records (exercise_id);
create index if not exists personal_records_session_idx on public.personal_records (source_session_id);

drop policy if exists sessions_owner_all on public.workout_sessions;
create policy sessions_owner_all on public.workout_sessions
for all to authenticated
using (athlete_id = (select auth.uid()))
with check (
  athlete_id = (select auth.uid())
  and exists (
    select 1
    from public.workout_days d
    where d.id = workout_day_id
  )
);

drop policy if exists session_exercises_owner_all on public.session_exercises;
create policy session_exercises_owner_all on public.session_exercises
for all to authenticated
using (
  exists (
    select 1
    from public.workout_sessions s
    where s.id = session_id
      and s.athlete_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_sessions s
    where s.id = session_id
      and s.athlete_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.workout_items i
    join public.workout_sections sec on sec.id = i.workout_section_id
    where i.id = workout_item_id
      and sec.workout_day_id = (
        select s.workout_day_id
        from public.workout_sessions s
        where s.id = session_id
      )
  )
);

drop policy if exists media_owner_write on public.exercise_media;
create policy media_owner_write on public.exercise_media
for all to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises e
    where e.id = exercise_id
  )
  and (
    storage_path is null
    or split_part(storage_path, '/', 1) = (select auth.uid())::text
  )
);

drop policy if exists strength_tests_owner_all on public.strength_tests;
create policy strength_tests_owner_all on public.strength_tests
for all to authenticated
using (athlete_id = (select auth.uid()))
with check (
  athlete_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises e
    where e.id = exercise_id
  )
  and (
    template_id is null
    or exists (
      select 1
      from public.strength_test_templates t
      where t.id = template_id
        and t.exercise_id = exercise_id
    )
  )
);

drop policy if exists personal_records_owner_all on public.personal_records;
create policy personal_records_owner_all on public.personal_records
for all to authenticated
using (athlete_id = (select auth.uid()))
with check (
  athlete_id = (select auth.uid())
  and exists (
    select 1
    from public.exercises e
    where e.id = exercise_id
  )
  and (
    source_session_id is null
    or exists (
      select 1
      from public.workout_sessions s
      where s.id = source_session_id
        and s.athlete_id = (select auth.uid())
    )
  )
);
