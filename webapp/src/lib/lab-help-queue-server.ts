import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getRequestFingerprint, getSupportServerConfig } from "@/lib/support-server";

const SUBMISSION_TOKEN_VERSION = "v1";
export const LAB_HELP_QUEUE_SUBMISSION_TOKEN_TTL_MS = 5 * 60 * 1000;
const SUBMISSION_TOKEN_CLOCK_SKEW_MS = 30 * 1000;

function isProductionRuntime() {
  return process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === "production"
    : process.env.NODE_ENV === "production";
}

export function getLabHelpQueueServerConfig() {
  const { turnstileSecret } = getSupportServerConfig();
  const rateLimitSecret =
    process.env.LAB_QUEUE_RATE_LIMIT_SECRET?.trim()
    || process.env.SUPPORT_RATE_LIMIT_SECRET?.trim();
  return {
    turnstileSecret,
    rateLimitSecret,
    submissionSecret:
      process.env.LAB_QUEUE_SUBMISSION_SECRET?.trim()
      || rateLimitSecret,
  };
}

export function isLabHelpQueueSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}

export function isLabHelpQueueJsonRequest(request: NextRequest): boolean {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

export function getLabHelpQueueRequestFingerprint(request: NextRequest, secret: string): string | null {
  const fingerprint = getRequestFingerprint(request, secret);
  if (fingerprint) return fingerprint;
  if (isProductionRuntime()) return null;
  return createHmac("sha256", secret).update("local-development").digest("hex");
}

export function getLabHelpQueueClientFingerprint(clientId: string, secret: string): string {
  return createHmac("sha256", secret).update(`lab-help-queue:${clientId}`).digest("hex");
}

function submissionTokenSignature(input: {
  clientId: string;
  requestFingerprint: string;
  issuedAtSeconds: number;
  secret: string;
}) {
  return createHmac("sha256", input.secret)
    .update([
      SUBMISSION_TOKEN_VERSION,
      input.clientId,
      input.requestFingerprint,
      String(input.issuedAtSeconds),
    ].join("\n"))
    .digest("hex");
}

export function createLabHelpQueueSubmissionToken(input: {
  clientId: string;
  requestFingerprint: string;
  secret: string;
  now?: number;
}): string {
  const issuedAtSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  const signature = submissionTokenSignature({ ...input, issuedAtSeconds });
  return `${SUBMISSION_TOKEN_VERSION}.${issuedAtSeconds}.${signature}`;
}

export function verifyLabHelpQueueSubmissionToken(input: {
  token: string;
  clientId: string;
  requestFingerprint: string;
  secret: string;
  now?: number;
}): boolean {
  const match = input.token.match(/^v1\.([0-9]{10,12})\.([a-f0-9]{64})$/);
  if (!match) return false;

  const issuedAtSeconds = Number(match[1]);
  const ageMs = (input.now ?? Date.now()) - issuedAtSeconds * 1000;
  if (ageMs < -SUBMISSION_TOKEN_CLOCK_SKEW_MS || ageMs > LAB_HELP_QUEUE_SUBMISSION_TOKEN_TTL_MS) {
    return false;
  }

  const expected = submissionTokenSignature({ ...input, issuedAtSeconds });
  const actualBuffer = Buffer.from(match[2], "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
