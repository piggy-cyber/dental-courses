"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  LAB_HELP_PROFESSORS,
  groupLabHelpQueueEntries,
  type LabHelpProfessor,
  type LabHelpQueuePublicEntry,
} from "@/lib/lab-help-queue";
import styles from "./LabHelpQueue.module.css";

const CLIENT_ID_KEY = "fourthCanalLabQueueClientIdV1";
const ACTIVE_ENTRY_KEY = "fourthCanalLabQueueActiveEntryV1";
const REFRESH_INTERVAL_MS = 5_000;

type RequestStatus = {
  state: "idle" | "submitting" | "success" | "error";
  message: string;
  entryId?: string;
  position?: number;
};

type QueueResponse = {
  ok: true;
  entries: LabHelpQueuePublicEntry[];
  refreshedAt: string;
  submissionToken: string;
};

type PostResponse = {
  ok: true;
  entry: LabHelpQueuePublicEntry;
  position: number;
  replayed?: boolean;
};

type ErrorResponse = {
  ok?: false;
  message?: string;
  activeEntry?: LabHelpQueuePublicEntry;
};

type SecurityState = "loading" | "ready" | "error" | "unconfigured";

function createUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function getClientId(): string {
  const stored = window.localStorage.getItem(CLIENT_ID_KEY);
  if (stored) return stored;
  const clientId = createUuid();
  window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}

function rememberActiveEntry(entryId: string | null) {
  if (entryId) {
    window.localStorage.setItem(ACTIVE_ENTRY_KEY, entryId);
  } else {
    window.localStorage.removeItem(ACTIVE_ENTRY_KEY);
  }
}

async function responseJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
}

function messageFromError(response: unknown, fallback: string) {
  if (!response || typeof response !== "object" || !("message" in response)) return fallback;
  const message = response.message;
  return typeof message === "string" && message.trim() ? message.trim() : fallback;
}

function isQueueResponse(value: QueueResponse | ErrorResponse | null): value is QueueResponse {
  const candidate = value as QueueResponse | null;
  return candidate?.ok === true
    && Array.isArray(candidate.entries)
    && typeof candidate.submissionToken === "string"
    && Boolean(candidate.submissionToken);
}

function isPostResponse(value: PostResponse | ErrorResponse | null): value is PostResponse {
  const candidate = value as PostResponse | null;
  return candidate?.ok === true && Boolean(candidate.entry?.id) && Number.isFinite(candidate.position);
}

function isPublicEntry(value: unknown): value is LabHelpQueuePublicEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<LabHelpQueuePublicEntry>;
  return typeof entry.id === "string"
    && typeof entry.studentName === "string"
    && typeof entry.benchSeat === "string"
    && typeof entry.professor === "string"
    && typeof entry.createdAt === "string";
}

function activeEntryFromError(value: unknown): LabHelpQueuePublicEntry | null {
  if (!value || typeof value !== "object" || !("activeEntry" in value)) return null;
  return isPublicEntry(value.activeEntry) ? value.activeEntry : null;
}

