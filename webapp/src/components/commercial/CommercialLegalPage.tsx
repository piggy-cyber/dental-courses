import { AlertTriangle } from "lucide-react";
import { CommercialShell } from "@/components/commercial/CommercialShell";
import { Notice, PageHero, styles } from "@/components/commercial/CommercialPrimitives";

const documents = {
  privacy: {
    title: "Privacy Policy",
    intro: "Draft coverage for the public site, account, VisiLearn extension, Mac app, Notion connection, support, and billing boundaries.",
    sections: [
      ["Data kept by Fourth Canal", "The planned account service may keep email, subscription status, device activation identifiers, software versions, processor family, operating-system major version, and coarse onboarding completion."],
      ["Data kept out of Fourth Canal servers", "Transcript text, captured media, browser cookies, provider URLs, recording titles, course names, filenames, Notion database content, private Notion identifiers, tokens, and bridge secrets are outside the account boundary."],
      ["Customer content", "Temporary staging and recovery files remain on the customer’s Mac. Permanent transcript attachments and readable text remain in the customer-owned Notion workspace."],
      ["Public-site analytics", "Public marketing and documentation pages may use aggregate, cookie-free measurement after privacy review. Advertising pixels, cross-site identifiers, session replay, form-content capture, authenticated account analytics, and app analytics are not allowed."],
      ["Deletion and disconnection", "Account deletion will revoke licensing and authorization data without silently deleting customer-owned Notion records or local recovery files."],
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: "Draft conditions for authorized use of the Fourth Canal service and software family.",
    sections: [
      ["Authorized use", "Customers must have permission to access and retain each recording and must follow provider, copyright, institutional, and course policies."],
      ["Restrictions", "Credential theft, access-control bypass, DRM circumvention, unauthorized capture, redistribution, and generic bulk scraping are prohibited."],
      ["Third-party availability", "EchoVideo, Zoom, Notion, Chrome, macOS, and institutional systems are independent services. Their changes can affect availability and compatibility."],
      ["Beta availability", "Private-beta services may change, pause, or be withdrawn while product acceptance, external testing, distribution, support, legal, and security work continues."],
    ],
  },
  eula: {
    title: "Mac Application EULA",
    intro: "Draft end-user license terms for Fourth Canal Transcript on supported Macs.",
    sections: [
      ["License grant", "A limited, revocable, non-transferable right to use the software on approved personal devices and only for authorized recordings."],
      ["Device scope", "The planned Fourth Canal Complete subscription supports two personal Mac activations with self-service rename and revocation controls."],
      ["Offline and expiration", "The planned entitlement validates daily when online and includes a 30-day offline grace period. Expiration pauses automatic Mac workflows without deleting customer content."],
      ["Ownership", "Fourth Canal retains its software rights. Customers retain their rights in content stored locally and in their own Notion workspace."],
    ],
  },
  billing: {
    title: "Subscription, Cancellation, and Refund Policy",
    intro: "Draft commercial terms for planned Fourth Canal subscriptions.",
    sections: [
      ["Private beta", "Approved private-beta testing remains free. Public checkout and the hosted billing portal are disabled."],
      ["Planned pricing", "VisiLearn Free is $0. Fourth Canal Complete is planned at $5 monthly or $48 annually with a 14-day no-card trial. Education and Teams remains a private pilot."],
      ["Cancellation", "Cancellation takes effect at the end of the paid period. Automatic Mac workflows pause after expiration, while the free extension and customer-owned content remain available."],
      ["Annual refund window", "The first annual charge is planned to include a 14-day refund window. Final terms remain subject to legal and release review."],
    ],
  },
  "acceptable-use": {
    title: "Acceptable Use Policy",
    intro: "Draft rules that keep capture within legitimate customer access and provider policy.",
    sections: [
      ["Allowed use", "Capture supported transcript and source-media files only from recording pages the customer is already authorized to open."],
      ["Prohibited use", "Do not steal credentials, bypass login or access controls, circumvent DRM, scrape generic websites, retain recordings without permission, or redistribute protected material."],
      ["Institutional responsibility", "Customers remain responsible for institutional, provider, course, copyright, privacy, and professional obligations that apply to each recording."],
      ["Enforcement", "Fourth Canal may suspend licensing or access when use creates security, legal, provider-policy, or customer-isolation risk."],
    ],
  },
  "third-party-services": {
    title: "Third-Party Services and Non-Affiliation",
    intro: "Draft disclosure of the independent platforms Fourth Canal may interoperate with.",
    sections: [
      ["Independent services", "EchoVideo/Echo360, Zoom, Notion, Google Chrome, Apple macOS, Stripe, and customer institutions are independently operated."],
      ["No endorsement", "Fourth Canal is not affiliated with, endorsed by, sponsored by, or representative of these providers or any educational institution."],
      ["Availability", "Provider changes, customer permissions, caption publication timing, institutional configuration, and outages can affect capture or organization."],
      ["Status reporting", "A future public status page will report only Fourth Canal-operated account, billing, authorization-broker, download, and update services—not the operating status of independent providers."],
    ],
  },
  "open-source": {
    title: "Open Source Notices",
    intro: "Draft disclosure for third-party software included in the site, extension, Mac app, and local worker.",
    sections: [
      ["Dependency inventory", "Fourth Canal will maintain an attributed dependency inventory and software bill of materials for public release packages."],
      ["License texts", "Complete license and attribution notices will ship with each applicable release and remain available through the account or documentation site."],
      ["No replacement", "This draft page does not replace the license files included with individual open-source packages."],
    ],
  },
} as const;

export type LegalKind = keyof typeof documents;

export function CommercialLegalPage({ kind }: { kind: LegalKind }) {
  const document = documents[kind];
  return (
    <CommercialShell>
      <PageHero eyebrow="Draft placeholder · legal review required" title={document.title} description={document.intro} actions={false} />
      <section className={styles.narrowSection}>
        <Notice warning><AlertTriangle aria-hidden="true" /><span>This is a product-boundary draft, not final legal advice or a production policy. Counsel approval is required before paid launch.</span></Notice>
        <div className={styles.legalBody}>
          {document.sections.map(([title, copy]) => <section key={title} className={styles.legalSection}><h2>{title}</h2><p>{copy}</p></section>)}
        </div>
      </section>
    </CommercialShell>
  );
}
