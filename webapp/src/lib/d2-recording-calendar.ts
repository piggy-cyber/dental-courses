export type RecordingStatus = "scheduled" | "recorded" | "not-recorded" | "not-scheduled" | "unknown";

export type D2Course = {
  code: string;
  name: string;
  canvasUrl: string;
  echoUrl: string;
};

export type D2RecordingEvent = {
  id: string;
  courseId: CourseId;
  date: string;
  classStart: string;
  classEnd: string;
  recordingStart: string | null;
  recordingEnd: string | null;
  title: string;
  recordingStatus: RecordingStatus;
  moduleName: string;
  moduleConfidence: string;
  scheduleFolder: string;
  moduleDir?: string;
  lecture: readonly string[];
  lab: readonly string[];
  canvasUrl: string;
  echoUrl: string | null;
  source: string;
};

export const courses = {
  "REHE-257": {
    code: "REHE 257",
    name: "Prosthodontic Technology",
    canvasUrl: "https://canvas.case.edu/courses/53680",
    echoUrl: "https://canvas.case.edu/courses/53680/external_tools/23168",
  },
  "HWDP-232": {
    code: "HWDP 232",
    name: "Renal & Hematologic Systems",
    canvasUrl: "https://canvas.case.edu/courses/53823",
    echoUrl: "https://canvas.case.edu/courses/53823/external_tools/23168",
  },
  "REHE-262": {
    code: "REHE 262",
    name: "Basic Restorative Dentistry II",
    canvasUrl: "https://canvas.case.edu/courses/53681",
    echoUrl: "https://canvas.case.edu/courses/53681/external_tools/23168",
  },
  "REHE-259": {
    code: "REHE 259",
    name: "Basic Fixed Prosthodontics II",
    canvasUrl: "https://canvas.case.edu/courses/53683",
    echoUrl: "https://canvas.case.edu/courses/53683/external_tools/23168",
  },
  "REHE-264": {
    code: "REHE 264",
    name: "Endodontics",
    canvasUrl: "https://canvas.case.edu/courses/53652",
    echoUrl: "https://canvas.case.edu/courses/53652/external_tools/23168",
  },
  "REMA-261": {
    code: "REMA 261",
    name: "Preclinical Orthodontics",
    canvasUrl: "https://canvas.case.edu/courses/53844",
    echoUrl: "https://canvas.case.edu/courses/53844/external_tools/23168",
  },
  "HWDP-245": {
    code: "HWDP 245",
    name: "Musculoskeletal System",
    canvasUrl: "https://canvas.case.edu/courses/53842",
    echoUrl: "https://canvas.case.edu/courses/53842/external_tools/23168",
  },
} satisfies Record<string, D2Course>;

export type CourseId = keyof typeof courses;

