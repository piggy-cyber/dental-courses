import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, username, bio, avatar_url, canvas_ics_url")
    .eq("id", user.id)
    .single();

  if (!profile) notFound();

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

      <div className="app-card p-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
