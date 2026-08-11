export const CLINIC_DUTY_BUCKET = "sim-clinic-duty";

export const CLINIC_DUTY_CHECKLIST = [
  { id: "shared_counters", label: "Shared counters", detail: "Wiped clean with no material or debris left to dry." },
  { id: "work_surfaces", label: "Work surfaces", detail: "Shared work surfaces are cleared and clean." },
  { id: "dispensing_areas", label: "Dispensing areas", detail: "Shared dispensing areas are orderly and free of residue." },
  { id: "sinks_faucets", label: "Sinks and faucets", detail: "Basins, fixtures, and nearby surfaces are clean." },
  { id: "floors", label: "Floors", detail: "Visible debris and dropped material have been removed." },
  { id: "aisles", label: "Aisles", detail: "Aisles are clear and safe to walk through." },
  { id: "trash_recycling", label: "Trash and recycling", detail: "Shared bins are handled according to clinic procedure." },
  { id: "shared_equipment", label: "Shared equipment", detail: "Shared equipment is clean, returned, and ready for the next group." },
  { id: "stools_chairs", label: "Stools and chairs", detail: "Shared seating is clean and returned to place." },
  { id: "clear_pathways", label: "Clear pathways", detail: "Doors, exits, and circulation paths are unobstructed." },
  { id: "supply_problems", label: "Supply check", detail: "Missing, low, or damaged shared supplies have been reported." },
  { id: "final_walkthrough", label: "Final walkthrough", detail: "Both Lab and Sim Clinic shared spaces received a final visual check." },
] as const;

export type ClinicDutyChecklistId = (typeof CLINIC_DUTY_CHECKLIST)[number]["id"];
export type ClinicDutyChecklist = Record<ClinicDutyChecklistId, boolean>;