const echoRows = [
  ["HWDP-232", "2026-08-10", "08:00", "09:59", "R&B: Renal Structure & Function", "recorded"],
  ["HWDP-232", "2026-08-10", "10:00", "12:00", "R&B: Blood Cells", "recorded"],
  ["HWDP-232", "2026-08-12", "08:00", "10:00", "R&B: Lymphatic Organs"],
  ["HWDP-232", "2026-08-12", "10:00", "12:00", "R&B: Functional Anatomy"],
  ["HWDP-232", "2026-08-17", "08:00", "10:00", "R&B: Reabsorption & Secretion"],
  ["HWDP-232", "2026-08-17", "10:00", "12:00", "R&B: Regulation fo Body Fluids"],
  ["HWDP-232", "2026-08-19", "08:00", "10:00", "R&B: Regulation of BP"],
  ["HWDP-232", "2026-08-19", "10:00", "12:00", "R&B: Integrated Renal Physiology"],
  ["HWDP-232", "2026-09-02", "10:00", "12:00", "R&B: Case Studies & Review"],

  ["REHE-262", "2026-08-12", "13:00", "14:00", "BP Resto: 08-12"],
  ["REHE-262", "2026-08-19", "13:00", "14:00", "BP Resto: 08-19"],
  ["REHE-262", "2026-08-26", "13:00", "14:00", "BP Resto: 08-26"],
  ["REHE-262", "2026-09-02", "13:00", "15:00", "BP Resto: 09-02"],
  ["REHE-262", "2026-09-30", "13:00", "14:00", "BP Resto: 09-30"],
  ["REHE-262", "2026-10-07", "13:00", "14:00", "BP Resto: 10-07"],
  ["REHE-262", "2026-10-14", "13:00", "14:00", "BP Resto: 10-14"],
  ["REHE-262", "2026-10-21", "13:00", "14:00", "BP Resto: 10-21"],

  ["REHE-259", "2026-08-14", "08:00", "09:00", "BP Fixed: Intro, Occlusal Adjustments"],
  ["REHE-259", "2026-08-21", "08:00", "09:00", "BP Fixed: Anterior Guidance, Custom Guide Table, Prep Guidelines"],
  ["REHE-259", "2026-08-28", "08:00", "09:00", "BP Fixed: Tx Considerations"],
  ["REHE-259", "2026-09-04", "08:00", "09:00", "BP Fixed: Pontic Design"],
  ["REHE-259", "2026-09-11", "08:00", "09:00", "BP Fixed: Biomechanics"],
  ["REHE-259", "2026-09-18", "08:00", "09:00", "BP Fixed: Resin Bonded FPDs"],
  ["REHE-259", "2026-09-25", "08:00", "09:00", "BP Fixed: Soft Tissue Mgmt, Final Impression"],
  ["REHE-259", "2026-10-16", "08:00", "09:00", "BP Fixed: Ceramics"],
  ["REHE-259", "2026-10-23", "08:00", "09:00", "BP Fixed: Shade Selection, Lab Communication"],
  ["REHE-259", "2026-10-30", "08:00", "09:00", "BP Fixed: Try-In, Soldering, Cementation"],

  ["REHE-264", "2026-08-13", "08:00", "10:00", "Endo: Intro, Instrumentation"],
  ["REHE-264", "2026-08-20", "08:00", "10:00", "Endo: Premolars"],
  ["REHE-264", "2026-08-27", "08:00", "10:00", "Endo: Biomechanical Prep"],
  ["REHE-264", "2026-09-03", "08:00", "10:00", "Endo: Biomechanical Prep"],
  ["REHE-264", "2026-09-24", "08:00", "10:00", "Endo: Review"],

  ["REMA-261", "2026-08-13", "13:00", "14:00", "Ortho: Biologic Response to Ortho Force"],
  ["REMA-261", "2026-08-13", "14:00", "15:00", "Ortho: Biomechanics"],
  ["REMA-261", "2026-08-20", "13:00", "14:00", "Ortho: Limited Ortho Tx"],
  ["REMA-261", "2026-08-20", "14:00", "15:00", "Ortho: Clinical & Rx Indicators"],
  ["REMA-261", "2026-08-27", "13:00", "14:00", "Ortho: 3D Printing"],
  ["REMA-261", "2026-08-27", "14:00", "15:00", "Ortho: Space Mgmt"],
  ["REMA-261", "2026-09-03", "13:00", "15:00", "Ortho: Case Presentations"],
  ["REMA-261", "2026-09-10", "13:00", "14:00", "Ortho: AI"],
  ["REMA-261", "2026-09-10", "14:00", "15:00", "Ortho: Procedures Every Dentist Should Know"],

  ["HWDP-245", "2026-09-03", "15:00", "17:00", "MS: Anatomy"],
  ["HWDP-245", "2026-09-04", "10:00", "12:00", "MS: Skin Histology"],
  ["HWDP-245", "2026-09-10", "15:00", "17:00", "MS: Skeletal Muscle Structure, Excitation"],
  ["HWDP-245", "2026-09-11", "10:00", "12:00", "MS: Muscle Histology"],
  ["HWDP-245", "2026-09-14", "10:00", "12:00", "MS: Muscle Contraction"],
  ["HWDP-245", "2026-09-16", "10:00", "12:00", "MS: Muscle Physiology"],
  ["HWDP-245", "2026-09-21", "08:00", "10:00", "MS: Bone Histology"],
  ["HWDP-245", "2026-09-23", "10:00", "12:00", "MS: Bone Physiology"],
  ["HWDP-245", "2026-09-24", "13:00", "15:00", "MS: Case Studies & Review"],
] as const;

