import type { MicpOcclusionDataset } from "@/lib/games/micp-types";

// Relationship records stay empty until the reserved course sources complete clinical review.
// Future records cannot compile without evidence locators and an explicit evidence status.
export const micpOcclusionDataset: MicpOcclusionDataset = {
  schemaVersion: 1,
  status: "clinical-map-in-review",
  sourceRefs: [],
  evidenceStatus: "needs-review",
  relationships: [],
};
