# Fourth Canal Game Brand

The Study Arcade is the energetic, dark-field expression of Fourth Canal. It can feel faster and more competitive than the rest of the site, but it must always look like the same institution.

## Brand idea

**Find the detail that changes the answer.**

Every game isolates one anatomical decision. The interface should reward observation, comparison, and confirmation—not random speed or visual noise. The four canal strands are the recurring orientation device. Three establish the expected pattern; the fourth, in Oxidized Copper, represents the detail a student must notice.

## Required identity

- Always use the approved four-strand Fourth Canal wordmark or compact mark.
- Never use an `FC` tile, generic tooth outline, mascot, or three-strand approximation.
- Keep the global navigation labels consistent: Games, Grade calculator, Study guides, About.
- Use Bodoni Moda for game and module headings. Use Inter for controls, explanations, and scores.
- Corners stay crisp at 3–5px. The arcade may use circular status meters only when the shape communicates progress.

## Atlas Night palette

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Field | `--arcade-bg` | `#091327` | Game background |
| Atlas Navy | `--arcade-panel` | `#0F1E3A` | Primary game panels |
| Raised Navy | `--arcade-panel-strong` | `#172B4D` | Active and elevated panels |
| Warm Bone | `--arcade-enamel` | `#F2EDE2` | Primary text and anatomical surfaces |
| Oxidized Copper | `--arcade-cyan` | `#C86A3A` | Fourth strand, focus, selected state, directional motion |
| Sea Glass | `--arcade-blue` | `#73D3C5` | Correct answers and verified status |
| Structural line | `--arcade-line` | `#354762` | Borders, grids, and anatomy guides |
| Supporting text | `--arcade-muted` | `#B8C2C8` | Secondary copy |
| Error | `--arcade-danger` | `#DC7880` | Incorrect or destructive state only |

The legacy variable name `--arcade-cyan` remains for compatibility with the completed games, but its approved value is copper. Do not introduce neon cyan as a brand color.

## Motion language

- Use scan, trace, sort, reveal, and anatomical assembly motions.
- The fourth strand may pulse, fill, or travel to show progress.
- Correct answers settle into place with Sea Glass; incorrect answers retract or offset in Error.
- Game cards may lift 6–8px and expose their fourth strand on hover.
- Avoid bouncing mascots, gelatinous blobs, particle explosions, and constant unrelated motion.
- Respect the site Motion setting and operating-system reduced-motion preference. Reduced motion removes parallax, looping drift, and long staging while preserving immediate state feedback.

## Navigation and page anatomy

1. Approved inverse wordmark with the `Study Arcade` section label.
2. The same core destinations as the public site.
3. Editorial module title and one plain-language learning goal.
4. Progress or account status in a compact structural rail.
5. The interactive field.
6. Explanation, missed-detail review, and evidence status.

Mobile navigation uses a contained menu. It must never become a horizontally scrolling row or cover gameplay.

## Components

- **Primary action:** copper field, Atlas Night text, 4px corners, directional arrow.
- **Secondary action:** transparent navy field, structural border, Warm Bone text.
- **Module card:** Atlas Navy surface, one-pixel structural border, four-strand signal, no generic illustration.
- **Score:** interface type, tabular numerals, no oversized decorative scoreboard.
- **Evidence label:** Sea Glass for verified; Warm Bone for study-only; Error for held or conflicting evidence.
- **Focus:** 3px copper outline with at least 3px offset.

## Safeguards

`npm run validate:brand` must fail if the game shell reintroduces an `FC` tile, omits the approved brand mark, loses the four-strand rules, or drops a finished game route from the arcade hub.
