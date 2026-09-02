import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  Database,
  FileCheck2,
  Laptop,
  LockKeyhole,
  PanelsTopLeft,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { BetaButton } from "@/components/commercial/BetaDialog";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { SectionHeading, styles } from "@/components/commercial/CommercialPrimitives";

const workflow = [
  { icon: PanelsTopLeft, step: "01", title: "Capture in Chrome", text: "Use the provider session you are already authorized to access. Cookies and sign-in details stay in Chrome." },
  { icon: Laptop, step: "02", title: "Verify on Mac", text: "Schedule work, validate files, retry clear failures, and protect retained recovery copies." },
  { icon: Database, step: "03", title: "Keep in Notion", text: "Store the original transcript and readable text in a database inside your own workspace." },
];

const outcomes = [
  { icon: CircleDot, title: "Exact-session matching", text: "Use a stable automation ID or normalized provider URL instead of guessing from similar recording titles." },
  { icon: FileCheck2, title: "Validated originals", text: "Keep provider-supplied VTT or timestamped TXT with an exact SHA-256 verification hash." },
  { icon: RefreshCw, title: "Recoverable errors", text: "Unavailable, interrupted, and ambiguous work stays visible for retry, requeue, or manual recovery." },
];

const prices = [
  { name: "VisiLearn Free", price: "$0", period: "forever", text: "Manual local capture on supported recording pages.", features: ["Chrome extension", "Manual VTT/TXT capture", "Authorized source-media capture", "Passive captions", "Local settings"] },
  { name: "Fourth Canal Complete", price: "$5", period: "per month", text: "The paired Mac and customer-owned Notion workflow.", featured: true, features: ["Everything in Free", "$48 annual option", "14-day no-card trial", "One Notion workspace", "Two personal Mac activations"] },
  { name: "Education & Teams", price: "Private", period: "pilot", text: "A controlled evaluation before multi-user administration is offered.", features: ["Guided onboarding", "Controlled cohort", "Direct support", "No self-service team sale"] },
];

const faq = [
  ["Does Fourth Canal bypass provider login or access controls?", "No. Capture works only for a recording the customer is already authorized to open in their signed-in Chrome session."],
  ["Does Chrome need to stay open?", "Yes. Scheduled browser capture requires Chrome to remain running and signed in to the supported recording provider."],
  ["Is Notion required?", "Notion is required for the paired Complete automation. VisiLearn Free can still make manual local transcript downloads without Notion."],
  ["Are audio and video always combined into one MP4?", "No. When a provider supplies separate streams, Fourth Canal preserves them honestly as separate files. The Mac app may synchronize them during playback."],
  ["Where is the permanent transcript library?", "Inside the customer’s own Notion workspace. Fourth Canal account systems do not receive transcript text, recording titles, course details, or Notion database content."],
  ["What is not supported at launch?", "Windows, Intel Mac, iPhone/iPad, Safari, Firefox, Edge, generic webpage capture, and automatic Google Meet or Drive capture are outside the launch boundary."],
  ["Is Fourth Canal affiliated with the recording providers or my institution?", "No. Fourth Canal is independent and is not affiliated with EchoVideo, Zoom, Notion, Google, Case Western Reserve University, or any educational institution."],
] as const;

