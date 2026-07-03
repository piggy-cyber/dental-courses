// Reads today's events from a Canvas calendar feed (.ics URL).
// The feed URL stays server-side; it is never sent to the browser.

export type ScheduleEvent = {
  dateLabel: string;
  time: string;
  title: string;
};

export type ScheduleResult = {
  heading: "Today" | "Upcoming";
  events: ScheduleEvent[];
};

const CAMPUS_TIME_ZONE = "America/New_York";

function unfoldIcsLines(text: string): string[] {
  // ICS wraps long lines; continuation lines start with a space or tab.
  return text
    .replace(/\r\n[ \t]/g, "")
    .replace(/\r/g, "")
    .split("\n");
}

function partsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localTimeInZoneToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const zoned = partsInZone(guess, timeZone);
  const zonedAsUtc = Date.UTC(
    Number(zoned.year),
    Number(zoned.month) - 1,
    Number(zoned.day),
    Number(zoned.hour),
    Number(zoned.minute),
    Number(zoned.second)
  );
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(guess.getTime() + targetAsUtc - zonedAsUtc);
}

function parseIcsDate(value: string, timeZone = CAMPUS_TIME_ZONE): Date | null {
  // Handles 20250911T130000Z, 20250911T130000, and 20250911 (all-day).
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0", z] = m;
  if (z === "Z") {
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  }
  return localTimeInZoneToDate(+y, +mo, +d, +h, +mi, +s, timeZone);
}

function parseDateStart(line: string) {
  const colonIndex = line.indexOf(":");
  if (colonIndex < 0) return null;

  const meta = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1).trim();
  const timeZone = meta.match(/TZID=([^;:]+)/)?.[1] ?? CAMPUS_TIME_ZONE;
  const date = parseIcsDate(value, timeZone);
  if (!date) return null;

  return {
    date,
    allDay: !value.includes("T"),
  };
}

function dateLabelFor(start: Date) {
  const todayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const labelFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const today = todayFmt.format(new Date());
  const eventDay = todayFmt.format(start);
  if (eventDay === today) return "Today";
  return labelFmt.format(start);
}

export async function getTodaysSchedule(feedUrl?: string | null): Promise<ScheduleResult | null> {
  if (!feedUrl) return null;

  try {
    const res = await fetch(feedUrl, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const lines = unfoldIcsLines(await res.text());

    const easternToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: CAMPUS_TIME_ZONE,
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
          const start = parseDateStart(line);
          current.start = start?.date;
          current.allDay = start?.allDay;
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
      timeZone: CAMPUS_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
    });
    const dayFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: CAMPUS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const sortedEvents = events
      .slice()
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    const todaysEvents = sortedEvents
      .filter((event) => dayFmt.format(event.start) === easternToday)
      .map((event) => ({
        dateLabel: "Today",
        time: event.allDay ? "All day" : timeFmt.format(event.start),
        title: event.title,
      }));

    if (todaysEvents.length > 0) {
      return { heading: "Today", events: todaysEvents };
    }

    const now = new Date();
    const upcomingEvents = sortedEvents
      .filter(
        (event) =>
          dayFmt.format(event.start) > easternToday || (!event.allDay && event.start >= now)
      )
      .slice(0, 6)
      .map((event) => ({
        dateLabel: dateLabelFor(event.start),
        time: event.allDay ? "All day" : timeFmt.format(event.start),
        title: event.title,
      }));

    return {
      heading: "Upcoming",
      events: upcomingEvents,
    };
  } catch {
    return null;
  }
}
