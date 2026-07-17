import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { PublicHeader } from "@/components/PublicHeader";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase.from("profiles")
    .select("id, email, name, username, bio, avatar_url").eq("id", user.id).single();
  if (!profile) notFound();
  const { data: progress } = await supabase.from("game_progress")
    .select("game_id, rounds_played, best_score, last_played_at").eq("profile_id", user.id)
    .order("last_played_at", { ascending: false });
  return <div className="fc-site min-h-screen bg-brand-bone text-brand-ink"><PublicHeader /><main className="mx-auto max-w-3xl space-y-6 px-5 py-12">
    <header className="app-card p-6"><p className="eyebrow">Account</p><h1 className="mt-1 text-3xl font-bold text-brand-navy">Your profile</h1><p className="mt-2 text-sm text-brand-muted">Manage the details and preferences connected to your public Fourth Canal account.</p></header>
    <section className="app-card p-6"><ProfileForm profile={profile} /></section>
    <section className="app-card p-6"><h2 className="text-xl font-semibold text-brand-navy">Saved progress</h2>{progress?.length ? <ul className="mt-3 space-y-2">{progress.map((item) => <li key={item.game_id} className="flex justify-between border-t border-brand-line pt-2"><a className="font-medium text-brand-navy hover:underline" href={`/games/${item.game_id}`}>{item.game_id.replaceAll("-", " ")}</a><span className="text-sm text-brand-muted">{item.rounds_played} rounds · best {item.best_score}</span></li>)}</ul> : <p className="mt-2 text-sm text-brand-muted">Play a game while signed in and your progress will appear here.</p>}</section>
    <section id="appearance" className="app-card p-6"><AppearanceSettings /></section>
  </main></div>;
}
