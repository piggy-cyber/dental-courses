"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SignInButton } from "@/components/SignInButton";
import type { QueueAdminAction, QueueAdminSnapshot, QueueEntry } from "@/lib/queue-master";
import { QueueError, QueueFrame, QueueLoading } from "./QueueFrame";
import { QueueQrCard } from "./QueueQrCard";
import { sendQueueAction, useQueueSnapshot } from "./useQueueSnapshot";
import styles from "./queue.module.css";

export function QueueAdmin({ slug }: { slug: string }) {
  const { snapshot, error, loading, refresh } = useQueueSnapshot<QueueAdminSnapshot>(slug, "admin");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "https://fourthcanal.com",
  );
  useEffect(() => {
    if (!snapshot?.me.id) return;
    const heartbeat = async () => {
      try {
        await fetch(`/api/queue/r/${encodeURIComponent(slug)}/heartbeat`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
      } catch { /* snapshot polling surfaces connectivity errors */ }
    };
    void heartbeat();
    const interval = window.setInterval(() => void heartbeat(), 20_000);
    return () => window.clearInterval(interval);
  }, [slug, snapshot?.me.id]);

  async function act(action: QueueAdminAction, key: string = action.type) {
    setBusyKey(key);
    setActionError(null);
    try {
      await sendQueueAction(slug, "admin", action);
      await refresh(true);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "That action could not be completed.");
    } finally {
      setBusyKey(null);
    }
  }

  const waiting = useMemo(() => snapshot?.entries.filter((entry) => entry.status === "waiting") ?? [], [snapshot]);
  const active = useMemo(() => snapshot?.entries.find((entry) => entry.assignedMembershipId === snapshot.me.id && (entry.status === "called" || entry.status === "helping")) ?? null, [snapshot]);

  if (loading && !snapshot) return <QueueFrame wide slug={slug}><QueueLoading label="Opening staff dashboard…" /></QueueFrame>;
  if (error && !snapshot) return (
    <QueueFrame slug={slug}><QueueError message={error} /><div className={styles.signInBlock}><SignInButton returnTo={`/queue/r/${slug}/admin`} /></div></QueueFrame>
  );
  if (!snapshot) return null;
  const joinUrl = `${origin}/queue/r/${snapshot.lobby.slug}/join`;
  const staffUrl = `${origin}/queue/r/${snapshot.lobby.slug}/staff`;
  const pendingByCandidate = new Map(snapshot.promotionRequests.filter((request) => request.status === "pending").map((request) => [request.candidateId, request]));

  return (
    <QueueFrame wide slug={slug}>
      <section className={styles.adminHeader}>
        <div><p className={styles.eyebrow}>Staff dashboard</p><h1>{snapshot.lobby.name}</h1><p>Heartbeat active · updates every 20 seconds</p></div>
        <div className={styles.headerActions}>
          <Link href="/queue/dashboard">Back to lobby controls</Link>
          <button className={snapshot.me.acceptingGuests ? styles.acceptingButton : styles.secondaryButton} disabled={busyKey !== null} onClick={() => act({ type: "set_accepting", accepting: !snapshot.me.acceptingGuests })}>
            {snapshot.me.acceptingGuests ? "Accepting guests" : "Not accepting"}
          </button>
        </div>
      </section>

      {(actionError || error) && <QueueError message={actionError || error || "Queue error"} />}

      <QueueQrCard title="Guest QR code" description="Guests scan this code to choose an available admin and check in." url={joinUrl} testId="guest-qr" />

      <div className={styles.adminGrid}>
        <section className={`${styles.panel} ${active ? styles.activePanel : ""}`}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Your session</p><h2>{active ? active.guestFirstName : "No active guest"}</h2></div>{active && <span>{active.status}</span>}</div>
          {active ? (
            <>
              <p className={styles.activeLocation}>{active.location}</p>
              <div className={styles.actions}>
                {active.status === "called" && <button className={styles.primaryButton} disabled={busyKey !== null} onClick={() => act({ type: "start_helping", entryId: active.id }, active.id)}>Start helping</button>}
                <button className={styles.primaryButton} disabled={busyKey !== null} onClick={() => act({ type: "finish", entryId: active.id }, active.id)}>Finish session</button>
                {active.status === "called" && <button className={styles.secondaryButton} disabled={busyKey !== null} onClick={() => act({ type: "no_show", entryId: active.id }, active.id)}>No show</button>}
              </div>
            </>
          ) : <p className={styles.empty}>Call a waiting guest when you are ready.</p>}
        </section>

        {snapshot.me.role === "owner" ? <QueueQrCard title="Staff QR code" description="Only share this code with people who may join the signed-in staff pool." url={staffUrl} testId="staff-qr" /> : <section className={styles.panel}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Admin access</p><h2>Staff QR is owner-only</h2></div></div><p className={styles.empty}>Ask the lobby owner to share the staff join code with new candidates.</p></section>}
      </div>

      <section className={styles.panel}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Live line</p><h2>Waiting guests</h2></div><span>{waiting.length}</span></div>
        <div className={styles.queueTable}>
          {waiting.map((entry, index) => (
            <WaitingRow
              key={entry.id}
              entry={entry}
              index={index}
              entries={waiting}
              snapshot={snapshot}
              busy={busyKey !== null}
              onAction={act}
            />
          ))}
          {!waiting.length && <p className={styles.empty}>The waiting line is clear.</p>}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Presence</p><h2>Staff</h2></div><span>{snapshot.memberships.length}</span></div>
        <div className={styles.membershipGrid}>
          {snapshot.memberships.map((member) => {
            const assignedGuests = snapshot.entries.filter((entry) => entry.assignedMembershipId === member.id).length;
            const assignedWaiting = waiting.filter((entry) => entry.assignedMembershipId === member.id).length;
            return (
              <article key={member.id} className={!member.isOnline && assignedWaiting ? styles.offlineWarning : ""}>
                <i className={member.isOnline ? styles.onlineDot : styles.offlineDot} />
                <div><strong>{member.displayName}</strong><small>{member.role} · {member.isAvailable ? "available" : member.isOnline ? "not accepting" : "offline"}</small></div>
                <span>{assignedWaiting} waiting</span>
                {snapshot.me.role === "owner" && member.role !== "owner" && (
                  <button title={assignedGuests > 0 ? "Reassign all waiting, called, and helping guests before removal." : "Remove this admin from the lobby"} disabled={busyKey !== null || assignedGuests > 0} onClick={() => { if (window.confirm(`Remove ${member.displayName} from this lobby?`)) void act({ type: "remove_staff", membershipId: member.id }, member.id); }}>Remove</button>
                )}
                {!member.isOnline && assignedWaiting > 0 && <p>Offline with an existing queue. Reassign guests manually.</p>}
              </article>
            );
          })}
        </div>
      </section>

      {snapshot.me.role === "owner" && (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Owner tools</p><h2>Signed-in staff pool</h2></div><span>{snapshot.candidates.length}</span></div>
          <div className={styles.inviteList}>
            {snapshot.candidates.map((candidate) => {
              const pending = pendingByCandidate.get(candidate.id);
              return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4" key={candidate.id}><div><strong>{candidate.displayName}</strong><p className="text-xs text-slate-500">{candidate.email} · {candidate.isOnline ? "online" : "offline"}</p></div>{pending ? <button className={styles.secondaryButton} disabled={busyKey !== null} onClick={() => { if (window.confirm(`Cancel the admin request for ${candidate.displayName}?`)) void act({ type: "cancel_promotion", requestId: pending.id }, pending.id); }}>Cancel request</button> : <button className={styles.primaryButton} disabled={busyKey !== null || !candidate.isOnline} title={!candidate.isOnline ? "The candidate must be online to receive a new request." : "Send an in-app admin request"} onClick={() => void act({ type: "request_promotion", candidateId: candidate.id }, candidate.id)}>Request as admin</button>}</div>;
            })}
            {!snapshot.candidates.length && <p className={styles.empty}>No candidates are waiting. Share the staff QR above.</p>}
          </div>
        </section>
      )}
    </QueueFrame>
  );
}

