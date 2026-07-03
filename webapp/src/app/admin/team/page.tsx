import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/app/admin/actions";
import { TeamRow } from "./TeamRow";

export const dynamic = "force-dynamic";

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: "student" | "owner";
  status: "pending" | "approved" | "revoked";
};

export default async function AdminTeamPage() {
  const { userId } = await requireAdminProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role, status")
    .eq("status", "approved")
    .order("role", { ascending: false })
    .order("email");

  const members = (data as TeamMember[]) ?? [];
  const admins = members.filter((m) => m.role === "owner");

  return (
    <div className="space-y-8">
      <header className="app-card p-6">
        <p className="eyebrow text-brand-gold">Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
          Admin team
        </h1>
        <p className="mt-2 text-brand-muted">
          Promote trusted classmates to help manage approvals. {admins.length} admin
          {admins.length === 1 ? "" : "s"} currently.
        </p>
      </header>

      <ul className="app-card divide-y divide-brand-line overflow-hidden">
        {members.map((member) => (
          <TeamRow key={member.id} member={member} isSelf={member.id === userId} />
        ))}
      </ul>
    </div>
  );
}
