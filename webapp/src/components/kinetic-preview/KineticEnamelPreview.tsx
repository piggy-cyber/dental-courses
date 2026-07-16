"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./KineticEnamelPreview.module.css";

type MotionMode = "cinematic" | "reduced" | "off";
type PreviewView = "dashboard" | "course";

const FLOW_ITEMS = [
  { time: "8:00", title: "Head & Neck · Cranial nerves", meta: "Lecture 07 · 48 min", accent: "cyan" },
  { time: "10:30", title: "Dental Anatomy · Occlusion lab", meta: "Practical review · Lab 214", accent: "violet" },
  { time: "2:00", title: "Cariology · Risk assessment", meta: "12 cards left in review", accent: "mint" },
];

const COURSES = [
  { code: "DENT 521", title: "Head & Neck", progress: 72, next: "Cranial nerve pathways", color: "cyan" },
  { code: "DENT 511", title: "Dental Anatomy", progress: 84, next: "Posterior tooth ID", color: "violet" },
  { code: "DENT 531", title: "Cariology", progress: 58, next: "Caries detection", color: "mint" },
];

const TOOLS = [
  { kicker: "Plan", title: "Grade Calculator", copy: "Model the score you need before the next exam.", symbol: "%", tone: "blue" },
  { kicker: "Connect", title: "Class Contacts", copy: "Find your cohort and course representatives quickly.", symbol: "@", tone: "pink" },
  { kicker: "Study", title: "Course Library", copy: "Jump back into lectures, transcripts, and guides.", symbol: "+", tone: "mint" },
  { kicker: "Personalize", title: "Your Profile", copy: "Pin courses and tune how Fourth Canal moves.", symbol: "◌", tone: "violet" },
];

const SEARCH_ITEMS = [
  { type: "Lecture", title: "Cranial Nerve VII: Facial Nerve", detail: "Head & Neck · Video + transcript" },
  { type: "Guide", title: "Posterior Tooth Identification", detail: "Dental Anatomy · Course Mastery Guide" },
  { type: "Tool", title: "Grade Calculator", detail: "Calculate weighted course outcomes" },
  { type: "Contact", title: "Head & Neck course representatives", detail: "Class contacts" },
];

