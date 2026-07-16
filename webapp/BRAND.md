# Fourth Canal — Brand Guidelines

## Theme: Clinical Calm

A student-built dental study desk with a public core and a separate private cohort library—not a corporate portal and not an official university site. The feeling is **focused, trustworthy, and calm**: open the game, calculate a grade, or read a course guide without digging through folders.

**Public promise:** *Study the signal. Skip the clutter.*

**Positioning:** Independent, peer-made dental study tools. The public core is open; legacy D1 course files remain behind approval-based access. Official school systems remain the source of truth.

---

## Brand personality

| Trait | We are | We are not |
|-------|--------|------------|
| Tone | Direct, helpful, peer-to-peer | Corporate, salesy, institutional |
| Voice | “Open the lecture” / “Course files” | “Leverage assets” / “Content ecosystem” |
| Audience | Dental students who need answers fast | Recruiters, patients, or clinical consumers |
| Trust | Clear labels, honest disclaimers, no clutter | Over-designed, gamified, flashy |

---

## Name & logo

**Product name:** Fourth Canal
**Short mark:** `FC` in a navy square
**Wordmark:** “Fourth Canal” in navy, bold

```
┌────┐
│ FC │  Fourth Canal
└────┘
```

- Mark minimum size: 24×24 px  
- Clear space: at least half the mark width on all sides  
- Do not stretch, rotate, or change mark colors outside the palette  

---

## Color palette

| Token | Hex | Use |
|-------|-----|-----|
| **Ink** | `#172033` | Primary text, headings |
| **Navy** | `#17375f` | Brand mark, nav, section titles |
| **Blue** | `#2878a8` | Primary buttons, links |
| **Teal** | `#278b83` | Eyebrows, accents, success states |
| **Gold** | `#ad7923` | Highlights, “owner” badges (sparingly) |
| **Paper** | `#f7f8f9` | Page background |
| **Panel** | `#ffffff` | Cards, modals, nav bar |
| **Soft** | `#eef5f4` | Hover states, subtle fills |
| **Line** | `#dce3e7` | Borders, dividers |
| **Muted** | `#687782` | Secondary text, metadata |

**Rules**
- Backgrounds stay light (paper + white panels). No dark mode for MVP.  
- One accent per screen: teal *or* gold, not both fighting for attention.  
- Links and CTAs use **blue**; navigation brand uses **navy**.  

---

## Typography

**Primary:** Geist Sans (via Next.js)  
**Fallback:** Inter, Segoe UI, system sans-serif  
**Mono:** Geist Mono — file names, codes, IDs only  

| Role | Size | Weight |
|------|------|--------|
| Page title | 1.5–2rem | 700 |
| Section heading | 1.125rem | 600–700 |
| Body | 0.9375–1rem | 400 |
| Eyebrow / label | 0.75rem | 700, uppercase, letter-spacing 0.12em |
| Metadata | 0.75–0.8125rem | 400, muted color |

Line height: **1.5–1.65** for body; keep paragraphs short.

---

## UI patterns

**Cards:** White panel, `1px` line border, soft shadow, `rounded-xl`  
**Buttons — primary:** Blue background, white text, rounded-lg/full  
**Buttons — secondary:** White background, line border, navy text  
**Navigation:** Sticky white bar, blur, navy wordmark, muted links → navy on hover  
**Course shelf:** Group files by kind (Syllabus → Textbook → Mastery Guide → Slides…)  
**Lecture rows:** Numbered title, date metadata, embedded video, transcript button below  

---

## Imagery

- Prefer **real study context**: desk, notes, tooth diagrams only when course-relevant  
- Hero asset: `assets/img/dental-study-hero.png` (static site) — warm, student desk, not clinical stock  
- No stock “smiling dentist” marketing photos  
- YouTube embeds are the main visual on course pages — keep chrome minimal so video reads clearly  

---

## Copy standards

**Homepage:** Lead with the game, grade calculator, and web-native course guides. Account creation is secondary.
**About:** Who built it, what’s inside, access model, disclaimer.  
**Empty states:** Say what to do next (“Run seed script”, “Not uploaded yet”).  
**Errors:** Plain English; direct users to retry Google or contact the site operator.

**Required disclaimer (About + footer):**  
*Student-built resource hub. Not affiliated with or endorsed by Case Western Reserve University or the School of Dental Medicine.*

---

## Voice examples

| Instead of… | Write… |
|-------------|--------|
| Access learning modules | Open a course |
| Multimedia assets | Lectures and videos |
| Cheat sheet | Course Mastery Guide |
| Repository | Library |
| Authentication failure | Google sign-in failed — try again |

---

## File & storage naming (internal)

Organized paths in Supabase Storage:

```
pillars/course-mastery-guides/{course-slug}/{filename}
pillars/textbook-companions/{course-slug}/{filename}
courses/{course-slug}/slides/{filename}
courses/{course-slug}/syllabus/{filename}
courses/{course-slug}/documents/{filename}
```

Display names match Canvas / source filenames so students recognize them.

---

## Pages checklist

| Page | Brand notes |
|------|-------------|
| `/` | Paper bg, navy title, teal eyebrow, three public core tools |
| `/about` | Story + disclaimer, public |
| `/games` | Public arcade; sign-in offered for saved progress |
| `/grade-calculator` | Public, local-only calculation |
| `/guides` | Public two-guide course index |
| `/library` | Private D1 semester groups, unlisted and no-index |
| `/course/[code]` | Private D1 lecture and file workspace |
| `/owner` | Gold accent for admin only |

---

*Last updated: July 2026 — Fourth Canal.*
