"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveLivingAtlasBankVersion, saveLivingAtlasFounderQuestion } from "@/app/(games)/games/living-atlas/actions";
import type { LivingAtlasAssessmentImagePlacement, LivingAtlasChoice, LivingAtlasFounderQuestion, LivingAtlasFounderQuestionPatch, LivingAtlasFounderReview, LivingAtlasReviewStatus } from "@/lib/living-atlas/types";
import { ClinicalImageViewer } from "./ClinicalImageViewer";
import styles from "./LivingAtlasPractice.module.css";

type ReviewAction = "saved" | "approved" | "changes_requested" | "rejected";
type PreviewPlacement = Exclude<LivingAtlasAssessmentImagePlacement, "none">;

const statusLabel: Record<LivingAtlasReviewStatus, string> = {
  review_required: "Needs review",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
};

function draftFor(question: LivingAtlasFounderQuestion): LivingAtlasFounderQuestionPatch {
  return {
    id: question.id,
    expectedRevision: question.revision,
    stem: question.stem,
    choices: question.choices,
    correctChoiceId: question.correctChoiceId,
    teachingFeedback: question.teachingFeedback,
    choiceFeedback: question.choiceFeedback,
    taxonomy: question.taxonomy,
    imagePlacement: question.imagePlacement,
    reviewNote: question.reviewNote ?? "",
  };
}

function questionNumber(id: string) {
  return id.slice(-3).replace(/^0+/, "") || "1";
}

