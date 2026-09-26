begin;

select plan(12);

-- Dedicated Wave 04 storage / media isolation checks beyond 0001_rls_isolation.sql.
-- Users A and B are created as auth users; profiles come from handle_new_user.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-0000000000a2',
    'authenticated', 'authenticated', 'media-a@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-0000000000b2',
    'authenticated', 'authenticated', 'media-b@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );

insert into public.exercises (id, owner_id, slug, name) values
  ('20000000-0000-4000-8000-000000000201', null, 'media-catalog-squat', 'Media catalog squat');

select is(
  (select public from storage.buckets where id = 'exercise-media'),
  false,
  'exercise-media bucket stays private'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-0000000000a2', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  format(
    'insert into storage.objects (bucket_id, name) values (%L, %L)',
    'exercise-media',
    '20000000-0000-4000-8000-0000000000a2'::text || '/ex/demo.webp'
  ),
  'user A can insert under their own storage prefix'
);

select lives_ok(
  format(
    'insert into public.exercise_media (exercise_id, owner_id, media_type, storage_path, is_primary, status) values (%L, %L, %L, %L, true, %L)',
    '20000000-0000-4000-8000-000000000201',
    '20000000-0000-4000-8000-0000000000a2',
    'image',
    '20000000-0000-4000-8000-0000000000a2'::text || '/ex/demo.webp',
    'owned'
  ),
  'user A can insert owned media metadata whose storage_path matches auth uid'
);

select throws_ok(
  format(
    'insert into public.exercise_media (exercise_id, owner_id, media_type, storage_path, status) values (%L, %L, %L, %L, %L)',
    '20000000-0000-4000-8000-000000000201',
    '20000000-0000-4000-8000-0000000000a2',
    'image',
    '20000000-0000-4000-8000-0000000000b2'::text || '/stolen.webp',
    'owned'
  ),
  '42501',
  null,
  'user A cannot claim a storage_path under user B prefix'
);

select throws_ok(
  format(
    'update storage.objects set name = %L where bucket_id = %L and name = %L',
    '20000000-0000-4000-8000-0000000000b2'::text || '/hijack.webp',
    'exercise-media',
    '20000000-0000-4000-8000-0000000000a2'::text || '/ex/demo.webp'
  ),
  '42501',
  null,
  'user A cannot retarget an object onto user B prefix'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-0000000000b2', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select count(*)::int from storage.objects where bucket_id = 'exercise-media' and name like '20000000-0000-4000-8000-0000000000a2/%'),
  0,
  'user B cannot list or read user A storage objects'
);

select is(
  (select count(*)::int from public.exercise_media where owner_id = '20000000-0000-4000-8000-0000000000a2'),
  0,
  'user B cannot read user A owned exercise_media rows'
);

-- Invisible under RLS: UPDATE/DELETE affect 0 rows and do not raise 42501.
with attempted as (
  update storage.objects
  set metadata = jsonb_build_object('stolen', 'true')
  where bucket_id = 'exercise-media'
    and name = '20000000-0000-4000-8000-0000000000a2'::text || '/ex/demo.webp'
  returning 1
)
select is(
  (select count(*)::int from attempted),
  0,
  'user B cannot update user A storage object'
);

with attempted as (
  delete from storage.objects
  where bucket_id = 'exercise-media'
    and name = '20000000-0000-4000-8000-0000000000a2'::text || '/ex/demo.webp'
  returning 1
)
select is(
  (select count(*)::int from attempted),
  0,
  'user B cannot delete user A storage object'
);

with attempted as (
  update public.exercise_media
  set alt_text = 'taken'
  where owner_id = '20000000-0000-4000-8000-0000000000a2'
  returning 1
)
select is(
  (select count(*)::int from attempted),
  0,
  'user B cannot update user A media metadata'
);

reset role;

select is(
  (select count(*)::int from storage.objects where bucket_id = 'exercise-media' and name like '20000000-0000-4000-8000-0000000000a2/%'),
  1,
  'user A object remains after user B isolation attempts'
);

select is(
  (select public from storage.buckets where id = 'exercise-media'),
  false,
  'exercise-media bucket remains private after isolation checks'
);

select * from finish();
rollback;
