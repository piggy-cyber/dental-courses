import Link from "next/link";
import { BetaButton } from "@/components/commercial/BetaDialog";
import { CheckList, CtaBand, FeatureGrid, Notice, PageHero, SectionHeading, styles } from "@/components/commercial/CommercialPrimitives";

const supported = [
  "Chrome 116 or newer",
  "Apple-silicon Mac",
  "macOS 13 or newer",
  "Declared EchoVideo and Echo360 lesson domains",
  "Zoom recording playback pages",
  "A Notion workspace controlled by the customer",
  "Native VTT, validated TXT fallback where implemented, and manual VTT/TXT import",
];

const unsupported = [
  "Intel Macs, Windows, iPhone, and iPad",
  "Safari, Firefox, and Edge",
  "Automatic Google Meet or Drive capture",
  "Generic webpage scraping",
  "Locked, expired, or unauthorized recordings",
  "DRM or institutional-control circumvention",
  "Capture before captions are published",
  "Guaranteed merged MP4 output",
  "Automation while Chrome is closed or signed out",
];

const permissionRows = [
  ["Supported site access", "Recognizes transcript and source-media responses on declared EchoVideo, Echo360, and Zoom playback pages."],
  ["Downloads", "Saves the VTT, timestamped TXT, and provider-supplied source files that the customer requests."],
  ["Storage", "Keeps settings, job state, exact-session identity, and recovery state in Chrome."],
  ["Alarms", "Runs scheduled checks without continuous background polling."],
  ["Tabs and scripting", "Recognizes the active supported recording page and starts its capture helper."],
  ["Network observation", "Identifies provider transcript and media responses. Browser cookies are not exported."],
] as const;

export function VisiLearnPage() {
  return (
    <>
      <PageHero title="Capture transcript files from a recording open in Chrome." description="VisiLearn works on supported Echo360 and Zoom pages that you are already authorized to access." />
      <section className={styles.section}>
        <SectionHeading title="What VisiLearn saves" />
        <FeatureGrid items={[
          { title: "Original transcript", text: "Keeps provider-supplied WebVTT and creates readable timestamped text without changing the transcript." },
          { title: "Exact recording identity", text: "Associates files with the recording you opened instead of matching similar titles." },
          { title: "Passive captions", text: "Provides local caption support without replacing provider playback controls." },
          { title: "Provider source media", text: "Saves available source components through the signed-in browser session." },
          { title: "Browser state", text: "Stores settings, capture state, and the Mac connection on the device." },
          { title: "Separate stream roles", text: "Keeps separate audio and video streams as separate originals." },
        ]} />
      </section>
      <section className={styles.sectionAlt}>
        <div>
          <SectionHeading title="Chrome permissions" description="Each permission is limited to a specific capture or recovery task." />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Permission group</th><th>Purpose</th></tr></thead>
              <tbody>{permissionRows.map(([permission, reason]) => <tr key={permission}><td>{permission}</td><td>{reason}</td></tr>)}</tbody>
            </table>
          </div>
          <Notice>Browser cookies and provider credentials stay in Chrome. VisiLearn does not bypass login, access controls, DRM, or institutional policy.</Notice>
        </div>
      </section>
      <CtaBand title="Confirm support before installing." description="Check the browser, provider, Mac, and file requirements for the private beta." />
    </>
  );
}

export function TranscriptPage() {
  return (
    <>
      <PageHero title="Verify files on your Mac before they reach Notion." description="Fourth Canal Transcript schedules capture, checks completed files, sends verified records to Notion, and keeps failed work available for review." />
      <section className={styles.section}>
        <SectionHeading title="Mac application responsibilities" />
        <FeatureGrid items={[
          { title: "Scheduled capture", text: "Coordinates approved jobs and reports when Chrome is closed, signed out, or disconnected." },
          { title: "Connection status", text: "Reports the worker, VisiLearn bridge, Downloads permission, and Notion connection separately." },
          { title: "SHA-256 verification", text: "Copies, hashes, and verifies a completed file before removing the staging copy." },
          { title: "Notion write and read-back", text: "Writes the transcript and metadata, then confirms the destination record." },
          { title: "Manual VTT/TXT import", text: "Imports a meeting or retained file without an automatic provider capture." },
          { title: "Retry and recovery", text: "Retries defined failures and keeps ambiguous or incomplete work for manual review." },
        ]} />
      </section>
      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <div>
            <SectionHeading title="Failure behavior" description="The worker does not guess when identity, file integrity, or destination verification is missing." />
            <Notice warning>Scheduled capture requires Chrome to remain open, signed in, and connected to the Mac app.</Notice>
          </div>
          <CheckList items={[
            "Downloading, Ready, and Failed remain separate states",
            "Every required file completes before a bundle becomes Ready",
            "Interrupted and corrupt files remain available for recovery",
            "A repeat refresh updates the same exact session",
            "Automatic linking requires an automation ID or normalized provider URL",
          ]} />
        </div>
      </section>
      <CtaBand title="Test with a sample file first." description="The private beta checks the complete workflow before public installers and automatic updates are enabled." />
    </>
  );
}

