begin;

create extension if not exists pgtap with schema extensions;
select plan(38);

insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'owner.queue@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Owner Queue"}'),
  ('10000000-0000-4000-8000-000000000002', 'candidate.queue@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Candidate Queue"}'),
  ('10000000-0000-4000-8000-000000000003', 'other.queue@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Other Owner"}'),
  ('10000000-0000-4000-8000-000000000004', 'expired.queue@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Expired Candidate"}'),
  ('10000000-0000-4000-8000-000000000005', 'offline.queue@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Offline Candidate"}')
on conflict (id) do nothing;

insert into public.profiles (id, email, name)
values
  ('10000000-0000-4000-8000-000000000001', 'owner.queue@example.com', 'Owner Queue'),
  ('10000000-0000-4000-8000-000000000002', 'candidate.queue@example.com', 'Candidate Queue'),
  ('10000000-0000-4000-8000-000000000003', 'other.queue@example.com', 'Other Owner'),
  ('10000000-0000-4000-8000-000000000004', 'expired.queue@example.com', 'Expired Candidate'),
  ('10000000-0000-4000-8000-000000000005', 'offline.queue@example.com', 'Offline Candidate')
on conflict (id) do update set email = excluded.email, name = excluded.name;

insert into public.queue_lobbies (id, name, slug, owner_profile_id)
values
  ('20000000-0000-4000-8000-000000000001', 'Staff Test One', 'staff-test-one', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Staff Test Two', 'staff-test-two', '10000000-0000-4000-8000-000000000003');
insert into public.queue_memberships (id, lobby_id, profile_id, role, display_name)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'Owner Queue'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'owner', 'Other Owner');

