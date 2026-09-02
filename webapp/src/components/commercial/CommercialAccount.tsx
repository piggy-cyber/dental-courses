"use client";

import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  Download,
  HelpCircle,
  KeyRound,
  Laptop,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { BrandMarkPublic } from "@/components/BrandMark";
import { BetaButton } from "@/components/commercial/BetaDialog";
import styles from "./CommercialSite.module.css";

export type AccountView = "dashboard" | "setup" | "downloads" | "devices" | "billing" | "support";

const nav = [
  ["dashboard", "Dashboard", "/account", LayoutDashboard],
  ["setup", "Setup", "/account/setup", ListChecks],
  ["downloads", "Downloads", "/account/downloads", Download],
  ["devices", "Devices", "/account/devices", Laptop],
  ["billing", "Billing", "/account/billing", CreditCard],
  ["support", "Support", "/account/support", HelpCircle],
] as const;

export function CommercialAccount({ view }: { view: AccountView }) {
  return (
    <div className={styles.site}>
      <div className={styles.accountShell}>
        <header className={styles.accountHeader}>
          <div className={styles.accountHeaderInner}>
            <BrandMarkPublic />
            <span className={styles.prototypeBadge}>Prototype account</span>
            <Link href="/" className={styles.buttonSecondary}>Public site</Link>
          </div>
        </header>
        <div className={styles.accountLayout}>
          <nav className={styles.accountNav} aria-label="Account preview">
            {nav.map(([id, label, href, Icon]) => <Link key={id} href={href} aria-current={view === id ? "page" : undefined}><Icon aria-hidden="true" />{label}</Link>)}
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
      <span className={styles.prototypeBadge}>Private beta prototype</span>
      <h1>{title}</h1>
      <p>{description}</p>
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
      <ViewHeader title="Account dashboard" description="A synthetic preview of subscription, device, software, and setup state. No authenticated account or customer transcript library is connected." />
      <div className={styles.metricGrid}>
        <Metric label="Plan" value="Complete beta" note="Free during private beta" icon={BadgeCheck} />
        <Metric label="Active devices" value="1 of 2" note="Synthetic activation" icon={Laptop} />
        <Metric label="Setup" value="5 of 7" note="Prototype progress" icon={ClipboardCheck} />
      </div>
      <section className={styles.panel}>
        <h2>Software and setup status</h2>
        <div className={styles.cardGrid}>
          <div className={styles.notice}><CheckCircle2 aria-hidden="true" /><span>VisiLearn 1.6.0 · local connection ready</span></div>
          <div className={styles.notice}><CheckCircle2 aria-hidden="true" /><span>Fourth Canal Transcript 1.1.0 · worker ready</span></div>
          <div className={styles.notice}><CheckCircle2 aria-hidden="true" /><span>Notion · connected state only</span></div>
          <div className={styles.notice}><KeyRound aria-hidden="true" /><span>License · synthetic private-beta entitlement</span></div>
        </div>
      </section>
      <section className={styles.panel}>
        <h2>Account controls</h2>
        <p>A future export will contain Fourth Canal account and activation data only. It will not read transcript titles, records, or Notion database contents.</p>
        <div className={styles.heroActions}>
          <button className={styles.buttonSecondary} type="button" disabled>Export account data disabled</button>
          <button className={styles.buttonDanger} type="button" disabled>Delete account disabled</button>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Laptop }) {
  return <article className={styles.metricCard}><Icon size={17} aria-hidden="true" /><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

const setupItems = [
  "Install VisiLearn from the Chrome Web Store",
  "Open the Fourth Canal account through an email magic link",
  "Install the signed and notarized Mac package",
  "Confirm processor, macOS, and Downloads access",
  "Activate this Mac and confirm the local Chrome connection",
  "Connect Notion and create a fresh Transcript Library",
  "Validate with the bundled sample VTT before a real recording",
];

function SetupView() {
  const [checked, setChecked] = useState([true, true, true, true, true, false, false]);
  const complete = checked.filter(Boolean).length;
  return (
    <>
      <ViewHeader title="Setup checklist" description="Test onboarding states locally. This prototype does not install software, activate a device, connect Notion, or send account data." />
      <section className={styles.panel}>
        <h2>Prototype progress: {complete} of {setupItems.length}</h2>
        <progress value={complete} max={setupItems.length} aria-label={`${complete} of ${setupItems.length} setup steps complete`} />
        <div className={styles.setupList}>
          {setupItems.map((item, index) => (
            <label className={styles.setupItem} key={item}>
              <input type="checkbox" checked={checked[index]} onChange={(event) => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))} />
              <span>{item}<small>This changes only the local prototype display.</small></span>
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
      <ViewHeader title="Downloads" description="Approved testers receive private installation instructions separately. Public executable downloads remain disabled." />
      <div className={styles.cardGrid}>
        <DownloadCard name="Fourth Canal VisiLearn" version="Private beta 1.6.0" requirement="Chrome 116+" />
        <DownloadCard name="Fourth Canal Transcript" version="Private beta 1.1.0" requirement="Apple-silicon · macOS 13+" />
      </div>
    </>
  );
}

function DownloadCard({ name, version, requirement }: { name: string; version: string; requirement: string }) {
  return (
    <article className={styles.card}>
      <Download aria-hidden="true" />
      <h3>{name}</h3>
      <p>{version}</p>
      <p>{requirement}</p>
      <BetaButton label="Request private access" secondary />
    </article>
  );
}

function DevicesView() {
  const [active, setActive] = useState(true);
  const [name, setName] = useState("Demo Mac");
  return (
    <>
      <ViewHeader title="Device activations" description="Test reversible, in-memory rename and revoke states. No real Mac identifier, serial number, or license record is read or changed." />
      <section className={styles.panel}>
        <h2>Active devices ({active ? 1 : 0}/2)</h2>
        {active ? (
          <div className={styles.deviceRow}>
            <div><strong>{name}</strong><small>Apple silicon · synthetic activation · online</small></div>
            <div className={styles.heroActions}>
              <button className={styles.buttonSecondary} type="button" onClick={() => setName((current) => current === "Demo Mac" ? "Study Mac" : "Demo Mac")}>Rename demo</button>
              <button className={styles.buttonDanger} type="button" onClick={() => setActive(false)}><Trash2 size={16} aria-hidden="true" />Revoke demo</button>
            </div>
          </div>
        ) : (
          <div className={styles.notice}><Laptop aria-hidden="true" /><span>No demo devices are active. <button className={styles.buttonSecondary} type="button" onClick={() => setActive(true)}><RefreshCw size={16} aria-hidden="true" />Restore demo device</button></span></div>
        )}
      </section>
    </>
  );
}

function BillingView() {
  return (
    <>
      <ViewHeader title="Billing and plan" description="A nonfunctional preview of subscription, renewal, and expiration states. Checkout, the hosted billing portal, and account deletion remain disabled." />
      <section className={styles.panel}>
        <span className={styles.miniLabel}>Active prototype</span>
        <h2>Fourth Canal Complete beta</h2>
        <p>$0 during approved private-beta testing. Planned public pricing is $5 monthly or $48 annually after a 14-day no-card trial.</p>
        <button className={styles.buttonSecondary} type="button" disabled>Hosted billing portal disabled</button>
      </section>
      <section className={styles.panel}>
        <h2>Planned license behavior</h2>
        <p>Daily online validation, a 30-day offline grace period, two personal Mac activations, and cancellation at the end of the paid term. Expiration pauses automatic Mac workflows without deleting Notion records or local recovery files.</p>
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
      <ViewHeader title="Support and safe diagnostics" description="Copy coarse software and connection state without exposing tokens, browser cookies, transcripts, recording URLs, titles, course names, filenames, Notion identifiers, or local paths." />
      <div className={styles.supportGrid}>
        <section className={styles.panel}>
          <h2>Support sequence</h2>
          <ol className={styles.checkList}>
            {[
              "Search the task-based documentation",
              "Copy safe diagnostics",
              "Send an email or support ticket",
              "Attach a file or log only after explicit approval",
              "Use screen sharing only with separate consent",
            ].map((item) => <li key={item}>{item}</li>)}
          </ol>
          <p>Standard response target: within two business days. No emergency or deadline guarantee is offered.</p>
          <Link href="/support" className={styles.button}>Open support form</Link>
        </section>
        <section className={styles.panel}>
          <h2>Safe diagnostics</h2>
          <pre className={styles.codeBlock}>{diagnostics.join("\n")}</pre>
          <button className={styles.buttonSecondary} type="button" onClick={async () => {
            await navigator.clipboard.writeText(diagnostics.join("\n"));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}>{copied ? <CheckCircle2 size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{copied ? "Copied locally" : "Copy safe diagnostics"}</button>
        </section>
      </div>
    </>
  );
}
