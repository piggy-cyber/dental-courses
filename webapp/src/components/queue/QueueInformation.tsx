import Link from "next/link";
import type { ReactNode } from "react";
import { SupportForm } from "@/components/SupportForm";
import { QueueSite } from "./QueueHome";

export function QueueInformationPage({ title, eyebrow, intro, children, signedIn = false }: { title: string; eyebrow: string; intro: string; children: ReactNode; signedIn?: boolean }) {
  return <QueueSite signedIn={signedIn}><main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-20"><p className="text-emerald-700 text-sm font-bold uppercase tracking-wider mb-3">{eyebrow}</p><h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{title}</h1><p className="text-lg text-slate-500 mb-12 max-w-3xl">{intro}</p><div className="space-y-10 text-slate-700 leading-7 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-emerald-700 [&_a]:underline">{children}</div></main></QueueSite>;
}

export function QueueAbout({ signedIn = false }: { signedIn?: boolean }) {
  return <QueueInformationPage signedIn={signedIn} eyebrow="About" title="A calmer way to manage a line" intro="QueueMaster is an independent Fourth Canal project for classrooms, labs, office hours, and other shared spaces.">
    <section><h2>What QueueMaster does</h2><p>Guests join from a QR code, keep working where they are, and see a bright green screen when it is their turn. Staff manage their own queue, while a shared display keeps the room informed.</p></section>
    <section><h2>Why it exists</h2><p>Names on a whiteboard are easy to miss and hard to manage fairly. QueueMaster gives owners, helpers, and guests one synchronized view without requiring guests to create an account.</p></section>
    <section><h2>Independent pilot</h2><p>QueueMaster is operated as an independent Fourth Canal project. It is not affiliated with or endorsed by any school or university, and it is not an emergency, medical, attendance, or protected-record system.</p></section>
  </QueueInformationPage>;
}

export function QueueInstructions({ signedIn = false }: { signedIn?: boolean }) {
  return <QueueInformationPage signedIn={signedIn} eyebrow="Instructions" title="Start in a few steps" intro="Use the guest QR for people waiting and the private staff QR for people who may help.">
    <section><h2>Owner</h2><ol><li><Link href="/queue/dashboard">Sign in and create a lobby.</Link></li><li>Share the guest QR. Share the staff QR only with potential helpers.</li><li>Approve staff requests, turn on Accepting guests, and open the display.</li></ol></section>
    <section><h2>Guest</h2><ol><li>Scan the guest QR and choose available staff.</li><li>Enter a first name and desk or car location.</li><li>Wait for the screen to turn green, then finish the session when done.</li></ol></section>
    <section><h2>Staff</h2><ol><li>Scan the staff QR and sign in with Google.</li><li>Join the staff pool and accept the owner&apos;s request.</li><li>Turn on Accepting guests, then call, help, and finish each guest.</li></ol></section>
    <section><h2>Good to know</h2><p>Staff become offline after 45 seconds without a heartbeat. Existing guests stay assigned until the owner moves them. Every lobby screen includes a clear return path.</p></section>
  </QueueInformationPage>;
}

