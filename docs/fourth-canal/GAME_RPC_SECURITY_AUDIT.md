# Game RPC security audit

Reviewed: 2026-07-18
Scope: the five `security definer` game functions currently flagged by the Supabase Security Advisor.

## Intentional exception

These functions use `security definer` to make tightly scoped, server-enforced game actions possible under row-level security. They are not anonymous endpoints. The live review confirmed that each function is owned by `postgres`, pins `search_path` to an empty value, and does not grant `anon` execution.

| Function | Who can execute | Caller/approval guard | Review result |
| --- | --- | --- | --- |
| `close_game_draft` | `authenticated` | Verifies `auth.uid()` and approval status | Intentional; retain. |
| `get_game_leaderboard` | `authenticated`, `service_role` | Verifies `auth.uid()`; read-only leaderboard lookup | Intentional; retain. |
| `record_game_round` | `authenticated` | Verifies `auth.uid()`; server-side round validation | Intentional; retain. |
| `record_game_round_with_draft` | `authenticated` | Verifies `auth.uid()` and approval status | Intentional; retain. |
| `save_game_draft` | `authenticated` | Verifies `auth.uid()` and approval status | Intentional; retain. |

## Boundaries checked

- No function is executable by `anon`.
- Each function has `search_path = ''`, preventing attacker-controlled schema shadowing.
- The live function definitions check the authenticated caller. Draft functions also gate on approved access.
- `record_game_round` is further protected by database constraints from the hardening migration: bounded non-negative scores and attempts, valid game identifiers, and a score-to-correct-answer limit.
- `get_game_leaderboard` is the only reviewed function available to `service_role`; it remains read-only.

## Follow-up rule

The Advisor will continue to surface these as generic `security definer` notices. Treat them as reviewed exceptions only while the grants, empty `search_path`, caller checks, and input constraints above remain unchanged. Any new `security definer` function must receive the same review before it is deployed.
