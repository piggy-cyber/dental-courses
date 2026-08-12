import snapshot from "@/data/d2-canvas-calendar.json";

export type CanvasEventKind = "class" | "exam" | "lab" | "competency" | "zoom";

export type D2CanvasCalendarEvent = {
  uid: string;
  courseCode: string;
  title: string;
  eventKind: CanvasEventKind;
  date: string;
  classStart: string | null;
  classEnd: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location: string | null;
  canvasUrl: string | null;
};

export type D2CanvasCalendarSnapshot = {
  sourceLabel: string;
  downloadedAt: string;
  eventCount: number;
  events: D2CanvasCalendarEvent[];
};

export const d2CanvasCalendar = snapshot as D2CanvasCalendarSnapshot;
