import Link from "next/link";
import {
  AlarmClock,
  AlertTriangle,
  ArrowRight,
  Blocks,
  CheckCircle2,
  CircleX,
  CloudOff,
  Database,
  Download,
  FileText,
  Fingerprint,
  FolderDown,
  HardDrive,
  Laptop,
  Link2,
  LockKeyhole,
  MousePointerClick,
  PanelsTopLeft,
  RefreshCw,
  Route,
  Search,
  SquareActivity,
} from "lucide-react";
import { BetaButton } from "@/components/commercial/BetaDialog";
import { CheckList, CtaBand, FeatureGrid, Notice, PageHero, SectionHeading, styles } from "@/components/commercial/CommercialPrimitives";

const supported = [
  "Chrome 116 or newer",
  "Apple-silicon Mac",
  "macOS 13 or newer",
  "EchoVideo and Echo360 lesson domains covered by the public extension",
  "Zoom recording playback pages",
  "Customer-owned Notion workspace",
  "Native VTT, validated TXT fallback where implemented, and manual VTT/TXT import",
];

const unsupported = [
  "Intel Macs, Windows, iPhone, and iPad",
  "Safari, Firefox, and Edge",
  "Google Meet or Drive automatic capture",
  "Generic webpage scraping",
  "Locked, expired, or unauthorized recordings",
  "Circumvention of DRM or institutional controls",
  "Guaranteed availability before captions are published",
  "Guaranteed merged MP4 output",
  "Automation while Chrome is closed or signed out",
];

const permissionRows = [
  ["Supported site access", "Recognizes transcript and source-media responses only on declared EchoVideo/Echo360 and Zoom playback pages."],
  ["Downloads", "Saves the VTT, timestamped TXT, and provider-supplied source files the customer explicitly requests."],
  ["Storage", "Keeps settings, job state, exact-session identity, and recovery state locally in Chrome."],
  ["Alarms", "Wakes scheduled checks without running continuous background polling."],
  ["Tabs and scripting", "Detects the active supported recording page and runs the matching local capture helper."],
  ["Network observation", "Identifies provider transcript and media responses on supported pages; browser cookies are never exported from Chrome."],
] as const;

export function VisiLearnPage() {
  return (
    <>
      <PageHero eyebrow="Fourth Canal VisiLearn" title="Authorized capture at the browser edge." description="A Chrome companion for exact-session transcript and source-media capture on supported Echo360 and Zoom recording pages you are already authorized to open." />
      <section className={styles.section}>
        <FeatureGrid items={[
          { icon: FileText, title: "Original transcript files", text: "Preserve provider-supplied WebVTT and generate a readable timestamped TXT without inventing transcript content." },
          { icon: MousePointerClick, title: "Exact-session selection", text: "Capture the recording you deliberately opened, with stable session identity instead of fuzzy title matching." },
          { icon: PanelsTopLeft, title: "Passive captions", text: "Show local caption support without replacing or interfering with the provider’s playback controls." },
          { icon: FolderDown, title: "Authorized source media", text: "Save available provider-supplied media components through the customer’s signed-in browser session." },
          { icon: HardDrive, title: "Local browser state", text: "Keep settings, capture state, and the Mac connection on the customer’s device." },
          { icon: Route, title: "Honest file roles", text: "Preserve separate audio and video streams as separate originals rather than presenting them as a merged MP4." },
        ]} />
      </section>
      <section className={styles.sectionAlt}>
        <div>
          <SectionHeading eyebrow="Chrome permissions" title="Every requested capability has one narrow job." description="The public package must remove the existing school-specific Canvas helper before Chrome Web Store submission. The permission explanations below describe the institution-neutral release boundary." />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Permission group</th><th>Why VisiLearn needs it</th></tr></thead>
              <tbody>{permissionRows.map(([permission, reason]) => <tr key={permission}><td>{permission}</td><td>{reason}</td></tr>)}</tbody>
            </table>
          </div>
          <div className={styles.notice}><LockKeyhole aria-hidden="true" /><span>Browser cookies and provider credentials never leave Chrome. VisiLearn does not bypass login, access controls, DRM, or institutional policy.</span></div>
        </div>
      </section>
      <CtaBand title="Capture only what you are authorized to open." description="Check the declared browser, provider, and Mac support boundary before joining the private beta." />
    </>
  );
}

