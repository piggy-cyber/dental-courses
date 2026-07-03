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
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">Admin team</h1>
        <p className="mt-1 text-brand-muted">
          Promote trusted classmates to help manage approvals. {admins.length} admin
          {admins.length === 1 ? "" : "s"} currently.
        </p>
      </header>

      <ul className="divide-y divide-brand-line overflow-hidden rounded-xl border border-brand-line bg-brand-panel">
        {members.map((member) => (
          <TeamRow key={member.id} member={member} isSelf={member.id === userId} />
        ))}
      </ul>
    </div>
  );
}