async function fetchQueueSnapshot(): Promise<QueueResponse> {
  const clientId = getClientId();
  const response = await fetch(`/api/lab-help-queue?clientId=${encodeURIComponent(clientId)}`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const body = await responseJson<QueueResponse | ErrorResponse>(response);
  if (!response.ok || !isQueueResponse(body)) {
    throw new Error(messageFromError(body, "The current queue could not be loaded."));
  }
  return body;
}

export function LabHelpQueue() {
  const [studentName, setStudentName] = useState("");
  const [issue, setIssue] = useState("");
  const [benchSeat, setBenchSeat] = useState("");
  const [professor, setProfessor] = useState<LabHelpProfessor | "">("");
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const [securityState, setSecurityState] = useState<SecurityState>(
    siteKey ? "loading" : "unconfigured",
  );
  const [entries, setEntries] = useState<LabHelpQueuePublicEntry[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState("");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [status, setStatus] = useState<RequestStatus>({
    state: "idle",
    message: "Ready to join when you submit the form.",
  });
  const pendingIdempotencyKey = useRef<string | null>(null);
  const latestSubmissionToken = useRef<string | null>(null);
  const refreshing = useRef(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const resetSecurityCheck = useCallback(() => {
    setTurnstileToken("");
    setSecurityState(siteKey ? "loading" : "unconfigured");
    if (turnstileWidgetIdRef.current) {
      window.turnstile?.reset(turnstileWidgetIdRef.current);
    }
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey || !turnstileContainerRef.current) return;

    function renderWidget() {
      if (!turnstileContainerRef.current || !window.turnstile || turnstileWidgetIdRef.current) return;
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: siteKey,
        action: "lab_help_queue_submit",
        appearance: "interaction-only",
        size: "flexible",
        theme: "auto",
        callback: (token) => {
          setTurnstileToken(token);
          setSecurityState("ready");
        },
        "expired-callback": () => {
          setTurnstileToken("");
          setSecurityState("loading");
        },
        "error-callback": () => {
          setTurnstileToken("");
          setSecurityState("error");
        },
      });
    }

    const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    if (existing) {
      existing.addEventListener("load", renderWidget);
      renderWidget();
      return () => existing.removeEventListener("load", renderWidget);
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderWidget);
    document.head.appendChild(script);
    return () => script.removeEventListener("load", renderWidget);
  }, [siteKey]);

  const refreshQueue = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;

    try {
      const body = await fetchQueueSnapshot();

      latestSubmissionToken.current = body.submissionToken;
      setEntries(body.entries);
      setQueueError("");
      setActiveEntryId((currentEntryId) => {
        if (!currentEntryId || body.entries.some((entry) => entry.id === currentEntryId)) {
          return currentEntryId;
        }
        rememberActiveEntry(null);
        return null;
      });
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "The current queue could not be loaded.");
    } finally {
      setQueueLoading(false);
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    const rememberedEntryId = window.localStorage.getItem(ACTIVE_ENTRY_KEY);
    const initialRefreshTimer = window.setTimeout(() => {
      if (rememberedEntryId) setActiveEntryId(rememberedEntryId);
      void refreshQueue();
    }, 0);
    const refreshTimer = window.setInterval(() => void refreshQueue(), REFRESH_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialRefreshTimer);
      window.clearInterval(refreshTimer);
    };
  }, [refreshQueue]);

  const groups = useMemo(() => groupLabHelpQueueEntries(entries), [entries]);
  const activeEntry = useMemo(
    () => entries.find((entry) => entry.id === activeEntryId) ?? null,
    [activeEntryId, entries],
  );
  const requestPending = status.state === "submitting" || leaving;

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestPending) return;
    if (activeEntryId) {
      setStatus({
        state: "error",
        message: "Leave your current request before joining another queue.",
      });
      return;
    }
    if (!siteKey) {
      setStatus({
        state: "error",
        message: "The anonymous security check is being configured. Try again later.",
      });
      return;
    }
    if (!turnstileToken) {
      setStatus({
        state: "error",
        message: "Complete the anonymous security check, then try again. No login is required.",
      });
      return;
    }

    const idempotencyKey = pendingIdempotencyKey.current ?? createUuid();
    pendingIdempotencyKey.current = idempotencyKey;
    setStatus({ state: "submitting", message: "Adding your request to the queue…" });
    let postAttempted = false;

    try {
      const clientId = getClientId();
      let submissionToken = latestSubmissionToken.current;
      if (!submissionToken) {
        const snapshot = await fetchQueueSnapshot();
        submissionToken = snapshot.submissionToken;
        latestSubmissionToken.current = submissionToken;
      }

      postAttempted = true;
      const response = await fetch("/api/lab-help-queue", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName,
          issue,
          benchSeat,
          professor,
          clientId,
          idempotencyKey,
          submissionToken,
          turnstileToken,
          website,
        }),
      });
      const body = await responseJson<PostResponse | ErrorResponse>(response);

      if (!response.ok || !isPostResponse(body)) {
        if (response.status === 403) latestSubmissionToken.current = null;
        const existingEntry = activeEntryFromError(body);
        if (existingEntry) {
          setActiveEntryId(existingEntry.id);
          rememberActiveEntry(existingEntry.id);
          setEntries((currentEntries) => currentEntries.some((entry) => entry.id === existingEntry.id)
            ? currentEntries
            : [...currentEntries, existingEntry]);
        }
        throw new Error(messageFromError(body, "Your request could not be submitted."));
      }

      pendingIdempotencyKey.current = null;
      setActiveEntryId(body.entry.id);
      rememberActiveEntry(body.entry.id);
      setEntries((currentEntries) => [
        ...currentEntries.filter((entry) => entry.id !== body.entry.id),
        body.entry,
      ]);
      setStatus({
        state: "success",
        message: `You are #${body.position} in ${body.entry.professor}'s queue.`,
        entryId: body.entry.id,
        position: body.position,
      });
      void refreshQueue();
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Your request could not be submitted.",
      });
    } finally {
      if (postAttempted) resetSecurityCheck();
    }
  }

  async function leaveQueue() {
    if (!activeEntryId || requestPending) return;
    setLeaving(true);
    setStatus({ state: "submitting", message: "Removing your request…" });

    try {
      const response = await fetch("/api/lab-help-queue", {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entryId: activeEntryId, clientId: getClientId() }),
      });
      const body = await responseJson<{ ok: true } | ErrorResponse>(response);
      if (!response.ok || body?.ok !== true) {
        throw new Error(messageFromError(body, "Your request could not be removed."));
      }

      setEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== activeEntryId));
      setActiveEntryId(null);
      rememberActiveEntry(null);
      pendingIdempotencyKey.current = null;
      setStatus({ state: "success", message: "You left the queue." });
      void refreshQueue();
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Your request could not be removed.",
      });
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand} aria-label="Fourth Canal Lab Help Queue">
            <span className={styles.mark} aria-hidden="true">FC</span>
            <span className={styles.brandText}>
              <strong>Lab Help Queue</strong>
              <span>Fourth Canal</span>
            </span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Preclinical lab</p>
          <h1>Lab Help Queue</h1>
          <p>Send one request to the faculty member you need, then keep this page open to watch the line.</p>
        </header>

        <div className={styles.layout}>
          <section className={`${styles.panel} ${styles.formPanel}`} aria-labelledby="join-queue-heading">
            <header className={styles.panelHeader}>
              <p className={styles.sectionEyebrow}>Request help</p>
              <h2 id="join-queue-heading">Join the queue</h2>
              <p>No account is required. Submit only once and leave when you no longer need help. Expired queue details are automatically deleted.</p>
            </header>

            <form
              className={styles.form}
              data-fc-lab-queue-form
              data-fc-lab-queue-version="1"
              data-fc-lab-queue-security={securityState}
              onSubmit={submitRequest}
            >
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Name</span>
                <input
                  className={styles.input}
                  name="studentName"
                  data-fc-lab-queue-field="name"
                  autoComplete="name"
                  maxLength={80}
                  placeholder="Your name"
                  required
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Issue <span className={styles.optional}>(optional)</span></span>
                <input
                  className={styles.input}
                  name="issue"
                  data-fc-lab-queue-field="issue"
                  maxLength={160}
                  placeholder="What do you need help with?"
                  value={issue}
                  onChange={(event) => setIssue(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Bench seat</span>
                <input
                  className={styles.input}
                  name="benchSeat"
                  data-fc-lab-queue-field="benchSeat"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="^#?[ ]*[0-9]{1,3}$"
                  placeholder="Example: 88"
                  required
                  value={benchSeat}
                  onChange={(event) => setBenchSeat(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Professor</span>
                <select
                  className={styles.select}
                  name="professor"
                  data-fc-lab-queue-field="professor"
                  required
                  value={professor}
                  onChange={(event) => setProfessor(event.target.value as LabHelpProfessor | "")}
                >
                  <option value="">Select professor</option>
                  {LAB_HELP_PROFESSORS.map((professorName) => (
                    <option key={professorName} value={professorName}>{professorName}</option>
                  ))}
                </select>
              </label>

              <label className={styles.honeypot} aria-hidden="true">
                <span>Website</span>
                <input
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </label>

              <div className={styles.securityCheck}>
                <span className={styles.fieldLabel}>Anonymous security check</span>
                <div
                  ref={turnstileContainerRef}
                  className={styles.turnstile}
                  aria-label="Anonymous security check"
                />
                <p data-state={securityState}>
                  {securityState === "ready" && "Ready. No account or login is required."}
                  {securityState === "loading" && "Checking this browser…"}
                  {securityState === "error" && "The security check could not load. Refresh this page and try again."}
                  {securityState === "unconfigured" && "The queue is being configured. Try again later."}
                </p>
              </div>

              <button
                className={styles.submit}
                type="submit"
                data-fc-lab-queue-submit
                data-security-ready={securityState === "ready" ? "true" : "false"}
                disabled={requestPending || Boolean(activeEntryId) || !siteKey || !turnstileToken}
              >
                {status.state === "submitting" && !leaving ? "Joining…" : "Join queue"}
              </button>

              <div
                className={styles.status}
                role="status"
                aria-live="polite"
                data-fc-lab-queue-status
                data-state={status.state}
                data-entry-id={status.entryId}
                data-position={status.position}
              >
                {status.message}
              </div>

              {activeEntryId && (
                <div className={styles.activeEntry}>
                  <p>
                    {activeEntry
                      ? `${activeEntry.studentName} is waiting for ${activeEntry.professor} at bench ${activeEntry.benchSeat}.`
                      : "This browser has an active request in the queue."}
                  </p>
                  <button
                    className={styles.leave}
                    type="button"
                    disabled={requestPending}
                    onClick={() => void leaveQueue()}
                  >
                    {leaving ? "Leaving…" : "Leave queue"}
                  </button>
                </div>
              )}
            </form>
          </section>

          <section className={`${styles.panel} ${styles.queuePanel}`} aria-labelledby="current-queue-heading">
            <header className={`${styles.panelHeader} ${styles.queueHeader}`}>
              <div>
                <p className={styles.sectionEyebrow}>Live view</p>
                <h2 id="current-queue-heading">Current queue</h2>
                <p>Each professor&apos;s line is numbered independently.</p>
              </div>
              <span className={styles.queueMeta}>{entries.length} {entries.length === 1 ? "request" : "requests"}</span>
            </header>

            {queueError && <p className={styles.queueError} role="alert">{queueError}</p>}
            {queueLoading && entries.length === 0 ? (
              <p className={styles.queueEmpty}>Loading the current queue…</p>
            ) : groups.length === 0 ? (
              <p className={styles.queueEmpty}>No one is waiting right now.</p>
            ) : (
              <div className={styles.queueGrid}>
                {groups.map((group) => (
                  <section className={styles.professorGroup} key={group.professor} aria-labelledby={`queue-${group.professor.replace(/[^a-z]+/gi, "-").toLowerCase()}`}>
                    <h3 id={`queue-${group.professor.replace(/[^a-z]+/gi, "-").toLowerCase()}`}>{group.professor}</h3>
                    <ol className={styles.entryList}>
                      {group.entries.map((entry, index) => (
                        <li className={styles.entry} key={entry.id}>
                          <p className={styles.entryName}>
                            <span className={styles.entryNumber}>#{index + 1}</span>
                            {entry.studentName}
                          </p>
                          <p className={styles.entryDetails}>
                            {entry.issue && <span>{entry.issue}</span>}
                            <span>Bench {entry.benchSeat}</span>
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
