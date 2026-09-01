"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { SignInButton } from "@/components/SignInButton";
import type { QueueAdminPromotionRequest, QueueLobby } from "@/lib/queue-master";
import { QueueSite } from "./QueueHome";
import styles from "./queue.module.css";

export function QueueDashboard({ initialLobbies, guestLobby, promotionRequests, signedIn }: { initialLobbies: QueueLobby[]; guestLobby: QueueLobby | null; promotionRequests: QueueAdminPromotionRequest[]; signedIn: boolean }) {
  const [lobbies, setLobbies] = useState(initialLobbies);
  const [requests, setRequests] = useState(promotionRequests);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createLobby(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/queue", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const payload = await response.json() as { lobby?: QueueLobby; message?: string };
      if (!response.ok || !payload.lobby) throw new Error(payload.message || "Could not create the lobby.");
      setLobbies((current) => [payload.lobby!, ...current]);
      window.location.assign(`/queue/r/${payload.lobby.slug}/admin`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create the lobby."); } finally { setBusy(false); }
  }

  async function respond(request: QueueAdminPromotionRequest, action: "accept" | "decline") {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/queue/r/${request.lobbySlug}/staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: action, requestId: request.id }) });
      const payload = await response.json() as { message?: string; redirectTo?: string | null };
      if (!response.ok) throw new Error(payload.message || "Could not respond to the request.");
      setRequests((current) => current.filter((item) => item.id !== request.id));
      if (payload.redirectTo) window.location.assign(payload.redirectTo);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not respond to the request."); } finally { setBusy(false); }
  }

  return <QueueSite signedIn={signedIn}><main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20"><section className="max-w-3xl mb-10"><p className="text-emerald-700 text-sm font-bold mb-3">CLASSROOM DASHBOARD</p><h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Your classroom lobbies</h1><p className="text-lg text-slate-500">Create a live room, reopen a queue, or respond to an admin request.</p></section>{!signedIn ? <section className={styles.panel}><div className={styles.signInBlock}><p>Sign in with Google to create lobbies, join a staff pool, or accept an admin request.</p><SignInButton returnTo="/queue/dashboard" /></div></section> : <>{requests.length ? <section className={`${styles.panel} mb-6`}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Staff requests</p><h2>Admin promotion requests</h2></div><span>{requests.length}</span></div>{requests.map((request) => <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4" key={request.id}><div><strong>{request.lobbyName}</strong><p className="text-sm text-slate-500">The lobby owner asked you to become an admin.</p></div><div className={styles.actions}><button className={styles.primaryButton} disabled={busy} onClick={() => void respond(request, "accept")}>Accept</button><button className={styles.secondaryButton} disabled={busy} onClick={() => void respond(request, "decline")}>Decline</button></div></div>)}</section> : null}{guestLobby ? <Link className={styles.resumeCard} href={`/queue/r/${guestLobby.slug}/join`}><span>Resume guest lobby</span><strong>{guestLobby.name}</strong><small>Open your current queue status →</small></Link> : null}<section className={styles.panel}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Staff</p><h2>Your lobbies</h2></div><span>{lobbies.length}</span></div><form className={styles.createForm} onSubmit={createLobby}><label>Lobby name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Biology lab · Section A" required /></label><button className={styles.primaryButton} disabled={busy}>{busy ? "Creating…" : "Create lobby"}</button></form>{message ? <p className={styles.inlineError} role="alert">{message}</p> : null}<div className={styles.lobbyList}>{lobbies.map((lobby) => <article key={lobby.id}><div><strong>{lobby.name}</strong><small>/queue/r/{lobby.slug}</small></div><nav><Link href={`/queue/r/${lobby.slug}/admin`}>Admin</Link><Link href={`/queue/r/${lobby.slug}/display`}>Display</Link><Link href={`/queue/r/${lobby.slug}/join`}>Guest</Link><Link href={`/queue/r/${lobby.slug}/staff`}>Staff join</Link></nav></article>)}{!lobbies.length ? <p className={styles.empty}>No lobbies yet. Create the first one above.</p> : null}</div></section></>}</main></QueueSite>;
}