export function CommercialHome() {
  return (
    <CommercialShell>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Local-first transcript workflow</p>
            <h1>From authorized recordings to a clean Notion transcript library.</h1>
            <p className={styles.heroLead}>VisiLearn captures supported Echo360 and Zoom transcript and media files through the browser session you already use. Fourth Canal Transcript validates and organizes them on your Mac. Your Notion workspace remains the permanent database.</p>
            <div className={styles.heroActions}>
              <BetaButton label="Join the private beta" />
              <Link href="#workflow" className={styles.buttonSecondary}>See how the workflow works <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
            <p className={styles.compatibilityLine}>Planned launch support: Chrome 116+, an Apple-silicon Mac running macOS 13 or later, and a Notion workspace for automated organization.</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className={styles.section} id="workflow">
        <SectionHeading eyebrow="One calm workflow" title="Three tools, with one clear responsibility each." />
        <div className={styles.workflowGrid}>
          {workflow.map(({ icon: Icon, step, title, text }) => (
            <article key={step} className={styles.featureCard}>
              <div className={styles.step}><Icon aria-hidden="true" /><span>{step}</span></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div>
          <SectionHeading eyebrow="Clear outcomes" title="Fewer manual steps, without a black box." description="The workflow is designed to stop when identity or file integrity is unclear—not to guess and quietly misfile a recording." />
          <div className={styles.featureGrid}>
            {outcomes.map(({ icon: Icon, title, text }) => <article key={title} className={styles.featureCard}><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.split}>
          <div>
            <SectionHeading eyebrow="Real product, synthetic preview" title="See the state of every handoff." description="The commercial preview uses demonstration-only names and counts. No transcript, provider, account, or school data is shown." />
            <Link href="/transcript" className={styles.textLink}>Explore the Mac workflow →</Link>
          </div>
          <ProductPreview compact />
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <div>
            <SectionHeading eyebrow="Local-first privacy" title="Your browser session stays in Chrome. Your library stays in Notion." description="Fourth Canal-operated servers are limited to account, subscription, device, version, and coarse onboarding state. They do not receive transcript text, captured media, provider URLs, or Notion database content." />
          </div>
          <ul className={styles.checkList}>
            <li><LockKeyhole aria-hidden="true" /><span>Browser cookies never leave Chrome.</span></li>
            <li><ShieldCheck aria-hidden="true" /><span>Temporary staging stays on the Mac until verified cleanup.</span></li>
            <li><Database aria-hidden="true" /><span>Permanent transcripts stay in the customer-owned Notion workspace.</span></li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeading eyebrow="Compatibility and limitations" title="A narrow launch boundary, stated plainly." description="The private beta does not promise universal provider support, unattended capture while Chrome is closed, or access to locked recordings." />
        <div className={styles.notice}><AlertTriangle aria-hidden="true" /><span>Public downloads, checkout, and Notion OAuth remain disabled until distribution, legal, isolation, and external beta gates are complete. The current private beta remains free.</span></div>
        <div className={styles.heroActions}>
          <Link href="/compatibility" className={styles.buttonSecondary}>Read the support matrix</Link>
          <Link href="/security" className={styles.buttonSecondary}>Review the data boundary</Link>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div>
          <SectionHeading eyebrow="Planned pricing" title="Account-based plans without transcript metering." description="Fourth Canal will not inspect customer records or count transcript minutes merely to calculate a bill." />
          <div className={styles.priceGrid}>
            {prices.map((plan) => (
              <article key={plan.name} className={`${styles.priceCard} ${plan.featured ? styles.priceCardFeatured : ""}`}>
                <span className={styles.miniLabel}>{plan.featured ? "Complete" : "Planned"}</span>
                <h3>{plan.name}</h3>
                <div className={styles.price}><strong>{plan.price}</strong><span>{plan.period}</span></div>
                <p>{plan.text}</p>
                <ul>{plan.features.map((feature) => <li key={feature}><CheckCircle2 aria-hidden="true" />{feature}</li>)}</ul>
                <BetaButton label={plan.name === "Education & Teams" ? "Contact about pilot" : "Join private beta"} secondary={!plan.featured} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.narrowSection}>
        <SectionHeading eyebrow="Frequently asked" title="The important boundaries, up front." />
        <div className={styles.faq}>{faq.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>

      <section className={styles.ctaBand}>
        <div>
          <h2>Keep the recording workflow local, legible, and yours.</h2>
          <p>The private beta is free while the commercial release gates are completed. No public checkout or executable download is active.</p>
          <BetaButton />
        </div>
      </section>
    </CommercialShell>
  );
}

function ProductPreview({ compact = false }: { compact?: boolean }) {
  const rows = [
    ["Weekly seminar", "Verified", CheckCircle2],
    ["Research meeting", "Uploading", Clock3],
    ["Review session", "Needs attention", AlertTriangle],
  ] as const;
  return (
    <div className={styles.productPreview} aria-label="Synthetic Fourth Canal Transcript product preview">
      <div className={styles.previewTop}>
        <div><strong>Fourth Canal Transcript</strong><small>Synthetic private-beta preview</small></div>
        <span className={styles.statusReady}>Ready</span>
      </div>
      <div className={styles.previewHealth}>
        {[["VisiLearn", "Connected"], ["Notion", "Connected"], ["Worker", "Ready"]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}
      </div>
      <div className={styles.previewBody}>
        {!compact ? <div className={styles.previewMetrics}>{[["Action needed", "2"], ["Scheduled", "1"], ["Saved library", "14"]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div> : null}
        <div className={styles.previewQueue}>{rows.map(([name, state, Icon]) => <div key={name} className={styles.previewRow}><Icon aria-hidden="true" /><span>{name}</span><small>{state}</small></div>)}</div>
        <div className={styles.previewFooter}><Database aria-hidden="true" /> No real customer or provider data is shown.</div>
      </div>
    </div>
  );
}