select lives_ok(
  $$select public.queue_join_staff_pool('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Candidate Queue', 'candidate.queue@example.com')$$,
  'candidate can explicitly join the staff pool'
);
select is((select count(*)::integer from public.queue_staff_candidates where lobby_id = '20000000-0000-4000-8000-000000000001' and left_at is null), 1, 'one active candidate exists');
select throws_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000002' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003')$$,
  'P0001', 'QUEUE_OWNER_REQUIRED', 'another lobby owner cannot request this candidate'
);
select lives_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000002' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'the matching owner can request promotion'
);
select throws_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000002' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'P0001', 'QUEUE_PROMOTION_ALREADY_PENDING', 'duplicate pending requests are rejected'
);
select throws_ok(
  $$select public.queue_respond_admin_promotion((select id from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000002' and status = 'pending'), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', true, 'Other Owner')$$,
  'P0001', 'QUEUE_PROMOTION_FORBIDDEN', 'another profile cannot accept the request'
);
select lives_ok(
  $$select public.queue_respond_admin_promotion((select id from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000002' and status = 'pending'), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', false, 'Candidate Queue')$$,
  'the candidate can decline'
);
select is((select status from public.queue_admin_promotion_requests order by created_at desc limit 1), 'declined', 'decline closes the request');
select lives_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000002' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'owner can send a later request after decline'
);
select lives_ok(
  $$select public.queue_respond_admin_promotion((select id from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000002' and status = 'pending'), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', true, 'Candidate Queue')$$,
  'candidate acceptance atomically creates membership'
);
select is((select role from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and profile_id = '10000000-0000-4000-8000-000000000002'), 'admin', 'acceptance creates admin role');
select is((select accepting_guests from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and profile_id = '10000000-0000-4000-8000-000000000002'), false, 'new admin starts with accepting guests off');
select ok(not has_table_privilege('authenticated', 'public.queue_staff_candidates', 'select'), 'authenticated cannot read candidate rows directly');
select ok(not has_table_privilege('authenticated', 'public.queue_admin_promotion_requests', 'select'), 'authenticated cannot read promotion rows directly');
select has_index('public', 'queue_admin_promotion_requests', 'queue_admin_promotion_requests_lobby_idx', 'promotion lobby history is indexed');
select has_index('public', 'queue_admin_promotion_requests', 'queue_admin_promotion_requests_candidate_id_idx', 'promotion candidate foreign key is indexed');
select throws_ok(
  $$select public.queue_claim_invitations('10000000-0000-4000-8000-000000000002', 'candidate.queue@example.com', 'Candidate Queue')$$,
  'P0001', 'QUEUE_EMAIL_INVITATIONS_DEPRECATED', 'legacy email claiming is disabled'
);

select lives_ok(
  $$select public.queue_join_staff_pool('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'Expired Candidate', 'expired.queue@example.com')$$,
  'a second candidate can join for expiration testing'
);
select lives_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000004' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'owner can request the expiration-test candidate'
);
update public.queue_admin_promotion_requests
set created_at = now() - interval '25 hours',
    expires_at = now() - interval '1 hour',
    updated_at = now() - interval '1 hour'
where candidate_profile_id = '10000000-0000-4000-8000-000000000004'
  and status = 'pending';
select throws_ok(
  $$select public.queue_respond_admin_promotion((select id from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000004' and status = 'pending'), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', true, 'Expired Candidate')$$,
  'P0001', 'QUEUE_PROMOTION_EXPIRED', 'an expired request cannot be accepted'
);
select is(
  (select count(*)::integer from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and profile_id = '10000000-0000-4000-8000-000000000004' and revoked_at is null),
  0,
  'expired acceptance creates no membership'
);
select lives_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000004' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'a new request can replace an effectively expired request'
);
select lives_ok(
  $$select public.queue_cancel_admin_promotion((select id from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000004' and status = 'pending'), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'the matching owner can cancel a replacement request'
);

select lives_ok(
  $$select public.queue_join_staff_pool('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'Offline Candidate', 'offline.queue@example.com')$$,
  'an offline-test candidate can join the staff pool'
);
select throws_ok(
  $$select public.queue_staff_candidate_heartbeat((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000005' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003')$$,
  'P0001', 'QUEUE_CANDIDATE_FORBIDDEN', 'another profile cannot heartbeat a candidate'
);
update public.queue_staff_candidates
set last_seen_at = now() - interval '46 seconds'
where profile_id = '10000000-0000-4000-8000-000000000005'
  and left_at is null;
select throws_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000005' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'P0001', 'QUEUE_CANDIDATE_UNAVAILABLE', 'offline candidates cannot receive new requests'
);
select lives_ok(
  $$select public.queue_staff_candidate_heartbeat((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000005' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005')$$,
  'the matching candidate can restore presence with a heartbeat'
);
select lives_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000005' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'an online candidate can receive a request'
);
select throws_ok(
  $$select public.queue_cancel_admin_promotion((select id from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000005' and status = 'pending'), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003')$$,
  'P0001', 'QUEUE_OWNER_REQUIRED', 'another lobby owner cannot cancel the request'
);
select lives_ok(
  $$select public.queue_leave_staff_pool((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000005' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005')$$,
  'a candidate can leave their own staff pool'
);
select is(
  (select status from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000005' order by created_at desc limit 1),
  'cancelled',
  'leaving cancels the pending promotion request'
);

insert into public.queue_staff_candidates (lobby_id, profile_id, display_name, email)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Owner Queue', 'owner.queue@example.com');
select throws_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000001' and left_at is null), '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  'P0001', 'QUEUE_SELF_PROMOTION', 'owners cannot promote themselves'
);

update public.queue_memberships
set accepting_guests = true, last_seen_at = now()
where lobby_id = '20000000-0000-4000-8000-000000000001'
  and profile_id = '10000000-0000-4000-8000-000000000002';
insert into public.queue_guest_sessions (id, token_hash)
values ('60000000-0000-4000-8000-000000000001', repeat('b', 64));
select lives_ok(
  $$select public.queue_join_lobby('20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'Removal Guest', 'Desk 9', (select id from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and profile_id = '10000000-0000-4000-8000-000000000002' and revoked_at is null))$$,
  'an active guest can join the promoted admin queue'
);
select throws_ok(
  $$select public.queue_remove_membership_scoped('20000000-0000-4000-8000-000000000001', (select id from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and profile_id = '10000000-0000-4000-8000-000000000002' and revoked_at is null), '10000000-0000-4000-8000-000000000001')$$,
  'P0001', 'QUEUE_REASSIGN_BEFORE_REMOVAL', 'an admin with an active guest cannot be removed'
);
select lives_ok(
  $$select public.queue_manage_waiting_entry_scoped('20000000-0000-4000-8000-000000000001', (select id from public.queue_entries where guest_session_id = '60000000-0000-4000-8000-000000000001' and status = 'waiting'), '10000000-0000-4000-8000-000000000001', (select id from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and role = 'owner' and revoked_at is null), null)$$,
  'the owner can reassign the active guest before removal'
);
select lives_ok(
  $$select public.queue_remove_membership_scoped('20000000-0000-4000-8000-000000000001', (select id from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and profile_id = '10000000-0000-4000-8000-000000000002' and revoked_at is null), '10000000-0000-4000-8000-000000000001')$$,
  'the owner can remove the admin after reassignment'
);
select ok(
  (select revoked_at is not null from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and profile_id = '10000000-0000-4000-8000-000000000002'),
  'removed admin membership is revoked rather than deleted'
);
select ok(
  position('for update' in lower(pg_get_functiondef('public.queue_request_admin_promotion(uuid,uuid,uuid)'::regprocedure))) > 0
    and exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and indexname = 'queue_admin_promotion_requests_one_pending_idx'
        and indexdef ilike 'create unique index%where (status = ''pending''%'
    ),
  'candidate row locking and the partial unique index arbitrate concurrent promotion requests'
);

select * from finish();
rollback;
