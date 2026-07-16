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

export function answerForRecord(record: RootCanalMatchRecord) {
  if (record.difficulty === "basic") return record.commonRootPattern;
  if (record.difficulty === "intermediate") return record.commonCanalPattern;
  return record.importantVariation;
}