export function QueuePrivacy({ signedIn = false }: { signedIn?: boolean }) {
  return <QueueInformationPage signedIn={signedIn} eyebrow="Legal" title="QueueMaster Privacy Policy" intro="Effective September 1, 2026. This policy covers QueueMaster on fourthcanal.com, including its lobby routes under /queue.">
    <section><h2>Information we collect</h2><p>Lobby owners, admins, and staff candidates sign in through Fourth Canal&apos;s Google authentication. QueueMaster uses the profile ID, Google account name, and email needed to identify lobby membership and staff-promotion requests. Guests provide only a first name and desk or car location.</p></section>
    <section><h2>Guest session</h2><p>QueueMaster stores a random HttpOnly, SameSite=Lax browser cookie for up to 30 days so a guest can resume an active lobby. The database stores only a SHA-256 hash of that token, never the token itself.</p></section>
    <section><h2>How information is used</h2><ul><li>Operate the queue, display approved public guest fields, and keep views synchronized.</li><li>Authorize lobby owners, admins, staff candidates, and individual guests.</li><li>Record minimal queue transition events for safety and troubleshooting.</li></ul></section>
    <section><h2>Realtime privacy</h2><p>Realtime events contain only the lobby ID and revision. They do not contain names, emails, locations, guest tokens, session IDs, or promotion-request IDs. Clients refetch the snapshot they are authorized to see.</p></section>
    <section><h2>Retention</h2><p>Abandoned active entries expire after 12 hours; completed, cancelled, and no-show entries after 24 hours; guest sessions after 30 days. Closed staff candidate and promotion-request records are retained for 30 days. Operational backups may persist for the provider&apos;s normal backup window.</p></section>
    <section><h2>Public site measurement</h2><p>Fourth Canal uses Vercel Web Analytics and Speed Insights on public QueueMaster information pages to understand basic traffic and performance. QueueMaster excludes dashboard, lobby, authentication, and API paths from this measurement and removes query strings before an event is sent. Participation analytics, individual queue reports, billing, and SMS are not implemented.</p></section>
    <section><h2>Support requests</h2><p>If you use the support form, QueueMaster receives the category, message, optional name, reply email when supplied, and page path. Cloudflare Turnstile helps prevent abuse. A keyed, non-reversible request fingerprint is used for hourly rate limiting; the form should not contain patient information, grades, passwords, or other sensitive records.</p></section>
    <section><h2>Service providers</h2><p>QueueMaster uses Fourth Canal&apos;s existing Google sign-in, Supabase authentication/database/realtime services, Vercel deployment and public measurement, and Cloudflare Turnstile on the support form. These providers process limited data needed to deliver their services.</p></section>
    <section><h2>Your choices</h2><p>You can use guest check-in without a Google account, leave a waiting queue, decline a staff request, and opt out of public analytics in this browser by setting the Fourth Canal analytics opt-out preference. Contact support for an access, correction, or deletion request where applicable.</p></section>
    <section><h2>Questions</h2><p>Use <Link href="/queue/support">QueueMaster Support</Link> for privacy questions. Do not submit medical, educational-record, or other sensitive information through lobby names or queue fields.</p></section>
  </QueueInformationPage>;
}

export function QueueTerms({ signedIn = false }: { signedIn?: boolean }) {
  return <QueueInformationPage signedIn={signedIn} eyebrow="Legal" title="QueueMaster Terms of Service" intro="Effective September 1, 2026. These pilot terms apply to use of QueueMaster under fourthcanal.com/queue.">
    <section><h2>Acceptance and pilot status</h2><p>By using QueueMaster, you agree to these terms. QueueMaster is a local pilot provided for evaluation and classroom workflow testing, without guaranteed availability or service levels.</p></section>
    <section><h2>Appropriate use</h2><p>Use QueueMaster only for lawful queue coordination. Do not enter protected health information, grades, confidential educational records, payment information, harassment, or misleading identity information.</p></section>
    <section><h2>Accounts and lobby responsibility</h2><p>Signed-in users are responsible for their Google account and for actions taken in lobbies they own or administer. Owners control staff promotion and must reassign active guests before removing an admin.</p></section>
    <section><h2>Guest and display information</h2><p>Guest first names and desk/car locations may appear on the public classroom display. Guests should use the minimum information needed to be found.</p></section>
    <section><h2>Unavailable features</h2><p>Pricing upgrades, payment processing, SMS notifications, and analytics exports are marked Coming soon and are not part of the pilot service.</p></section>
    <section><h2>Availability and changes</h2><p>Fourth Canal may change, pause, or end the pilot, remove abusive content, and adjust these terms as the product develops. Material changes will be reflected by a new effective date.</p></section>
    <section><h2>Disclaimer and limitation</h2><p>QueueMaster is provided as-is for workflow coordination. It is not an emergency, medical, attendance-compliance, or records-management system. To the extent permitted by law, Fourth Canal is not liable for indirect or consequential losses from use or unavailability of the pilot.</p></section>
    <section><h2>Questions</h2><p>For account, accessibility, privacy, copyright, security, or other concerns, use <Link href="/queue/support">QueueMaster Support</Link>.</p></section>
  </QueueInformationPage>;
}

export function QueueSupport({ signedIn = false }: { signedIn?: boolean }) {
  return <QueueInformationPage signedIn={signedIn} eyebrow="Support" title="Tell us what needs attention" intro="Use this form for QueueMaster access, accessibility, privacy, copyright, security, or site concerns.">
    <section><h2>Before you send</h2><p>Include the page and what happened. Do not include patient information, grades, passwords, or other sensitive records.</p></section>
    <div className="[&_.app-card]:max-w-none [&_.app-card]:rounded-2xl [&_.app-card]:border [&_.app-card]:border-slate-200 [&_.app-card]:bg-white [&_.app-card]:shadow-sm [&_.app-input]:rounded-xl [&_.app-input]:border-slate-300 [&_.portal-button-primary]:rounded-xl [&_.portal-button-primary]:bg-emerald-600 [&_.portal-button-primary]:text-white">
      <SupportForm />
    </div>
  </QueueInformationPage>;
}
