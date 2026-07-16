import type { Metadata } from "next";
import { KineticEnamelPreview } from "@/components/kinetic-preview/KineticEnamelPreview";

export const metadata: Metadata = {
  title: "Kinetic Enamel Preview",
  description: "An interactive Fourth Canal interface concept.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UiPreviewPage() {
  return <KineticEnamelPreview />;
}
