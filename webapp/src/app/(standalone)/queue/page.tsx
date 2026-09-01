import { permanentRedirect } from "next/navigation";

export default function LegacyQueueHomePage() {
  permanentRedirect("/");
}
