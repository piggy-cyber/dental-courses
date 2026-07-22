import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { SupportForm } from "@/components/SupportForm";

export const metadata: Metadata = {
  title: "Support",
  description: "Contact Fourth Canal about site access, accessibility, content, privacy, copyright, or security.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <div className="fc-site public-core-page public-tool-page">
      <PublicHeader />
      <main className="public-tool-main space-y-8">
        <nav className="public-core-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span>Support</span>
        </nav>
        <header className="public-tool-hero">
          <p className="eyebrow">Support</p>
          <h1>Tell us what needs attention.</h1>
          <p>
            Use this form for site, account, accessibility, content, privacy, copyright, and security concerns. Do not include patient information, grades, passwords, or other sensitive records.
          </p>
        </header>
        <SupportForm />
      </main>
    </div>
  );
}