const prosthRows = [
  {
    date: "2026-08-11", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Intro, Preliminary Impressions", moduleName: "Session 1", moduleDir: "05 - Session 1", scheduleFolder: "Folder 00 + Folder 01",
    lecture: ["Introduction of instructors, syllabus & schedule", "Objectives; why a course on dentures", "Equipment; sequence of treatment overview", "Preliminary impressions; mandibular template construction; pouring and trimming casts"],
    lab: ["Make preliminary impressions", "Pour casts", "Trim casts"],
  },
  {
    date: "2026-08-11", classStart: "13:00", classEnd: "16:45", recordingStart: "13:00", recordingEnd: "15:00",
    title: "Anatomy, Custom Trays", moduleName: "Session 2", moduleDir: "06 - Session 2", scheduleFolder: "Folder 01",
    lecture: ["Anatomy of the edentulous maxilla and mandible", "Constructing custom trays", "The edentulous anatomy"],
    lab: ["Make preliminary impressions", "Pour and trim casts", "Fabricate custom trays (White Triad)"],
  },
  {
    date: "2026-08-18", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Myostatic Outline, Border Molding", moduleName: "Session 3", moduleDir: "07 - Session 3", scheduleFolder: "Folder 02",
    lecture: ["Myostatic outline", "Border molding", "Final impressions and impression materials"],
    lab: ["Border mold upper and lower trays", "Make final impressions", "Instructor check-off of myostatic outline drawings"],
  },
  {
    date: "2026-08-18", classStart: "13:00", classEnd: "16:45", recordingStart: "13:00", recordingEnd: "15:00",
    title: "Impression Materials, Beading, Boxing, Pouring", moduleName: "Session 4", moduleDir: "08 - Session 4", scheduleFolder: "Folder 02",
    lecture: ["Impression materials", "Beading, boxing and pouring final impressions", "Trimming the casts"],
    lab: ["Make final impressions", "Bead, box and pour final impressions", "Trim master casts"],
  },
  {
    date: "2026-08-25", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Record Bases", moduleName: "Session 5", moduleDir: "09 - Session 5", scheduleFolder: "Folder 03",
    lecture: ["Constructing record bases and wax occlusal rims", "Anatomy of the edentulous arches", "Auxiliary method to determine initial incisal length"],
    lab: ["Draw posterior palatal seal area", "Construct record bases and wax occlusal rims (Pink Triad)"],
  },
  {
    date: "2026-08-25", classStart: "13:00", classEnd: "16:45", recordingStart: "13:00", recordingEnd: "15:00",
    title: "Mounting Casts", moduleName: "Session 6", moduleDir: "10 - Session 6", scheduleFolder: "Folder 03",
    lecture: ["Vertical dimension of rest and occlusion", "Making the centric relation record", "Mounting upper and lower casts", "Centric relation definitions"],
    lab: ["Mount upper cast", "Establish vertical dimension of occlusion", "Make centric relation record and mount lower cast"],
  },
  {
    date: "2026-09-01", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Wax Occlusal Rims, Speech Considerations", moduleName: "Session 7", moduleDir: "11 - Session 7", scheduleFolder: "Folder 04",
    lecture: ["Refining wax occlusal rims", "Setting upper anterior teeth", "The neutral zone", "Speech considerations"],
    lab: ["Finish mounting casts", "Refine wax occlusal rims", "Prepare new items for Competency #1", "Set maxillary anterior teeth"],
  },
  {
    date: "2026-09-01", classStart: "13:00", classEnd: "16:45", recordingStart: "13:00", recordingEnd: "15:00",
    title: "Setting Anterior Teeth, Pathology", moduleName: "Session 8", moduleDir: "12 - Session 8", scheduleFolder: "Folder 05",
    lecture: ["Setting lower anterior teeth", "Pathology of the edentulous mouth"],
    lab: ["Set lower anterior teeth", "Refine wax", "Prepare new items for Competency #1"],
  },
  {
    date: "2026-09-08", classStart: "08:00", classEnd: "12:00", recordingStart: null, recordingEnd: null,
    title: "Laboratory Competency #1 — Group A", moduleName: "Session 9", moduleDir: "13 - Session 9", scheduleFolder: "Folder 06",
    lecture: ["Laboratory Competency #1 for half the class", "Other half: set upper and lower anterior teeth"],
    lab: ["Border molding", "Final impressions", "Bead, box and pour master cast", "Trim casts"],
  },
  {
    date: "2026-09-08", classStart: "13:00", classEnd: "16:45", recordingStart: null, recordingEnd: null,
    title: "Laboratory Competency #1 — Group B", moduleName: "Session 10", moduleDir: "14 - Session 10", scheduleFolder: "Folder 07",
    lecture: ["Set upper and lower anterior teeth for half the class", "Laboratory Competency #1 for the other half"],
    lab: ["Border molding", "Final impressions", "Bead, box and pour master cast", "Trim casts"],
  },
  {
    date: "2026-09-15", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Setting Lower Posterior Teeth", moduleName: "Session 11", moduleDir: "15 - Session 11", scheduleFolder: "Not listed in source schedule",
    lecture: ["Set lower posterior teeth for lingualized occlusion", "Tooth selection"],
    lab: ["Set lower posterior teeth", "Refine wax"],
  },
  {
    date: "2026-09-15", classStart: "13:00", classEnd: "16:45", recordingStart: "13:00", recordingEnd: "15:00",
    title: "Setting Upper Posterior Teeth", moduleName: "Session 12", moduleDir: "16 - Session 12", scheduleFolder: "Not listed in source schedule",
    lecture: ["Set upper posterior teeth for lingualized occlusion", "Finishing wax contours", "Balanced occlusion and complete dentures"],
    lab: ["Set upper posterior teeth", "Check balanced occlusion", "Refine wax"],
  },
  {
    date: "2026-09-22", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Psychological Factors", moduleName: "Session 14", moduleDir: "17 - Session 14", scheduleFolder: "Folder 10",
    lecture: ["Psychological factors in denture construction — Dr. Victoroff"],
    lab: ["Finish waxing contours of maxillary and mandibular setup"],
  },
  {
    date: "2026-09-22", classStart: "13:00", classEnd: "16:45", recordingStart: null, recordingEnd: null,
    title: "Midterm Exam + Project #1 Due", moduleName: "Session 15", moduleDir: "18 - Session 15 MIDTERM EXAM and Turn in the project #1 for evaluation", scheduleFolder: "Folder 11",
    lecture: ["One-hour midterm exam"],
    lab: ["Finish maxillary and mandibular setup", "Turn in Project #1 by 4:00 PM"],
  },
  {
    date: "2026-09-29", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Implant Overdenture Project", moduleName: "Session 16", moduleDir: "19 - Session 16", scheduleFolder: "Folder 12",
    lecture: ["Implant-supported mandibular overdenture project", "Implant overdentures", "Impressions for implant overdenture exercise"],
    lab: ["Make preliminary impressions", "Make mandibular custom impression tray", "Border mold tray"],
  },
  {
    date: "2026-09-29", classStart: "13:00", classEnd: "16:45", recordingStart: "13:00", recordingEnd: "15:00",
    title: "Retention, Combination Syndrome", moduleName: "Session 17", moduleDir: "20 - Session 17", scheduleFolder: "Folder 13",
    lecture: ["Denture retention", "The combination syndrome — literature and clinical case"],
    lab: ["Make final impression", "Bead, box and pour final impressions", "Trim cast"],
  },
  {
    date: "2026-10-06", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Placing Implant Parts", moduleName: "Session 18", moduleDir: "21 - Session 18", scheduleFolder: "Not listed in source schedule",
    lecture: ["Direct and indirect methods of placing prosthetic implant parts", "Vertical dimension"],
    lab: ["Construct registration base and wax occlusal rim", "Simulate indirect retainer placement", "Perform direct retainer-head placement"],
  },
  {
    date: "2026-10-06", classStart: "13:00", classEnd: "16:45", recordingStart: "13:00", recordingEnd: "15:00",
    title: "Mounting Review", moduleName: "Session 19", moduleDir: "22 - Session 19", scheduleFolder: "Folder 14",
    lecture: ["Review maxillary and mandibular cast mounting", "Interarch relation and centric relation records", "Maxillary wax occlusal rim"],
    lab: ["Wax occlusal rim try-in", "Mount maxillary cast", "Create interarch record and mount mandibular casts"],
  },
  {
    date: "2026-10-13", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Tooth Selection", moduleName: "Session 20", moduleDir: "23 - Session 20", scheduleFolder: "Folder 15",
    lecture: ["Tooth selection — shape, size and shade", "Esthetics and characterization"],
    lab: ["Finish implant parts placement", "Maxillary anterior tooth setup", "Refine wax"],
  },
  {
    date: "2026-10-13", classStart: "13:00", classEnd: "16:45", recordingStart: "13:00", recordingEnd: "15:00",
    title: "Dental Exam, PPS", moduleName: "Session 21", moduleDir: "24 - Session 21", scheduleFolder: "Folder 16",
    lecture: ["Dental examination, medical and pre-prosthetic concerns", "Evaluate the prospective patient", "Residual ridge and tissue morphology", "Posterior palatal seal"],
    lab: ["Mandibular anterior tooth setup", "Mandibular posterior tooth setup"],
  },
  {
    date: "2026-10-20", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Try-In Appointment", moduleName: "Session 22", moduleDir: "25 - Session 22", scheduleFolder: "Folder 17",
    lecture: ["The try-in appointment", "The laboratory prescription"],
    lab: ["Maxillary posterior tooth setup", "Refine wax", "Complete waxing and occlusal adjustment"],
  },
  {
    date: "2026-10-20", classStart: "13:00", classEnd: "16:45", recordingStart: "13:00", recordingEnd: "15:00",
    title: "Lab Processing, Delivery", moduleName: "Session 23", moduleDir: "26 - Session 23", scheduleFolder: "Folder 18",
    lecture: ["Laboratory processing of trial dentures", "Delivery of the dentures"],
    lab: [],
  },
  {
    date: "2026-10-27", classStart: "08:00", classEnd: "12:00", recordingStart: "08:00", recordingEnd: "10:00",
    title: "Digital Denture Teeth Set-Up", moduleName: "Session 24", moduleDir: "27 - Session 24", scheduleFolder: "Folder 19",
    lecture: ["Introduction to digital denture teeth setup exercise — Dr. Turkyilmaz"],
    lab: ["Digital denture tooth setup", "Continue finishing case waxing", "Occlusal adjustment"],
  },
  {
    date: "2026-10-27", classStart: "13:00", classEnd: "16:45", recordingStart: null, recordingEnd: null,
    title: "Final Comprehensive Written Examination", moduleName: "Session 25", moduleDir: "28 - Session 25", scheduleFolder: "Folder 20",
    lecture: ["Final comprehensive written examination"],
    lab: ["Turn in Implant-Supported Mandibular Overdenture Project #2 by 4:00 PM"],
  },
] as const;

