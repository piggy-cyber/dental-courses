"use client";

import { usePathname } from "next/navigation";

const CANAL_PATHS = [
  "M8 3C2 35 12 61 6 91C2 116 9 145 8 171",
  "M20 2C13 34 24 62 18 91C13 119 21 145 20 171",
  "M32 4C25 35 36 62 30 92C25 118 33 146 32 171",
  "M44 8C37 37 48 65 42 95C37 120 45 147 43 171",
] as const;

function routeLabel(pathname: string) {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/guides")) return "Study guides";
  if (pathname.startsWith("/games")) return "Games";
  if (pathname.startsWith("/grade-calculator")) return "Grade calculator";
  if (pathname.startsWith("/about")) return "About";
  if (pathname.startsWith("/admin")) return "Administration";
  if (pathname.startsWith("/home")) return "Today";
  if (pathname.startsWith("/library") || pathname.startsWith("/course") || pathname.startsWith("/resource")) return "Private library";
  if (pathname.startsWith("/contacts")) return "Contacts";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/legal")) return "Legal";
  return "Fourth Canal";
}

export function GlobalCanalProgress() {
  const pathname = usePathname();
  const isIsolatedAtlasSession = pathname.startsWith("/games/living-atlas/runs/") || pathname.startsWith("/games/living-atlas/recall/");
  if (isIsolatedAtlasSession) return null;
  const isGame = pathname === "/games" || pathname.startsWith("/games/");
  const label = routeLabel(pathname);

  function advancePage() {
    const travel = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    if (travel === 0) return;
    const progress = window.scrollY / travel;
    const destination = progress > 0.92
      ? 0
      : Math.min(window.scrollY + window.innerHeight * 0.82, travel);
    window.scrollTo({
      top: destination,
      behavior: document.documentElement.dataset.fcMotion === "off" ? "auto" : "smooth",
    });
  }

  return (
    <aside
      className="fc-global-canal-progress"
      data-game={isGame ? "true" : "false"}
      aria-label={`${label} page progress`}
    >
      <button type="button" onClick={advancePage} title="Move down the page; from the bottom, return to the top">
        <span className="fc-global-canal-route">{label}</span>
        <svg viewBox="0 0 52 176" role="img" aria-labelledby="fc-global-canal-title">
          <title id="fc-global-canal-title">Four canal strands; the copper fourth canal fills as you scroll</title>
          {CANAL_PATHS.slice(0, 3).map((path, index) => (
            <path key={path} d={path} className={`fc-global-canal-strand fc-global-canal-strand-${index + 1}`} pathLength="1" />
          ))}
          <path d={CANAL_PATHS[3]} className="fc-global-canal-strand fc-global-canal-strand-4" pathLength="1" />
          <path d={CANAL_PATHS[3]} className="fc-global-canal-fill" pathLength="1" />
        </svg>
        <span className="fc-global-canal-index"><b>04</b><small>scroll</small></span>
      </button>
    </aside>
  );
}
