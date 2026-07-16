import eruptionCatalogJson from "@/data/games/eruption-data.json";

export type EruptionDentition = "permanent" | "primary" | "mixed";
export type EruptionArch = "maxillary" | "mandibular";
export type EruptionAgeUnit = "months" | "years";
export type TimelineSet = "permanent" | "primary" | "mixed";
export type SequenceBand =
  | "early"
  | "middle"
  | "late"
  | "third-molar"
  | "early-mixed"
  | "transitional-mixed"
  | "late-mixed";
export type EruptionToothType = "incisor" | "canine" | "premolar" | "molar";
export type EvidenceStatus = "course-verified" | "needs-review";

export type EruptionSourceRef = {
  courseCode: string;
  sourceName: string;
  locator: string;
};

export type EruptionRecord = {
  id: string;
  toothName: string;
  toothNumber?: string;
  toothType: EruptionToothType;
  dentitionType: EruptionDentition;
  arch: EruptionArch;
  eruptionRange: {
    min: number;
    max: number;
  };
  typicalRange?: {
    min: number;
    max: number;
  };
  ageUnit: EruptionAgeUnit;
  sequenceRank: number;
  sequenceBand: SequenceBand;
  explanation: string;
  commonConfusion: string;
  sourceRefs: EruptionSourceRef[];
  evidenceStatus: EvidenceStatus;
  timelineSet: TimelineSet;
};

export type EruptionCatalog = {
  schemaVersion: 1;
  records: EruptionRecord[];
};

export const eruptionCatalog = eruptionCatalogJson as EruptionCatalog;

export function rangeInMonths(record: EruptionRecord) {
  const multiplier = record.ageUnit === "years" ? 12 : 1;
  return {
    min: record.eruptionRange.min * multiplier,
    max: record.eruptionRange.max * multiplier,
  };
}

export function formatEruptionRange(record: EruptionRecord) {
  if (record.typicalRange) {
    return `${record.typicalRange.min}-${record.typicalRange.max} typical · to ${record.eruptionRange.max} ${record.ageUnit}`;
  }
  return `${record.eruptionRange.min}-${record.eruptionRange.max} ${record.ageUnit}`;
}
