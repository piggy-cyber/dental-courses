import type {
  BuccolingualLocation,
  ContactAreaRecord,
  ContactLocation,
  ContactQuestion,
  ContactQuestionKind,
  ContactSurface,
} from "./contact-area-types";

const HEIGHT_RANK: Record<ContactLocation, number> = {
  "incisal-third": 0,
  "occlusal-third": 0,
  "incisal-middle-junction": 1,
  "occlusal-middle-junction": 1,
  "middle-third": 2,
};

export const QUESTION_KINDS: ContactQuestionKind[] = [
  "adjacent",
  "mark-contact",
  "mark-faciolingual",
  "compare-height",
  "no-contact",
];

export function segmentForRecord(record: ContactAreaRecord) {
  return /incisor|canine/i.test(record.toothName) ? "anterior" : "posterior";
}

export function formatContactLocation(location: ContactLocation | null) {
  if (!location) return "Not mapped";
  return location
    .replace("incisal-middle-junction", "Incisal-middle junction")
    .replace("occlusal-middle-junction", "Occlusal-middle junction")
    .replace("incisal-third", "Incisal third")
    .replace("occlusal-third", "Occlusal third")
    .replace("middle-third", "Middle third");
}

export function formatBuccolingualLocation(location: BuccolingualLocation | null) {
  if (!location) return "Not mapped";
  return location
    .replace("facial-middle-junction", "Facial-middle junction")
    .replace("facial-third", "Facial third")
    .replace("middle-third", "Middle third");
}

function regionForLocation(location: ContactLocation) {
  if (location.includes("junction")) return "junction";
  if (location.includes("middle")) return "middle";
  return "incisal-occlusal";
}

function regionForBuccolingual(location: BuccolingualLocation) {
  if (location.includes("junction")) return "junction";
  if (location.startsWith("facial")) return "facial";
  return "middle";
}

function masteryCode(
  record: ContactAreaRecord,
  surface: ContactSurface,
  region: string,
) {
  return [
    "contact-area",
    record.arch,
    segmentForRecord(record),
    surface,
    region,
  ].join("|");
}

function toothChoiceLabel(toothNumber: string, toothNames: Map<string, string>) {
  const name = toothNames.get(toothNumber);
  return name ? `#${toothNumber} · ${name}` : `Tooth #${toothNumber}`;
}

function neighborChoices(
  record: ContactAreaRecord,
  correct: string,
  toothNames: Map<string, string>,
) {
  const minimum = record.arch === "maxillary" ? 1 : 17;
  const maximum = record.arch === "maxillary" ? 16 : 32;
  const numeric = Number(record.toothNumber);
  const candidates = [
    correct,
    record.mesialContactTooth,
    record.distalContactTooth,
    String(Math.min(maximum, numeric + 2)),
    String(Math.max(minimum, numeric - 2)),
    record.toothNumber,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)]
    .filter((value) => value !== record.toothNumber || value === correct)
    .slice(0, 4)
    .map((value) => ({ value, label: toothChoiceLabel(value, toothNames) }));
}

