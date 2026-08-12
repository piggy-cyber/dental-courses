#!/usr/bin/env node

import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const D2_CANVAS_COURSE_CODES = [
  "HWDP 232",
  "HWDP 245",
  "REHE 257",
  "REHE 259",
  "REHE 262",
  "REHE 264",
  "REMA 261",
];

const CAMPUS_TIME_ZONE = "America/New_York";

function unfoldIcsLines(text) {
  return text.replace(/\r?\n[ \t]/g, "").replace(/\r/g, "").split("\n");
}

function unescapeIcsText(value) {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function partsInZone(date, timeZone = CAMPUS_TIME_ZONE) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
}

function localTimeInZoneToDate(year, month, day, hour, minute, second, timeZone) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const zoned = partsInZone(guess, timeZone);
  const zonedAsUtc = Date.UTC(
    Number(zoned.year),
    Number(zoned.month) - 1,
    Number(zoned.day),
    Number(zoned.hour),
    Number(zoned.minute),
    Number(zoned.second),
  );
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(guess.getTime() + targetAsUtc - zonedAsUtc);
}

function parseIcsDate(line) {
  const colonIndex = line.indexOf(":");
  if (colonIndex < 0) return null;

  const meta = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1).trim();
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!match) return null;

  const [, year, month, day, hour = "0", minute = "0", second = "0", utc] = match;
  const allDay = !value.includes("T");
  const timeZone = meta.match(/TZID=([^;:]+)/)?.[1] ?? CAMPUS_TIME_ZONE;
  const date = utc === "Z"
    ? new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second))
    : localTimeInZoneToDate(+year, +month, +day, +hour, +minute, +second, timeZone);

  return { allDay, date };
}

function valueFor(lines, propertyName) {
  const line = lines.find((candidate) => {
    const name = candidate.slice(0, candidate.indexOf(":"));
    return name === propertyName || name.startsWith(`${propertyName};`);
  });
  if (!line) return "";
  return line.slice(line.indexOf(":") + 1);
}

function lineFor(lines, propertyName) {
  return lines.find((candidate) => {
    const name = candidate.slice(0, candidate.indexOf(":"));
    return name === propertyName || name.startsWith(`${propertyName};`);
  });
}

function eventKindFor(title) {
  if (/\b(final exam|midterm)\b/i.test(title)) return "exam";
  if (/\bcompetency\b/i.test(title)) return "competency";
  if (/\b(lab|hololens)\b/i.test(title)) return "lab";
  if (/\[zoom\]/i.test(title)) return "zoom";
  return "class";
}

function localCalendarParts(date) {
  const parts = partsInZone(date);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function parseD2CanvasCalendarIcs(text, options = {}) {
  const allowedCourseCodes = new Set(options.courseCodes ?? D2_CANVAS_COURSE_CODES);
  const lines = unfoldIcsLines(text);
  const rawEvents = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = [];
    else if (line === "END:VEVENT" && current) {
      rawEvents.push(current);
      current = null;
    } else if (current) current.push(line);
  }

  return rawEvents.flatMap((eventLines) => {
    const rawSummary = unescapeIcsText(valueFor(eventLines, "SUMMARY"));
    const courseCode = rawSummary.match(/\[([^\]]+)\]\s*$/)?.[1]?.trim() ?? "";
    if (!allowedCourseCodes.has(courseCode)) return [];

    const start = parseIcsDate(lineFor(eventLines, "DTSTART") ?? "");
    const end = parseIcsDate(lineFor(eventLines, "DTEND") ?? "");
    const uid = unescapeIcsText(valueFor(eventLines, "UID"));
    if (!uid || !start || !end) return [];

    const localStart = localCalendarParts(start.date);
    const localEnd = localCalendarParts(end.date);
    const title = rawSummary.replace(new RegExp(`\\s*\\[${courseCode.replace(" ", "\\s+")}\\]\\s*$`), "").trim();

    return [{
      uid,
      courseCode,
      title,
      eventKind: eventKindFor(title),
      date: localStart.date,
      classStart: start.allDay ? null : localStart.time,
      classEnd: end.allDay ? null : localEnd.time,
      startsAt: start.date.toISOString(),
      endsAt: end.date.toISOString(),
      allDay: start.allDay,
      location: unescapeIcsText(valueFor(eventLines, "LOCATION")) || null,
      canvasUrl: unescapeIcsText(valueFor(eventLines, "URL")) || null,
    }];
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.uid.localeCompare(b.uid));
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const input = argumentValue("--input");
  const output = resolve(argumentValue("--output") ?? "src/data/d2-canvas-calendar.json");
  if (!input) {
    throw new Error("Usage: node scripts/import-d2-canvas-calendar.mjs --input /path/to/canvas.ics [--output src/data/d2-canvas-calendar.json]");
  }

  const [text, inputStat] = await Promise.all([readFile(input, "utf8"), stat(input)]);
  const events = parseD2CanvasCalendarIcs(text);
  if (events.length === 0) throw new Error("No D2 course events were found in the Canvas feed.");

  const snapshot = {
    sourceLabel: "Canvas Fall 2026 D2 calendar snapshot",
    downloadedAt: inputStat.mtime.toISOString(),
    eventCount: events.length,
    events,
  };

  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  process.stdout.write(`Imported ${events.length} D2 Canvas events to ${output}\n`);
}

const isEntrypoint = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isEntrypoint) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
