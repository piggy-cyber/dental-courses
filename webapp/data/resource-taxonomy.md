# Resource taxonomy

Edit this file to change how course files are categorized across admin and student views.

After editing, run:

```bash
node webapp/scripts/generate-resource-taxonomy.mjs
```

Then paste `webapp/supabase/resource-organization.sql` into the Supabase SQL editor (once, or after taxonomy changes that add new roles).

---

## Essentials

### essential_syllabus
label: Syllabus
kind: Syllabus
section: Syllabus
canonical: yes
sort: 10

### essential_mastery
label: Mastery guide
kind: Course Mastery Guide
section: Mastery guide
sort: 20

### essential_companion
label: Textbook companion
kind: Textbook Companion
section: Textbook companion
optional: yes
sort: 30

---

## Lecture files

### lecture_slides
label: Slides
kind: Slides
section: Lecture
sort: 40

### lecture_transcript_file
label: Transcript file
kind: Document
section: Lecture
sort: 50

### lecture_other
label: Other file
kind: Document
section: Lecture
sort: 60

---

## Labs and extras

### supplemental_lab_guide
label: Lab guide
kind: Lab Guide
section: Lab guide
sort: 70

### supplemental_flashcards
label: Flashcards
kind: Flashcards
section: Flashcards
sort: 80

### supplemental_document
label: Document
kind: Document
section: Documents
sort: 90

### supplemental_local_media
label: Supplemental video
kind: Local Media Source
section: Videos
sort: 100

### supplemental_other
label: Other
kind: Document
section: Other
sort: 110

---

## Inbox

### inbox
label: Inbox (unassigned)
kind: Document
section: Inbox
sort: 1000
