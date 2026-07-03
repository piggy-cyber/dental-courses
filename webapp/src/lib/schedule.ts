// Reads today's events from a Canvas calendar feed (.ics URL).
// The feed URL stays server-side in the CANVAS_ICS_URL env var; it is never
// sent to the browser. If the variable is not set, the section is hidden.

export type TodayEvent = { time: string; title: string };

function unfoldIcsLines(text: string): string[] {
  // ICS wraps long lines; continuation lines start with a space or tab.
  return text
    .replace(/\r\n[ \t]/g, "")
    .replace(/\r/g, "")
    .split("\n");
}

function parseIcsDate(value: string): Date | null {
  // Handles 20250911T130000Z, 20250911T130000, and 20250911 (all-day).
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0", z] = m;
  if (z === "Z") {
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  }
  // Treat floating/TZID times as campus-local (America/New_York).
  return new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

export async function getTodaysSchedule(): Promise<TodayEvent[] | null> {
  const feedUrl = process.env.CANVAS_ICS_URL;
  if (!feedUrl) return null;

  try {
    const res = await fetch(feedUrl, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const lines = unfoldIcsLines(await res.text());

    const easternToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const events: { start: Date; allDay: boolean; title: string }[] = [];
    let current: { start?: Date; allDay?: boolean; title?: string } | null = null;

    for (const line of lines) {
      if (line === "BEGIN:VEVENT") current = {};
      else if (line === "END:VEVENT" && current) {
        if (current.start && current.title) {
          events.push({
            start: current.start,
            allDay: current.allDay ?? false,
            title: current.title,
          });
        }
        current = null;
      } else if (current) {
        if (line.startsWith("DTSTART")) {
          const value = line.slice(line.indexOf(":") + 1).trim();
          current.start = parseIcsDate(value) ?? undefined;
          current.allDay = !value.includes("T");
        } else if (line.startsWith("SUMMARY")) {
          current.title = line
            .slice(line.indexOf(":") + 1)
            .replace(/\\,/g, ",")
            .replace(/\\;/g, ";")
            .replace(/\\n/g, " ")
            .trim();
        }
      }
    }

    const timeFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    });
    const dayFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return events
      .filter((event) => dayFmt.format(event.start) === easternToday)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((event) => ({
        time: event.allDay ? "All day" : timeFmt.format(event.start),
        title: event.title,
      }));
  } catch {
    return null;
  }
}
