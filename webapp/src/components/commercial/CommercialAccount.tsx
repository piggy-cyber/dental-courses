"use client";

import Link from "next/link";
import { useState } from "react";
import { BetaButton } from "@/components/commercial/BetaDialog";
import { BrandMarkPublic } from "@/components/BrandMark";
import styles from "./CommercialSite.module.css";

export type AccountView = "dashboard" | "setup" | "downloads" | "devices" | "billing" | "support";

const nav = [
  ["dashboard", "Dashboard", "/account"],
  ["setup", "Setup", "/account/setup"],
  ["downloads", "Downloads", "/account/downloads"],
  ["devices", "Devices", "/account/devices"],
  ["billing", "Billing", "/account/billing"],
  ["support", "Support", "/account/support"],
] as const;

export function CommercialAccount({ view }: { view: AccountView }) {
  return (
    <div className={styles.site}>
      <div className={styles.accountShell}>
        <header className={styles.accountHeader}>
          <div className={styles.accountHeaderInner}>
            <BrandMarkPublic />
            <span className={styles.statusLine}>Prototype account</span>
            <Link href="/" className={styles.buttonSecondary}>Public site</Link>
          </div>
        </header>
        <div className={styles.accountLayout}>
          <nav className={styles.accountNav} aria-label="Account prototype">
            {nav.map(([id, label, href]) => <Link key={id} href={href} aria-current={view === id ? "page" : undefined}>{label}</Link>)}
          </nav>
          <main className={styles.accountMain}><AccountViewContent view={view} /></main>
        </div>
      </div>
    </div>
  );
}

function ViewHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className={styles.viewHeader}>
      <h1>{title}</h1>
      <p>{description}</p>
      <p className={styles.statusLine}>Private beta prototype. No account or customer data is connected or saved.</p>
    </header>
  );
}

function AccountViewContent({ view }: { view: AccountView }) {
  if (view === "setup") return <SetupView />;
  if (view === "downloads") return <DownloadsView />;
  if (view === "devices") return <DevicesView />;
  if (view === "billing") return <BillingView />;
  if (view === "support") return <SupportView />;
  return <DashboardView />;
}

function DashboardView() {
  return (
    <>
      <ViewHeader title="Account dashboard" description="Synthetic subscription, device, software, and setup state for interface testing." />
      <div className={styles.metricGrid}>
        <Metric label="Plan" value="Complete beta" note="Free during private beta" />
        <Metric label="Active devices" value="1 of 2" note="Synthetic activation" />
        <Metric label="Setup" value="5 of 7" note="Prototype progress" />
      </div>
      <section className={styles.panel}>
        <h2>Software status</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Component</th><th>Version</th><th>State</th></tr></thead>
            <tbody>
              <tr><td>VisiLearn</td><td>1.6.0</td><td>Local connection ready</td></tr>
              <tr><td>Fourth Canal Transcript</td><td>1.1.0</td><td>Worker ready</td></tr>
              <tr><td>Notion</td><td>Prototype</td><td>Connected state only</td></tr>
              <tr><td>License</td><td>Private beta</td><td>Synthetic entitlement</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className={styles.panel}>
        <h2>Account controls</h2>
        <p>A future export will contain account and activation data only. It will not read transcript titles, records, or Notion content.</p>
        <div className={styles.heroActions}>
          <button className={styles.buttonSecondary} type="button" disabled>Export account data disabled</button>
          <button className={styles.buttonDanger} type="button" disabled>Delete account disabled</button>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className={styles.metricCard}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

const setupItems = [
  "Install VisiLearn from the Chrome Web Store",
  "Open the Fourth Canal account through an email magic link",
  "Install the signed and notarized Mac package",
  "Confirm processor, macOS, and Downloads access",
  "Activate this Mac and confirm the Chrome connection",
  "Connect Notion and create a new Transcript Library",
  "Run the bundled sample VTT before a real recording",
];

function SetupView() {
  const [checked, setChecked] = useState([true, true, true, true, true, false, false]);
  const complete = checked.filter(Boolean).length;
  return (
    <>
      <ViewHeader title="Setup checklist" description="Test setup states without installing software, activating a device, or connecting Notion." />
      <section className={styles.panel}>
        <h2>Progress: {complete} of {setupItems.length}</h2>
        <progress value={complete} max={setupItems.length} aria-label={`${complete} of ${setupItems.length} setup steps complete`} />
        <div className={styles.setupList}>
          {setupItems.map((item, index) => (
            <label className={styles.setupItem} key={item}>
              <input type="checkbox" checked={checked[index]} onChange={(event) => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))} />
              <span>{item}<small>This changes only the current prototype screen.</small></span>
            </label>
          ))}
        </div>
      </section>
    </>
  );
}

