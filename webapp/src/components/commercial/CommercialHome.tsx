import Link from "next/link";
import { BetaButton } from "@/components/commercial/BetaDialog";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import styles from "./CommercialSite.module.css";

const workflow = [
  ["01", "Capture in Chrome", "VisiLearn saves transcript and source-media files from a supported recording page you are already authorized to open."],
  ["02", "Verify on your Mac", "Fourth Canal Transcript checks file type, exact-session identity, and SHA-256 before it removes a staging copy."],
  ["03", "Store in Notion", "The Mac app writes the original transcript, readable text, and verification details to a database in your workspace."],
] as const;

const jobs = [
  ["Weekly seminar", "Echo360", "Verified", "Notion"],
  ["Research meeting", "Zoom", "Uploading", "Notion"],
  ["Review session", "Manual VTT", "Needs review", "On this Mac"],
] as const;

const pricing = [
  ["VisiLearn Free", "$0", "Chrome capture, local VTT/TXT files, passive captions"],
  ["Fourth Canal Complete", "$5 monthly or $48 yearly", "Mac verification, scheduling, Notion delivery, two Mac activations"],
  ["Education and Teams", "Private pilot", "Guided evaluation; no self-service team plan"],
] as const;

const faq = [
  ["Does Fourth Canal bypass provider access controls?", "No. It works only with recordings you can already open in your signed-in Chrome session."],
  ["Does Chrome need to stay open?", "Yes. Scheduled browser capture requires Chrome to stay running, signed in, and connected to the Mac app."],
  ["Where are transcripts stored?", "Permanent transcript files and readable text stay in your Notion workspace. Fourth Canal account systems do not receive them."],
  ["Are audio and video always merged?", "No. If a provider supplies separate streams, Fourth Canal keeps them as separate original files."],
] as const;

export function CommercialHome() {
  return (
    <CommercialShell>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1>Save authorized recording transcripts to your own Notion workspace.</h1>
            <p className={styles.heroLead}>VisiLearn captures the files in Chrome. Fourth Canal Transcript verifies them on your Mac and sends them to a Notion database you control.</p>
            <div className={styles.heroActions}>
              <BetaButton label="Request beta access" />
              <Link href="/compatibility" className={styles.buttonSecondary}>Check compatibility</Link>
            </div>
            <p className={styles.compatibilityLine}>Private beta. Chrome 116 or newer, Apple silicon, macOS 13 or newer, and a customer-owned Notion workspace.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}><span className={styles.sectionNumber}>01.</span> Three programs, three jobs.</h2>
        </div>
        <ol className={styles.workflowList}>
          {workflow.map(([step, title, text]) => (
            <li key={step} className={styles.workflowItem}>
              <span>{step}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.sectionAlt}>
        <div>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}><span className={styles.sectionNumber}>02.</span> Every job has a state.</h2>
            <p className={styles.sectionLead}>This table uses synthetic names and contains no provider, school, account, or transcript data.</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}><span className={styles.sectionNumber}>03.</span> Plans are based on software access, not transcript volume.</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Plan</th><th>Price</th><th>Includes</th></tr></thead>
            <tbody>{pricing.map(([plan, price, includes]) => <tr key={plan}><td>{plan}</td><td>{price}</td><td>{includes}</td></tr>)}</tbody>
          </table>
        </div>
        <div className={styles.heroActions}>
          <Link href="/pricing" className={styles.textLink}>Read pricing details</Link>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.split}>
          <div>
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}><span className={styles.sectionNumber}>04.</span> Check requirements before installation.</h2>
              <p className={styles.sectionLead}>Public downloads, checkout, and Notion OAuth are disabled. The current beta is free and distributed only to approved testers.</p>
            </div>
            <div className={styles.heroActions}>
              <Link href="/compatibility" className={styles.buttonSecondary}>Compatibility</Link>
              <Link href="/security" className={styles.buttonSecondary}>Data handling</Link>
            </div>
          </div>
          <div>
            <h2 className={styles.sectionTitle}><span className={styles.sectionNumber}>05.</span> Common questions</h2>
            <div className={styles.faq}>{faq.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}</summary><p>{answer}</p></details>)}</div>
          </div>
        </div>
      </section>
    </CommercialShell>
  );
}

function ProductPreview() {
  return (
    <div className={styles.productPreview} aria-label="Synthetic Fourth Canal Transcript job table">
      <div className={styles.previewTop}>
        <div><strong>Fourth Canal Transcript</strong> <small>synthetic beta data</small></div>
        <span className={styles.statusReady}>WORKER READY</span>
      </div>
      <div className={styles.previewBody}>
        <table className={styles.previewTable}>
          <thead><tr><th>Job</th><th>Source</th><th>State</th><th>Destination</th></tr></thead>
          <tbody>{jobs.map(([job, source, state, destination]) => <tr key={job}><td>{job}</td><td>{source}</td><td>{state}</td><td>{destination}</td></tr>)}</tbody>
        </table>
        <div className={styles.previewFooter}>Demonstration only. No information is sent or saved.</div>
      </div>
    </div>
  );
}
