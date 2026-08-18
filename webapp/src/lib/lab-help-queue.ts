export const LAB_HELP_PROFESSORS = [
  "Dr. T",
  "Dr. J",
  "Dr. Berns",
  "Dr. LaSalvia",
  "Dr. Markarian",
  "Dr. Zakhary",
  "Dr. Ali",
  "Dr. Tarik",
] as const;

export type LabHelpProfessor = (typeof LAB_HELP_PROFESSORS)[number];

export type LabHelpQueuePublicEntry = {
  id: string;
  studentName: string;
  issue: string | null;
  benchSeat: string;
  professor: LabHelpProfessor;
  createdAt: string;
};

export type LabHelpQueueSubmission = {
  studentName: string;
  issue: string | null;
  benchSeat: string;
  professor: LabHelpProfessor;
  clientId: string;
  idempotencyKey: string;
  submissionToken: string;
  turnstileToken: string;
};

export type LabHelpQueueValidationResult =
  | { ok: true; data: LabHelpQueueSubmission }
  | { ok: false; code: "validation_failed" | "spam_detected"; message: string };

export type LabHelpQueueCancellation = {
  entryId: string;
  clientId: string;
};

export type LabHelpQueueGroup = {
  professor: LabHelpProfessor;
  entries: LabHelpQueuePublicEntry[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maximum || /[\u0000-\u001f\u007f]/.test(normalized)) {
    return null;
  }
  return normalized;
}

function optionalText(value: unknown, maximum: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && !value.trim()) return null;
  return normalizedText(value, maximum) ?? undefined;
}

export function normalizeBenchSeat(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const match = String(value).trim().match(/^#?\s*([0-9]{1,3})$/);
  if (!match) return null;
  const seat = Number(match[1]);
  return Number.isInteger(seat) && seat >= 1 && seat <= 999 ? String(seat) : null;
}

export function isLabHelpProfessor(value: unknown): value is LabHelpProfessor {
  return typeof value === "string" && LAB_HELP_PROFESSORS.includes(value as LabHelpProfessor);
}

export function validateLabHelpQueueSubmission(payload: unknown): LabHelpQueueValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "validation_failed", message: "Complete the lab help request." };
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.website !== "string" || record.website !== "") {
    return { ok: false, code: "spam_detected", message: "The request could not be submitted." };
  }

  const studentName = normalizedText(record.studentName, 80);
  if (!studentName) {
    return { ok: false, code: "validation_failed", message: "Enter your name." };
  }

  const issue = optionalText(record.issue, 160);
  if (issue === undefined) {
    return { ok: false, code: "validation_failed", message: "Keep the issue under 160 characters." };
  }

  const benchSeat = normalizeBenchSeat(record.benchSeat);
  if (!benchSeat) {
    return { ok: false, code: "validation_failed", message: "Enter a bench seat from 1 to 999." };
  }

  if (!isLabHelpProfessor(record.professor)) {
    return { ok: false, code: "validation_failed", message: "Choose a professor from the list." };
  }

  const clientId = normalizedText(record.clientId, 36);
  const idempotencyKey = normalizedText(record.idempotencyKey, 36);
  const submissionToken = normalizedText(record.submissionToken, 96);
  const turnstileToken = normalizedText(record.turnstileToken, 2048);
  if (
    !clientId
    || !UUID_PATTERN.test(clientId)
    || !idempotencyKey
    || !UUID_PATTERN.test(idempotencyKey)
    || !submissionToken
    || !turnstileToken
  ) {
    return { ok: false, code: "validation_failed", message: "Refresh the page and try again." };
  }

  return {
    ok: true,
    data: {
      studentName,
      issue,
      benchSeat,
      professor: record.professor,
      clientId: clientId.toLowerCase(),
      idempotencyKey: idempotencyKey.toLowerCase(),
      submissionToken,
      turnstileToken,
    },
  };
}

export function normalizeLabHelpQueueClientId(value: unknown): string | null {
  const clientId = normalizedText(value, 36);
  return clientId && UUID_PATTERN.test(clientId) ? clientId.toLowerCase() : null;
}

export function validateLabHelpQueueCancellation(payload: unknown):
  | { ok: true; data: LabHelpQueueCancellation }
  | { ok: false; message: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Choose the request to leave." };
  }
  const record = payload as Record<string, unknown>;
  const entryId = normalizedText(record.entryId, 36);
  const clientId = normalizedText(record.clientId, 36);
  if (!entryId || !UUID_PATTERN.test(entryId) || !clientId || !UUID_PATTERN.test(clientId)) {
    return { ok: false, message: "Refresh the page and try again." };
  }
  return { ok: true, data: { entryId: entryId.toLowerCase(), clientId: clientId.toLowerCase() } };
}

export function groupLabHelpQueueEntries(entries: LabHelpQueuePublicEntry[]): LabHelpQueueGroup[] {
  const grouped = new Map<LabHelpProfessor, LabHelpQueuePublicEntry[]>(
    LAB_HELP_PROFESSORS.map((professor) => [professor, []]),
  );

  [...entries]
    .filter((entry) => isLabHelpProfessor(entry.professor))
    .sort((left, right) => {
      const timeDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
      return timeDifference || left.id.localeCompare(right.id);
    })
    .forEach((entry) => grouped.get(entry.professor)?.push(entry));

  return LAB_HELP_PROFESSORS.flatMap((professor) => {
    const professorEntries = grouped.get(professor) ?? [];
    return professorEntries.length ? [{ professor, entries: professorEntries }] : [];
  });
}
