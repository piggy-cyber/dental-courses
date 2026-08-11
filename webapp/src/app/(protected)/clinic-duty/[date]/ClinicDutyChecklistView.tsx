"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { ClinicDutyPhotoUrl } from "@/lib/clinic-duty-photos";
import {
  type ClinicDutyDetail,
} from "@/lib/clinic-duty";
import {
  CLINIC_DUTY_BUCKET,
  CLINIC_DUTY_CHECKLIST,
  type ClinicDutyChecklist,
  type ClinicDutyChecklistId,
} from "@/lib/clinic-duty-shared";
import { createClient } from "@/lib/supabase/client";
import {
  completeClinicDuty,
  confirmClinicDutyPhotoUpload,
  prepareClinicDutyPhotoUpload,
} from "../actions";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

async function stripMetadataAndResize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, 1800 / longest);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Your browser could not process this image.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("Your browser could not process this image.");
  if (blob.size > 5_000_000) throw new Error("The processed photo is still larger than 5 MB.");
  return blob;
}

function PhotoUploader({ detail, photos }: { detail: ClinicDutyDetail; photos: ClinicDutyPhotoUrl[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setMessage("Processing image and removing metadata…");
    try {
      const blob = await stripMetadataAndResize(file);
      const prepared = await prepareClinicDutyPhotoUpload({
        dutyDateId: detail.id,
        mimeType: "image/jpeg",
        byteSize: blob.size,
      });
      setMessage("Uploading private photo…");
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(CLINIC_DUTY_BUCKET)
        .uploadToSignedUrl(prepared.storagePath, prepared.token, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);
      await confirmClinicDutyPhotoUpload(prepared.photoId);
      setMessage("Photo added. The private viewing link expires after ten minutes.");
      router.refresh();
    } catch (caught) {
      setMessage(null);
      setError(caught instanceof Error ? caught.message : "Photo upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="app-card p-5">
      <div className="clinic-duty-section-heading">
        <div>
          <p className="eyebrow">Private evidence · 60-day retention</p>
          <h2>Shared-space photo</h2>
        </div>
        <span>{photos.length}/4</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-brand-muted">
        Include the cleaned shared area only. No faces, name tags, screens, charts, patient information, or identifying reflections. Images are resized and re-encoded before upload to remove embedded metadata.
      </p>
      {photos.length > 0 && (
        <div className="clinic-duty-photo-grid">
          {photos.map((photo, index) => (
            <figure key={photo.id}>
              <Image src={photo.url} alt={`Private Sim Clinic Duty evidence ${index + 1}`} width={520} height={390} unoptimized />
              <figcaption>Private photo {index + 1} · link expires in 10 minutes</figcaption>
            </figure>
          ))}
        </div>
      )}
      {detail.submission?.status !== "completed" && (
        <div className="mt-4 space-y-3">
          <label className="clinic-duty-policy-check">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span>I checked the frame and it contains no person or patient-identifying information.</span>
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="app-input w-full px-3 py-2 text-sm"
            disabled={!acknowledged || busy || photos.length >= 4}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          {busy && <p className="text-sm text-brand-muted" aria-live="polite">{message}</p>}
          {!busy && message && <p className="text-sm text-emerald-700" role="status">{message}</p>}
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}

export function ClinicDutyChecklistView({
  detail,
  photoUrls,
}: {
  detail: ClinicDutyDetail;
  photoUrls: ClinicDutyPhotoUrl[];
}) {
  const router = useRouter();
  const initialChecklist = Object.fromEntries(
    CLINIC_DUTY_CHECKLIST.map((item) => [item.id, Boolean(detail.submission?.checklist[item.id])])
  ) as ClinicDutyChecklist;
  const [checklist, setChecklist] = useState(initialChecklist);
  const [unsafeIssueReported, setUnsafeIssueReported] = useState(detail.submission?.unsafeIssueReported ?? false);
  const [unsafeIssueType, setUnsafeIssueType] = useState(detail.submission?.unsafeIssueType ?? "");
  const [unsafeIssueNote, setUnsafeIssueNote] = useState(detail.submission?.unsafeIssueNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const completed = detail.submission?.status === "completed";
  const allChecked = CLINIC_DUTY_CHECKLIST.every((item) => checklist[item.id]);
  const photoRequirementMet = detail.photoWaived || photoUrls.length > 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await completeClinicDuty({
          dutyDateId: detail.id,
          dutyDate: detail.date,
          checklist,
          unsafeIssueReported,
          unsafeIssueType,
          unsafeIssueNote,
        });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The checklist could not be submitted.");
      }
    });
  }

  return (
    <div className="clinic-duty-detail">
      <Link href="/clinic-duty" className="portal-link text-sm">← Back to schedule</Link>
      <header className="clinic-duty-detail-hero">
        <div>
          <p className="eyebrow">{detail.termLabel} · Shared Lab and Sim Clinic</p>
          <h1>{formatDate(detail.date)}</h1>
          <p>{formatTime(detail.opensAt)}–{formatTime(detail.closesAt)} · {detail.slots.map((slot) => slot.assigneeName).join(" + ")}</p>
        </div>
        <span className={`clinic-duty-status clinic-duty-status-${completed ? "completed" : detail.dateStatus === "closed" ? "closed" : "due-today"}`}>
          {completed ? "Completed" : detail.dateStatus === "closed" ? "Closed" : detail.submission?.status === "reopened" ? "Reopened" : "Open"}
        </span>
      </header>

      {detail.dateStatus === "closed" && (
        <div className="clinic-duty-message">This date is closed: {detail.closureReason}</div>
      )}
      {detail.submission?.status === "reopened" && (
        <div className="clinic-duty-message">A coordinator reopened this record: {detail.submission.reopenReason}</div>
      )}

      <section className="clinic-duty-safety-note">
        <b>Stop and report unsafe conditions.</b>
        <p>Do not handle sharps, biohazard material, damaged equipment, or unsafe spills outside school policy. Secure the area if appropriate and report it through the school’s required channel.</p>
      </section>

      <div className="clinic-duty-detail-grid">
        <section className="app-card overflow-hidden">
          <div className="clinic-duty-section-heading p-5 pb-3">
            <div><p className="eyebrow">Complete together or individually</p><h2>Shared-space checklist</h2></div>
            <span>{Object.values(checklist).filter(Boolean).length}/{CLINIC_DUTY_CHECKLIST.length}</span>
          </div>
          <div className="clinic-duty-checklist">
            {CLINIC_DUTY_CHECKLIST.map((item) => (
              <label key={item.id} data-checked={checklist[item.id]}>
                <input
                  type="checkbox"
                  checked={checklist[item.id]}
                  disabled={completed || detail.dateStatus === "closed"}
                  onChange={(event) => setChecklist((current) => ({
                    ...current,
                    [item.id as ClinicDutyChecklistId]: event.target.checked,
                  }))}
                />
                <span><b>{item.label}</b><small>{item.detail}</small></span>
              </label>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          <PhotoUploader detail={detail} photos={photoUrls} />
          <section className="app-card p-5">
            <p className="eyebrow">Safety and supply report</p>
            <h2 className="mt-1 text-xl font-bold text-brand-navy">Did you report an unsafe issue?</h2>
            <label className="clinic-duty-policy-check mt-4">
              <input type="checkbox" checked={unsafeIssueReported} disabled={completed} onChange={(event) => setUnsafeIssueReported(event.target.checked)} />
              <span>Yes — sharps, biohazard, damage, or an unsafe spill was reported.</span>
            </label>
            {unsafeIssueReported && (
              <div className="mt-3 space-y-3">
                <select className="app-input w-full px-3 py-2" value={unsafeIssueType} disabled={completed} onChange={(event) => setUnsafeIssueType(event.target.value)}>
                  <option value="">Choose issue type</option>
                  <option value="sharps">Sharps</option>
                  <option value="biohazard">Biohazard</option>
                  <option value="equipment-damage">Equipment damage</option>
                  <option value="unsafe-spill">Unsafe spill</option>
                  <option value="other">Other unsafe condition</option>
                </select>
                <textarea className="app-input w-full px-3 py-2" rows={4} value={unsafeIssueNote} disabled={completed} onChange={(event) => setUnsafeIssueNote(event.target.value)} placeholder="Briefly record what was reported and where. Do not include patient information." />
              </div>
            )}
          </section>

          {detail.photoWaived && (
            <p className="clinic-duty-message">Photo waived by a coordinator: {detail.photoWaiverReason}</p>
          )}
          {completed ? (
            <section className="clinic-duty-complete-card">
              <p className="eyebrow">Immutable completion record</p>
              <h2>Completed for both assigned students</h2>
              <p>Submitted by {detail.submission?.submittedByName ?? "an assigned student"} on {detail.submission?.submittedAt ? new Date(detail.submission.submittedAt).toLocaleString() : "this date"}.</p>
            </section>
          ) : (
            <button
              type="button"
              className="portal-button-primary w-full px-5 py-3 font-semibold"
              disabled={isPending || detail.dateStatus === "closed" || !allChecked || !photoRequirementMet || (unsafeIssueReported && (!unsafeIssueType || unsafeIssueNote.trim().length < 3))}
              onClick={submit}
            >
              {isPending ? "Submitting…" : "Complete duty for both students"}
            </button>
          )}
          {!completed && !photoRequirementMet && <p className="text-sm text-brand-muted">Add at least one private photo before submitting.</p>}
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
