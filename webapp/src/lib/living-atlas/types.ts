export type LivingAtlasMode = "study" | "review";

export type LivingAtlasConfidence = 1 | 2 | 3;

export type LivingAtlasDifficulty = "foundational" | "application" | "advanced";

export type LivingAtlasAssessmentImagePlacement = "prompt" | "feedback" | "results" | "none";

export type LivingAtlasReviewStatus = "review_required" | "changes_requested" | "approved" | "rejected";

export type LivingAtlasAidType = "prism_split" | "atlas_chorus" | "rift_turn";

export type LivingAtlasQuestionFormat = "single_best_answer" | "true_false" | "image_identification";

export type LivingAtlasDeliveryKind = "test" | "recall";

export type LivingAtlasRecallRating = "again" | "learning" | "know_it";

export type LivingAtlasTaxonomy = {
  academicYear: string;
  term: string;
  courseCode: string;
  courseTitle: string;
  unit: string;
  domain: string;
  topic: string;
  conceptId: string;
  objective: string;
  itemFormat: string;
  stemType: string;
  cognitiveLevel: string;
  difficulty: LivingAtlasDifficulty;
};

export type LivingAtlasChoice = {
  id: "a" | "b" | "c" | "d";
  text: string;
};

export type LivingAtlasDraftQuestion = {
  id: string;
  sourceCardId: string;
  sourceCardOrder: number;
  topic: string;
  conceptId: string;
  difficulty: LivingAtlasDifficulty;
  stem: string;
  choices: LivingAtlasChoice[];
  correctChoiceId: LivingAtlasChoice["id"];
  teachingFeedback: string;
  choiceFeedback: Record<LivingAtlasChoice["id"], string>;
  sourceImageUrl: string | null;
  sourceImagePlacement: "answer" | "prompt" | null;
  assessmentImagePlacement: Exclude<LivingAtlasAssessmentImagePlacement, "results">;
};

// This delivery object intentionally omits answer keys, feedback, original
// source URLs, and immutable source-card identifiers.
export type LivingAtlasSafeQuestion = Omit<
  LivingAtlasDraftQuestion,
  | "correctChoiceId"
  | "teachingFeedback"
  | "choiceFeedback"
  | "sourceCardId"
  | "sourceCardOrder"
  | "sourceImageUrl"
  | "sourceImagePlacement"
> & {
  domain: string;
  objective: string;
  choiceOrder: LivingAtlasChoice["id"][];
  hasSourceImage: boolean;
  imageAvailable: boolean;
  imageUrl: string | null;
  imageCaption: string | null;
  itemFormat: LivingAtlasQuestionFormat;
  imagePending?: boolean;
  images?: LivingAtlasSignedImage[];
};

export type LivingAtlasFeedback = {
  correct: boolean;
  selectedChoiceId: LivingAtlasChoice["id"];
  correctChoiceId: LivingAtlasChoice["id"];
  teachingFeedback: string;
  choiceFeedback: Record<LivingAtlasChoice["id"], string>;
  imageAvailable: boolean;
  imageUrl: string | null;
  imageCaption: string | null;
  images?: LivingAtlasSignedImage[];
};

// Returned only after a Study answer has been committed through a protected
// server action. It deliberately contains no other run items or answer keys.
export type LivingAtlasCommittedAnswer = {
  position: number;
  selectedChoiceId: LivingAtlasChoice["id"];
  activeEcho: boolean;
  feedback: LivingAtlasFeedback;
};

export type LivingAtlasSignedImage = {
  id: string;
  placement: Exclude<LivingAtlasAssessmentImagePlacement, "none">;
  available: boolean;
  url: string | null;
  alt: string;
  caption: string | null;
};

export type LivingAtlasProgress = {
  coverage: number;
  recentAccuracy: number;
  mastery: number;
  activeEchoes: number;
  echoRepairs: number;
  flaggedQuestions: number;
  masteredConcepts: number;
  attemptedConcepts: number;
  totalConcepts: number;
};

