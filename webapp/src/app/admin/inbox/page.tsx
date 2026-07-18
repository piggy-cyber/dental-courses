import Link from "next/link";
import { requireAdminProfile } from "@/app/admin/actions";
import { RetryDeliveryButton } from "./RetryDeliveryButton";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type InboxEntry = {
  event_id: number;
  scope: "access" | "support" | "content" | "operations";
  severity: "info" | "attention" | "urgent";
  event_type: string;
  reference_id: string;
  dashboard_path: string;
  event_created_at: string;
  outbox_id: number;
  destination: "president" | "site_ops" | "member_access" | "academic_content" | "support_inbox";
  delivery_status: "pending" | "delivered" | "failed" | "disabled";
  delivery_attempts: number;
  delivery_error: string | null;
  delivered_at: string | null;
};

const STATUS_STYLES: Record<InboxEntry["delivery_status"], string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  disabled: "border-brand-line bg-brand-soft text-brand-muted",
};

function label(value: string) {
  return value.replaceAll("_", " ").replaceAll(".", " · ");
}

export default async function AdminInboxPage() {
  await requireAdminProfile("communications.manage");
  const { data, error } = await createAdminClient().rpc("get_communications_inbox", {
    p_limit: 100,
  });
  if (error) throw new Error(error.message);
  const entries = (data as InboxEntry[] | null) ?? [];
  const needsAttention = entries.filter((entry) =>
    ["failed", "disabled", "pending"].includes(entry.delivery_status)
  ).length;

  return (
    <div className="space-y-6">
      <header className="app-card flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <p className="eyebrow text-brand-gold">President workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">Inbox</h1>
          <p className="mt-2 max-w-2xl text-brand-muted">
            Private operational activity and safe Slack delivery status. Support messages and member details stay in their protected admin records.
          </p>
        </div>
        <span className="border border-brand-line bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-navy">
          {needsAttention} delivery {needsAttention === 1 ? "needs" : "need"} review
        </span>
      </header>

      <section className="app-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="portal-table min-w-[880px] text-sm">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Destination</th>
                <th>Delivery</th>
                <th>When</th>
                <th className="w-40">Review</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.outbox_id}>
                  <td>
                    <p className="font-semibold text-brand-navy">{label(entry.event_type)}</p>
                    <p className="mt-0.5 text-xs text-brand-muted">
                      {entry.severity} · ref {entry.reference_id}
                    </p>
                  </td>
                  <td>{label(entry.destination)}</td>
                  <td>
                    <span className={`inline-flex border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[entry.delivery_status]}`}>
                      {entry.delivery_status}
                    </span>
                    {entry.delivery_error && <p className="mt-1 text-xs text-brand-muted">{entry.delivery_error}</p>}
                  </td>
                  <td className="text-brand-muted">{new Date(entry.event_created_at).toLocaleString()}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={entry.dashboard_path} className="portal-link text-xs font-semibold">Open</Link>
                      {entry.delivery_status !== "delivered" && <RetryDeliveryButton outboxId={entry.outbox_id} />}
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-brand-muted">
                    New support, access, content, and operations activity will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
