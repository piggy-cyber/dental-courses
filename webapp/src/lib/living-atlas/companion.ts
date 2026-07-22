import type { LivingAtlasCollectible } from "./types";

export const LIVING_ATLAS_DEFAULT_COMPANION_ID = "white-holland-lop" as const;

export const LIVING_ATLAS_COLLECTIBLES: Omit<LivingAtlasCollectible, "unlockedAt" | "locked">[] = [
  {
    id: "first-survey",
    title: "First Survey",
    description: "Chart your first released Dental Anatomy concept.",
    kind: "badge",
  },
  {
    id: "first-insight",
    title: "First Insight",
    description: "Bring one concept to Mastered status.",
    kind: "lore",
  },
  {
    id: "echo-gardener",
    title: "Echo Gardener",
    description: "Repair an Echo through a later, stronger response.",
    kind: "companion",
  },
  {
    id: "domain-cartographer",
    title: "Domain Cartographer",
    description: "Survey every released Dental Anatomy domain.",
    kind: "badge",
  },
  {
    id: "archive-keeper",
    title: "Archive Keeper",
    description: "Attempt every released concept in this bank version.",
    kind: "lore",
  },
  {
    id: "prosthodontic-golden-crown",
    title: "Golden Crown",
    description: "A future Prosthodontics relic for the player and companion.",
    kind: "relic",
    futureCourse: "Prosthodontics",
  },
];