export type LivingAtlasBankShelfItem = {
  id: string;
  title: string;
  sourceCardCount: number;
  sourceUrl: string | null;
  sourceLabel: string | null;
  playable: boolean;
  deliveryKind: LivingAtlasDeliveryKind;
  reviewQuestionCount: number;
  attemptedQuestions: number;
  recentAccuracy: number;
  averageTimeMs: number;
  activeEchoes: number;
  masteredConcepts: number;
};

export type LivingAtlasCourseShelfItem = {
  code: string;
  slug: string;
  title: string;
  academicYear: "D1" | "D2" | "D3" | "D4";
  term: "Summer" | "Fall" | "Spring" | "Multiple";
  status: "draft" | "review" | "released" | "retired";
  description: string | null;
  bankCount: number;
  playableBankCount: number;
};

export type LivingAtlasDashboard = {
  course?: LivingAtlasCourseShelfItem;
  courses: LivingAtlasCourseShelfItem[];
  banks: LivingAtlasBankShelfItem[];
  progress: LivingAtlasProgress;
  activeRun: LivingAtlasRunSummary | null;
};

export type LivingAtlasRunConfig = {
  mode: LivingAtlasMode;
  length: number;
  topics: string[];
  difficulties: LivingAtlasDifficulty[];
  imageOnly: boolean;
  flaggedOnly: boolean;
  repairOnly: boolean;
  unseenOnly: boolean;
  visibleTimer: boolean;
};

export type LivingAtlasSavedSet = {
  id: string;
  name: string;
  config: LivingAtlasRunConfig;
  createdAt: string;
};

export type LivingAtlasBankOverview = {
  id: string;
  courseSlug?: string;
  courseTitle?: string;
  bankKind?: "recall_practice" | "practice_problem" | "practice_test";
  deliveryKind: LivingAtlasDeliveryKind;
  title: string;
  subtitle: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  sourceCardCount: number;
  reviewQuestionCount: number;
  imageQuestionCount: number;
  topics: string[];
  difficulties: LivingAtlasDifficulty[];
  progress: LivingAtlasProgress;
  activeRun: LivingAtlasRunSummary | null;
  savedSets: LivingAtlasSavedSet[];
  reviewSummary: LivingAtlasReviewSummary;
  activeRecallSession: LivingAtlasRecallSessionSummary | null;
  recallRatedCount: number;
  recallRepairCount: number;
};

export type LivingAtlasRunSummary = {
  id: string;
  bankId: string;
  mode: LivingAtlasMode;
  status: "active" | "completed" | "abandoned";
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  currentPosition: number;
  activeTimeMs: number;
  visibleTimer: boolean;
  createdAt: string;
};

export type LivingAtlasNavigatorItem = {
  position: number;
  questionId: string;
  answered: boolean;
  committed: boolean;
  flagged: boolean;
  activeEcho: boolean;
};

export type LivingAtlasCachedRunItem = LivingAtlasNavigatorItem & {
  question: LivingAtlasSafeQuestion;
  selectedChoiceId: LivingAtlasChoice["id"] | null;
  confidence: LivingAtlasConfidence | null;
  activeTimeMs: number;
};

export type LivingAtlasRunView = {
  run: LivingAtlasRunSummary;
  courseTitle: string;
  bankTitle: string;
  question: LivingAtlasSafeQuestion | null;
  selectedChoiceId: LivingAtlasChoice["id"] | null;
  confidence: LivingAtlasConfidence | null;
  itemActiveTimeMs: number;
  alreadyCommitted: boolean;
  manuallyFlagged: boolean;
  activeEcho: boolean;
  feedback: LivingAtlasFeedback | null;
  aids: LivingAtlasStudyAidState;
  navigator: LivingAtlasNavigatorItem[];
  cachedItems: LivingAtlasCachedRunItem[];
  progress: LivingAtlasProgress;
};