function DownloadsView() {
  return (
    <>
      <ViewHeader title="Downloads" description="Approved testers receive private installation instructions separately. Public executable downloads are disabled." />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Software</th><th>Version</th><th>Requirement</th><th>Access</th></tr></thead>
          <tbody>
            <DownloadRow name="Fourth Canal VisiLearn" version="Private beta 1.6.0" requirement="Chrome 116 or newer" />
            <DownloadRow name="Fourth Canal Transcript" version="Private beta 1.1.0" requirement="Apple silicon and macOS 13 or newer" />
          </tbody>
        </table>
      </div>
    </>
  );
}

function DownloadRow({ name, version, requirement }: { name: string; version: string; requirement: string }) {
  return <tr><td>{name}</td><td>{version}</td><td>{requirement}</td><td><BetaButton label="Request private access" secondary /></td></tr>;
}

function DevicesView() {
  const [active, setActive] = useState(true);
  const [name, setName] = useState("Demo Mac");
  return (
    <>
      <ViewHeader title="Device activations" description="Test reversible rename and revoke states without reading or changing a real device or license record." />
      <section className={styles.panel}>
        <h2>Active devices ({active ? 1 : 0}/2)</h2>
        {active ? (
          <div className={styles.deviceRow}>
            <div><strong>{name}</strong><small>Apple silicon · synthetic activation · online</small></div>
            <div className={styles.heroActions}>
              <button className={styles.buttonSecondary} type="button" onClick={() => setName((current) => current === "Demo Mac" ? "Study Mac" : "Demo Mac")}>Rename demo</button>
              <button className={styles.buttonDanger} type="button" onClick={() => setActive(false)}>Revoke demo</button>
            </div>
          </div>
        ) : (
          <div className={styles.notice}>No demo devices are active. <button className={styles.buttonSecondary} type="button" onClick={() => setActive(true)}>Restore demo device</button></div>
        )}
      </section>
    </>
  );
}

function BillingView() {
  return (
    <>
      <ViewHeader title="Billing and plan" description="Synthetic subscription, renewal, and expiration states. Checkout, the billing portal, and account deletion are disabled." />
      <section className={styles.panel}>
        <p className={styles.statusLine}>Active prototype</p>
        <h2>Fourth Canal Complete beta</h2>
        <p>$0 during approved private-beta testing. Planned public pricing is $5 monthly or $48 annually after a 14-day no-card trial.</p>
        <button className={styles.buttonSecondary} type="button" disabled>Hosted billing portal disabled</button>
      </section>
      <section className={styles.panel}>
        <h2>Planned license behavior</h2>
        <p>Daily online validation, a 30-day offline grace period, two personal Mac activations, and cancellation at the end of the paid term. Expiration pauses automatic Mac workflows without deleting Notion records or recovery files.</p>
      </section>
    </>
  );
}

const diagnostics = [
  "App: 1.1.0 private beta",
  "Extension: 1.6.0 private beta",
  "OS major: 14 (synthetic)",
  "Processor: Apple silicon",
  "Downloads permission: granted",
  "Chrome connection: healthy",
  "Notion connection: connected",
  "Last job: synthetic success at 09:42",
];

function SupportView() {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <ViewHeader title="Support and safe diagnostics" description="Copy software and connection state without tokens, cookies, transcripts, recording details, Notion identifiers, or device paths." />
      <div className={styles.supportGrid}>
        <section className={styles.panel}>
          <h2>Support order</h2>
          <ol className={styles.checkList}>
            {["Search the task documentation", "Copy safe diagnostics", "Send an email or support ticket", "Attach a file or log only after approval", "Use screen sharing only after separate consent"].map((item) => <li key={item}>{item}</li>)}
          </ol>
          <p>Standard response target: two business days. Emergency or deadline service is not offered.</p>
          <Link href="/support" className={styles.button}>Open support form</Link>
        </section>
        <section className={styles.panel}>
          <h2>Safe diagnostics</h2>
          <pre className={styles.codeBlock}>{diagnostics.join("\n")}</pre>
          <button className={styles.buttonSecondary} type="button" onClick={async () => {
            await navigator.clipboard.writeText(diagnostics.join("\n"));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}>{copied ? "Copied on this device" : "Copy safe diagnostics"}</button>
        </section>
      </div>
    </>
  );
}
