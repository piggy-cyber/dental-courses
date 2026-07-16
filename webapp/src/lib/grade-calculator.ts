export type GradeEntry = {
  label: string;
  score: number | null;
  weight: number | null;
};

export type GradeRowPreset = {
  label: string;
  weight: number;
};

export type GradeCalculatorPreset = {
  courseCode: string;
  courseTitle: string;
  rows: GradeRowPreset[];
};

export type GoalStatus =
  | "empty"
  | "secured"
  | "reachable"
  | "unreachable"
  | "complete";

export type GradeSummary = {
  plannedWeight: number;
  completedWeight: number;
  remainingWeight: number;
  currentGrade: number | null;
  bankedPoints: number;
  requiredAverage: number | null;
  maximumFinalGrade: number;
  goalStatus: GoalStatus;
};

function isUsableWeight(weight: number | null): weight is number {
  return weight !== null && Number.isFinite(weight) && weight > 0;
}

function isUsableScore(score: number | null): score is number {
  return score !== null && Number.isFinite(score) && score >= 0;
}

export function calculateGradeSummary(
  entries: GradeEntry[],
  targetGrade: number,
): GradeSummary {
  const plannedWeight = entries.reduce(
    (total, entry) => total + (isUsableWeight(entry.weight) ? entry.weight : 0),
    0,
  );
  const completedEntries = entries.filter(
    (entry) => isUsableScore(entry.score) && isUsableWeight(entry.weight),
  );
  const completedWeight = completedEntries.reduce(
    (total, entry) => total + (entry.weight ?? 0),
    0,
  );
  const weightedScoreTotal = completedEntries.reduce(
    (total, entry) => total + (entry.score ?? 0) * (entry.weight ?? 0),
    0,
  );
  const currentGrade =
    completedWeight > 0 ? weightedScoreTotal / completedWeight : null;
  const bankedPoints = weightedScoreTotal / 100;
  const remainingWeight = Math.max(0, 100 - completedWeight);
  const requiredAverage =
    completedWeight > 0 && remainingWeight > 0
      ? ((targetGrade - bankedPoints) * 100) / remainingWeight
      : null;
  const maximumFinalGrade = bankedPoints + remainingWeight;

  let goalStatus: GoalStatus = "empty";
  if (completedWeight > 0 && remainingWeight === 0) {
    goalStatus = "complete";
  } else if (completedWeight > 0 && bankedPoints >= targetGrade) {
    goalStatus = "secured";
  } else if (requiredAverage !== null && requiredAverage <= 100) {
    goalStatus = "reachable";
  } else if (requiredAverage !== null) {
    goalStatus = "unreachable";
  }

  return {
    plannedWeight,
    completedWeight,
    remainingWeight,
    currentGrade,
    bankedPoints,
    requiredAverage,
    maximumFinalGrade,
    goalStatus,
  };
}
