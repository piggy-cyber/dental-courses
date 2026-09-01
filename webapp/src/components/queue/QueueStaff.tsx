"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignInButton } from "@/components/SignInButton";
import type { QueueStaffAction, QueueStaffSnapshot } from "@/lib/queue-master";
import { QueueError, QueueFrame, QueueLoading } from "./QueueFrame";
import { useQueueSnapshot } from "./useQueueSnapshot";
import styles from "./queue.module.css";

export function QueueStaff({ slug }: { slug: string }) {
  const { snapshot, error, loading, refresh } = useQueueSnapshot<QueueStaffSnapshot>(slug, "staff");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(action: QueueStaffAction) {
    setBusy(true); setActionError(null);
    try {
      const response = await fetch(`/api/queue/r/${encodeURIComponent(slug)}/staff`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const payload = await response.json() as { message?: string; redirectTo?: string | null };
      if (!response.ok) throw new Error(payload.message || "That staff action could not be completed.");
      if (payload.redirectTo) { window.location.assign(payload.redirectTo); return; }
      await refresh(true);
    } catch (caught) { setActionError(caught instanceof Error ? caught.message : "That staff action could not be completed."); } finally { setBusy(false); }
  }

  useEffect(() => {
    if (!snapshot?.candidate?.id) return;
    const candidateId = snapshot.candidate.id;
    const heartbeat = () => fetch(`/api/queue/r/${encodeURIComponent(slug)}/staff`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "heartbeat", candidateId }) }).catch(() => undefined);
    void heartbeat();
    const interval = window.setInterval(() => void heartbeat(), 20_000);
    return () => window.clearInterval(interval);
  }, [slug, snapshot?.candidate?.id]);

  if (loading && !snapshot) return <QueueFrame slug={slug}><QueueLoading label="Opening staff join…" /></QueueFrame>;
  if (error && !snapshot) return <QueueFrame slug={slug}><section className={styles.panel}><div className={styles.signInBlock}><p>Sign in with Google, then explicitly join this lobby&apos;s staff pool.</p><SignInButton returnTo={`/queue/r/${slug}/staff`} /></div></section>{error.includes("Sign in") ? null : <QueueError message={error} />}</QueueFrame>;
  if (!snapshot) return null;
  if (snapshot.membership) return <QueueFrame slug={slug}><section className={styles.panel}><div className={styles.signInBlock}><p>You already have {snapshot.membership.role} access to {snapshot.lobby.name}.</p><Link className={styles.primaryButton} href={`/queue/r/${slug}/admin`}>Back to lobby controls</Link></div></section></QueueFrame>;
  const pending = snapshot.promotionRequests.find((request) => request.status === "pending");
  return <QueueFrame slug={slug}><section className={styles.lobbyHeading}><p className={styles.eyebrow}>Staff join</p><h1>{snapshot.lobby.name}</h1><p>Joining the pool shows your Google name and email to this lobby&apos;s owner. It does not make you an admin until you accept an in-app request.</p></section>{actionError || error ? <QueueError message={actionError || error || "Staff error"} /> : null}{!snapshot.candidate ? <section className={styles.panel}><div className={styles.signInBlock}><p>You are signed in. Join only if you intend to help guests in this lobby.</p><button className={styles.primaryButton} disabled={busy} onClick={() => void act({ type: "join" })}>{busy ? "Joining…" : "Join staff pool"}</button></div></section> : <section className={styles.panel}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Waiting for owner</p><h2>You are in the staff pool</h2></div><span>{snapshot.candidate.isOnline ? "Online" : "Offline"}</span></div>{pending ? <div className="p-5"><h3 className="text-xl font-bold">Admin request received</h3><p className="mt-2 text-sm text-slate-500">Accept to become an admin with Accepting guests off by default, or decline and stay in the staff pool.</p><div className={`${styles.actions} mt-4`}><button className={styles.primaryButton} disabled={busy} onClick={() => void act({ type: "accept", requestId: pending.id })}>Accept and open admin</button><button className={styles.secondaryButton} disabled={busy} onClick={() => void act({ type: "decline", requestId: pending.id })}>Decline</button></div></div> : <p className={styles.empty}>The owner can now see you. Keep this page open while waiting for a request.</p>}<div className="border-t border-slate-200 p-5"><button className={styles.secondaryButton} disabled={busy} onClick={() => { if (window.confirm("Leave this lobby's staff pool and cancel any pending request?")) void act({ type: "leave", candidateId: snapshot.candidate!.id }); }}>Leave staff pool</button></div></section>}</QueueFrame>;
}
