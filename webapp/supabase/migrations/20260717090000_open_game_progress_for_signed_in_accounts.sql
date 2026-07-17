-- Public accounts can save and read only their own public-game progress.
-- Private course/resource policies remain untouched. The validated round RPC
-- remains the only write path; this migration preserves its current validation
-- body and changes only its workspace-approval guard.

drop policy if exists "Approved students can read their own game progress" on public.game_progress;
drop policy if exists "Signed-in users can read their own game progress" on public.game_progress;
create policy "Signed-in users can read their own game progress"
on public.game_progress for select to authenticated
using ((select auth.uid()) = profile_id);

drop policy if exists "Approved students can read their own game round receipts" on public.game_rounds;
drop policy if exists "Signed-in users can read their own game round receipts" on public.game_rounds;
create policy "Signed-in users can read their own game round receipts"
on public.game_rounds for select to authenticated
using ((select auth.uid()) = profile_id);

do $migration$
declare
  function_definition text;
  old_guard constant text := E'if caller_id is null or not (select private.is_approved()) then\n    raise exception ''An approved account is required.'' using errcode = ''42501'';\n  end if;';
  new_guard constant text := E'if caller_id is null then\n    raise exception ''A signed-in account is required.'' using errcode = ''42501'';\n  end if;';
begin
  select pg_get_functiondef(
    'public.record_game_round(uuid, text, integer, integer, integer, integer, jsonb)'::regprocedure
  )
  into function_definition;

  if function_definition is null or position(old_guard in function_definition) = 0 then
    raise exception 'record_game_round does not have the expected approval guard; migration stopped without changing game writes.';
  end if;

  function_definition := replace(function_definition, old_guard, new_guard);
  execute function_definition;
end;
$migration$;
