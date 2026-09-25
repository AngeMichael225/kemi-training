begin;

select plan(33);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-0000000000a1',
    'authenticated', 'authenticated', 'user-a@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-0000000000b1',
    'authenticated', 'authenticated', 'user-b@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );

insert into public.exercises (id, owner_id, slug, name) values
  ('10000000-0000-4000-8000-000000000001', null, 'catalog-squat', 'Catalog squat'),
  ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-0000000000a1', 'a-private', 'A private'),
  ('10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-0000000000b1', 'b-private', 'B private');

insert into public.exercise_media (id, exercise_id, owner_id, media_type, alt_text) values
  ('10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', null, 'image', 'Catalog media');

insert into public.training_programs (id, athlete_id, name) values
  ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-0000000000a1', 'A program'),
  ('10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-0000000000b1', 'B program');

insert into public.program_weeks (id, program_id, week_number) values
  ('10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000011', 1),
  ('10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000012', 1);

insert into public.workout_days (id, program_week_id, day_number, title) values
  ('10000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000021', 1, 'A day'),
  ('10000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000022', 1, 'B day');

insert into public.workout_sections (id, workout_day_id, section_type, title) values
  ('10000000-0000-4000-8000-000000000041', '10000000-0000-4000-8000-000000000031', 'strength', 'A section'),
  ('10000000-0000-4000-8000-000000000042', '10000000-0000-4000-8000-000000000032', 'strength', 'B section');

insert into public.workout_items (id, workout_section_id, exercise_id) values
  ('10000000-0000-4000-8000-000000000051', '10000000-0000-4000-8000-000000000041', '10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000052', '10000000-0000-4000-8000-000000000042', '10000000-0000-4000-8000-000000000001');

insert into public.strength_test_templates (id, program_id, exercise_id, slug, name) values
  ('10000000-0000-4000-8000-000000000061', '10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'b-test', 'B test');

insert into public.workout_sessions (id, athlete_id, workout_day_id) values
  ('10000000-0000-4000-8000-000000000071', '10000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000032');

select is_empty(
  $$select relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity$$,
  'RLS is enabled on every public table'
);

set local role anon;
select is((select count(*)::int from public.profiles), 0, 'anonymous cannot read profiles');
select throws_ok(
  $$insert into public.profiles (id, display_name) values ('10000000-0000-4000-8000-000000000099', 'nope')$$,
  '42501',
  null,
  'anonymous cannot insert profiles'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select count(*)::int from public.exercises where id = '10000000-0000-4000-8000-000000000001'),
  1,
  'GLOBAL CATALOG — INTENTIONAL: authenticated users can read catalog exercises'
);
select is(
  (select count(*)::int from public.exercise_media where id = '10000000-0000-4000-8000-000000000004'),
  1,
  'GLOBAL CATALOG — INTENTIONAL: authenticated users can read catalog media'
);
select is((select count(*)::int from public.exercises where id = '10000000-0000-4000-8000-000000000003'), 0, 'user A cannot read user B private exercise');
select is((select count(*)::int from public.training_programs where id = '10000000-0000-4000-8000-000000000012'), 0, 'user A cannot read user B program');
select is((select count(*)::int from public.workout_sessions where id = '10000000-0000-4000-8000-000000000071'), 0, 'user A cannot read user B session');
select is_empty(
  $$update public.exercises set name = 'taken' where id = '10000000-0000-4000-8000-000000000003' returning id$$,
  'user A cannot update user B private exercise'
);

