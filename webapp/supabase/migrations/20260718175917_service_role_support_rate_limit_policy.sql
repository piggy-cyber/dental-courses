-- The private rate-limit table is intentionally inaccessible to public roles.
-- This explicit service-role policy preserves that boundary and documents the
-- only application principal that manages these rows.
create policy "service role manages public support rate limits"
  on private.public_support_rate_limits
  for all
  to service_role
  using (true)
  with check (true);
