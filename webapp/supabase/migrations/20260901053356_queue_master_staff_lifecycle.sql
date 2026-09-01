-- Keep claimed invitations aligned with membership removal so an owner can
-- intentionally invite the same Google account again later.

create or replace function private.queue_revoke_claimed_invitations()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.revoked_at is null and new.revoked_at is not null then
    update public.queue_admin_invitations
    set revoked_at = coalesce(revoked_at, now())
    where lobby_id = new.lobby_id
      and claimed_by_profile_id = new.profile_id
      and revoked_at is null;
  end if;
  return null;
end;
$$;

revoke all on function private.queue_revoke_claimed_invitations()
  from public, anon, authenticated;

create trigger queue_memberships_revoke_claimed_invitations
after update of revoked_at on public.queue_memberships
for each row
when (old.revoked_at is null and new.revoked_at is not null)
execute function private.queue_revoke_claimed_invitations();