export type LivingAtlasRecallSessionSummary = {
  id: string;
  bankId: string;
  status: "active" | "completed" | "abandoned";
  cardCount: number;
  ratedCount: number;
  currentPosition: number;
  activeTimeMs: number;
  visibleTimer: boolean;
  createdAt: string;
};

export type LivingAtlasRecallNavigatorItem = {
  position: number;
  questionId: string;
  revealed: boolean;
  rating: LivingAtlasRecallRating | null;
  needsRecall: boolean;
};

export type LivingAtlasRecallCard = {
  id: string;
  sourceOrder: number;
  prompt: string;
  hasImage: boolean;
  imagePlacement: "prompt" | "answer" | "none";
  imageAvailable: boolean;
  imageUrl: string | null;
  imageCaption: string | null;
};

export type LivingAtlasRecallReveal = {
  answer: string;
  imageAvailable: boolean;
  imageUrl: string | null;
  imageCaption: string | null;
};

export type LivingAtlasRecallCachedCard = {
  position: number;
  card: LivingAtlasRecallCard;
  reveal: LivingAtlasRecallReveal;
  revealed: boolean;
  rating: LivingAtlasRecallRating | null;
  needsRecall: boolean;
  activeTimeMs: number;
};

export type LivingAtlasRecallSyncPatch = {
  position: number;
  revealed?: boolean;
  rating?: LivingAtlasRecallRating;
  activeTimeMs: number;
};

export type LivingAtlasRecallRunView = {
  session: LivingAtlasRecallSessionSummary;
  courseTitle: string;
  bankTitle: string;
  cachedCards: LivingAtlasRecallCachedCard[];
  navigator: LivingAtlasRecallNavigatorItem[];
  repairCount: number;
};

export type LivingAtlasLegacySession = {
  id: string;
  bankId: string;
  bankTitle: string;
  status: "completed" | "abandoned";
  answeredCount: number;
  completedAt: string | null;
  recordedAt: string;
};

export type LivingAtlasChorusSnapshot = {
  available: boolean;
  sampleSize: number;
  minimumSampleSize: number;
  choices: Array<{ choiceId: LivingAtlasChoice["id"]; percent: number }>;
};

export type LivingAtlasAidOutcome = {
  aidType: LivingAtlasAidType;
  position: number;
  createdAt: string;
  note: string;
  eliminatedChoiceIds?: LivingAtlasChoice["id"][];
  hint?: string;
  chorus?: LivingAtlasChorusSnapshot;
  replacedQuestionId?: string;
};

export type LivingAtlasStudyAidState = {
  limit: number;
  used: number;
  remaining: number;
  outcomes: LivingAtlasAidOutcome[];
};

export type LivingAtlasQuestionResult = {
  position: number;
  questionId: string;
  topic: string;
  stem: string;
  selectedChoiceId: LivingAtlasChoice["id"];
  correctChoiceId: LivingAtlasChoice["id"];
  correct: boolean;
  confidence: LivingAtlasConfidence;
  activeTimeMs: number;
  flagged: boolean;
  teachingFeedback: string;
  choiceFeedback: Record<LivingAtlasChoice["id"], string>;
  domain: string;
  conceptId: string;
  objective: string;
  imagePlacement: LivingAtlasAssessmentImagePlacement;
  imageAvailable: boolean;
  imageUrl: string | null;
  imageCaption: string | null;
  images?: LivingAtlasSignedImage[];
};

export type LivingAtlasTopicResult = {
  domain: string;
  topic: string;
  answered: number;
  correct: number;
  accuracy: number;
  averageTimeMs: number;
  personalBaselineMs: number | null;
};

export type LivingAtlasConceptResult = {
  domain: string;
  topic: string;
  conceptId: string;
  objective: string;
  attempted: number;
  correct: number;
  accuracy: number;
  activeEchoes: number;
  flaggedQuestions: number;
  knowledgeState: "unseen" | "learning" | "reviewing" | "mastered";
};