export function KineticEnamelPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [motionMode, setMotionMode] = useState<MotionMode>("cinematic");
  const [activeView, setActiveView] = useState<PreviewView>("dashboard");
  const [transitioning, setTransitioning] = useState(false);
  const [toolIndex, setToolIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const [pinned, setPinned] = useState(["DENT 521", "DENT 511"]);
  const [notice, setNotice] = useState("Live concept · demonstration data only");

  useEffect(() => {
    if (motionMode !== "cinematic") return;
    const timer = window.setInterval(() => {
      setToolIndex((current) => (current + 1) % TOOLS.length);
    }, 4300);
    return () => window.clearInterval(timer);
  }, [motionMode]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter((item) =>
      `${item.type} ${item.title} ${item.detail}`.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  function movePointer(event: React.PointerEvent<HTMLDivElement>) {
    if (motionMode !== "cinematic" || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const tiltX = ((y / window.innerHeight) - 0.5) * -10;
    const tiltY = ((x / window.innerWidth) - 0.5) * 12;
    rootRef.current.style.setProperty("--pointer-x", `${x}px`);
    rootRef.current.style.setProperty("--pointer-y", `${y}px`);
    rootRef.current.style.setProperty("--tilt-x", `${tiltX}deg`);
    rootRef.current.style.setProperty("--tilt-y", `${tiltY}deg`);
  }

  function changeView(next: PreviewView) {
    if (next === activeView || transitioning) return;
    if (motionMode === "off") {
      setActiveView(next);
      return;
    }
    setTransitioning(true);
    window.setTimeout(() => setActiveView(next), motionMode === "reduced" ? 150 : 480);
    window.setTimeout(() => setTransitioning(false), motionMode === "reduced" ? 360 : 1180);
  }

  function toggleComplete(index: number) {
    setCompleted((items) =>
      items.includes(index) ? items.filter((item) => item !== index) : [...items, index],
    );
  }

  function togglePin(code: string) {
    setPinned((items) =>
      items.includes(code) ? items.filter((item) => item !== code) : [...items, code],
    );
  }

  function selectSearchResult(title: string) {
    setSearchOpen(false);
    setSearchQuery("");
    setNotice(`Command ready · ${title}`);
  }

  const currentTool = TOOLS[toolIndex];

  return (
    <div
      ref={rootRef}
      className={styles.previewRoot}
      data-motion={motionMode}
      onPointerMove={movePointer}
    >
      <div className={styles.pointerGlow} aria-hidden="true" />
      <div className={styles.ambientField} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.orbThree} />
        <span className={styles.canallineOne} />
        <span className={styles.canallineTwo} />
      </div>

      {transitioning && (
        <div className={styles.blinds} aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} style={{ "--blind-index": index } as React.CSSProperties} />
          ))}
          <div className={styles.transitionMark}>
            <span>FC</span>
            <strong>{activeView === "dashboard" ? "Opening course" : "Returning home"}</strong>
          </div>
        </div>
      )}

      <aside className={styles.livingRail} aria-label="Preview navigation">
        <button className={styles.brandButton} onClick={() => changeView("dashboard")} aria-label="Fourth Canal home">
          <span>FC</span>
        </button>
        <nav>
          <button className={activeView === "dashboard" ? styles.navActive : ""} onClick={() => changeView("dashboard")}>
            <span>01</span> Flow
          </button>
          <button className={activeView === "course" ? styles.navActive : ""} onClick={() => changeView("course")}>
            <span>02</span> Courses
          </button>
          <button onClick={() => setSearchOpen(true)}><span>03</span> Search</button>
          <button onClick={() => setDrawerOpen(true)}><span>04</span> Resource</button>
        </nav>
        <div className={styles.railPulse} aria-hidden="true"><span /></div>
        <button className={styles.avatarButton} aria-label="Open profile preview">RA</button>
      </aside>

      <main className={styles.stage}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.microLabel}>Fourth Canal / Kinetic Enamel Lab</p>
            <h1>{activeView === "dashboard" ? "Good afternoon, Rick." : "Head & Neck Anatomy"}</h1>
          </div>
          <div className={styles.topActions}>
            <button className={styles.searchTrigger} onClick={() => setSearchOpen(true)}>
              <span>⌘</span> Command Chamber <kbd>K</kbd>
            </button>
            <div className={styles.motionControl} aria-label="Motion level">
              {(["cinematic", "reduced", "off"] as MotionMode[]).map((mode) => (
                <button
                  key={mode}
                  className={motionMode === mode ? styles.motionActive : ""}
                  onClick={() => setMotionMode(mode)}
                >
                  {mode === "cinematic" ? "Cinema" : mode === "reduced" ? "Calm" : "Off"}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className={styles.statusStrip}>
          <span><i /> System alive</span>
          <p>{notice}</p>
          <button onClick={() => changeView(activeView === "dashboard" ? "course" : "dashboard")}>
            Preview blinds transition <b>→</b>
          </button>
        </div>

        {activeView === "dashboard" ? (
          <DashboardView
            completed={completed}
            currentTool={currentTool}
            pinned={pinned}
            toolIndex={toolIndex}
            onComplete={toggleComplete}
            onDrawer={() => setDrawerOpen(true)}
            onPin={togglePin}
            onSelectTool={setToolIndex}
            onViewCourse={() => changeView("course")}
          />
        ) : (
          <CourseView onDrawer={() => setDrawerOpen(true)} onHome={() => changeView("dashboard")} />
        )}
      </main>

      <nav className={styles.mobileDock} aria-label="Mobile preview navigation">
        <button className={activeView === "dashboard" ? styles.dockActive : ""} onClick={() => changeView("dashboard")}><span>✦</span>Flow</button>
        <button className={activeView === "course" ? styles.dockActive : ""} onClick={() => changeView("course")}><span>◉</span>Courses</button>
        <button onClick={() => setSearchOpen(true)}><span>⌕</span>Search</button>
        <button onClick={() => setDrawerOpen(true)}><span>＋</span>Open</button>
      </nav>

      {searchOpen && (
        <div className={styles.modalScrim} onMouseDown={() => setSearchOpen(false)}>
          <section className={styles.commandChamber} onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Command Chamber">
            <div className={styles.commandHeader}>
              <span>⌘</span>
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search the entire canal..."
                aria-label="Search Fourth Canal"
              />
              <button onClick={() => setSearchOpen(false)}>ESC</button>
            </div>
            <p className={styles.commandHint}>Courses · lectures · transcripts · tools · people</p>
            <div className={styles.searchResults}>
              {searchResults.map((result, index) => (
                <button key={result.title} onClick={() => selectSearchResult(result.title)}>
                  <span className={styles.resultNumber}>0{index + 1}</span>
                  <span><b>{result.title}</b><small>{result.detail}</small></span>
                  <em>{result.type}</em>
                </button>
              ))}
              {searchResults.length === 0 && <p className={styles.emptySearch}>No match yet. Try “tooth” or “grade”.</p>}
            </div>
          </section>
        </div>
      )}

      <div className={`${styles.drawerScrim} ${drawerOpen ? styles.drawerScrimOpen : ""}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`${styles.resourceDrawer} ${drawerOpen ? styles.drawerOpen : ""}`} aria-hidden={!drawerOpen}>
        <div className={styles.drawerHeader}>
          <div><p className={styles.microLabel}>Layered Resource View</p><h2>Cranial Nerve VII</h2></div>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close resource drawer">×</button>
        </div>
        <div className={styles.videoFrame}>
          <div className={styles.videoScan} />
          <button aria-label="Play preview">▶</button>
          <span>28:14 / 48:02</span>
        </div>
        <div className={styles.resourceMeta}>
          <span>HEAD & NECK · LECTURE 07</span>
          <strong>58% viewed</strong>
        </div>
        <div className={styles.transcriptBlock}>
          <p><b>28:14</b> The facial nerve exits the skull through the stylomastoid foramen before entering the parotid gland...</p>
          <p><b>28:31</b> Remember that its five terminal branches are motor branches to the muscles of facial expression.</p>
        </div>
        <div className={styles.drawerActions}>
          <button className={styles.enamelButton}>Continue lecture <span>→</span></button>
          <button className={styles.ghostButton}>Open transcript</button>
        </div>
      </aside>
    </div>
  );
}

type DashboardProps = {
  completed: number[];
  currentTool: (typeof TOOLS)[number];
  pinned: string[];
  toolIndex: number;
  onComplete: (index: number) => void;
  onDrawer: () => void;
  onPin: (code: string) => void;
  onSelectTool: (index: number) => void;
  onViewCourse: () => void;
};

function DashboardView({ completed, currentTool, pinned, toolIndex, onComplete, onDrawer, onPin, onSelectTool, onViewCourse }: DashboardProps) {
  return (
    <div className={styles.dashboardView}>
      <section className={styles.heroGrid}>
        <article className={`${styles.glassPanel} ${styles.flowPanel}`}>
          <div className={styles.panelHeading}>
            <div><p className={styles.microLabel}>Thursday · July 16</p><h2>Today’s Flow</h2></div>
            <span className={styles.liveBadge}><i /> Live</span>
          </div>
          <div className={styles.flowList}>
            {FLOW_ITEMS.map((item, index) => (
              <button key={item.title} className={completed.includes(index) ? styles.flowComplete : ""} onClick={() => onComplete(index)}>
                <time>{item.time}</time>
                <span className={`${styles.flowNode} ${styles[item.accent]}`}><i /></span>
                <span className={styles.flowCopy}><b>{item.title}</b><small>{item.meta}</small></span>
                <span className={styles.checkMark}>{completed.includes(index) ? "✓" : "○"}</span>
              </button>
            ))}
          </div>
          <div className={styles.flowFooter}>
            <span>{completed.length} of {FLOW_ITEMS.length} complete</span>
            <button className={styles.textButton} onClick={onViewCourse}>Enter today’s course <b>→</b></button>
          </div>
        </article>

        <article className={`${styles.glassPanel} ${styles.toothPanel}`}>
          <div className={styles.toothCopy}>
            <p className={styles.microLabel}>Current focus</p>
            <h2>Trace the pathway.</h2>
            <p>Move through the facial nerve from brainstem to terminal branches.</p>
            <button className={styles.enamelButton} onClick={onDrawer}>Continue lecture <span>→</span></button>
          </div>
          <div className={styles.toothScene} role="img" aria-label="Translucent animated tooth with illuminated root canals">
            <div className={styles.toothHalo} />
            <div className={styles.toothModel}>
              <div className={styles.toothCrown}><i /><b /><em /></div>
              <div className={`${styles.toothRoot} ${styles.rootLeft}`}><i /></div>
              <div className={`${styles.toothRoot} ${styles.rootCenter}`}><i /></div>
              <div className={`${styles.toothRoot} ${styles.rootRight}`}><i /></div>
            </div>
            <span className={styles.anatomyLabelOne}>Enamel shell</span>
            <span className={styles.anatomyLabelTwo}>Canal system</span>
          </div>
        </article>
      </section>

      <section className={styles.middleGrid}>
        <article className={`${styles.glassPanel} ${styles.toolDeck}`}>
          <div className={styles.panelHeading}>
            <div><p className={styles.microLabel}>Rotating utility layer</p><h2>Tool Deck</h2></div>
            <span className={styles.deckCount}>0{toolIndex + 1} / 0{TOOLS.length}</span>
          </div>
          <div className={styles.toolStage} data-tone={currentTool.tone}>
            <div className={styles.toolSymbol}>{currentTool.symbol}</div>
            <div><span>{currentTool.kicker}</span><h3>{currentTool.title}</h3><p>{currentTool.copy}</p></div>
            <button className={styles.roundButton} aria-label={`Open ${currentTool.title}`}>↗</button>
          </div>
          <div className={styles.deckDots}>
            {TOOLS.map((tool, index) => <button key={tool.title} className={toolIndex === index ? styles.deckDotActive : ""} onClick={() => onSelectTool(index)} aria-label={`Show ${tool.title}`} />)}
          </div>
        </article>

        <article className={`${styles.glassPanel} ${styles.signalPanel}`}>
          <p className={styles.microLabel}>Learning signal</p>
          <div className={styles.signalRing}><span>18</span><small>day<br />streak</small></div>
          <h3>Momentum is building.</h3>
          <p>4 lectures and 2 mastery guides completed this week.</p>
          <div className={styles.sparkline} aria-hidden="true">{[32, 52, 44, 68, 61, 86, 74, 96].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
        </article>
      </section>

      <section className={styles.courseSection}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.microLabel}>Pinned + adaptive</p><h2>Course Pulse</h2></div>
          <p>Your most active courses surface themselves. Pin what cannot move.</p>
        </div>
        <div className={styles.courseGrid}>
          {COURSES.map((course, index) => (
            <article className={styles.courseCard} key={course.code} style={{ "--course-index": index } as React.CSSProperties}>
              <div className={`${styles.courseGlow} ${styles[course.color]}`} />
              <button className={`${styles.pinButton} ${pinned.includes(course.code) ? styles.pinned : ""}`} onClick={() => onPin(course.code)} aria-label={`${pinned.includes(course.code) ? "Unpin" : "Pin"} ${course.title}`}>⌁</button>
              <span className={styles.courseCode}>{course.code}</span>
              <h3>{course.title}</h3>
              <div className={styles.progressTrack}><i style={{ width: `${course.progress}%` }} /></div>
              <div className={styles.courseMeta}><span><b>{course.progress}%</b> complete</span><span>Next · {course.next}</span></div>
              <button className={styles.courseOpen} onClick={onViewCourse}>Open course <span>→</span></button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CourseView({ onDrawer, onHome }: { onDrawer: () => void; onHome: () => void }) {
  const lectures = [
    { number: "01", title: "Brainstem nuclei", state: "Complete", progress: 100 },
    { number: "02", title: "Intracranial course", state: "Complete", progress: 100 },
    { number: "03", title: "Facial canal & branches", state: "In progress", progress: 58 },
    { number: "04", title: "Extracranial branches", state: "Up next", progress: 0 },
  ];

  return (
    <div className={styles.courseView}>
      <section className={`${styles.glassPanel} ${styles.courseHero}`}>
        <div>
          <button className={styles.backButton} onClick={onHome}>← Today’s Flow</button>
          <p className={styles.microLabel}>DENT 521 · Module 03</p>
          <h2>The facial nerve, mapped as a living pathway.</h2>
          <p>Follow each branch in sequence. Your lecture, transcript, and mastery guide stay aligned around the same anatomical path.</p>
          <div className={styles.heroActions}><button className={styles.enamelButton} onClick={onDrawer}>Resume lecture <span>→</span></button><button className={styles.ghostButton}>Open mastery guide</button></div>
        </div>
        <div className={styles.courseOrb}><span>58%</span><small>module<br />mastery</small></div>
      </section>

      <section className={styles.lectureCanal}>
        <div className={styles.sectionHeading}><div><p className={styles.microLabel}>Sequential learning path</p><h2>Lecture Canal</h2></div><p>Every resource stays attached to where it belongs.</p></div>
        <div className={styles.canalPath}>
          {lectures.map((lecture, index) => (
            <article key={lecture.number} className={lecture.progress === 58 ? styles.activeLecture : ""}>
              <div className={styles.pathNode}><span>{lecture.number}</span></div>
              <div className={styles.lectureCard}>
                <div><span>{lecture.state}</span><h3>{lecture.title}</h3></div>
                <div className={styles.lectureProgress}><i style={{ width: `${lecture.progress}%` }} /></div>
                <button onClick={onDrawer}>{lecture.progress === 58 ? "Continue" : lecture.progress === 100 ? "Review" : "Preview"} <b>→</b></button>
              </div>
              {index < lectures.length - 1 && <div className={styles.pathConnector}><i /></div>}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.resourceBand}>
        <div><p className={styles.microLabel}>Attached resources</p><h2>Everything moves together.</h2></div>
        {[
          ["Video", "48 min", "58%"],
          ["Transcript", "18 pages", "Synced"],
          ["Mastery Guide", "12 sections", "Updated"],
        ].map((resource) => <button key={resource[0]} onClick={onDrawer}><span>{resource[0]}</span><b>{resource[1]}</b><em>{resource[2]}</em><i>↗</i></button>)}
      </section>
    </div>
  );
}
