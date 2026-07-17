-- PREVIEW REVIEW ONLY: do not apply until the public-account preview is approved.
-- Keep private course/resource policies untouched. This only makes each signed-in
-- user able to read their own public-game rows; writes remain RPC-only.

drop policy if exists "Approved students can read their own game progress" on public.game_progress;
create policy "Signed-in users can read their own game progress"
on public.game_progress for select to authenticated
using ((select auth.uid()) = profile_id);

drop policy if exists "Approved students can read their own game round receipts" on public.game_rounds;
create policy "Signed-in users can read their own game round receipts"
on public.game_rounds for select to authenticated
using ((select auth.uid()) = profile_id);

-- The current validated RPC remains the only write path. Before applying this
-- migration, pull the production definition and replace only its approval guard:
--   if caller_id is null then raise exception 'A signed-in account is required.';
-- Do not replace its game-id or mastery validation body with an older draft.
