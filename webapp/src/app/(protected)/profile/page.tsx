import { createClient } from "@/lib/supabase/server";
import { getGroupMeClientId } from "@/lib/groupme";
import { ProfileForm } from "@/components/ProfileForm";
import { GroupMeConnectCard } from "@/components/GroupMeConnectCard";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ groupme?: string; reason?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, name, username, bio, avatar_url, canvas_ics_url, groupme_connected_at"
    )
    .eq("id", user.id)
    .single();

  if (!profile) notFound();

  const params = await searchParams;
  const banner =
    params.groupme === "connected"
      ? "connected"
      : params.groupme === "disconnected"
        ? "disconnected"
        : params.groupme === "error"
          ? "error"
          : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="app-card p-6">
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">
          Your profile
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          Update how you appear in the library. Email comes from your sign-in provider.
        </p>
      </header>

      <GroupMeConnectCard
        connected={Boolean(profile.groupme_connected_at)}
        connectedAt={profile.groupme_connected_at}
        configured={Boolean(getGroupMeClientId())}
        banner={banner}
        errorReason={params.reason ?? null}
      />

      <AppearanceSettings />

      <div className="app-card p-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
