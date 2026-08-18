import type { Metadata } from "next";
import { LabHelpQueue } from "@/components/LabHelpQueue";

export const metadata: Metadata = {
  title: "Lab Help Queue",
  description: "Join the preclinical lab help queue and see the current line.",
  robots: "noindex, nofollow, noarchive",
};

export default function LabHelpQueuePage() {
  return <LabHelpQueue />;
}
