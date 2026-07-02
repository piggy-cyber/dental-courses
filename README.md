# D1 Course Library

Public preview for a student course library.

- `index.html`: simple homepage.
- `library.html`: semester-organized course navigation.
- `management.html`: lecture, caption, YouTube embed, and file matching draft.
- `login.html`: student and owner access draft.
- `assets/resources/`: public-safe placeholders only.
- `assets/js/youtube-videos.js`: public placeholder for YouTube metadata.
- `assets/js/youtube-videos.private.js`: ignored local preview file with real YouTube IDs.
- `assets/js/transcript-content.js`: public placeholder for transcript text.
- `assets/js/transcript-content.private.js`: ignored local preview file with transcript text for copy/download testing.
- `private-staging/`: ignored local staging for locked files before protected hosting.

Do not commit paid or limited-access course files, transcript text, or unlisted YouTube IDs to this public static site. Put locked files in private storage and serve them only through authenticated, short-lived links. YouTube videos should be embedded from YouTube after the protected access layer is active, not uploaded to GitHub.
