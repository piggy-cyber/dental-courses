"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LivingAtlasPublicCatalogueCourse } from "@/lib/living-atlas/server/course-catalog";
import styles from "./LivingAtlasPractice.module.css";

type ViewMode = "grid" | "list";
type SortMode = "curriculum" | "decks" | "cards" | "course";

const YEARS = ["All years", "D1", "D2", "D3"] as const;
const TERMS = ["All terms", "Summer", "Fall", "Spring", "Multiple"] as const;

function startHref(deckId: string | null, signedIn: boolean) {
  if (!deckId) return null;
  const destination = `/games/living-atlas/banks/${deckId}`;
  return signedIn ? destination : `/games/living-atlas/access?next=${encodeURIComponent(destination)}`;
}

export function LivingAtlasCatalogue({
  courses,
  signedIn,
}: {
  courses: LivingAtlasPublicCatalogueCourse[];
  signedIn: boolean;
}) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<(typeof YEARS)[number]>("All years");
  const [term, setTerm] = useState<(typeof TERMS)[number]>("All terms");
  const [sort, setSort] = useState<SortMode>("curriculum");
  const [view, setView] = useState<ViewMode>("list");
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = courses.filter((course) => {
      const haystack = [course.courseCode, ...course.relatedCourseCodes, course.courseTitle, course.description ?? "", ...course.decks.map((deck) => deck.title)].join(" ").toLowerCase();
      return (year === "All years" || course.academicYear === year)
        && (term === "All terms" || course.term === term)
        && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
    return [...matches].sort((left, right) => {
      if (sort === "decks") return right.deckCount - left.deckCount || left.courseCode.localeCompare(right.courseCode);
      if (sort === "cards") return right.cardCount - left.cardCount || left.courseCode.localeCompare(right.courseCode);
      if (sort === "course") return left.courseTitle.localeCompare(right.courseTitle);
      return courses.indexOf(left) - courses.indexOf(right);
    });
  }, [courses, query, sort, term, year]);

  const visibleDecks = filtered.reduce((total, course) => total + course.deckCount, 0);

  return (
    <main id="game-content" className={styles.atlasRoot}>
      <section className={styles.catalogueHero}>
        <div>
          <p className={styles.eyebrow}>Living Atlas · Beta catalogue</p>
          <h1>Find the course.<br />Open the right deck.</h1>
          <p>
            Browse the complete D1–D3 library before you sign in. Create an account only when you are ready to practice, save your place, and return to what needs repair.
          </p>
        </div>
        <aside className={styles.catalogueCallout}>
          <strong>{courses.length} courses</strong>
          <span>{courses.reduce((total, course) => total + course.deckCount, 0)} organized recall and practice decks</span>
          {signedIn ? <span className={styles.catalogueSignedIn}>Account ready · choose a deck to begin</span> : <Link href="/games/living-atlas/access" className={styles.primaryButton}>Create account to practice</Link>}
        </aside>
      </section>

      <section className={styles.catalogueToolbar} aria-label="Filter the Living Atlas course catalogue">
        <label className={styles.catalogueSearch}>
          <span>Find a course, code, or deck</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. pharmacology, DSRE 335, lecture 1" />
        </label>
        <label>
          <span>Year</span>
          <select value={year} onChange={(event) => setYear(event.target.value as (typeof YEARS)[number])}>
            {YEARS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Term</span>
          <select value={term} onChange={(event) => setTerm(event.target.value as (typeof TERMS)[number])}>
            {TERMS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="curriculum">Curriculum order</option>
            <option value="course">Course name</option>
            <option value="decks">Most decks</option>
            <option value="cards">Most cards</option>
          </select>
        </label>
        <div className={styles.catalogueViews} aria-label="Catalogue layout">
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>Grid</button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
        </div>
      </section>

      <section className={styles.catalogueSummary} aria-live="polite">
        <strong>{filtered.length} course{filtered.length === 1 ? "" : "s"}</strong>
        <span>{visibleDecks} deck{visibleDecks === 1 ? "" : "s"} shown</span>
        {!signedIn ? <span>Deck content unlocks after account creation.</span> : null}
      </section>

      <section className={`${styles.catalogueCourses} ${view === "list" ? styles.catalogueCoursesList : ""}`} aria-label="Living Atlas course catalogue">
        {filtered.map((course) => {
          const expanded = openCourse === course.courseSlug;
          return (
            <article key={course.courseCode} className={`${styles.catalogueCourse} ${expanded ? styles.catalogueCourseOpen : ""}`}>
              <button type="button" className={styles.catalogueCourseButton} aria-expanded={expanded} onClick={() => setOpenCourse(expanded ? null : course.courseSlug)}>
                <span className={styles.catalogueCourseMeta}>{course.academicYear} · {course.term}</span>
                <strong>{[course.courseCode, ...course.relatedCourseCodes].join(" + ")}</strong>
                <h2>{course.courseTitle}</h2>
                <p>{course.description ?? "Organized study decks for this course."}</p>
                <footer><span>{course.deckCount} decks</span><span>{course.cardCount.toLocaleString()} cards</span><span>{expanded ? "Close" : "View decks"} →</span></footer>
              </button>
              {expanded ? (
                <div className={styles.catalogueDecks}>
                  <div className={styles.catalogueDeckHeading}>
                    <div><p className={styles.eyebrow}>Course library</p><h3>{course.courseTitle}</h3></div>
                    {!signedIn ? <Link href={`/games/living-atlas/access?next=${encodeURIComponent(`/games/living-atlas/courses/${course.courseSlug}`)}`} className={styles.secondaryButton}>Why create an account?</Link> : <Link href={`/games/living-atlas/courses/${course.courseSlug}`} className={styles.secondaryButton}>Open course workspace</Link>}
                  </div>
                  <ul>
                    {course.decks.map((deck) => {
                      const href = startHref(deck.id, signedIn);
                      return (
                        <li key={`${course.courseCode}-${deck.title}`}>
                          <div><strong>{deck.title}</strong><span>{deck.cardCount} cards · {deck.kind === "recall" ? "Recall Practice" : "Practice problems"}</span></div>
                          {deck.available && href ? <Link href={href} className={styles.primaryButton}>{signedIn ? "Start" : "Sign in to practice"}</Link> : <span className={styles.catalogueUnavailable}>In development</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {!filtered.length ? <section className={styles.catalogueEmpty}><h2>No courses match those filters.</h2><p>Try a broader course name, a different term, or reset the year filter.</p></section> : null}

      <section className={styles.catalogueAccountNote}>
        <div><p className={styles.eyebrow}>Account boundary</p><h2>Browse first. Study when you are ready.</h2><p>Creating an account unlocks personal sessions, saved progress, image tools, flags, repair queues, and your companion’s learning record. It never exposes answer keys before you answer.</p></div>
        {!signedIn ? <Link href="/games/living-atlas/access" className={styles.primaryButton}>See account benefits</Link> : null}
      </section>
    </main>
  );
}
