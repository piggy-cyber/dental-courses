begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'owner.queue@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Owner Queue"}'),
  ('10000000-0000-4000-8000-000000000002', 'candidate.queue@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Candidate Queue"}'),
  ('10000000-0000-4000-8000-000000000003', 'other.queue@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Other Owner"}')
on conflict (id) do nothing;

insert into public.profiles (id, email, name)
values
  ('10000000-0000-4000-8000-000000000001', 'owner.queue@example.com', 'Owner Queue'),
  ('10000000-0000-4000-8000-000000000002', 'candidate.queue@example.com', 'Candidate Queue'),
  ('10000000-0000-4000-8000-000000000003', 'other.queue@example.com', 'Other Owner')
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
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000002' and left_at is null), '10000000-0000-4000-8000-000000000003')$$,
  'P0001', 'QUEUE_OWNER_REQUIRED', 'another lobby owner cannot request this candidate'
);
select lives_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000002' and left_at is null), '10000000-0000-4000-8000-000000000001')$$,
  'the matching owner can request promotion'
);
select throws_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000002' and left_at is null), '10000000-0000-4000-8000-000000000001')$$,
  'P0001', 'QUEUE_PROMOTION_ALREADY_PENDING', 'duplicate pending requests are rejected'
);
select throws_ok(
  $$select public.queue_respond_admin_promotion((select id from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000002' and status = 'pending'), '10000000-0000-4000-8000-000000000003', true, 'Other Owner')$$,
  'P0001', 'QUEUE_PROMOTION_FORBIDDEN', 'another profile cannot accept the request'
);
select lives_ok(
  $$select public.queue_respond_admin_promotion((select id from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000002' and status = 'pending'), '10000000-0000-4000-8000-000000000002', false, 'Candidate Queue')$$,
  'the candidate can decline'
);
select is((select status from public.queue_admin_promotion_requests order by created_at desc limit 1), 'declined', 'decline closes the request');
select lives_ok(
  $$select public.queue_request_admin_promotion((select id from public.queue_staff_candidates where profile_id = '10000000-0000-4000-8000-000000000002' and left_at is null), '10000000-0000-4000-8000-000000000001')$$,
  'owner can send a later request after decline'
);
select lives_ok(
  $$select public.queue_respond_admin_promotion((select id from public.queue_admin_promotion_requests where candidate_profile_id = '10000000-0000-4000-8000-000000000002' and status = 'pending'), '10000000-0000-4000-8000-000000000002', true, 'Candidate Queue')$$,
  'candidate acceptance atomically creates membership'
);
select is((select role from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and profile_id = '10000000-0000-4000-8000-000000000002'), 'admin', 'acceptance creates admin role');
select is((select accepting_guests from public.queue_memberships where lobby_id = '20000000-0000-4000-8000-000000000001' and profile_id = '10000000-0000-4000-8000-000000000002'), false, 'new admin starts with accepting guests off');
select ok(not has_table_privilege('authenticated', 'public.queue_staff_candidates', 'select'), 'authenticated cannot read candidate rows directly');
select throws_ok(
  $$select public.queue_claim_invitations('10000000-0000-4000-8000-000000000002', 'candidate.queue@example.com', 'Candidate Queue')$$,
  'P0001', 'QUEUE_EMAIL_INVITATIONS_DEPRECATED', 'legacy email claiming is disabled'
);

select * from finish();
rollback;
