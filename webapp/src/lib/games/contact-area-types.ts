import type { ToothArch } from "./tooth-types";

export type ContactSurface = "mesial" | "distal";

export type ContactView = "facial" | "occlusal";

export type ContactLocation =
  | "incisal-third"
  | "incisal-middle-junction"
  | "occlusal-third"
  | "occlusal-middle-junction"
  | "middle-third";

export type BuccolingualLocation =
  | "facial-third"
  | "facial-middle-junction"
  | "middle-third";

export type IncisocervicalZone =
  | "mesial-incisal-occlusal"
  | "mesial-middle"
  | "mesial-cervical"
  | "distal-incisal-occlusal"
  | "distal-middle"
  | "distal-cervical";

export type FacioLingualZone = "facial-third" | "middle-third" | "lingual-third";

export type ContactZone = IncisocervicalZone | FacioLingualZone;

export type SourceRef = {
  courseCode: string;
  sourceName: string;
  locator: string;
};

export type EvidenceStatus = "course-verified" | "needs-review";

export type AcceptedTargetRegion = {
  mesialIncisocervical: IncisocervicalZone[];
  distalIncisocervical: IncisocervicalZone[];
  mesialFaciolingual: FacioLingualZone[];
  distalFaciolingual: FacioLingualZone[];
};

export type ContactAreaRecord = {
  id: string;
  toothNumber: string;
  toothName: string;
  arch: ToothArch;
  view: ContactView;
  mesialContactTooth: string | null;
  distalContactTooth: string | null;
  mesialContactLocation: ContactLocation | null;
  distalContactLocation: ContactLocation | null;
  buccolingualContactPosition: {
    mesial: BuccolingualLocation | null;
    distal: BuccolingualLocation | null;
  };
  acceptedTargetRegion: AcceptedTargetRegion;
  explanation: string;
  commonTrap: string;
  sourceRefs: SourceRef[];
  evidenceStatus: EvidenceStatus;
};

export type ContactAreaCatalog = {
  schemaVersion: 1;
  courseCode: string;
  records: ContactAreaRecord[];
};

export type ContactQuestionKind =
  | "adjacent"
  | "mark-contact"
  | "mark-faciolingual"
  | "compare-height"
  | "no-contact";

export type ContactQuestion = {
  id: string;
  kind: ContactQuestionKind;
  record: ContactAreaRecord;
  prompt: string;
  instruction: string;
  surface: ContactSurface;
  axis: "choice" | "incisocervical" | "faciolingual";
  choices: Array<{ value: string; label: string }>;
  correctChoice: string | null;
  acceptedZones: ContactZone[];
  correctLabel: string;
  explanation: string;
  commonTrap: string;
  sourceRefs: SourceRef[];
  masteryCode: string;
};