export function TranscriptPage() {
  return (
    <>
      <PageHero eyebrow="Fourth Canal Transcript for Mac" title="A calm control plane for local transcript work." description="Schedule capture, validate originals, surface exceptions, and organize a customer-owned Notion library from an Apple-silicon Mac." />
      <section className={styles.section}>
        <FeatureGrid items={[
          { icon: AlarmClock, title: "Scheduled capture", text: "Coordinate approved recording jobs while clearly showing when Chrome is closed, signed out, or disconnected." },
          { icon: SquareActivity, title: "Connection health", text: "Show the background worker, VisiLearn bridge, Downloads permission, and Notion connection as separate states." },
          { icon: Fingerprint, title: "SHA-256 validation", text: "Copy, hash, and verify every completed file before the temporary staging copy is removed." },
          { icon: Database, title: "Notion upload and read-back", text: "Write the transcript and metadata, then verify the destination record instead of assuming success." },
          { icon: FolderDown, title: "Manual VTT/TXT import", text: "Bring in a meeting or retained file without depending on an automatic provider capture." },
          { icon: RefreshCw, title: "Retry and recovery", text: "Retry or requeue clear failures while preserving unavailable, incomplete, and ambiguous items for deliberate review." },
        ]} />
      </section>
      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <div>
            <SectionHeading eyebrow="Background behavior" title="Automation that fails visibly instead of guessing." description="The local worker can schedule and validate work in the background. It never invents a match, deletes a recovery copy before verification, or requires transcript contents for license checks." />
            <Notice warning><AlertTriangle aria-hidden="true" /><span>Scheduled browser capture still requires Chrome to remain open, signed in, and connected to the local Mac app.</span></Notice>
          </div>
          <CheckList items={[
            "Downloading, Ready, and Failed states remain visible",
            "Per-file completion is recorded before a bundle becomes Ready",
            "Interrupted and corrupt files stay available for recovery",
            "Duplicate refreshes update the same exact session instead of creating another record",
            "Automatic linking requires an exact automation ID or normalized provider URL",
          ]} />
        </div>
      </section>
      <CtaBand title="Keep the operator local and legible." description="The private beta validates the workflow before public installers and automatic updates are enabled." />
    </>
  );
}

