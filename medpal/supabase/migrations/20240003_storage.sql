-- Create the prescriptions bucket (private)
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict do nothing;

-- Users can only upload to their own folder: {user_id}/...
create policy "Users can upload their own prescriptions"
  on storage.objects for insert
  with check (
    bucket_id = 'prescriptions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read their own prescriptions"
  on storage.objects for select
  using (
    bucket_id = 'prescriptions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own prescriptions"
  on storage.objects for delete
  using (
    bucket_id = 'prescriptions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