function WaitingRow({ entry, index, entries, snapshot, busy, onAction }: {
  entry: QueueEntry;
  index: number;
  entries: QueueEntry[];
  snapshot: QueueAdminSnapshot;
  busy: boolean;
  onAction: (action: QueueAdminAction, key?: string) => Promise<void>;
}) {
  const canManage = snapshot.me.role === "owner" || snapshot.me.id === entry.assignedMembershipId;
  const previous = entries[index - 1];
  const next = entries[index + 1];
  return (
    <article>
      <b>{index + 1}</b>
      <div><strong>{entry.guestFirstName}</strong><small>{entry.location} · {entry.assignedStaffName}</small></div>
      <select aria-label={`Assign ${entry.guestFirstName}`} value={entry.assignedMembershipId} disabled={!canManage || busy} onChange={(event) => void onAction({ type: "reassign", entryId: entry.id, membershipId: event.target.value }, entry.id)}>
        {snapshot.memberships.map((member) => <option key={member.id} value={member.id}>{member.displayName}{member.isOnline ? "" : " (offline)"}</option>)}
      </select>
      <div className={styles.rowActions}>
        <button disabled={!canManage || busy || !previous} onClick={() => void onAction({ type: "reorder", entryId: entry.id, sortPosition: previous ? Math.max(1, previous.sortPosition - 1) : entry.sortPosition }, entry.id)}>↑</button>
        <button disabled={!canManage || busy || !next} onClick={() => void onAction({ type: "reorder", entryId: entry.id, sortPosition: next ? next.sortPosition + 1 : entry.sortPosition }, entry.id)}>↓</button>
        <button disabled={!canManage || busy} onClick={() => void onAction({ type: "call", entryId: entry.id }, entry.id)}>Call</button>
        <button disabled={!canManage || busy} onClick={() => { if (window.confirm(`Cancel ${entry.guestFirstName}'s queue entry?`)) void onAction({ type: "cancel", entryId: entry.id }, entry.id); }}>Cancel</button>
        <button disabled={!canManage || busy} onClick={() => { if (window.confirm(`Mark ${entry.guestFirstName} as no-show?`)) void onAction({ type: "no_show", entryId: entry.id }, entry.id); }}>No show</button>
      </div>
    </article>
  );
}