export function NotionPage() {
  return (
    <>
      <PageHero eyebrow="Transcript Library for Notion" title="Your permanent database stays in your workspace." description="Fourth Canal creates one supported standalone Transcript Library beneath a parent page the customer chooses. It does not host a competing transcript library." />
      <section className={styles.section}>
        <div className={styles.split}>
          <div>
            <SectionHeading eyebrow="Customer-owned destination" title="Disconnect the bridge without losing the library." description="Canceling, disconnecting Notion, or removing the Mac app does not delete transcript files or readable text already stored in the customer’s workspace." />
            <Notice warning><AlertTriangle aria-hidden="true" /><span>Public Notion OAuth is not enabled during the private beta. The account preview shows only a coarse connected or disconnected state.</span></Notice>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Supported field</th><th>Purpose</th></tr></thead>
              <tbody>
                {[
                  ["Original attachment", "Preserve the provider-supplied VTT or imported file"],
                  ["Readable text", "Keep searchable timestamped transcript text"],
                  ["Recorded at and type", "Describe the recording without changing the original"],
                  ["Verification hash", "Identify the exact file uploaded"],
                  ["Status and error", "Show recoverable processing state"],
                  ["Exact automation identity", "Link only by stable ID or normalized provider URL"],
                ].map(([field, purpose]) => <tr key={field}><td>{field}</td><td>{purpose}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className={styles.sectionAlt}>
        <div>
          <SectionHeading eyebrow="Export and deletion" title="The workspace remains independent." />
          <FeatureGrid items={[
            { icon: Download, title: "Export from Notion", text: "Use Notion’s normal export tools for the database and readable transcript content." },
            { icon: Link2, title: "Disconnect cleanly", text: "Revoke the connection without removing existing customer-owned records." },
            { icon: CircleX, title: "Delete deliberately", text: "Delete transcript records through the customer’s Notion workspace; account deletion does not silently remove them." },
          ]} />
        </div>
      </section>
      <CtaBand title="Keep Notion as the source of truth." description="Start with one supported database schema, then preserve the customer’s ordinary export and deletion controls." />
    </>
  );
}

export function CompatibilityPage() {
  return (
    <>
      <PageHero eyebrow="Planned launch support" title="A deliberately narrow compatibility boundary." description="The first commercial release will support only combinations Fourth Canal can test and maintain honestly." actions={false} />
      <section className={styles.section}>
        <div className={styles.split}>
          <div><SectionHeading eyebrow="Supported" title="Planned launch matrix" /><CheckList items={supported} /></div>
          <div><SectionHeading eyebrow="Not supported" title="Outside the first release" /><CheckList items={unsupported} negative /></div>
        </div>
      </section>
      <section className={styles.sectionAlt}>
        <div>
          <Notice warning><AlertTriangle aria-hidden="true" /><span>Compatibility with a provider does not guarantee a particular recording has captions or source media. Provider and institutional policy always controls availability.</span></Notice>
        </div>
      </section>
      <CtaBand title="Your setup not listed?" description="Join the private beta list for compatibility updates without enabling unsupported capture." />
    </>
  );
}

export function SecurityPage() {
  return (
    <>
      <PageHero eyebrow="Security and privacy" title="A visible boundary from browser to customer database." description="Each part of Fourth Canal receives only the information it needs. Transcript content stays out of Fourth Canal-operated account systems." actions={false} />
      <section className={styles.section}>
        <FeatureGrid items={[
          { icon: PanelsTopLeft, title: "Signed-in Chrome", text: "Provider session, cookies, supported page context, local settings, and capture job state." },
          { icon: Laptop, title: "Customer Mac", text: "Temporary staging, validation, recovery files, local logs, and Keychain credentials." },
          { icon: Database, title: "Customer Notion", text: "Permanent transcript attachment, readable text, metadata, status, and verification hash." },
        ]} />
      </section>
      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <div>
            <SectionHeading eyebrow="Fourth Canal account" title="Minimal commercial state only." description="The account may hold email, subscription status, device activation, current software versions, and coarse onboarding booleans." />
            <Link href="/security/report" className={styles.buttonSecondary}>Report a security issue <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <CheckList negative items={[
            "No transcript text or captured media",
            "No browser cookies or provider credentials",
            "No recording URLs, titles, course names, or filenames",
            "No Notion database content, page identifiers, or access tokens in account views",
            "No transcript or browser-session data in license checks",
          ]} />
        </div>
      </section>
      <section className={styles.section}>
        <SectionHeading eyebrow="Analytics boundary" title="Aggregate public-site measurement only." />
        <div className={styles.cardGrid}>
          <div><CheckList items={["Normalized public page", "Referrer domain", "Coarse region and device category", "Named CTA events after review"]} /></div>
          <div><CheckList negative items={["No advertising pixels", "No cross-site identifiers", "No session replay", "No form-content capture", "No analytics in the extension, Mac app, or account pages"]} /></div>
        </div>
      </section>
      <CtaBand title="Security starts with a smaller data boundary." description="Fourth Canal-operated services are designed not to receive the recording content they do not need." />
    </>
  );
}

export function DownloadPage() {
  return (
    <>
      <PageHero eyebrow="Private beta downloads" title="Install access stays controlled during testing." description="Approved testers receive installation instructions separately. The public site does not expose executable downloads before signing, notarization, and Chrome Web Store approval." actions={false} />
      <section className={styles.section}>
        <div className={styles.cardGrid}>
          <DownloadCard icon={Blocks} name="Fourth Canal VisiLearn" version="Private beta 1.6.0" requirement="Chrome 116 or newer" />
          <DownloadCard icon={Laptop} name="Fourth Canal Transcript" version="Private beta 1.1.0" requirement="Apple-silicon · macOS 13+" />
        </div>
        <Notice><CloudOff aria-hidden="true" /><span>These controls explain the release boundary. They do not begin a download, checkout, activation, or external connection.</span></Notice>
      </section>
      <section className={styles.sectionAlt}>
        <div>
          <SectionHeading eyebrow="Planned onboarding" title="Test the connection before a real recording." />
          <CheckList items={[
            "Install VisiLearn from the Chrome Web Store",
            "Open a Fourth Canal account through an email magic link",
            "Install the signed and notarized Mac package",
            "Confirm processor, macOS, Downloads access, device license, and local Chrome connection",
            "Connect Notion and create a fresh supported Transcript Library",
            "Validate the workflow with a bundled sample VTT",
            "Then test one recording the customer is authorized to open",
          ]} />
        </div>
      </section>
      <CtaBand title="Public downloads are a release gate, not a placeholder link." description="The private beta remains controlled until distribution and isolation checks pass." />
    </>
  );
}

function DownloadCard({ icon: Icon, name, version, requirement }: { icon: typeof Blocks; name: string; version: string; requirement: string }) {
  return (
    <article className={styles.card}>
      <Icon aria-hidden="true" />
      <h3>{name}</h3>
      <p>{version}</p>
      <p>{requirement}</p>
      <BetaButton label="Request beta access" secondary />
    </article>
  );
}

const pricingPlans = [
  { name: "VisiLearn Free", price: "$0", period: "forever", features: ["Chrome extension", "Manual VTT/TXT capture", "Authorized source-media capture", "Passive captions", "Local settings"] },
  { name: "Fourth Canal Complete", price: "$5", period: "monthly", featured: true, features: ["$48 annual option", "14-day no-card trial", "Mac scheduling and validation", "One Notion workspace", "Two personal Mac activations", "Updates and standard support"] },
  { name: "Education & Teams", price: "Private", period: "pilot", features: ["Controlled pilot only", "Guided onboarding", "Organizational evaluation", "No self-service multi-user administration"] },
];

export function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Planned pricing" title="Simple account pricing without transcript metering." description="Private beta testing is free for approved participants. Public checkout and billing remain disabled until the commercial release gates pass." actions={false} />
      <section className={styles.section}>
        <div className={styles.priceGrid}>
          {pricingPlans.map((plan) => (
            <article key={plan.name} className={`${styles.priceCard} ${plan.featured ? styles.priceCardFeatured : ""}`}>
              <span className={styles.miniLabel}>{plan.featured ? "Complete" : "Planned"}</span>
              <h3>{plan.name}</h3>
              <div className={styles.price}><strong>{plan.price}</strong><span>{plan.period}</span></div>
              <ul>{plan.features.map((feature) => <li key={feature}><CheckCircle2 aria-hidden="true" />{feature}</li>)}</ul>
              <BetaButton label={plan.name === "Education & Teams" ? "Contact about pilot" : "Join private beta"} secondary={!plan.featured} />
            </article>
          ))}
        </div>
      </section>
      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <div><SectionHeading eyebrow="Commercial rules" title="Maintenance-funded, customer-owned." description="There is no lifetime license at launch because browser and provider compatibility require ongoing maintenance." /></div>
          <CheckList items={[
            "Annual subscribers receive a 14-day refund window on the first annual charge",
            "Cancellation takes effect at the end of the paid period",
            "Expired automatic Mac workflows pause; customer Notion and local recovery files are not deleted",
            "The free Chrome extension remains usable after Complete expires",
            "Teams remain a controlled pilot until administration and permission behavior are tested",
          ]} />
        </div>
      </section>
      <CtaBand title="The private beta remains free." description="Billing begins only after public distribution, legal review, external beta, and account-operation gates are complete." />
    </>
  );
}

