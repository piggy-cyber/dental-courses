import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";

const RECOVERY_LINKS = [
  {
    number: "01",
    title: "Games",
    detail: "Practice tooth identification and dental anatomy.",
    href: "/games",
  },
  {
    number: "02",
    title: "Grade calculator",
    detail: "Work out the grade you need on what remains.",
    href: "/grade-calculator",
  },
  {
    number: "03",
    title: "About Fourth Canal",
    detail: "See why the missing detail became our name.",
    href: "/about#why",
  },
] as const;

export default function NotFound() {
  return (
    <div className="fc-site public-core-page public-not-found-page">
      <PublicHeader />

      <main className="public-not-found-main">
        <section className="public-not-found-hero" aria-labelledby="not-found-title">
          <div className="public-not-found-atlas-art">
            <Image
              src="/brand/living-atlas-social-preview-v1.png"
              alt="A white Holland Lop companion beside a dental study console"
              fill
              priority
              sizes="(max-width: 760px) calc(100vw - 1.2rem), 42vw"
            />
          </div>

          <div className="public-not-found-copy">
            <p className="eyebrow">Route not found</p>
            <h1 id="not-found-title">This page is missing.</h1>
            <p>
              The link may be old, the address may be mistyped, or the page may have moved.
              Start with the course directory or choose another public tool below.
            </p>
            <div className="public-core-hero-actions">
              <Link href="/guides" className="public-core-primary-action">
                Open course directory <span aria-hidden="true">→</span>
              </Link>
              <Link href="/" className="public-core-secondary-action">
                Return home
              </Link>
            </div>
          </div>
        </section>

        <nav className="public-not-found-routes" aria-label="Other places to continue">
          {RECOVERY_LINKS.map((item) => (
            <Link href={item.href} key={item.number}>
              <span>{item.number}</span>
              <div>
                <b>{item.title}</b>
                <small>{item.detail}</small>
              </div>
              <strong aria-hidden="true">→</strong>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
