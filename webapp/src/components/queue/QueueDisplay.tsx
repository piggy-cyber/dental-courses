"use client";

import { useSyncExternalStore } from "react";
import type { QueueDisplaySnapshot } from "@/lib/queue-master";
import { QueueError, QueueLoading } from "./QueueFrame";
import { QueueLobbyNav } from "./QueueLobbyNav";
import { QueueQrCard } from "./QueueQrCard";
import { useQueueSnapshot } from "./useQueueSnapshot";
import styles from "./queue.module.css";

export function QueueDisplay({ slug }: { slug: string }) {
  const { snapshot, error, loading } = useQueueSnapshot<QueueDisplaySnapshot>(slug, "display");
  const origin = useSyncExternalStore(() => () => undefined, () => window.location.origin, () => "https://fourthcanal.com");
  if (loading && !snapshot) return <main className={styles.display}><QueueLoading /></main>;
  if (error && !snapshot) return <main className={styles.display}><QueueError message={error} /></main>;
  if (!snapshot) return null;
  return (
    <main className={styles.display}>
      <QueueLobbyNav slug={slug} displayMode />
      <header>
        <div><p>QueueMaster · Classroom Display</p><h1>{snapshot.lobby.name}</h1></div>
        <span>{snapshot.lobby.closedAt ? "Closed" : "Live"} · {snapshot.waiting.length} waiting</span>
      </header>
      <section className={styles.displayStaff}>
        {snapshot.staff.map((staff) => (
          <article key={staff.id} className={staff.activeEntry ? styles.displayActive : ""}>
            <div><i className={staff.isOnline ? styles.onlineDot : styles.offlineDot} /><h2>{staff.displayName}</h2></div>
            {staff.activeEntry ? (
              <><strong>{staff.activeEntry.guestFirstName}</strong><p>{staff.activeEntry.location}</p><small>{staff.activeEntry.status === "called" ? "Please come forward" : "Helping now"}</small></>
            ) : (
              <><strong>{staff.isAvailable ? "Available" : staff.isOnline ? "Not accepting" : "Offline"}</strong><p>{staff.waitingCount} waiting</p></>
            )}
          </article>
        ))}
      </section>
      <section className={styles.displayWaiting}>
        <h2>Waiting</h2>
        <div>
          {snapshot.waiting.map((entry, index) => (
            <article key={entry.id}><b>{index + 1}</b><strong>{entry.guestFirstName}</strong><span>{entry.location}</span><small>{entry.assignedStaffName}</small></article>
          ))}
          {!snapshot.waiting.length && <p>Everyone has been called. New guests can scan the lobby QR code.</p>}
        </div>
      </section>
      <div className="mt-6 text-slate-900"><QueueQrCard title="Join this queue" description="Scan to choose an available staff member and check in." url={`${origin}/queue/r/${snapshot.lobby.slug}/join`} testId="display-guest-qr" /></div>
      {error && <QueueError message={error} />}
    </main>
  );
}
