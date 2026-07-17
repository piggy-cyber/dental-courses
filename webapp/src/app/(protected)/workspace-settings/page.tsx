import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGroupMeClientId } from "@/lib/groupme";
import { GroupMeConnectCard } from "@/components/GroupMeConnectCard";

export const dynamic = "force-dynamic";
export default async function WorkspaceSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase.from("profiles").select("groupme_connected_at, canvas_ics_url").eq("id", user.id).single();
  if (!profile) notFound();
  return <div className="mx-auto max-w-3xl space-y-6"><header className="app-card p-6"><p className="eyebrow">Workspace</p><h1 className="mt-1 text-3xl font-bold text-brand-navy">Workspace settings</h1><p className="mt-2 text-sm text-brand-muted">Connections used only in your private student workspace.</p></header><GroupMeConnectCard connected={Boolean(profile.groupme_connected_at)} connectedAt={profile.groupme_connected_at} configured={Boolean(getGroupMeClientId())} /><section className="app-card p-6"><h2 className="text-lg font-bold text-brand-navy">Canvas calendar</h2><p className="mt-2 text-sm text-brand-muted">Your Canvas feed remains in place and is visible only in the private workspace.</p>{profile.canvas_ics_url && <p className="mt-3 text-sm text-brand-muted">Calendar feed connected.</p>}</section></div>;
}
