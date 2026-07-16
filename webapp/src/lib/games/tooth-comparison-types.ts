export type EvidenceStatus = "course-verified" | "needs-review";

export type ToothComparisonChoice = {
  id: "A" | "B";
  label: string;
};

export type ToothComparisonFeatureType =
  | "crown-shape"
  | "symmetry"
  | "lingual-anatomy"
  | "root-pattern"
  | "ridge-groove"
  | "arch-clue"
  | "clinical-identification";

export type ToothComparisonRowLabel =
  | "Crown shape"
  | "Lingual anatomy"
  | "Root pattern"
  | "Ridge/groove clue"
  | "Arch clue"
  | "Clinical identification clue";

export type SourceRef = {
  courseCode: string;
  sourceName: string;
  locator: string;
};

export type ComparisonTooth = {
  id: string;
  label: string;
  universal: string;
  family: string;
  visualId: string;
};

export type ToothComparisonRow = {
  label: ToothComparisonRowLabel;
  toothA: string;
  toothB: string;
};

export type ToothComparisonQuestion = {
  id: string;
  featureType: ToothComparisonFeatureType;
  toothA: ComparisonTooth;
  toothB: ComparisonTooth;
  prompt: string;
  choices: ToothComparisonChoice[];
  correctChoice: "A" | "B";
  explanation: string;
  distractorExplanation: string;
  comparisonRows: ToothComparisonRow[];
  commonTrap: string;
  sourceRefs: SourceRef[];
  evidenceStatus: EvidenceStatus;
};

export type ToothComparisonDataset = {
  schemaVersion: 1;
  questions: ToothComparisonQuestion[];
};

export function getToothComparisonMasteryKey(
  question: Pick<ToothComparisonQuestion, "toothA" | "featureType">,
) {
  return `${question.toothA.family}|${question.featureType}`;
}

export function parseToothComparisonMasteryKey(key: string) {
  const separator = key.lastIndexOf("|");
  if (separator < 1 || separator === key.length - 1) return null;
  return {
    family: key.slice(0, separator),
    featureType: key.slice(separator + 1) as ToothComparisonFeatureType,
  };
}
