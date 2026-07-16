export const ROOT_CANAL_DIFFICULTIES = ["basic", "intermediate", "clinical"] as const;

export type RootCanalDifficulty = (typeof ROOT_CANAL_DIFFICULTIES)[number];

export type RootCanalSourceRef = {
  courseCode: string;
  sourceName: string;
  locator: string;
};

export type RootCanalMatchRecord = {
  id: string;
  toothName: string;
  toothNumber: string;
  difficulty: RootCanalDifficulty;
  commonRootPattern: string;
  commonCanalPattern: string;
  importantVariation: string;
  clinicalNote: string;
  wrongOptions: string[];
  explanation: string;
  sourceRefs: RootCanalSourceRef[];
  evidenceStatus: "course-verified" | "needs-review";
};

export type RootCanalMatchCatalog = {
  schemaVersion: 1;
  records: RootCanalMatchRecord[];
};

export const ROOT_CANAL_CHALLENGE_LENGTH = 3;

const VALID_ROOT_CANAL_OUTCOMES = new Set([
  "0:0:0",
  "1:1:110",
  "2:1:220",
  "2:2:230",
  "3:3:360",
]);

export function isValidRootCanalRound(input: {
  score: number;
  bestStreak: number;
  correct: number;
  attempts: number;
  masteryEntries: Array<{
    correct: number;
    attempts: number;
    difficulty: RootCanalDifficulty | undefined;
  }>;
}) {
  const difficulties = new Set(input.masteryEntries.map((entry) => entry.difficulty));
  return (
    input.attempts === ROOT_CANAL_CHALLENGE_LENGTH &&
    input.masteryEntries.length === ROOT_CANAL_CHALLENGE_LENGTH &&
    input.masteryEntries.every(
      (entry) => entry.attempts === 1 && (entry.correct === 0 || entry.correct === 1),
    ) &&
    difficulties.size === 1 &&
    !difficulties.has(undefined) &&
    VALID_ROOT_CANAL_OUTCOMES.has(`${input.correct}:${input.bestStreak}:${input.score}`)
  );
}

export function answerForRecord(record: RootCanalMatchRecord) {
  if (record.difficulty === "basic") return record.commonRootPattern;
  if (record.difficulty === "intermediate") return record.commonCanalPattern;
  return record.importantVariation;
}
