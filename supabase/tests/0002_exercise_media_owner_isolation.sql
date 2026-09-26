begin;

select plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-0000000000a1',
    'authenticated', 'authenticated', 'media-a@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-0000000000b1',
    'authenticated', 'authenticated', 'media-b@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );

insert into public.exercises (id, owner_id, slug, name) values
  ('20000000-0000-4000-8000-000000000001', null, 'media-catalog-squat', 'Media catalog squat');

select is(
  (select public from storage.buckets where id = 'exercise-media'),
  false,
  'exercise-media bucket stays private'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  format(
    'insert into storage.objects (bucket_id, name) values (%L, %L)',
    'exercise-media',
    '20000000-0000-4000-8000-0000000000a1'::text || '/owned.png'
  ),
  'user A can upload under their exercise-media prefix'
);

select lives_ok(
  format(
    'insert into public.exercise_media (exercise_id, owner_id, media_type, storage_path, is_primary, status) values (%L, %L, %L, %L, true, %L)',
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-0000000000a1',
    'image',
    '20000000-0000-4000-8000-0000000000a1'::text || '/owned.png',
    'owned'
  ),
  'user A can insert owned media metadata under their storage prefix'
);

select throws_ok(
  format(
    'insert into storage.objects (bucket_id, name) values (%L, %L)',
    'exercise-media',
    '20000000-0000-4000-8000-0000000000b1'::text || '/stolen.png'
  ),
  '42501',
  null,
  'user A cannot upload under user B exercise-media prefix'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-0000000000b1', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'exercise-media'
      and name = '20000000-0000-4000-8000-0000000000a1'::text || '/owned.png'
  ),
  0,
  'user B cannot list or download user A storage object'
);

-- Invisible under RLS: UPDATE/DELETE affect 0 rows and do not raise 42501.
with attempted as (
  update storage.objects
  set name = name
  where bucket_id = 'exercise-media'
    and name = '20000000-0000-4000-8000-0000000000a1'::text || '/owned.png'
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
    and name = '20000000-0000-4000-8000-0000000000a1'::text || '/owned.png'
  returning 1
)
select is(
  (select count(*)::int from attempted),
  0,
  'user B cannot delete user A storage object'
);

select * from finish();
rollback;
