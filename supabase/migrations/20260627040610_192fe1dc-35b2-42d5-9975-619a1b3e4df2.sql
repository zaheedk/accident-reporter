
-- 1. Storage policies
drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Downloads are publicly accessible" on storage.objects;
drop policy if exists "Partner logos publicly readable" on storage.objects;

create policy "Avatar read by name"
  on storage.objects for select
  using (bucket_id = 'avatars' and name is not null and length(name) > 0);

create policy "Downloads read by name"
  on storage.objects for select
  using (bucket_id = 'downloads' and name is not null and length(name) > 0);

create policy "Partner logos read by name"
  on storage.objects for select
  using (bucket_id = 'partner-logos' and name like 'logos/%');

drop policy if exists "Users can view their own vehicle photos" on storage.objects;
create policy "Vehicle photos read by owner or authorised viewer"
  on storage.objects for select
  using (
    bucket_id = 'vehicle-photos'
    and auth.uid() is not null
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_access_user_data(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
    )
  );

-- 2. Invite tables: invitee can read own pending invite by code.
drop policy if exists "Invitee can read own invite by code" on public.broker_invites;
create policy "Invitee can read own invite by code"
  on public.broker_invites for select
  to authenticated
  using (
    status = 'pending'
    and accepted_at is null
    and (
      lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or accepted_by = auth.uid()
    )
  );

drop policy if exists "Invitee can read own invite by code" on public.family_invites;
create policy "Invitee can read own invite by code"
  on public.family_invites for select
  to authenticated
  using (
    status = 'pending'
    and accepted_at is null
    and (
      lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or accepted_by = auth.uid()
    )
  );

drop policy if exists "Invitee can read own invite by code" on public.fleet_invites;
create policy "Invitee can read own invite by code"
  on public.fleet_invites for select
  to authenticated
  using (
    status = 'pending'
    and accepted_at is null
    and (
      lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or accepted_by = auth.uid()
    )
  );

-- 3. phone_otps: explicit restrictive deny for clients.
drop policy if exists "Service role only" on public.phone_otps;
create policy "Deny all client access to phone_otps"
  on public.phone_otps
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
revoke all on public.phone_otps from anon, authenticated;

-- 4. SECURITY DEFINER internal helpers — revoke EXECUTE from clients.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.add_head_as_member() from public, anon, authenticated;
revoke all on function public.add_manager_as_fleet_member() from public, anon, authenticated;
revoke all on function public.assign_first_user_admin() from public, anon, authenticated;
revoke all on function public.enqueue_email(text, jsonb) from public, anon, authenticated;
revoke all on function public.delete_email(text, bigint) from public, anon, authenticated;
revoke all on function public.read_email_batch(text, integer, integer) from public, anon, authenticated;
revoke all on function public.move_to_dlq(text, text, bigint, jsonb) from public, anon, authenticated;
