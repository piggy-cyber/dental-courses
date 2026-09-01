begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data)
values
  ('71000000-0000-4000-8000-000000000001', 'lifecycle.owner@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Lifecycle Owner"}'),
  ('71000000-0000-4000-8000-000000000002', 'lifecycle.other@example.com', 'authenticated', 'authenticated', '{"provider":"google","providers":["google"]}', '{"name":"Other Owner"}')
on conflict (id) do nothing;

insert into public.profiles (id, email, name)
values
  ('71000000-0000-4000-8000-000000000001', 'lifecycle.owner@example.com', 'Lifecycle Owner'),
  ('71000000-0000-4000-8000-000000000002', 'lifecycle.other@example.com', 'Other Owner')
on conflict (id) do update set email = excluded.email, name = excluded.name;

select lives_ok($$select public.queue_create_lobby('71000000-0000-4000-8000-000000000001', 'Lifecycle One', 'lifecycle-one', 'Lifecycle Owner')$$, 'owner creates first lobby');
select lives_ok($$select public.queue_create_lobby('71000000-0000-4000-8000-000000000001', 'Lifecycle Two', 'lifecycle-two', 'Lifecycle Owner')$$, 'owner creates second lobby');
select lives_ok($$select public.queue_create_lobby('71000000-0000-4000-8000-000000000001', 'Lifecycle Three', 'lifecycle-three', 'Lifecycle Owner')$$, 'owner creates third lobby');
select throws_ok($$select public.queue_create_lobby('71000000-0000-4000-8000-000000000001', 'Lifecycle Four', 'lifecycle-four', 'Lifecycle Owner')$$, 'P0001', 'QUEUE_LOBBY_LIMIT', 'fourth active lobby is rejected');

select lives_ok($$select public.queue_set_lobby_closed((select id from public.queue_lobbies where slug = 'lifecycle-one'), '71000000-0000-4000-8000-000000000001', true)$$, 'owner closes an empty lobby');
select lives_ok($$select public.queue_create_lobby('71000000-0000-4000-8000-000000000001', 'Lifecycle Four', 'lifecycle-four', 'Lifecycle Owner')$$, 'closed lobby frees one active slot');
select throws_ok($$select public.queue_set_lobby_closed((select id from public.queue_lobbies where slug = 'lifecycle-one'), '71000000-0000-4000-8000-000000000001', false)$$, 'P0001', 'QUEUE_LOBBY_LIMIT', 'reopen respects the active limit');
select throws_ok($$select public.queue_set_lobby_closed((select id from public.queue_lobbies where slug = 'lifecycle-two'), '71000000-0000-4000-8000-000000000002', true)$$, 'P0001', 'QUEUE_OWNER_REQUIRED', 'another owner cannot close the lobby');

update public.queue_memberships
set accepting_guests = true, last_seen_at = now()
where lobby_id = (select id from public.queue_lobbies where slug = 'lifecycle-two')
  and role = 'owner';
insert into public.queue_guest_sessions (id, token_hash)
values ('72000000-0000-4000-8000-000000000001', repeat('a', 64));
select public.queue_join_lobby(
  (select id from public.queue_lobbies where slug = 'lifecycle-two'),
  '72000000-0000-4000-8000-000000000001',
  'Guest',
  'Desk 1',
  (select id from public.queue_memberships where lobby_id = (select id from public.queue_lobbies where slug = 'lifecycle-two') and role = 'owner')
);

select throws_ok(
  $$select public.queue_call_entry_scoped((select id from public.queue_lobbies where slug = 'lifecycle-three'), (select id from public.queue_entries where guest_session_id = '72000000-0000-4000-8000-000000000001' and status = 'waiting'), '71000000-0000-4000-8000-000000000001')$$,
  'P0001', 'QUEUE_RESOURCE_LOBBY_MISMATCH', 'entry actions reject a mismatched route lobby'
);
select throws_ok(
  $$select public.queue_transition_entry_scoped((select id from public.queue_lobbies where slug = 'lifecycle-three'), (select id from public.queue_entries where guest_session_id = '72000000-0000-4000-8000-000000000001' and status = 'waiting'), 'cancelled', 'guest', null, '72000000-0000-4000-8000-000000000001')$$,
  'P0001', 'QUEUE_RESOURCE_LOBBY_MISMATCH', 'guest actions reject a mismatched route lobby'
);

select throws_ok($$select public.queue_set_lobby_closed((select id from public.queue_lobbies where slug = 'lifecycle-two'), '71000000-0000-4000-8000-000000000001', true)$$, 'P0001', 'QUEUE_ACTIVE_ENTRIES', 'active guests prevent closing');

select public.queue_transition_entry_scoped(
  (select id from public.queue_lobbies where slug = 'lifecycle-two'),
  (select id from public.queue_entries where guest_session_id = '72000000-0000-4000-8000-000000000001' and status = 'waiting'),
  'cancelled', 'guest', null, '72000000-0000-4000-8000-000000000001'
);
select lives_ok($$select public.queue_set_lobby_closed((select id from public.queue_lobbies where slug = 'lifecycle-two'), '71000000-0000-4000-8000-000000000001', true)$$, 'owner closes after the active guest leaves');

select * from finish();
rollback;
