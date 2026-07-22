import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/SignInPanel";
import styles from "@/components/games/LivingAtlasPractice.module.css";
import { safeReturnPath } from "@/lib/auth-redirect";
import { getOptionalSessionProfile } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your Living Atlas account",
  description: "Create a Fourth Canal account to practice, save your place, and review your progress in Living Atlas.",
  robots: { index: false, follow: false },
};

export default async function LivingAtlasAccessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const returnTo = safeReturnPath(next, "/games/living-atlas");
  const { profile, userId } = await getOptionalSessionProfile();
  const hasUsableAccount = Boolean(userId && profile?.status !== "revoked");
  if (hasUsableAccount) redirect(returnTo);

  return (
    <main id="game-content" className={styles.atlasRoot}>
      <section className={styles.accessPage}>
        <div className={styles.accessCopy}>
          <p className={styles.eyebrow}>Living Atlas · Account required to practice</p>
          <h1>Make every practice session yours.</h1>
          <p>Explore the catalogue freely. When you are ready to flip cards or answer questions, a Fourth Canal account keeps the work connected across every course.</p>
          <ul>
            <li><strong>Resume exactly where you stopped.</strong><span>Your deck, card, choices, and study settings stay put.</span></li>
            <li><strong>Repair the right material.</strong><span>Flags and recall repair queues stay separate so a correct answer never hides a weak point.</span></li>
            <li><strong>See learning take shape.</strong><span>Your coverage, mastery, pace, achievements, and Holland Lop companion reflect your own stored work.</span></li>
            <li><strong>Use image tools when they matter.</strong><span>Question and source diagrams can be zoomed inside an authenticated study session.</span></li>
          </ul>
          <Link href="/games/living-atlas" className={styles.secondaryButton}>Back to the catalogue</Link>
        </div>
        <aside className={styles.accessPanel}>
          <p className={styles.eyebrow}>Start your account</p>
          <h2>Continue with Google</h2>
          <p>Sign in once, then return directly to the deck you chose. The catalogue remains open without an account.</p>
          <SignInPanel returnTo={returnTo} />
        </aside>
      </section>
    </main>
  );
}
