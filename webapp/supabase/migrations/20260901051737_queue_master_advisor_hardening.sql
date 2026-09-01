-- Make the server-only access boundary explicit for the database advisor.
-- Browser roles still have no table grants, and all application authorization
-- continues to happen in QueueMaster's server endpoints before service-role use.

create policy "Queue service role access" on public.queue_lobbies
  for all to service_role using (true) with check (true);
create policy "Queue service role access" on public.queue_memberships
  for all to service_role using (true) with check (true);
create policy "Queue service role access" on public.queue_admin_invitations
  for all to service_role using (true) with check (true);
create policy "Queue service role access" on public.queue_guest_sessions
  for all to service_role using (true) with check (true);
create policy "Queue service role access" on public.queue_entries
  for all to service_role using (true) with check (true);
create policy "Queue service role access" on public.queue_transition_events
  for all to service_role using (true) with check (true);

create index queue_admin_invitations_claimed_profile_idx
  on public.queue_admin_invitations (claimed_by_profile_id)
  where claimed_by_profile_id is not null;
create index queue_admin_invitations_inviter_idx
  on public.queue_admin_invitations (invited_by_profile_id);
create index queue_guest_sessions_last_lobby_idx
  on public.queue_guest_sessions (last_lobby_id)
  where last_lobby_id is not null;
create index queue_transition_events_actor_guest_idx
  on public.queue_transition_events (actor_guest_session_id)
  where actor_guest_session_id is not null;
create index queue_transition_events_actor_profile_idx
  on public.queue_transition_events (actor_profile_id)
  where actor_profile_id is not null;
