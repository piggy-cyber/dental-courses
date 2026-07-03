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
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-navy">Your profile</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Update how you appear in the library. Email comes from your sign-in provider.
        </p>
      </header>

      <div className="rounded-xl border border-brand-line bg-brand-panel p-6 shadow-sm">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
