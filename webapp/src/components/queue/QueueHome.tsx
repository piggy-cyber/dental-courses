"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Code,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  Monitor,
  QrCode,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { QueueLobby } from "@/lib/queue-master";
import { createClient } from "@/lib/supabase/client";
import styles from "./queue.module.css";

type Page = "home" | "features" | "useCases" | "pricing" | "workspace";

export function QueueHome({
  initialLobbies,
  guestLobby,
  signedIn,
}: {
  initialLobbies: QueueLobby[];
  guestLobby: QueueLobby | null;
  signedIn: boolean;
}) {
  const [page, setPage] = useState<Page>("home");
  const [lobbies, setLobbies] = useState(initialLobbies);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function show(next: Page) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function signIn() {
    setAuthBusy(true);
    const form = new FormData();
    form.set("next", "/queue");
    const start = await fetch("/auth/start", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
    });
    if (!start.ok) {
      setAuthBusy(false);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      setAuthBusy(false);
      return;
    }
    window.location.assign(data.url);
  }

  function openWorkspace() {
    if (signedIn) show("workspace");
    else void signIn();
  }

  async function createLobby(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json() as { lobby?: QueueLobby; message?: string };
      if (!response.ok || !payload.lobby) throw new Error(payload.message || "Could not create the lobby.");
      setLobbies((current) => [payload.lobby!, ...current]);
      setName("");
      window.location.assign("/queue/r/" + payload.lobby.slug + "/admin");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not create the lobby.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header page={page} signedIn={signedIn} busy={authBusy} show={show} openWorkspace={openWorkspace} />
      {page === "home" && <Home onCreate={openWorkspace} busy={authBusy} />}
      {page === "features" && <Features />}
      {page === "useCases" && <UseCases />}
      {page === "pricing" && <Pricing onStart={openWorkspace} />}
      {page === "workspace" && (
        <Workspace
          lobbies={lobbies}
          guestLobby={guestLobby}
          name={name}
          busy={busy}
          message={message}
          setName={setName}
          createLobby={createLobby}
        />
      )}
      <Footer show={show} />
    </div>
  );
}

