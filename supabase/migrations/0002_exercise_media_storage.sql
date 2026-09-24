insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-media',
  'exercise-media',
  false,
  25165824,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy exercise_media_storage_select
on storage.objects for select to authenticated
using (bucket_id = 'exercise-media' and split_part(name, '/', 1) = auth.uid()::text);

create policy exercise_media_storage_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'exercise-media' and split_part(name, '/', 1) = auth.uid()::text);

create policy exercise_media_storage_update
on storage.objects for update to authenticated
using (bucket_id = 'exercise-media' and split_part(name, '/', 1) = auth.uid()::text)
with check (bucket_id = 'exercise-media' and split_part(name, '/', 1) = auth.uid()::text);

create policy exercise_media_storage_delete
on storage.objects for delete to authenticated
using (bucket_id = 'exercise-media' and split_part(name, '/', 1) = auth.uid()::text);
