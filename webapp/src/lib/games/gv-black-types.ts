export type GvBlackClassId = "I" | "II" | "III" | "IV" | "V" | "VI";

export type EvidenceStatus = "course-verified" | "needs-review";

export type SourceRef = {
  courseCode: string;
  sourceName: string;
  locator: string;
};

export type GvBlackDiagramSpec = {
  tooth: "incisor" | "premolar" | "molar";
  view: "occlusal" | "facial" | "lingual" | "proximal";
  lesion:
    | "occlusal-pit-fissure"
    | "buccal-pit"
    | "lingual-pit"
    | "posterior-proximal"
    | "anterior-proximal-no-incisal"
    | "anterior-proximal-incisal"
    | "cervical-third"
    | "posterior-cusp-tip"
    | "anterior-incisal-only";
  markerSide: "left" | "center" | "right";
  label: string;
};

export type GvBlackClass = {
  id: GvBlackClassId;
  masteryKey: string;
  title: string;
  rule: string;
  contrast: string;
  sourceRefs: SourceRef[];
};

export type GvBlackCase = {
  id: string;
  classId: GvBlackClassId;
  prompt: string;
  clinicalCue: string;
  explanation: string;
  diagram: GvBlackDiagramSpec;
  modes: Array<"study" | "challenge">;
  evidenceStatus: EvidenceStatus;
  sourceRefs: SourceRef[];
};

export type GvBlackCatalog = {
  schemaVersion: number;
  gameId: "gv-black-sorter";
  title: string;
  sourceNote: string;
  classes: GvBlackClass[];
  cases: GvBlackCase[];
};
