"use client";

import { useEffect, useRef, useState } from "react";
import {
  SUPPORT_CATEGORIES,
  isReplyEmailRequired,
  type SupportCategory,
} from "@/lib/support";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  site: "Site issue",
  account: "Account or access",
  accessibility: "Accessibility",
  content: "Content concern",
  privacy: "Privacy request",
  copyright: "Copyright or removal request",
  security: "Security concern",
  other: "Other",
};

type SupportStatus = "idle" | "sending" | "sent" | "error";

export function SupportForm() {
  const [category, setCategory] = useState<SupportCategory>("site");
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [name, setName] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState<SupportStatus>("idle");
  const [feedback, setFeedback] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const replyEmailRequired = isReplyEmailRequired(category);

  useEffect(() => {
    if (!siteKey || !widgetRef.current) return;

    function renderWidget() {
      if (!widgetRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]');
    if (existing) {
      existing.addEventListener("load", renderWidget);
      renderWidget();
      return () => existing.removeEventListener("load", renderWidget);
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderWidget);
    document.head.appendChild(script);
    return () => script.removeEventListener("load", renderWidget);
  }, [siteKey]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (!siteKey) {
      setStatus("error");
      setFeedback("Support is being configured. Please try again later.");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          replyEmail,
          name,
          pagePath: `${window.location.pathname}${window.location.search}`,
          "cf-turnstile-response": turnstileToken,
          website: honeypot,
        }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string; referenceId?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? "We could not send your request.");
      }
      setStatus("sent");
      setFeedback(`Thanks — your reference is ${body.referenceId}.`);
      setMessage("");
      setReplyEmail("");
      setName("");
      setTurnstileToken("");
      if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "We could not send your request.");
    }
  }

  return (
    <form onSubmit={submit} className="app-card max-w-3xl space-y-5 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-brand-navy">
          Request type
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as SupportCategory)}
            className="app-input mt-2 w-full px-3 py-2 text-sm"
          >
            {SUPPORT_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-brand-navy">
          Your name <span className="font-normal text-brand-muted">(optional)</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="app-input mt-2 w-full px-3 py-2 text-sm" maxLength={120} autoComplete="name" />
        </label>
      </div>

      <label className="block text-sm font-semibold text-brand-navy">
        What should we know?
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          minLength={20}
          maxLength={4000}
          required
          rows={7}
          className="app-input mt-2 w-full px-3 py-2 text-sm"
          placeholder="Include the page, what happened, and the information that would help us investigate."
        />
        <span className="mt-1 block text-xs font-normal text-brand-muted">20–4,000 characters. Do not include patient, grade, or other sensitive records.</span>
      </label>

      <label className="block text-sm font-semibold text-brand-navy">
        Reply email {replyEmailRequired ? "(required)" : "(optional)"}
        <input
          value={replyEmail}
          onChange={(event) => setReplyEmail(event.target.value)}
          type="email"
          required={replyEmailRequired}
          className="app-input mt-2 w-full px-3 py-2 text-sm"
          maxLength={254}
          autoComplete="email"
        />
      </label>

      <label className="sr-only" aria-hidden="true">
        Leave this field empty
        <input value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" />
      </label>

      <div ref={widgetRef} aria-label="Security check" />
      {!siteKey && <p className="text-sm text-amber-700">The support form is being configured. Please try again later.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending" || !message.trim() || !turnstileToken || !siteKey}
          className="portal-button-primary px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send support request"}
        </button>
        {feedback && <p className={status === "sent" ? "text-sm text-emerald-700" : "text-sm text-red-700"} aria-live="polite">{feedback}</p>}
      </div>
    </form>
  );
}
