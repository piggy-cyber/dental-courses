# Course Resource Upload Guide

Use this folder only for files that are safe to publish publicly.

Paid or limited-access course files should live in private storage behind real authentication, not in a GitHub Pages public asset folder.

## Folder Layout

- `course-mastery-guides/`: placeholder only until protected hosting exists.
- `syllabi/`: placeholder only until protected hosting exists.
- `textbook-companions/`: placeholder only until protected hosting exists.
- `images/[course-slug]/`: placeholder only until protected hosting exists.
- `videos/[course-slug]/`: placeholder only; embed YouTube videos instead of uploading video files here.

## Add a New File

1. If the file is public, put it in the matching folder.
2. If the file is limited-access, add it to the private storage layer instead.
3. In `../js/course-data.js`, use a real path only for public files. Use `true` for locked files that exist but should not expose a public URL.

## Course Slugs

Course media folders use the same course slugs as the guide PDFs, for example:

- `rehe-151-dental-anatomy`
- `dspr-136-cariology`
- `hewb-130-oral-histology`

Keep filenames lowercase and web-safe when possible.
