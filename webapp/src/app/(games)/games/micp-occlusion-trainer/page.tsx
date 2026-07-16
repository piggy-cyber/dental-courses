import type { Metadata } from "next";
import { MicpOcclusionTrainer } from "@/components/games/MicpOcclusionTrainer";

export const metadata: Metadata = {
  title: "MICP Occlusion Trainer",
  description: "A review-gated MICP relationship workspace for Fourth Canal students.",
};

export default function MicpOcclusionTrainerPage() {
  return <MicpOcclusionTrainer />;
}