select lives_ok(
  format(
    'insert into public.workout_sessions (id, athlete_id, workout_day_id) values (%L, %L, %L)',
    '10000000-0000-4000-8000-000000000072',
    '10000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000031'
  ),
  'user A can create a session on their own day'
);
select throws_ok(
  format(
    'insert into public.workout_sessions (id, athlete_id, workout_day_id) values (%L, %L, %L)',
    '10000000-0000-4000-8000-000000000073',
    '10000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000032'
  ),
  '42501',
  null,
  'user A cannot point a session at user B workout day'
);
select throws_ok(
  format(
    'update public.workout_sessions set workout_day_id = %L where id = %L',
    '10000000-0000-4000-8000-000000000032',
    '10000000-0000-4000-8000-000000000072'
  ),
  '42501',
  null,
  'user A cannot retarget a session onto user B workout day'
);
select lives_ok(
  format(
    'insert into public.session_exercises (session_id, workout_item_id) values (%L, %L)',
    '10000000-0000-4000-8000-000000000072',
    '10000000-0000-4000-8000-000000000051'
  ),
  'user A can attach their own workout item'
);
select throws_ok(
  format(
    'insert into public.session_exercises (session_id, workout_item_id) values (%L, %L)',
    '10000000-0000-4000-8000-000000000072',
    '10000000-0000-4000-8000-000000000052'
  ),
  '42501',
  null,
  'user A cannot attach user B workout item'
);
select lives_ok(
  format(
    'insert into public.strength_tests (athlete_id, exercise_id) values (%L, %L)',
    '10000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000001'
  ),
  'user A can record a catalog exercise strength test'
);
select throws_ok(
  format(
    'insert into public.strength_tests (athlete_id, exercise_id) values (%L, %L)',
    '10000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000003'
  ),
  '42501',
  null,
  'user A cannot reference user B private exercise from a strength test'
);
select throws_ok(
  format(
    'insert into public.strength_tests (athlete_id, exercise_id, template_id) values (%L, %L, %L)',
    '10000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000061'
  ),
  '42501',
  null,
  'user A cannot reference user B strength template'
);
select lives_ok(
  format(
    'insert into public.personal_records (athlete_id, exercise_id, record_type, value, unit, achieved_at) values (%L, %L, %L, 1, %L, now())',
    '10000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000001',
    'estimated_1rm',
    'kg'
  ),
  'user A can store a catalog personal record'
);
select throws_ok(
  format(
    'insert into public.personal_records (athlete_id, exercise_id, record_type, value, unit, achieved_at, source_session_id) values (%L, %L, %L, 1, %L, now(), %L)',
    '10000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000001',
    'estimated_1rm',
    'kg',
    '10000000-0000-4000-8000-000000000071'
  ),
  '42501',
  null,
  'user A cannot point a personal record at user B session'
);
select lives_ok(
  format(
    'insert into public.exercise_media (exercise_id, owner_id, media_type, storage_path) values (%L, %L, %L, %L)',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-0000000000a1',
    'image',
    '10000000-0000-4000-8000-0000000000a1'::text || '/photo.jpg'
  ),
  'user A can attach media to a catalog exercise under their prefix'
);
select throws_ok(
  format(
    'insert into public.exercise_media (exercise_id, owner_id, media_type) values (%L, %L, %L)',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-0000000000a1',
    'image'
  ),
  '42501',
  null,
  'user A cannot attach media to user B private exercise'
);

select lives_ok(
  format(
    'insert into storage.objects (bucket_id, name) values (%L, %L)',
    'exercise-media',
    '10000000-0000-4000-8000-0000000000a1'::text || '/file.jpg'
  ),
  'user A can upload under their storage prefix'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'exercise-media' and name = '10000000-0000-4000-8000-0000000000a1'::text || '/file.jpg'),
  1,
  'user A can read their storage object'
);
select throws_ok(
  format(
    'insert into storage.objects (bucket_id, name) values (%L, %L)',
    'exercise-media',
    '10000000-0000-4000-8000-0000000000b1'::text || '/stolen.jpg'
  ),
  '42501',
  null,
  'user A cannot upload under user B prefix'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000b1', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*)::int from storage.objects where name = '10000000-0000-4000-8000-0000000000a1'::text || '/file.jpg'),
  0,
  'user B cannot read user A storage object'
);
select throws_ok(
  format(
    'delete from storage.objects where bucket_id = %L and name = %L',
    'exercise-media',
    '10000000-0000-4000-8000-0000000000a1'::text || '/file.jpg'
  ),
  '42501',
  null,
  'user B cannot delete user A storage object'
);

reset role;
select is(
  (select count(*)::int from storage.objects where name like '%/file.jpg'),
  1,
  'user B delete did not remove user A object'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000b1', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$delete from public.workout_sessions where id = '10000000-0000-4000-8000-000000000071'$$,
  'user B can delete their own session'
);
select lives_ok(
  $$delete from public.training_programs where id = '10000000-0000-4000-8000-000000000012'$$,
  'user B can delete their program because user A did not pin it'
);
select lives_ok(
  $$delete from public.exercises where id = '10000000-0000-4000-8000-000000000003'$$,
  'user B can delete their private exercise'
);

reset role;
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) as cfg
        where cfg like 'search_path=%'
      )
  ),
  'set_updated_at pins search_path'
);
select ok(
  not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
  'anon cannot execute handle_new_user'
);
select ok(
  not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'authenticated cannot execute handle_new_user'
);

select * from finish();
rollback;
