"use client";

import Link from "next/link";
import { useState } from "react";
import { SignInButton } from "@/components/SignInButton";
import type { QueueLobby } from "@/lib/queue-master";
import { QueueFrame } from "./QueueFrame";
import styles from "./queue.module.css";

export function QueueHome({
  initialLobbies,
  guestLobby,
  signedIn,
}: {
  initialLobbies: QueueLobby[];
  guestLobby: QueueLobby | null;
  signedIn: boolean;
}) {
  const [lobbies, setLobbies] = useState(initialLobbies);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createLobby(event: React.FormEvent) {
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
      window.location.assign(`/queue/r/${payload.lobby.slug}/admin`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not create the lobby.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <QueueFrame>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Local multi-lobby pilot</p>
        <h1>A calmer way to wait.</h1>
        <p>Create a live lobby for a physical space, or reopen a queue you already manage.</p>
      </section>

      {guestLobby && (
        <Link className={styles.resumeCard} href={`/queue/r/${guestLobby.slug}/join`}>
          <span>Resume guest lobby</span>
          <strong>{guestLobby.name}</strong>
          <small>Open your current queue status →</small>
        </Link>
      )}

      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Staff</p><h2>Your lobbies</h2></div>
          <span>{lobbies.length}</span>
        </div>
        {!signedIn ? (
          <div className={styles.signInBlock}>
            <p>Sign in with the same Google account you use for Fourth Canal to create or claim a staff invitation.</p>
            <SignInButton returnTo="/queue" />
          </div>
        ) : (
          <>
            <form className={styles.createForm} onSubmit={createLobby}>
              <label>
                Lobby name
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="City Hall front desk" required />
              </label>
              <button className={styles.primaryButton} disabled={busy}>{busy ? "Creating…" : "Create lobby"}</button>
            </form>
            {message && <p className={styles.inlineError}>{message}</p>}
            <div className={styles.lobbyList}>
              {lobbies.map((lobby) => (
                <article key={lobby.id}>
                  <div><strong>{lobby.name}</strong><small>/queue/r/{lobby.slug}</small></div>
                  <nav>
                    <Link href={`/queue/r/${lobby.slug}/admin`}>Admin</Link>
                    <Link href={`/queue/r/${lobby.slug}/display`}>Display</Link>
                    <Link href={`/queue/r/${lobby.slug}/join`}>Join</Link>
                  </nav>
                </article>
              ))}
              {!lobbies.length && <p className={styles.empty}>No lobbies yet. Create the first one above.</p>}
            </div>
          </>
        )}
      </section>
    </QueueFrame>
  );
}