export function NotionPage() {
  return (
    <>
      <PageHero title="Store the permanent transcript library in your workspace." description="Fourth Canal creates one supported Transcript Library under a Notion page that you choose." />
      <section className={styles.section}>
        <div className={styles.split}>
          <div>
            <SectionHeading title="Disconnect without deleting records." description="Canceling, disconnecting Notion, or removing the Mac app does not delete transcript files or readable text already stored in your workspace." />
            <Notice warning>Public Notion OAuth is disabled during the private beta. Account screens show only synthetic connection state.</Notice>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Database field</th><th>Purpose</th></tr></thead>
              <tbody>
                {[
                  ["Original attachment", "Preserves the provider-supplied VTT or imported file"],
                  ["Readable text", "Stores searchable timestamped transcript text"],
                  ["Recorded at and type", "Describes the recording without modifying the original"],
                  ["Verification hash", "Identifies the exact uploaded file"],
                  ["Status and error", "Reports recoverable processing state"],
                  ["Automation identity", "Links by stable ID or normalized provider URL"],
                ].map(([field, purpose]) => <tr key={field}><td>{field}</td><td>{purpose}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className={styles.sectionAlt}>
        <div>
          <SectionHeading title="Export, disconnect, and delete" />
          <FeatureGrid items={[
            { title: "Export from Notion", text: "Use Notion export tools for the database and readable transcript content." },
            { title: "Disconnect", text: "Revoke the connection without removing existing records." },
            { title: "Delete a transcript", text: "Delete records inside Notion. Account deletion does not remove them." },
          ]} />
        </div>
      </section>
      <CtaBand title="Notion remains the source of truth." description="Fourth Canal supports one database schema and leaves ordinary export and deletion controls with the customer." />
    </>
  );
}

export function CompatibilityPage() {
  return (
    <>
      <PageHero title="Supported platforms and file types." description="The first release covers only combinations that Fourth Canal can test and maintain." actions={false} />
      <section className={styles.section}>
        <div className={styles.split}>
          <div><SectionHeading title="Supported in the planned release" /><CheckList items={supported} /></div>
          <div><SectionHeading title="Not supported" /><CheckList items={unsupported} negative /></div>
        </div>
        <Notice warning>Provider support does not guarantee that a particular recording includes captions or source media. Provider and institutional policy control availability.</Notice>
      </section>
      <CtaBand title="Setup not listed?" description="Request beta access for compatibility updates. Unsupported capture will remain disabled." />
    </>
  );
}

export function SecurityPage() {
  const boundaries = [
    ["Signed-in Chrome", "Provider session, supported page context, settings, and capture job state", "Cookies and credentials are not exported"],
    ["Customer Mac", "Temporary staging, verification, recovery files, logs, and Keychain credentials", "Files remain on the device until the customer sends them elsewhere"],
    ["Customer Notion", "Transcript attachment, readable text, metadata, status, and verification hash", "The workspace is controlled by the customer"],
    ["Fourth Canal account", "Email, plan, device activation, software versions, and setup completion", "No transcript, recording, course, filename, or Notion content"],
  ] as const;
  return (
    <>
      <PageHero title="What each part of Fourth Canal can access." description="Transcript content stays out of Fourth Canal account systems. The table below identifies where each class of data is handled." actions={false} />
      <section className={styles.section}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Component</th><th>Handles</th><th>Limit</th></tr></thead>
            <tbody>{boundaries.map(([component, handles, limit]) => <tr key={component}><td>{component}</td><td>{handles}</td><td>{limit}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <div>
            <SectionHeading title="Account data limits" description="The account may store only commercial and coarse setup state." />
            <Link href="/security/report" className={styles.buttonSecondary}>Report a security issue</Link>
          </div>
          <CheckList negative items={[
            "Transcript text or captured media",
            "Browser cookies or provider credentials",
            "Recording URLs, titles, course names, or filenames",
            "Notion page content, identifiers, or access tokens",
            "Transcript or browser-session data in license checks",
          ]} />
        </div>
      </section>
      <section className={styles.section}>
        <SectionHeading title="Public-site analytics" description="Only aggregate measurement may be enabled after review." />
        <div className={styles.split}>
          <CheckList items={["Normalized public page", "Referrer domain", "Coarse region and device category", "Named button events after review"]} />
          <CheckList negative items={["Advertising pixels", "Cross-site identifiers", "Session replay", "Form-content capture", "Analytics in the extension, Mac app, or account pages"]} />
        </div>
      </section>
      <CtaBand title="Collect less account data." description="Fourth Canal does not need transcript contents, recording details, or browser credentials to manage a subscription." />
    </>
  );
}

export function DownloadPage() {
  return (
    <>
      <PageHero title="Private beta installation access." description="Approved testers receive installation instructions separately. This page does not expose executable downloads." actions={false} status="Private beta prototype. Public downloads are disabled." />
      <section className={styles.section}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Software</th><th>Version</th><th>Requirement</th><th>Access</th></tr></thead>
            <tbody>
              <tr><td>Fourth Canal VisiLearn</td><td>Private beta 1.6.0</td><td>Chrome 116 or newer</td><td><BetaButton label="Request access" secondary /></td></tr>
              <tr><td>Fourth Canal Transcript</td><td>Private beta 1.1.0</td><td>Apple silicon and macOS 13 or newer</td><td><BetaButton label="Request access" secondary /></td></tr>
            </tbody>
          </table>
        </div>
        <Notice>These controls do not start a download, checkout, activation, or external connection.</Notice>
      </section>
      <section className={styles.sectionAlt}>
        <div>
          <SectionHeading title="Planned setup order" />
          <CheckList items={[
            "Install VisiLearn from the Chrome Web Store",
            "Open a Fourth Canal account through an email magic link",
            "Install the signed and notarized Mac package",
            "Confirm macOS, processor, Downloads access, and the Chrome connection",
            "Connect Notion and create a supported Transcript Library",
            "Run the bundled sample VTT",
            "Test one recording that you are authorized to open",
          ]} />
        </div>
      </section>
      <CtaBand title="Downloads remain disabled until release checks pass." description="Distribution requires signed packages, legal review, isolation testing, and an external beta." />
    </>
  );
}

const pricingPlans = [
  ["VisiLearn Free", "$0", "Chrome extension; manual VTT/TXT capture; supported source media; passive captions; local settings"],
  ["Fourth Canal Complete", "$5 monthly or $48 yearly", "Mac scheduling and verification; one Notion workspace; two Mac activations; updates and support"],
  ["Education and Teams", "Private pilot", "Guided onboarding and organizational evaluation; no self-service team administration"],
] as const;

export function PricingPage() {
  return (
    <>
      <PageHero title="Planned pricing." description="Private beta testing is free. Public checkout and billing remain disabled until the commercial release checks pass." actions={false} status="Private beta prototype. No payment can be made on this site." />
      <section className={styles.section}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Plan</th><th>Price</th><th>Includes</th><th>Beta access</th></tr></thead>
            <tbody>{pricingPlans.map(([plan, price, includes]) => <tr key={plan}><td>{plan}</td><td>{price}</td><td>{includes}</td><td><BetaButton label={plan === "Education and Teams" ? "Contact about pilot" : "Request access"} secondary /></td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <SectionHeading title="Subscription rules" description="Ongoing browser and provider changes require maintained software. A lifetime license is not planned." />
          <CheckList items={[
            "The first annual charge has a planned 14-day refund window",
            "Cancellation takes effect at the end of the paid period",
            "Expiration pauses automatic Mac workflows without deleting customer files",
            "VisiLearn Free remains available after Complete expires",
            "Teams remain a controlled pilot until administration and permissions are tested",
          ]} />
        </div>
      </section>
      <CtaBand title="The private beta is free." description="Billing begins only after public distribution, legal review, external testing, and account-operation checks are complete." />
    </>
  );
}

export function ChangelogPage() {
  const entries = [
    ["1.6.0 / 1.1.0", "Current private beta", ["Restored the exact-session media bundle lifecycle", "Added file verification and recovery states", "Kept separate audio and video originals", "Kept public distribution disabled"]],
    ["Commercial foundation", "Website milestone", ["Defined the Chrome, Mac, and Notion product roles", "Added pricing, compatibility, account, support, security, and legal prototypes", "Added release-contract and private-data checks"]],
  ] as const;
  return (
    <>
      <PageHero title="Private beta changes." description="These entries describe verified product and website work. They do not claim public distribution or completed live acceptance." actions={false} />
      <section className={styles.narrowSection}>
        {entries.map(([version, label, items]) => (
          <article key={version} className={styles.panel}>
            <p className={styles.statusLine}>{label}</p>
            <h2>{version}</h2>
            <CheckList items={[...items]} />
          </article>
        ))}
        <Notice warning>One authorized Echo capture and repeat remains a product acceptance check. Chrome Web Store distribution, signed and notarized Mac installation, billing, and public Notion OAuth are not live.</Notice>
      </section>
    </>
  );
}

export function SupportIntro() {
  return (
    <>
      <PageHero title="Support by task." description="Start with setup and recovery documentation. If that does not resolve the issue, send only the diagnostic information required for the case." actions={false} />
      <section className={styles.section}>
        <SectionHeading title="Documentation topics" />
        <FeatureGrid items={[
          { title: "Install and connect", text: "VisiLearn, the Mac app, Downloads access, local connection, and the sample VTT." },
          { title: "Capture a recording", text: "Echo360 and Zoom capture, scheduled work, and manual VTT/TXT import." },
          { title: "Repair a connection", text: "Extension detection, Chrome sign-in, worker status, Notion authorization, and schema changes." },
          { title: "Recover a file", text: "Unavailable transcripts, ambiguous sessions, retained staging files, duplicate protection, and failed read-back." },
        ]} />
      </section>
      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <SectionHeading title="Support order" description="Send private files or use screen sharing only after separate consent." />
          <CheckList items={["Search the task documentation", "Copy safe diagnostics from the Mac app", "Send an email or support ticket", "Attach a file or log only after approval", "Use screen sharing only after separate consent"]} />
        </div>
      </section>
    </>
  );
}
