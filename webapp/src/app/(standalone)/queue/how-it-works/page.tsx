import { permanentRedirect } from "next/navigation";

export default function LegacyHowItWorksPage() {
  permanentRedirect("/queue/instructions");
}
