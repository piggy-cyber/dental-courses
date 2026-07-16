-- Keep collection-label access in one permissive SELECT policy so Postgres
-- evaluates only one policy per authenticated resource_collections query.

drop policy if exists "access staff read resource collection labels"
  on public.resource_collections;

alter policy "read accessible resource collections"
  on public.resource_collections
  to authenticated
  using (
    private.can_access_resource_collection(id)
    or (select private.has_admin_permission('accounts.manage'))
  );
