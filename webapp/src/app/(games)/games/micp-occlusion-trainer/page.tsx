import type { Metadata } from "next";
import { MicpOcclusionTrainer } from "@/components/games/MicpOcclusionTrainer";

export const metadata: Metadata = {
  title: "MICP Occlusion Trainer",
  description: "A review-gated MICP relationship study module.",
};

export default function MicpOcclusionTrainerPage() {
  return <MicpOcclusionTrainer />;
}
