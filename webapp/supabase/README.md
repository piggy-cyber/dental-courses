# Fourth Canal database operations

The live Supabase project is production data. Treat `supabase/migrations/` as
the authoritative change history for an existing project.

## Safe change procedure

1. Inspect the live schema and both Supabase advisor reports.
2. Create a named migration with `supabase migration new <name>`.
3. Review the SQL for least privilege, explicit schemas, and safe rollback.
4. Apply the final migration once through the Supabase migration API or CLI.
5. Re-run security and performance advisors and test Google sign-in, student
   reads, owner updates, uploads, and roster matching.
6. Commit the migration with the application code that depends on it.

The top-level `*.sql` files in this directory are historical bootstrap modules
used to build the current schema. Do not paste them over an existing production
database after migrations have been applied; doing so can restore older function
or policy definitions.

## Access model

- Students authenticate through Google OAuth only.
- Roster-matched accounts can be approved automatically.
- Row-level security limits course collections to approved grants.
- Owner-only maintenance actions are checked in server actions and the database.
- The service-role key is server-only and must never be exposed to the browser.

## Routine checks

- Monthly: review accounts, owners, storage policies, and advisor findings.
- At officer handoff: add the successor, verify owner access, then remove the
  former operator without sharing personal credentials.
- After adding an integration: update `/legal`, environment-variable notes, and
  this runbook before deployment.