const moduleDefaults: Partial<Record<CourseId, string>> = {
  "REMA-261": "01 - Preclinical Orthodontics (course-level module)",
};


const echoEvents: D2RecordingEvent[] = echoRows.map(([courseId, date, start, end, title, status = "scheduled"], index) => {
  const course = courses[courseId];
  return {
    id: `echo-${courseId.toLowerCase()}-${date}-${start.replace(":", "")}-${index}`,
    courseId,
    date,
    classStart: start,
    classEnd: end,
    recordingStart: start,
    recordingEnd: end,
    title,
    recordingStatus: status as RecordingStatus,
    moduleName: moduleDefaults[courseId] || "Module not mapped yet",
    moduleConfidence: moduleDefaults[courseId] ? "course-level" : "unmapped",
    scheduleFolder: "Not mapped",
    lecture: [],
    lab: [],
    canvasUrl: course.canvasUrl,
    echoUrl: course.echoUrl,
    source: "Echo360 class schedule",
  };
});

const prosthEvents: D2RecordingEvent[] = prosthRows.map((row, index) => ({
  id: `prosth-${row.date}-${row.classStart.replace(":", "")}-${index}`,
  courseId: "REHE-257",
  ...row,
  recordingStatus: row.recordingStart ? "scheduled" : "not-scheduled",
  moduleConfidence: "confirmed",
  canvasUrl: courses["REHE-257"].canvasUrl,
  echoUrl: row.recordingStart ? courses["REHE-257"].echoUrl : null,
  source: "2026 REHE 257/267 schedule + Echo360",
}));

const unpublishedCourses = [
  "Clinical Observation and Assisting II (100/12374)",
  "Digital Dentistry I (100/14876)",
  "Endocrine and Reproductive Systems in Health and Disease (100/11898)",
  "Neuroscience in Health and Disease (100/11966)",
  "Preventive Periodontics (100/11910)",
];

export const d2RecordingCalendar = {
  checkedAt: "2026-08-11T08:49:00-04:00",
  sourceLabel: "2026 REHE 257/267 schedule + Echo360 class schedules",
  courses,
  events: [...echoEvents, ...prosthEvents],
  unpublishedCourses,
} as const;
