export type CurriculumYear = 1 | 2 | 3 | 4;

export type CohortCollection = {
  graduation_year: number | null;
  curriculum_year: number | null;
  academic_year_start: number | null;
  cumulative_access: boolean;
  is_active: boolean;
};

export function classLabel(graduationYear: number | null | undefined): string {
  return graduationYear ? `Class of ${graduationYear}` : "No class assigned";
}

export function academicYearLabel(startYear: number | null | undefined): string {
  if (!startYear) return "No academic year";
  return `${startYear}\u2013${String(startYear + 1).slice(-2)}`;
}

export function rawCurriculumYear(
  graduationYear: number,
  date: Date = new Date()
): number {
  const academicYearStart = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return academicYearStart - graduationYear + 5;
}

export function currentCurriculumYear(
  graduationYear: number | null | undefined,
  date: Date = new Date()
): CurriculumYear | null {
  if (!graduationYear) return null;
  const year = rawCurriculumYear(graduationYear, date);
  if (year < 1 || year > 4) return null;
  return year as CurriculumYear;
}

export function standingLabel(
  graduationYear: number | null | undefined,
  date: Date = new Date()
): string {
  if (!graduationYear) return "Standing unavailable";
  const year = rawCurriculumYear(graduationYear, date);
  if (year < 1) return "Incoming";
  if (year > 4) return "Alumni";
  return `D${year}`;
}

export function cohortStandingLabel(
  graduationYear: number | null | undefined,
  date: Date = new Date()
): string {
  if (!graduationYear) return "No class assigned";
  return `${classLabel(graduationYear)} \u00b7 ${standingLabel(graduationYear, date)}`;
}

export function collectionVintageLabel(
  collection: Pick<CohortCollection, "graduation_year" | "curriculum_year" | "academic_year_start">
): string {
  if (
    !collection.graduation_year ||
    !collection.curriculum_year ||
    !collection.academic_year_start
  ) {
    return "Manual collection";
  }

  return `${classLabel(collection.graduation_year)} \u00b7 D${collection.curriculum_year} \u00b7 ${academicYearLabel(collection.academic_year_start)}`;
}

export function hasCumulativeCollectionAccess(
  graduationYear: number | null | undefined,
  collection: CohortCollection,
  date: Date = new Date()
): boolean {
  if (
    !graduationYear ||
    !collection.is_active ||
    !collection.cumulative_access ||
    collection.graduation_year !== graduationYear ||
    !collection.curriculum_year
  ) {
    return false;
  }

  const standing = rawCurriculumYear(graduationYear, date);
  return standing >= collection.curriculum_year;
}
