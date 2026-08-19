import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VisiLearn Privacy Policy",
  description:
    "Privacy policy for the Fourth Canal VisiLearn Chrome extension.",
  alternates: { canonical: "/visilearn/privacy" },
};

export default function VisiLearnPrivacyPage() {
  return (
    <div className="fc-site app-shell-bg min-h-screen text-brand-ink">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between border-b border-brand-line px-4 py-5 sm:px-6">
        <Image
          src="/brand/fourth-canal-horizontal-on-light-outlined.svg"
          alt="Fourth Canal"
          width={220}
          height={48}
          className="fc-brand-horizontal"
          priority
        />
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-muted">
          Extension privacy
        </span>
      </div>

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <header className="app-card p-6 sm:p-8">
          <p className="eyebrow">Fourth Canal Chrome extension</p>
          <h1 className="portal-title mt-2 text-3xl font-bold sm:text-4xl">
            VisiLearn Privacy Policy
          </h1>
          <p className="mt-2 text-sm font-semibold text-brand-navy">
            Effective and last updated: August 19, 2026
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-brand-muted">
            Fourth Canal VisiLearn is a local-first Chrome extension for studying
            authorized course videos. It enhances Echo360 playback and downloads and
            applies user-configured Modi remote controls to Echo360 and YouTube. The
            extension does not require a Fourth Canal account.
          </p>
        </header>

        <section className="app-card p-6 prose-brand sm:p-8">
          <p className="eyebrow">01 / Information handled</p>
          <h2 className="mt-2">Information processed on your device</h2>
          <p>VisiLearn may process:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Echo360 course and session titles, dates, page addresses, recording
              availability, captions, transcript text, and media resource addresses.
            </li>
            <li>
              Whether the current page is a supported Echo360 or YouTube page, so the
              extension can provide the appropriate feature.
            </li>
            <li>
              Settings, Modi remote mappings, download presets, course display
              preferences, notes, and scheduled download-job state created by the user.
            </li>
          </ul>
          <h2>Information VisiLearn does not intentionally collect</h2>
          <p>
            VisiLearn does not intentionally read or store passwords, authentication
            cookies, payment information, health information, advertising identifiers,
            or data from unsupported websites.
          </p>
        </section>

        <section className="app-card p-6 prose-brand sm:p-8">
          <p className="eyebrow">02 / Use, storage, and deletion</p>
          <h2 className="mt-2">How information is used</h2>
          <p>
            Information is used only for VisiLearn&apos;s disclosed features: Focus Mode,
            playback controls, caption display and caption-gap skipping, Modi remote
            controls, course discovery, notes, and user-selected or scheduled Echo360
            downloads.
          </p>
          <h2>Where information is stored</h2>
          <p>
            Settings and course metadata are stored locally in Chrome extension storage.
            Captions are processed in memory unless the user explicitly downloads a
            caption or transcript file. Downloaded files are saved to the user&apos;s computer
            through Chrome&apos;s download system.
          </p>
          <h2>Retention and deletion</h2>
          <p>
            Local extension data remains in the user&apos;s Chrome profile until the user
            clears the extension&apos;s storage or removes the extension. Files already
            downloaded to the computer remain there until the user deletes them.
          </p>
        </section>

        <section className="app-card p-6 prose-brand sm:p-8">
          <p className="eyebrow">03 / Network activity and sharing</p>
          <h2 className="mt-2">Direct access to supported services</h2>
          <p>
            VisiLearn uses the user&apos;s existing authorized Echo360 session to access
            supported Echo360 pages and resources over HTTPS. YouTube controls operate on
            the supported YouTube page using the user&apos;s locally saved mappings.
          </p>
          <h2>No publisher analytics or study-data service</h2>
          <p>
            The VisiLearn extension does not send analytics, study data, settings, course
            information, captions, notes, or browsing history to Fourth Canal. It does not
            sell user data, use user data for advertising or credit decisions, or share
            user data with data brokers or unrelated third parties.
          </p>
          <p>
            The extension contains no remotely hosted executable code and uses no hosted
            AI, advertising, or analytics service. Echo360, YouTube, Chrome, and downloaded
            files remain subject to their own services and privacy practices.
          </p>
        </section>

        <section className="app-card p-6 prose-brand sm:p-8">
          <p className="eyebrow">04 / Chrome Web Store Limited Use</p>
          <h2 className="mt-2">Limited Use commitment</h2>
          <p>
            VisiLearn&apos;s use of information received from Chrome APIs complies with the
            Chrome Web Store User Data Policy, including the Limited Use requirements.
            Information is used only to provide or improve the extension&apos;s disclosed,
            user-facing course-video study features.
          </p>
          <p>
            Information is not transferred for advertising, unrelated profiling, credit
            decisions, or sale. It is not made available for human reading except when the
            user affirmatively requests support, when needed for security or abuse review,
            when required by law, or when the data has been aggregated and anonymized.
          </p>
        </section>

        <section className="app-card p-6 prose-brand sm:p-8">
          <p className="eyebrow">05 / Changes and contact</p>
          <h2 className="mt-2">Policy changes</h2>
          <p>
            Material changes will be reflected on this page with a new effective date and,
            when required, in the Chrome Web Store listing.
          </p>
          <h2>Questions or privacy requests</h2>
          <p>
            Use the Fourth Canal{" "}
            <Link href="/support" className="font-semibold text-brand-blue underline">
              support form
            </Link>{" "}
            and identify VisiLearn in the message. Support information submitted through
            the website is handled under the Fourth Canal{" "}
            <Link href="/legal#privacy" className="font-semibold text-brand-blue underline">
              site privacy policy
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