function Header({
  signedIn,
  busy,
  show,
  openWorkspace,
}: {
  page: Page;
  signedIn: boolean;
  busy: boolean;
  show: (page: Page) => void;
  openWorkspace: () => void;
}) {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <button type="button" onClick={() => show("home")} className="flex items-center gap-2 text-emerald-600 font-bold text-xl tracking-tight">
            <GraduationCap size={28} /><span>QueueMaster</span>
          </button>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button type="button" onClick={() => show("features")} className="hover:text-slate-900 transition-colors">Features</button>
            <button type="button" onClick={() => show("useCases")} className="hover:text-slate-900 transition-colors">Use Cases</button>
            <button type="button" onClick={() => show("pricing")} className="hover:text-slate-900 transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={openWorkspace} disabled={busy} className="text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors hidden sm:block disabled:opacity-60">
              {signedIn ? "Dashboard" : "Log In"}
            </button>
            <button type="button" onClick={openWorkspace} disabled={busy} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-60">
              {busy ? "Opening Google…" : signedIn ? "Create a Lobby" : "Sign Up Free"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Home({ onCreate, busy }: { onCreate: () => void; busy: boolean }) {
  const cards = [
    { title: "Instant Check-in", text: "Students scan a QR code on your Smartboard to enter the queue. No app required.", icon: <QrCode size={32} />, color: "bg-blue-100 text-blue-600" },
    { title: "Smartboard Display", text: "Cast the live queue to your projector. It turns green when you call the next student.", icon: <Monitor size={32} />, color: "bg-emerald-100 text-emerald-600" },
    { title: "Auto-Analytics", text: "Automatically track who asks questions and export data for participation grades.", icon: <BarChart3 size={32} />, color: "bg-purple-100 text-purple-600" },
  ];
  return (
    <main>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold mb-6">
          <Zap size={16} /> Now with Participation Analytics
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">Stop writing names <br />on the whiteboard.</h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          The quiet, fair, and organized way to manage student questions, office hours, and hackathon mentorship. Let students stay at their desks while they wait.
        </p>
        <div className="flex justify-center">
          <button type="button" onClick={onCreate} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-emerald-200 disabled:opacity-60">
            Create a Classroom Lobby <ArrowRight size={20} />
          </button>
        </div>
      </section>
      <section className="bg-white py-20 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-12 text-center">
          {cards.map((card) => (
            <article key={card.title}>
              <div className={"w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 " + card.color}>{card.icon}</div>
              <h3 className="text-xl font-bold mb-3">{card.title}</h3>
              <p className="text-slate-500">{card.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Features() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <PageHeading title="Features Built for Educators">Everything you need to run a smooth classroom or lab.</PageHeading>
      <div className="space-y-16">
        <Feature icon={<BarChart3 size={80} className="text-slate-300" />} title="Participation Analytics (CSV Export)">
          Stop guessing who is participating. QueueMaster logs every interaction, timestamp, and duration. At the end of the week, export a CSV to effortlessly calculate participation or lab grades.
        </Feature>
        <Feature reverse icon={<MessageSquare size={80} className="text-slate-300" />} title="Silent SMS Notifications">
          Running office hours in a noisy cafe or a large library? Students can optionally provide their phone number to receive a text when they are next in line, so they don&apos;t have to stare at their screens.
        </Feature>
      </div>
    </main>
  );
}

function Feature({ reverse = false, icon, title, children }: { reverse?: boolean; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className={"flex flex-col items-center gap-12 " + (reverse ? "md:flex-row-reverse" : "md:flex-row")}>
      <div className="flex-1 w-full bg-slate-100 rounded-3xl p-8 aspect-video flex items-center justify-center border border-slate-200">{icon}</div>
      <div className="flex-1 space-y-4"><h2 className="text-3xl font-bold text-slate-900">{title}</h2><p className="text-slate-500 text-lg">{children}</p></div>
    </section>
  );
}

function UseCases() {
  const cases = [
    { title: "University Office Hours", text: "Manage large crowds of students before finals. TAs can easily pull from the same queue, and students can wait in the hallway until their number is called.", icon: <HelpCircle size={40} className="text-blue-500 mb-4" /> },
    { title: "Hackathons", text: "With 500 hackers and only 10 mentors, organizing help is chaotic. Mentors walk around the venue and claim tickets right from their phones.", icon: <Code size={40} className="text-emerald-500 mb-4" /> },
    { title: "Active Classrooms & Labs", text: "Keep students focused on their lab work instead of holding their hands up for 15 minutes. They submit a ticket with their desk number and keep working.", icon: <Users size={40} className="text-purple-500 mb-4" /> },
  ];
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <PageHeading title="Who uses QueueMaster?">Tailored for dynamic, active learning environments.</PageHeading>
      <div className="grid md:grid-cols-3 gap-8">
        {cases.map((item) => (
          <article key={item.title} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            {item.icon}<h3 className="text-2xl font-bold mb-3">{item.title}</h3><p className="text-slate-600">{item.text}</p>
          </article>
        ))}
      </div>
    </main>
  );
}

function PageHeading({ title, children }: { title: string; children: ReactNode }) {
  return <div className="text-center mb-16"><h1 className="text-4xl font-extrabold text-slate-900 mb-4">{title}</h1><p className="text-xl text-slate-500">{children}</p></div>;
}

function Pricing({ onStart }: { onStart: () => void }) {
  const free = ["1 Active Lobby at a time", "Max 50 guests per day", "Big Screen Display view", "Standard QR Code generation"];
  const pro = ["Unlimited Active Lobbies", "Unlimited guests", "CSV Analytics & Attendance Exports", "Custom Room URLs (e.g., /r/cs101)", "Add unlimited TAs / Co-Admins"];
  return (
    <main className="bg-slate-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeading title="Simple, Teacher-Friendly Pricing">Start for free. Upgrade for analytics.</PageHeading>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PriceCard name="Basic Queue" price="$0" suffix="/forever" items={free} action="Start Free" onStart={onStart} />
          <PriceCard dark name="Teacher Pro" price="$7.99" suffix="/month" items={pro} action="Upgrade to Pro" onStart={onStart} />
        </div>
      </div>
    </main>
  );
}

function PriceCard({ dark = false, name, price, suffix, items, action, onStart }: { dark?: boolean; name: string; price: string; suffix: string; items: string[]; action: string; onStart: () => void }) {
  return (
    <section className={dark ? "bg-slate-900 p-8 rounded-3xl shadow-xl flex flex-col relative transform md:-translate-y-4 border-2 border-emerald-500" : "bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col"}>
      {dark && <div className="absolute top-0 right-8 -translate-y-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold tracking-wide">MOST POPULAR</div>}
      <h2 className={"text-2xl font-bold " + (dark ? "text-white" : "text-slate-900")}>{name}</h2>
      <div className="mt-4 mb-8"><span className={"text-5xl font-black " + (dark ? "text-white" : "")}>{price}</span><span className={dark ? "text-slate-400" : "text-slate-500"}>{suffix}</span></div>
      <ul className="space-y-4 mb-8 flex-grow">
        {items.map((item) => <li key={item} className={"flex items-center gap-3 " + (dark ? "text-slate-300" : "text-slate-600")}><Check size={20} className={dark ? "text-emerald-400" : "text-emerald-500"} />{item}</li>)}
      </ul>
      <button type="button" onClick={onStart} className={dark ? "w-full py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20" : "w-full py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"}>{action}</button>
    </section>
  );
}

function Workspace({
  lobbies,
  guestLobby,
  name,
  busy,
  message,
  setName,
  createLobby,
}: {
  lobbies: QueueLobby[];
  guestLobby: QueueLobby | null;
  name: string;
  busy: boolean;
  message: string | null;
  setName: (name: string) => void;
  createLobby: (event: FormEvent) => void;
}) {
  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
      <section className="max-w-3xl mb-10">
        <p className="text-emerald-700 text-sm font-bold mb-3">CLASSROOM DASHBOARD</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">Your classroom lobbies</h1>
        <p className="text-lg text-slate-500">Create a live room, reopen a queue, or share a display with the class.</p>
      </section>
      {guestLobby && (
        <Link className={styles.resumeCard} href={"/queue/r/" + guestLobby.slug + "/join"}>
          <span>Resume guest lobby</span><strong>{guestLobby.name}</strong><small>Open your current queue status →</small>
        </Link>
      )}
      <section className={styles.panel}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Staff</p><h2>Your lobbies</h2></div><span>{lobbies.length}</span></div>
        <form className={styles.createForm} onSubmit={createLobby}>
          <label>Lobby name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Biology lab · Section A" required /></label>
          <button className={styles.primaryButton} disabled={busy}>{busy ? "Creating…" : "Create lobby"}</button>
        </form>
        {message && <p className={styles.inlineError}>{message}</p>}
        <div className={styles.lobbyList}>
          {lobbies.map((lobby) => (
            <article key={lobby.id}>
              <div><strong>{lobby.name}</strong><small>/queue/r/{lobby.slug}</small></div>
              <nav><Link href={"/queue/r/" + lobby.slug + "/admin"}>Admin</Link><Link href={"/queue/r/" + lobby.slug + "/display"}>Display</Link><Link href={"/queue/r/" + lobby.slug + "/join"}>Join</Link></nav>
            </article>
          ))}
          {!lobbies.length && <p className={styles.empty}>No lobbies yet. Create the first one above.</p>}
        </div>
      </section>
    </main>
  );
}

function Footer({ show }: { show: (page: Page) => void }) {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight mb-4"><GraduationCap size={24} /><span>QueueMaster</span></div>
          <p className="text-sm max-w-xs mb-4">Stop writing names on the whiteboard. The easiest way to manage student questions and office hours.</p>
          <div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck size={16} /> Data encrypted and stored securely.</div>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><button type="button" onClick={() => show("features")} className="hover:text-white transition-colors">Features</button></li>
            <li><button type="button" onClick={() => show("pricing")} className="hover:text-white transition-colors">Pricing</button></li>
            <li><button type="button" onClick={() => show("useCases")} className="hover:text-white transition-colors">Use Cases</button></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Legal</h4>
          <ul className="space-y-2 text-sm"><li><Link href="/legal" className="hover:text-white transition-colors">Privacy Policy</Link></li><li><Link href="/legal" className="hover:text-white transition-colors">Terms of Service</Link></li></ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-sm text-center md:text-left">© {new Date().getFullYear()} QueueMaster Education. All rights reserved.</div>
    </footer>
  );
}
