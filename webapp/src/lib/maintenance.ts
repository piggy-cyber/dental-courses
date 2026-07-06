export const CBRE_REQUEST_URL = "https://cmms.serviceinsight.cbre.com/requests";
export const CBRE_PHONE = "1-855-240-0142";
export const HEC_ADDRESS = "9501 Euclid Avenue";

export const MAINTENANCE_BUILDINGS = [
  { id: "samson", label: "Samson Pavilion" },
] as const;

export const MAINTENANCE_DEPARTMENTS = [
  { id: "dmd-clinic", label: "DMD Student Clinic" },
] as const;

export const MAINTENANCE_ISSUES = [
  { id: "projector", label: "Projector / display" },
  { id: "hvac", label: "Temperature / HVAC" },
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical / lights" },
  { id: "furniture", label: "Furniture" },
  { id: "other", label: "Other" },
] as const;

export type MaintenanceRequest = {
  building: string;
  department: string;
  room: string;
  station: string;
  issue: string;
  notes: string;
  reporterName: string;
};

export function formatMaintenanceRequestText(req: MaintenanceRequest): string {
  const lines = [
    `Location: ${HEC_ADDRESS}`,
    `Building: ${req.building}`,
    `Department: ${req.department}`,
    `Room: ${req.room}`,
  ];

  if (req.station.trim()) {
    lines.push(`Station number: ${req.station.trim()}`);
  }

  lines.push(`Issue: ${req.issue}`, `Reported by: ${req.reporterName}`);

  if (req.notes.trim()) {
    lines.push(`Notes: ${req.notes.trim()}`);
  }

  return lines.join("\n");
}

export function formatMaintenanceGroupMeText(req: MaintenanceRequest): string {
  const location = req.station.trim()
    ? `${req.building} · Sim Lab station ${req.station.trim()}`
    : `${req.building} · Room ${req.room}`;

  let text = `Classroom issue reported\n${req.reporterName} · ${location}\nIssue: ${req.issue}`;

  if (req.notes.trim()) {
    text += `\n${req.notes.trim()}`;
  }

  text += `\nCBRE ticket submitted · Urgent? Call ${CBRE_PHONE}`;
  return text;
}