export function ChangelogPage() {
  const entries = [
    { version: "1.6.0 / 1.1.0", label: "Current private beta", items: ["Restored exact-session media bundle lifecycle", "Added local video-library validation and recovery states", "Preserved separate audio and video originals", "Kept public distribution disabled pending release gates"] },
    { version: "Commercial foundation", label: "Prototype milestone", items: ["Defined the Chrome → Mac → customer Notion product family", "Added pricing, compatibility, account, support, security, and legal prototypes", "Added release contract and private-data scan"] },
  ];
  return (
    <>
      <PageHero eyebrow="Product history" title="A transparent private-beta changelog." description="These entries describe verified local product and commercial-foundation milestones. They are not claims of public distribution or completed live acceptance." actions={false} />
      <section className={styles.narrowSection}>
        {entries.map((entry) => (
          <article key={entry.version} className={styles.panel}>
            <span className={styles.miniLabel}>{entry.label}</span>
            <h2>{entry.version}</h2>
            <CheckList items={entry.items} />
          </article>
        ))}
        <Notice warning><AlertTriangle aria-hidden="true" /><span>One real authorized Echo capture and repeat remains a product acceptance gate. Chrome Web Store distribution, signed/notarized Mac installation, billing, and public Notion OAuth are not live.</span></Notice>
      </section>
    </>
  );
}

export function SupportIntro() {
  return (
    <>
      <PageHero eyebrow="Support" title="Start with the task, then share only safe diagnostics." description="Search the setup and recovery paths below. If you still need help, use the existing support form without including transcript content, recording URLs, account secrets, or school records." actions={false} />
      <section className={styles.section}>
        <SectionHeading eyebrow="Five-minute setup" title="Common paths, organized around the job." />
        <div className={styles.cardGrid}>
          {[
            ["Install and connect", "VisiLearn, the Mac app, Downloads access, local connection, and the sample VTT."],
            ["Capture a recording", "Echo360 lesson capture, Zoom playback capture, scheduled work, and manual VTT/TXT import."],
            ["Repair the workflow", "Extension not detected, Chrome signed out, worker stale, Notion authorization expired, or schema changed."],
            ["Recover safely", "Unavailable transcript, ambiguous session, retained temporary file, duplicate protection, or upload read-back failure."],
          ].map(([title, copy]) => <article key={title} className={styles.card}><Search aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>
      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <div><SectionHeading eyebrow="Support sequence" title="Documentation first, private files only with consent." /></div>
          <CheckList items={["Searchable task documentation", "Copy safe diagnostics from the Mac app", "Email or ticket support", "Attach a file or log only after explicit approval", "Screen sharing only with separate consent"]} />
        </div>
      </section>
    </>
  );
}