export type LivingAtlasResults = {
  run: LivingAtlasRunSummary;
  courseTitle: string;
  courseSlug: string;
  bankTitle: string;
  accuracy: number;
  averageTimeMs: number;
  personalBaselineMs: number | null;
  topics: LivingAtlasTopicResult[];
  concepts: LivingAtlasConceptResult[];
  questions: LivingAtlasQuestionResult[];
  progress: LivingAtlasProgress;
};

export type LivingAtlasReviewSummary = {
  bankVersionId: string;
  bankVersion: number;
  bankStatus: "review_required" | "changes_requested" | "approved" | "rejected";
  total: number;
  reviewRequired: number;
  changesRequested: number;
  approved: number;
  rejected: number;
  imageSupported: number;
};

export type LivingAtlasFounderQuestion = {
  id: string;
  revision: number;
  reviewStatus: LivingAtlasReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  sourceOrder: number;
  stem: string;
  choices: LivingAtlasChoice[];
  correctChoiceId: LivingAtlasChoice["id"];
  teachingFeedback: string;
  choiceFeedback: Record<LivingAtlasChoice["id"], string>;
  taxonomy: LivingAtlasTaxonomy;
  imagePlacement: LivingAtlasAssessmentImagePlacement;
  hasSourceImage: boolean;
  imageAvailable: boolean;
  imageUrl: string | null;
  imageCaption: string | null;
  images?: LivingAtlasSignedImage[];
  sourceReference: {
    prompt: string;
    answer: string;
  };
};

export type LivingAtlasReviewEvent = {
  id: string;
  variantId: string;
  revision: number;
  action: "created" | "saved" | "approved" | "changes_requested" | "rejected";
  note: string | null;
  createdAt: string;
};

export type LivingAtlasFounderReview = {
  bankId: string;
  bankTitle: string;
  bankKind: "practice_problem" | "practice_test";
  provenance: "source_derived" | "fourth_canal_original";
  sourceVersion: string;
  summary: LivingAtlasReviewSummary;
  questions: LivingAtlasFounderQuestion[];
  taxonomyOptions: {
    domains: string[];
    topics: string[];
    concepts: string[];
    objectives: string[];
  };
  eventsByQuestion: Record<string, LivingAtlasReviewEvent[]>;
};

export type LivingAtlasFounderQuestionPatch = {
  id: string;
  expectedRevision: number;
  stem: string;
  choices: LivingAtlasChoice[];
  correctChoiceId: LivingAtlasChoice["id"];
  teachingFeedback: string;
  choiceFeedback: Record<LivingAtlasChoice["id"], string>;
  taxonomy: LivingAtlasTaxonomy;
  imagePlacement: LivingAtlasAssessmentImagePlacement;
  reviewNote?: string | null;
};

export type LivingAtlasCompanionMood = "curious" | "steady" | "celebrating" | "concerned";

export type LivingAtlasCompanionProfile = {
  companionId: "white-holland-lop";
  name: string;
  species: string;
  mood: LivingAtlasCompanionMood;
  chorusOptIn: boolean;
  equipped: {
    head: string | null;
    collar: string | null;
    body: string | null;
    accessory: string | null;
  };
};

export type LivingAtlasCollectible = {
  id: string;
  title: string;
  description: string;
  kind: "badge" | "lore" | "companion" | "player" | "relic";
  unlockedAt: string | null;
  locked: boolean;
  futureCourse?: string;
};

export type LivingAtlasPerformance = {
  companion: LivingAtlasCompanionProfile;
  progress: LivingAtlasProgress;
  recentPaceMs: number | null;
  personalBaselineMs: number | null;
  recentAccuracy: number;
  collectibles: LivingAtlasCollectible[];
  nextAction: {
    label: string;
    detail: string;
    href: string;
  };
};
