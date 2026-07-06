"use client";

import { useState } from "react";
import { testGroupMeConnection } from "@/app/(protected)/profile/actions";

type Props = {
  connected: boolean;
  connectedAt: string | null;
  configured: boolean;
  banner?: "connected" | "disconnected" | "error";
  errorReason?: string | null;
};

function formatConnectedAt(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function GroupMeConnectCard({
  connected,
  connectedAt,
  configured,
  banner,
  errorReason,
}: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    const result = await testGroupMeConnection();
    if (result.ok) {
      setTestResult(
        `${result.groupCount} group${result.groupCount === 1 ? "" : "s"} found`
      );
    } else {
      setTestError(result.error);
    }
    setTesting(false);
  }

  return (
    <section className="app-card p-6">
      <p className="eyebrow">Integrations</p>
      <h2 className="mt-1 text-lg font-bold text-brand-navy">GroupMe</h2>
      <p className="mt-2 text-sm text-brand-muted">
        Connect your GroupMe account to enable class notifications from this site.
      </p>

      {banner === "connected" && (
        <p className="mt-3 border border-brand-teal/30 bg-brand-soft px-3 py-2 text-sm text-brand-navy">
          GroupMe connected successfully.
        </p>
      )}
      {banner === "disconnected" && (
        <p className="mt-3 border border-brand-line bg-brand-soft px-3 py-2 text-sm text-brand-muted">
          GroupMe disconnected.
        </p>
      )}
      {banner === "error" && (
        <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Could not connect GroupMe{errorReason ? ` (${errorReason.replace(/_/g, " ")})` : ""}.
        </p>
      )}

      {!configured ? (
        <p className="mt-4 text-sm text-brand-muted">
          GroupMe OAuth is not configured on this deployment yet.
        </p>
      ) : connected ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="cockpit-switch-indicator" />
            <span className="font-semibold text-brand-navy">Connected</span>
            {connectedAt && (
              <span className="text-brand-muted">· {formatConnectedAt(connectedAt)}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="portal-button px-4 py-2 text-sm disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test connection"}
            </button>
            <form action="/api/groupme/disconnect" method="post">
              <button type="submit" className="portal-button px-4 py-2 text-sm">
                Disconnect
              </button>
            </form>
          </div>

          {testResult && <p className="text-sm text-brand-teal">{testResult}</p>}
          {testError && <p className="text-sm text-red-600">{testError}</p>}
        </div>
      ) : (
        <div className="mt-4">
          <a href="/api/groupme/connect" className="portal-button-primary px-4 py-2 text-sm font-semibold">
            Connect GroupMe
          </a>
        </div>
      )}
    </section>
  );
}
