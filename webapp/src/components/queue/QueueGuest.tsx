"use client";

import { useMemo, useState } from "react";
import type { QueueGuestAction, QueueGuestSnapshot } from "@/lib/queue-master";
import { QueueError, QueueFrame, QueueLoading } from "./QueueFrame";
import { sendQueueAction, useQueueSnapshot } from "./useQueueSnapshot";
import styles from "./queue.module.css";

export function QueueGuest({ slug }: { slug: string }) {
  const { snapshot, error, loading, refresh } = useQueueSnapshot<QueueGuestSnapshot>(slug, "guest");
  const [firstName, setFirstName] = useState("");
  const [location, setLocation] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const available = useMemo(() => snapshot?.staff.filter((staff) => staff.isAvailable) ?? [], [snapshot]);

  async function act(action: QueueGuestAction) {
    setBusy(true);
    setActionError(null);
    try {
      await sendQueueAction(slug, "guest", action);
      await refresh(true);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !snapshot) return <QueueFrame><QueueLoading /></QueueFrame>;
  if (error && !snapshot) return <QueueFrame><QueueError message={error} /></QueueFrame>;
  if (!snapshot) return null;
  const entry = snapshot.currentEntry;

  return (
    <QueueFrame>
      <section className={styles.lobbyHeading}>
        <p className={styles.eyebrow}>Guest check-in</p>
        <h1>{snapshot.lobby.name}</h1>
        <p>Keep this tab open. Your place is saved in this browser.</p>
      </section>

      {entry ? (
        <section className={`${styles.guestStatus} ${entry.status === "called" || entry.status === "helping" ? styles.greenState : ""}`}>
          <p className={styles.eyebrow}>{entry.status === "waiting" ? "You’re in line" : entry.status === "called" ? "You’re being called" : "Session in progress"}</p>
          <h2>{entry.guestFirstName}</h2>
          <p className={styles.statusLead}>
            {entry.status === "waiting"
              ? `${snapshot.waitingAhead === 0 ? "You’re next" : `${snapshot.waitingAhead} ahead of you`} for ${entry.assignedStaffName}.`
              : `Meet ${entry.assignedStaffName} at ${entry.location}.`}
          </p>
          <dl className={styles.statusFacts}>
            <div><dt>Location</dt><dd>{entry.location}</dd></div>
            <div><dt>Staff</dt><dd>{entry.assignedStaffName}</dd></div>
            <div><dt>Status</dt><dd>{entry.status.replace("_", " ")}</dd></div>
          </dl>
          <div className={styles.actions}>
            {entry.status === "called" && <button className={styles.primaryButton} disabled={busy} onClick={() => act({ type: "start_helping", entryId: entry.id })}>Start helping</button>}
            {(entry.status === "called" || entry.status === "helping") && <button className={styles.primaryButton} disabled={busy} onClick={() => act({ type: "finish", entryId: entry.id })}>Finish session</button>}
            {entry.status === "waiting" && <button className={styles.secondaryButton} disabled={busy} onClick={() => act({ type: "leave", entryId: entry.id })}>Leave queue</button>}
          </div>
        </section>
      ) : (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Step 1</p><h2>Choose available staff</h2></div><span>{available.length}</span></div>
          <div className={styles.staffPicker}>
            {snapshot.staff.map((staff) => (
              <button
                type="button"
                key={staff.id}
                disabled={!staff.isAvailable}
                onClick={() => setMembershipId(staff.id)}
                className={membershipId === staff.id ? styles.selectedStaff : ""}
              >
                <i className={staff.isAvailable ? styles.onlineDot : styles.offlineDot} />
                <strong>{staff.displayName}</strong>
                <small>{staff.isAvailable ? `${staff.waitingCount} waiting` : staff.isOnline ? "Not accepting" : "Offline"}</small>
              </button>
            ))}
            {!snapshot.staff.length && <p className={styles.empty}>No staff have joined this lobby yet.</p>}
          </div>
          <form className={styles.checkInForm} onSubmit={(event) => {
            event.preventDefault();
            void act({ type: "check_in", firstName, location, membershipId });
          }}>
            <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={40} autoComplete="given-name" required /></label>
            <label>Desk or car location<input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={40} placeholder="Desk 12 or blue Honda" required /></label>
            <button className={styles.primaryButton} disabled={busy || !membershipId || !available.length}>{busy ? "Joining…" : "Join queue"}</button>
          </form>
        </section>
      )}
      {(actionError || error) && <QueueError message={actionError || error || "Queue error"} />}
    </QueueFrame>
  );
}
