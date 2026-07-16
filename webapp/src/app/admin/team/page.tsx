import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFullAdminProfile } from "@/app/admin/actions";
import { COUNCIL_PRESETS, type AdminPermission } from "@/lib/admin-permissions";
import { TeamRow } from "./TeamRow";

export const dynamic = "force-dynamic";

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: "student" | "owner";
  status: "pending" | "approved" | "revoked";
  roster_match: boolean;
  council_title: string | null;
  admin_permissions: AdminPermission[];
  delegated_at: string | null;
};

export default async function AdminTeamPage() {
  const { userId } = await requireFullAdminProfile();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, email, name, role, status, roster_match, council_title, admin_permissions, delegated_at"
    )
    .eq("status", "approved")
    .order("role", { ascending: false })
    .order("name")
    .order("email");
  if (error) throw new Error(error.message);

  const members = ((data as TeamMember[] | null) ?? []).map((member) => ({
    ...member,
    admin_permissions: member.admin_permissions ?? [],
  }));
  const fullAdmins = members.filter((member) => member.role === "owner");
  const delegatedMembers = members.filter(
    (member) => member.role !== "owner" && member.admin_permissions.length > 0
  );

  return (
    <div className="space-y-8">
      <header className="app-card flex flex-wrap items-start justify-between gap-4 p-6">
        <div className="max-w-3xl">
          <p className="eyebrow text-brand-gold">Council control</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
            Council access
          </h1>
          <p className="mt-2 text-brand-muted">
            Give each class officer a title and only the responsibilities they own. President and
            Vice President have the same full access; every other role is limited by the checked
            controls below.
          </p>
        </div>
        <Link href="/admin/roster" className="portal-button px-4 py-2 text-sm">
          Open official roster
        </Link>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="app-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Full access</p>
          <p className="mt-2 text-3xl font-bold text-brand-navy">{fullAdmins.length}</p>
          <p className="mt-1 text-sm text-brand-muted">President and Vice President continuity</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Delegated</p>
          <p className="mt-2 text-3xl font-bold text-brand-navy">{delegatedMembers.length}</p>
          <p className="mt-1 text-sm text-brand-muted">Officers with limited responsibilities</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Safety rule</p>
          <p className="mt-2 font-bold text-brand-navy">Roster only</p>
          <p className="mt-1 text-sm text-brand-muted">Exact Google email required before delegation</p>
        </div>
      </section>

      <section className="app-card p-5">
        <h2 className="text-sm font-bold uppercase text-brand-navy">Suggested delegation map</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {COUNCIL_PRESETS.filter(
            (preset) => preset.id !== "custom" && preset.id !== "none"
          ).map((preset) => (
            <div key={preset.id} className="border border-brand-line bg-brand-panel p-4">
              <p className="font-semibold text-brand-navy">{preset.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-brand-muted">{preset.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Approved students</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Choose a preset or create a custom title. A student without a roster match stays locked.
          </p>
        </div>
        {members.map((member) => (
          <TeamRow key={member.id} member={member} isSelf={member.id === userId} />
        ))}
      </section>
    </div>
  );
}