export function LivingAtlasFounderReviewView({ review }: { review: LivingAtlasFounderReview }) {
  const router = useRouter();
  const [questions, setQuestions] = useState(review.questions);
  const [summary, setSummary] = useState(review.summary);
  const [eventsByQuestion, setEventsByQuestion] = useState(review.eventsByQuestion);
  const [selectedId, setSelectedId] = useState(review.questions[0]?.id ?? "");
  const [filter, setFilter] = useState<"all" | LivingAtlasReviewStatus>("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<LivingAtlasFounderQuestionPatch | null>(() => review.questions[0] ? draftFor(review.questions[0]) : null);
  const [previewPlacement, setPreviewPlacement] = useState<PreviewPlacement>("prompt");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = questions.find((question) => question.id === selectedId) ?? null;
  const events = selected ? eventsByQuestion[selected.id] ?? [] : [];
  const filtered = useMemo(() => questions.filter((question) => {
    const matchesStatus = filter === "all" || question.reviewStatus === filter;
    const haystack = `${question.stem} ${question.taxonomy.domain} ${question.taxonomy.topic} ${question.taxonomy.conceptId}`.toLowerCase();
    return matchesStatus && haystack.includes(query.trim().toLowerCase());
  }), [filter, query, questions]);

  function select(question: LivingAtlasFounderQuestion) {
    setSelectedId(question.id);
    setDraft(draftFor(question));
    setPreviewPlacement(question.imagePlacement === "none" ? "prompt" : question.imagePlacement);
    setMessage(null);
  }

  function patchDraft(patch: Partial<LivingAtlasFounderQuestionPatch>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  function patchTaxonomy(key: keyof LivingAtlasFounderQuestionPatch["taxonomy"], value: string) {
    setDraft((current) => current ? { ...current, taxonomy: { ...current.taxonomy, [key]: value } } : current);
  }

  function patchChoice(choiceId: LivingAtlasChoice["id"], value: string) {
    setDraft((current) => current ? { ...current, choices: current.choices.map((choice) => choice.id === choiceId ? { ...choice, text: value } : choice) } : current);
  }

  function patchChoiceFeedback(choiceId: LivingAtlasChoice["id"], value: string) {
    setDraft((current) => current ? { ...current, choiceFeedback: { ...current.choiceFeedback, [choiceId]: value } } : current);
  }

  function save(action: ReviewAction) {
    if (!draft) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveLivingAtlasFounderQuestion(review.bankId, draft, action);
      if (!result.ok) return setMessage(result.error);
      setQuestions((current) => current.map((question) => question.id === result.value.question.id ? result.value.question : question));
      setSummary(result.value.summary);
      setEventsByQuestion((current) => ({
        ...current,
        [result.value.question.id]: [{
          id: `local-${result.value.question.id}-${result.value.question.revision}`,
          variantId: result.value.question.id,
          revision: result.value.question.revision,
          action,
          note: draft.reviewNote?.trim() || null,
          createdAt: new Date().toISOString(),
        }, ...(current[result.value.question.id] ?? [])],
      }));
      setDraft(draftFor(result.value.question));
      setMessage(action === "saved" ? "Revision saved. It remains in Founder Review Draft." : `${statusLabel[result.value.question.reviewStatus]} · revision ${result.value.question.revision}.`);
      router.refresh();
    });
  }

  function approveVersion() {
    setMessage(null);
    startTransition(async () => {
      const result = await approveLivingAtlasBankVersion(review.bankId);
      if (!result.ok) return setMessage(result.error);
      setSummary(result.value);
      setMessage(`${review.bankTitle} v${summary.bankVersion} is editorially approved. It is still founder-only and is not a student release.`);
      router.refresh();
    });
  }

  if (!selected || !draft) return null;

  return (
    <div className={styles.reviewPage}>
      <section className={styles.reviewHero}>
        <div>
          <p className={styles.eyebrow}>Founder content operations · private</p>
          <h1>{review.bankTitle}</h1>
          <p>Each candidate keeps its original Omar card visible beside the new question. Approving this version is an editorial decision only; it does not release the bank to learners.</p>
        </div>
        <div className={styles.reviewHeroStats}>
          <div><span>Version</span><strong>v{summary.bankVersion}</strong></div>
          <div><span>Approved</span><strong>{summary.approved}/{summary.total}</strong></div>
          <div><span>Images</span><strong>{summary.imageSupported}</strong></div>
          <button type="button" className={styles.primaryButton} disabled={isPending || summary.approved !== summary.total} onClick={approveVersion}>Approve version</button>
        </div>
      </section>

      {message ? <div className={styles.notice} role="status">{message}</div> : null}

      <div className={styles.reviewWorkspace}>
        <aside className={styles.reviewQueue}>
          <div className={styles.reviewQueueHeading}>
            <div><p className={styles.eyebrow}>Question queue</p><h2>{filtered.length} visible</h2></div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stem or tag" aria-label="Search review questions" />
          </div>
          <div className={styles.reviewFilters}>
            <button type="button" className={filter === "all" ? styles.selectedControl : ""} onClick={() => setFilter("all")}>All <span>{summary.total}</span></button>
            {(["review_required", "changes_requested", "approved", "rejected"] as LivingAtlasReviewStatus[]).map((status) => (
              <button key={status} type="button" className={filter === status ? styles.selectedControl : ""} onClick={() => setFilter(status)}>{statusLabel[status]} <span>{status === "review_required" ? summary.reviewRequired : status === "changes_requested" ? summary.changesRequested : status === "approved" ? summary.approved : summary.rejected}</span></button>
            ))}
          </div>
          <div className={styles.reviewQueueList}>
            {filtered.map((question) => (
              <button key={question.id} type="button" className={question.id === selected.id ? styles.reviewQueueCurrent : ""} onClick={() => select(question)}>
                <span>#{questionNumber(question.id)} · r{question.revision}</span>
                <strong>{question.stem}</strong>
                <small>{question.taxonomy.domain} · {question.taxonomy.topic}</small>
                <i className={`${styles.reviewStatus} ${styles[`review_${question.reviewStatus}`]}`}>{statusLabel[question.reviewStatus]}</i>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.reviewEditor}>
          <header className={styles.reviewEditorHeader}>
            <div>
              <p className={styles.eyebrow}>Question {selected.sourceOrder} · revision {draft.expectedRevision}</p>
              <h2>Content and taxonomy</h2>
            </div>
            <span className={`${styles.reviewStatus} ${styles[`review_${selected.reviewStatus}`]}`}>{statusLabel[selected.reviewStatus]}</span>
          </header>

          <section className={styles.reviewTaxonomy} aria-label="Question taxonomy">
            <label>Academic stage<input value={draft.taxonomy.academicYear} onChange={(event) => patchTaxonomy("academicYear", event.target.value)} /></label>
            <label>Term<input value={draft.taxonomy.term} onChange={(event) => patchTaxonomy("term", event.target.value)} /></label>
            <label>Course code<input value={draft.taxonomy.courseCode} onChange={(event) => patchTaxonomy("courseCode", event.target.value)} /></label>
            <label>Course title<input value={draft.taxonomy.courseTitle} onChange={(event) => patchTaxonomy("courseTitle", event.target.value)} /></label>
            <label>Unit<input value={draft.taxonomy.unit} onChange={(event) => patchTaxonomy("unit", event.target.value)} /></label>
            <label>Domain<select value={draft.taxonomy.domain} onChange={(event) => patchTaxonomy("domain", event.target.value)}>{review.taxonomyOptions.domains.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Topic<select value={draft.taxonomy.topic} onChange={(event) => patchTaxonomy("topic", event.target.value)}>{review.taxonomyOptions.topics.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Concept<select value={draft.taxonomy.conceptId} onChange={(event) => patchTaxonomy("conceptId", event.target.value)}>{review.taxonomyOptions.concepts.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Difficulty<select value={draft.taxonomy.difficulty} onChange={(event) => patchTaxonomy("difficulty", event.target.value)}><option value="foundational">Foundational</option><option value="application">Application</option><option value="advanced">Advanced</option></select></label>
            <label>Cognitive level<select value={draft.taxonomy.cognitiveLevel} onChange={(event) => patchTaxonomy("cognitiveLevel", event.target.value)}><option value="recall">Recall</option><option value="understanding">Understanding</option><option value="application">Application</option><option value="analysis">Analysis</option></select></label>
            <label>Item format<select value={draft.taxonomy.itemFormat} onChange={(event) => patchTaxonomy("itemFormat", event.target.value)}><option value="single_best_answer">Single best answer</option><option value="true_false">True or false</option><option value="image_identification">Image identification</option></select></label>
            <label>Stem type<select value={draft.taxonomy.stemType} onChange={(event) => patchTaxonomy("stemType", event.target.value)}><option value="standard">Standard</option><option value="cloze">Cloze</option></select></label>
            <label className={styles.reviewWide}>Learning objective<textarea rows={2} value={draft.taxonomy.objective} onChange={(event) => patchTaxonomy("objective", event.target.value)} /></label>
          </section>

          <section className={styles.reviewSourceReference}>
            <p className={styles.eyebrow}>Immutable Omar source card · card {selected.sourceOrder}</p>
            <dl>
              <div><dt>Prompt</dt><dd>{selected.sourceReference.prompt}</dd></div>
              <div><dt>Preserved answer</dt><dd>{selected.sourceReference.answer}</dd></div>
            </dl>
          </section>

          <section className={styles.reviewQuestionForm}>
            <label>Question stem<textarea rows={4} value={draft.stem} onChange={(event) => patchDraft({ stem: event.target.value })} /></label>
            <div className={styles.reviewChoices}>
              {draft.choices.map((choice) => (
                <div key={choice.id} className={draft.correctChoiceId === choice.id ? styles.reviewChoiceCorrect : ""}>
                  <label><input type="radio" name="correct-choice" checked={draft.correctChoiceId === choice.id} onChange={() => patchDraft({ correctChoiceId: choice.id })} /><span>{choice.id.toUpperCase()}</span><input value={choice.text} onChange={(event) => patchChoice(choice.id, event.target.value)} aria-label={`Choice ${choice.id.toUpperCase()}`} /></label>
                  <textarea rows={2} value={draft.choiceFeedback[choice.id]} onChange={(event) => patchChoiceFeedback(choice.id, event.target.value)} placeholder={`Why ${choice.id.toUpperCase()} is or is not correct`} />
                </div>
              ))}
            </div>
            <label>Teaching feedback<textarea rows={3} value={draft.teachingFeedback} onChange={(event) => patchDraft({ teachingFeedback: event.target.value })} /></label>
            <label>Founder review note<textarea rows={2} value={draft.reviewNote ?? ""} onChange={(event) => patchDraft({ reviewNote: event.target.value })} placeholder="Why this changed, what should be checked, or why it is approved." /></label>
          </section>

          <section className={styles.placementPreview}>
            <div className={styles.placementHeading}><div><p className={styles.eyebrow}>Image placement preview</p><h3>See the exact learner layout without starting a run</h3></div>{selected.hasSourceImage ? <select value={draft.imagePlacement} onChange={(event) => patchDraft({ imagePlacement: event.target.value as LivingAtlasAssessmentImagePlacement })}><option value="none">No learner image</option><option value="prompt">Prompt image</option><option value="feedback">Feedback image</option><option value="results">Results-only image</option></select> : <span>No source image</span>}</div>
            {selected.hasSourceImage && selected.imageAvailable && selected.imageUrl ? (
              <>
                <div className={styles.previewTabs}>
                  {(["prompt", "feedback", "results"] as PreviewPlacement[]).map((placement) => <button key={placement} type="button" className={previewPlacement === placement ? styles.selectedControl : ""} onClick={() => setPreviewPlacement(placement)}>{placement === "prompt" ? "Prompt" : placement === "feedback" ? "Feedback" : "Results only"}</button>)}
                </div>
                <div className={styles.previewSurface}>
                  {previewPlacement === "prompt" ? <><small>Question stem</small><strong>{draft.stem}</strong><ClinicalImageViewer src={selected.imageUrl} alt="Private founder preview of the question diagram" label="Prompt image" caption={selected.imageCaption} /></> : null}
                  {previewPlacement === "feedback" ? <div className={styles.previewFeedback}><div><small>After the learner commits</small><strong>{draft.teachingFeedback}</strong><span>{draft.choiceFeedback[draft.correctChoiceId]}</span></div><ClinicalImageViewer src={selected.imageUrl} alt="Private founder preview of the feedback diagram" label="Feedback image" caption={selected.imageCaption} /></div> : null}
                  {previewPlacement === "results" ? <details open><summary>Question review · Results only</summary><p>{draft.stem}</p><ClinicalImageViewer src={selected.imageUrl} alt="Private founder preview of the results diagram" label="Results-only image" caption={selected.imageCaption} /></details> : null}
                </div>
              </>
            ) : selected.hasSourceImage ? <div className={styles.imageFallback}>This source image is registered but currently unavailable from private storage. The learner will see the same honest fallback.</div> : <div className={styles.imageFallback}>No source image is associated with this question. It must stay set to “No learner image.”</div>}
          </section>

          <footer className={styles.reviewActions}>
            <button type="button" className={styles.secondaryButton} disabled={isPending} onClick={() => save("saved")}>{isPending ? "Saving…" : "Save revision"}</button>
            <button type="button" className={styles.warningButton} disabled={isPending} onClick={() => save("changes_requested")}>Request changes</button>
            <button type="button" className={styles.dangerButton} disabled={isPending} onClick={() => save("rejected")}>Reject</button>
            <button type="button" className={styles.primaryButton} disabled={isPending} onClick={() => save("approved")}>Approve question</button>
          </footer>

          <section className={styles.reviewHistory}>
            <p className={styles.eyebrow}>Revision history</p>
            {events.length ? events.map((event) => <div key={event.id}><strong>r{event.revision} · {event.action.replaceAll("_", " ")}</strong><span>{new Date(event.createdAt).toLocaleString()}</span>{event.note ? <p>{event.note}</p> : null}</div>) : <p>No review events yet.</p>}
          </section>
        </section>
      </div>
    </div>
  );
}
