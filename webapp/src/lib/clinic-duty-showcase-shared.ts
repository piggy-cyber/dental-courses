export type ClinicDutyShowcaseSlot = {
  id: string;
  position: 1 | 2;
  studentKey: string;
  name: string;
};

export type ClinicDutyShowcaseDate = {
  id: string;
  date: string;
  opensAt: string;
  closesAt: string;
  dateStatus: "open" | "closed";
  closureReason: string | null;
  slots: ClinicDutyShowcaseSlot[];
};

export type ClinicDutyShowcase = {
  term: {
    id: string;
    slug: string;
    label: string;
    startsOn: string;
    endsOn: string;
    timezone: string;
  };
  summary: {
    students: number;
    openDates: number;
    closedDates: number;
    dutySlots: number;
    minimumDuties: number;
    maximumDuties: number;
  };
  dates: ClinicDutyShowcaseDate[];
};

export type ClinicDutyShowcaseCalendarWeek = Array<ClinicDutyShowcaseDate | null>;

export function buildClinicDutyShowcaseCalendar(
  dates: ClinicDutyShowcaseDate[],
  month: string,
): ClinicDutyShowcaseCalendarWeek[] {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];

  const [year, zeroPaddedMonth] = month.split("-");
  const monthIndex = Number(zeroPaddedMonth) - 1;
  const firstWeekday = new Date(Date.UTC(Number(year), monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(Number(year), monthIndex + 1, 0)).getUTCDate();
  const dateByDay = new Map(
    dates
      .filter((date) => date.date.startsWith(`${month}-`))
      .map((date) => [Number(date.date.slice(-2)), date]),
  );
  const cells: Array<ClinicDutyShowcaseDate | null> = Array.from(
    { length: firstWeekday },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(dateByDay.get(day) ?? null);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

export type ClinicDutyShowcaseTermRow = {
  id: string;
  slug: string;
  label: string;
  starts_on: string;
  ends_on: string;
  timezone: string;
};

export type ClinicDutyShowcaseDateRow = {
  id: string;
  duty_date: string;
  opens_at: string;
  closes_at: string;
  status: "open" | "closed";
  closure_reason: string | null;
};

export type ClinicDutyShowcaseSlotRow = {
  id: string;
  duty_date_id: string;
  position: 1 | 2;
  assignee_roster_id: string;
};

export type ClinicDutyShowcaseRosterRow = {
  id: string;
  full_name: string;
};

export const FALL_2026_D2_PREFERRED_NAMES = [
  "Aabid Syed",
  "Aamir Qadri",
  "Abby Siener",
  "Abhi Patel",
  "Adam Yusoff",
  "Adrian Kang",
  "Alisar Makki",
  "Amira Elfeel",
  "Anita Panatch",
  "Blossom Parkinson",
  "Callahan Cowles",
  "Carmen Barghouty",
  "Carson Colahan",
  "Chris Aerni",
  "Claire Proulx",
  "Clara Luisetti",
  "Colby Clavecilla",
  "Dai Ngo",
  "Danean Kim",
  "Daniella Sosonov",
  "Elise Whisman",
  "Elissa Aziz",
  "Emily Yang",
  "Emma Dalton",
  "Enzo Sugameli",
  "Florencia Hilburn",
  "George Labib",
  "Gokul Anirudhan",
  "Ian Loh",
  "Isaac Chavez",
  "Jacqueline Palusak",
  "Joe Eisentraut",
  "Jordan Sobe",
  "Julia Guidone",
  "Julia Kerns",
  "Kadyn Heising",
  "Karandeep Singh",
  "Keinaz Kadkhoda",
  "Kermina Banoub",
  "Kiana Beheshtian",
  "Lily Dorsch",
  "Lina Alsmoudi",
  "Luchen Yu",
  "Maja Jovanovic",
  "Mara Grieshop",
  "Mariam Wahba",
  "Marielle Parks",
  "Max Hardt",
  "Melanie Hribar",
  "Michael Raj",
  "Michelle Huang",
  "Natalie Melert",
  "Nate Dallmann",
  "Neil Desai",
  "Nikita Chhabra",
  "Olivia LaGrasta",
  "Paige Gaynier",
  "Paige Siener",
  "Pierson Hull",
  "Rania Latifi",
  "Raquel Putrus",
  "Reem Hayek",
  "Reese Dehen",
  "Rick Ahn",
  "Rosaly Romero",
  "Sanjula Reddy",
  "Sarah Klingerman",
  "Scott Herman",
  "Seth Lee",
  "Shani Hussain",
  "Sophia Li",
  "Suhani Nog",
  "Tanvi Mallya",
  "Tara Gairing",
  "Taylor Lordo",
  "Tyler Nguyen",
  "Ursula M. Pountou",
  "Xinlin Yang",
  "Za'Niya Walker",
  "Zain Shaikh",
  "Zakir Kassam",
  "Zuhair Rizvi",
] as const;

export function buildClinicDutyShowcase(
  term: ClinicDutyShowcaseTermRow,
  dates: ClinicDutyShowcaseDateRow[],
  slots: ClinicDutyShowcaseSlotRow[],
  roster: ClinicDutyShowcaseRosterRow[],
): ClinicDutyShowcase {
  const identityByRosterId = new Map(
    [...roster]
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
      .map((student, index) => [
        student.id,
        { name: student.full_name, studentKey: `student-${index + 1}` },
      ]),
  );
  const slotsByDateId = new Map<string, ClinicDutyShowcaseSlot[]>();
  const workload = new Map<string, number>();

  for (const slot of slots) {
    const identity = identityByRosterId.get(slot.assignee_roster_id);
    if (!identity) throw new Error(`Missing roster identity for duty slot ${slot.id}.`);

    const transformed: ClinicDutyShowcaseSlot = {
      id: slot.id,
      position: slot.position,
      studentKey: identity.studentKey,
      name: identity.name,
    };
    const dateSlots = slotsByDateId.get(slot.duty_date_id) ?? [];
    dateSlots.push(transformed);
    slotsByDateId.set(slot.duty_date_id, dateSlots);
    workload.set(slot.assignee_roster_id, (workload.get(slot.assignee_roster_id) ?? 0) + 1);
  }

  const transformedDates = dates
    .map((date) => ({
      id: date.id,
      date: date.duty_date,
      opensAt: date.opens_at,
      closesAt: date.closes_at,
      dateStatus: date.status,
      closureReason: date.closure_reason,
      slots: (slotsByDateId.get(date.id) ?? []).sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const date of transformedDates) {
    if (date.dateStatus === "open" && date.slots.length !== 2) {
      throw new Error(`Open duty date ${date.date} must have exactly two assignees.`);
    }
    if (date.dateStatus === "closed" && date.slots.length !== 0) {
      throw new Error(`Closed duty date ${date.date} cannot have assignees.`);
    }
  }

  const dutyCounts = [...workload.values()];

  return {
    term: {
      id: term.id,
      slug: term.slug,
      label: term.label,
      startsOn: term.starts_on,
      endsOn: term.ends_on,
      timezone: term.timezone,
    },
    summary: {
      students: workload.size,
      openDates: transformedDates.filter((date) => date.dateStatus === "open").length,
      closedDates: transformedDates.filter((date) => date.dateStatus === "closed").length,
      dutySlots: slots.length,
      minimumDuties: dutyCounts.length > 0 ? Math.min(...dutyCounts) : 0,
      maximumDuties: dutyCounts.length > 0 ? Math.max(...dutyCounts) : 0,
    },
    dates: transformedDates,
  };
}

export function buildFall2026ShowcaseSnapshot(): ClinicDutyShowcase {
  const closedDates = new Map([
    ["2026-09-07", "University holiday — Labor Day"],
    ["2026-11-26", "University holiday — Thanksgiving recess"],
    ["2026-11-27", "University holiday — Thanksgiving recess"],
  ]);
  const dates: ClinicDutyShowcaseDateRow[] = [];
  const slots: ClinicDutyShowcaseSlotRow[] = [];
  const roster = FALL_2026_D2_PREFERRED_NAMES.map((full_name, index) => ({
    id: `showcase-student-${index}`,
    full_name,
  }));
  let openDateIndex = 0;

  for (let cursor = Date.UTC(2026, 7, 14); cursor <= Date.UTC(2026, 11, 16); cursor += 86_400_000) {
    const calendarDate = new Date(cursor);
    if (calendarDate.getUTCDay() === 0) continue;

    const date = calendarDate.toISOString().slice(0, 10);
    const dateId = `showcase-date-${date}`;
    const isSaturday = calendarDate.getUTCDay() === 6;
    const closureReason = closedDates.get(date) ?? null;
    const utcOffset = date >= "2026-11-01" ? "-05:00" : "-04:00";
    dates.push({
      id: dateId,
      duty_date: date,
      opens_at: `${date}T07:00:00${utcOffset}`,
      closes_at: `${date}T${isSaturday ? "19" : "23"}:00:00${utcOffset}`,
      status: closureReason ? "closed" : "open",
      closure_reason: closureReason,
    });

    if (closureReason) continue;
    const studentIndexes: [number, number] = [
      openDateIndex % 82,
      openDateIndex < 82
        ? (openDateIndex + 27) % 82
        : 22 + ((openDateIndex - 82 + 1) % 22),
    ];
    studentIndexes.forEach((studentIndex, positionIndex) => {
      slots.push({
        id: `${dateId}-slot-${positionIndex + 1}`,
        duty_date_id: dateId,
        position: (positionIndex + 1) as 1 | 2,
        assignee_roster_id: roster[studentIndex].id,
      });
    });
    openDateIndex += 1;
  }

  return buildClinicDutyShowcase(
    {
      id: "showcase-fall-2026",
      slug: "fall-2026",
      label: "Fall 2026",
      starts_on: "2026-08-14",
      ends_on: "2026-12-16",
      timezone: "America/New_York",
    },
    dates,
    slots,
    roster,
  );
}
