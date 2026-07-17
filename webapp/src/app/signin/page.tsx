import { PublicHeader } from "@/components/PublicHeader";
import { SignInPanel } from "@/components/SignInPanel";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default function SignInPage() {
  return <div className="fc-site min-h-screen bg-brand-bone text-brand-ink"><PublicHeader /><main className="mx-auto grid min-h-[70vh] max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-2"><section><p className="eyebrow">Fourth Canal</p><h1 className="mt-3 text-5xl font-bold text-brand-navy">Find what matters. Keep what you learn.</h1><p className="mt-5 max-w-lg text-lg text-brand-muted">Sign in once to keep your game progress and personal study preferences with you.</p><div className="mt-8 flex gap-3" aria-hidden="true">{[1,2,3,4].map((n) => <i key={n} className={`block h-20 w-1 ${n === 4 ? "bg-brand-copper" : "bg-brand-navy"}`} />)}</div></section><section className="app-card p-7"><h2 className="text-2xl font-bold text-brand-navy">Welcome back</h2><p className="mt-2 text-sm text-brand-muted">Use your Google account to continue.</p><div className="mt-6"><SignInPanel /></div></section></main></div>;
}