export function buildContactQuestionBank(
  records: ContactAreaRecord[],
  toothNames: Map<string, string>,
) {
  const questions: ContactQuestion[] = [];

  for (const record of records.filter((item) => item.evidenceStatus === "course-verified")) {
    for (const surface of ["mesial", "distal"] as const) {
      const neighbor =
        surface === "mesial" ? record.mesialContactTooth : record.distalContactTooth;
      const location =
        surface === "mesial" ? record.mesialContactLocation : record.distalContactLocation;
      const incisoZones =
        surface === "mesial"
          ? record.acceptedTargetRegion.mesialIncisocervical
          : record.acceptedTargetRegion.distalIncisocervical;
      const faciolingualLocation = record.buccolingualContactPosition[surface];
      const faciolingualZones =
        surface === "mesial"
          ? record.acceptedTargetRegion.mesialFaciolingual
          : record.acceptedTargetRegion.distalFaciolingual;

      if (neighbor) {
        questions.push({
          id: `${record.id}-${surface}-neighbor`,
          kind: "adjacent",
          record,
          prompt: `Which tooth contacts the ${surface} surface of #${record.toothNumber}?`,
          instruction: "Choose the adjacent tooth in the same arch.",
          surface,
          axis: "choice",
          choices: neighborChoices(record, neighbor, toothNames),
          correctChoice: neighbor,
          acceptedZones: [],
          correctLabel: toothChoiceLabel(neighbor, toothNames),
          explanation: record.explanation,
          commonTrap: record.commonTrap,
          sourceRefs: record.sourceRefs,
          masteryCode: masteryCode(record, surface, "relationship"),
        });
      }

      if (location && incisoZones.length) {
        questions.push({
          id: `${record.id}-${surface}-height`,
          kind: "mark-contact",
          record,
          prompt: `Mark the ${surface} contact height on #${record.toothNumber}.`,
          instruction: "Select a generous crown region. Junction answers accept either adjoining third.",
          surface,
          axis: "incisocervical",
          choices: [],
          correctChoice: null,
          acceptedZones: incisoZones,
          correctLabel: formatContactLocation(location),
          explanation: record.explanation,
          commonTrap: record.commonTrap,
          sourceRefs: record.sourceRefs,
          masteryCode: masteryCode(record, surface, regionForLocation(location)),
        });
      }

      if (faciolingualLocation && faciolingualZones.length) {
        questions.push({
          id: `${record.id}-${surface}-faciolingual`,
          kind: "mark-faciolingual",
          record,
          prompt: `Where is #${record.toothNumber}'s ${surface} contact faciolingually?`,
          instruction: "Tap the facial/buccal, middle, or lingual third on the occlusal view.",
          surface,
          axis: "faciolingual",
          choices: [],
          correctChoice: null,
          acceptedZones: faciolingualZones,
          correctLabel: formatBuccolingualLocation(faciolingualLocation),
          explanation: record.explanation,
          commonTrap: record.commonTrap,
          sourceRefs: record.sourceRefs,
          masteryCode: masteryCode(record, surface, regionForBuccolingual(faciolingualLocation)),
        });
      }

      if (!neighbor) {
        questions.push({
          id: `${record.id}-${surface}-terminal`,
          kind: "no-contact",
          record,
          prompt: `Which surface of #${record.toothNumber} has no adjacent tooth contact?`,
          instruction: "A terminal tooth still has both proximal surfaces, but only one has a neighbor.",
          surface,
          axis: "choice",
          choices: [
            { value: "mesial", label: "Mesial surface" },
            { value: "distal", label: "Distal surface" },
            { value: "facial", label: "Facial / buccal surface" },
            { value: "lingual", label: "Lingual surface" },
          ],
          correctChoice: surface,
          acceptedZones: [],
          correctLabel: `${surface[0]?.toUpperCase()}${surface.slice(1)} surface`,
          explanation: record.explanation,
          commonTrap: record.commonTrap,
          sourceRefs: record.sourceRefs,
          masteryCode: masteryCode(record, surface, "terminal"),
        });
      }
    }

    if (
      record.mesialContactLocation &&
      record.distalContactLocation &&
      HEIGHT_RANK[record.mesialContactLocation] !== HEIGHT_RANK[record.distalContactLocation]
    ) {
      const correctSurface: ContactSurface =
        HEIGHT_RANK[record.mesialContactLocation] > HEIGHT_RANK[record.distalContactLocation]
          ? "mesial"
          : "distal";
      questions.push({
        id: `${record.id}-compare-height`,
        kind: "compare-height",
        record,
        prompt: `Which contact on #${record.toothNumber} is more cervical?`,
        instruction: "Compare the mesial and distal contact heights from the facial view.",
        surface: correctSurface,
        axis: "choice",
        choices: [
          { value: "mesial", label: "Mesial contact" },
          { value: "distal", label: "Distal contact" },
        ],
        correctChoice: correctSurface,
        acceptedZones: [],
        correctLabel: `${correctSurface[0]?.toUpperCase()}${correctSurface.slice(1)} contact`,
        explanation: record.explanation,
        commonTrap: record.commonTrap,
        sourceRefs: record.sourceRefs,
        masteryCode: masteryCode(record, correctSurface, "height"),
      });
    }
  }

  return questions;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target] as T, copy[index] as T];
  }
  return copy;
}

export function createChallengeRound(questionBank: ContactQuestion[]) {
  const selected = QUESTION_KINDS.flatMap((kind) =>
    shuffle(questionBank.filter((question) => question.kind === kind)).slice(0, 2),
  );

  return shuffle(selected).map((question) => ({
    ...question,
    choices: shuffle(question.choices),
  }));
}
