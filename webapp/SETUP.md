# Fourth Canal — Setup Guide

This is the real, secure version of the course site. Nobody sees anything
except the homepage until you approve their account.

How it works, in one paragraph: students visit the homepage (date, campus
weather, and their own saved Canvas calendar feed). They sign in with Google.
That puts them on your approval list as "pending" — they still can't see
anything. First, prebuild the graduating class in the Roster page and mark the
students who are allowed to join. Then link each student's Google account to
the correct roster name. Their D1, D2, D3, and D4 resources accumulate
automatically as the class advances. Council responsibilities are managed
separately and never change a student&apos;s class access.

You need to create two free accounts (Supabase and Google Cloud) and click
through some settings once. About 30 minutes. Everything below is copy-paste.

---

## Step 1 — Create the Supabase project (the database)

1. Go to https://supabase.com and sign up (you can use your Google account).
2. Click "New project". Name it `Fourth Canal`, pick a strong database
   password (save it somewhere), region `East US (North Virginia)`.
3. Wait ~2 minutes for it to finish creating.

## Step 2 — Create the database tables

1. In the Supabase dashboard, click "SQL Editor" in the left sidebar.
2. Open the file `webapp/supabase/schema.sql` from this project, copy ALL of
   it, paste it into the editor, and click "Run".
3. You should see "Success. No rows returned". Done.

## Step 3 — Turn on Google sign-in

1. Go to https://console.cloud.google.com and sign in with your Gmail.
2. Create a new project (name doesn't matter, e.g. `fourth-canal`).
3. In the search bar, find "OAuth consent screen" ("branding" page):
   - User type: External. App name: `Fourth Canal`. Add the app logo,
     `https://fourthcanal.com` as the homepage, and the public Privacy and
     Terms links from `https://fourthcanal.com/legal`.
   - You can leave everything else default and save.
4. Search for "Credentials" -> "Create credentials" -> "OAuth client ID":
   - Application type: Web application.
   - Under "Authorized redirect URIs" click "+ Add URI" and paste your
     Supabase callback URL. You find it in Supabase under
     Authentication -> Sign In / Up -> Google -> "Callback URL".
     For this project it is
     `https://fourthcanal.supabase.co/auth/v1/callback`.
   - Click Create. Copy the "Client ID" and "Client secret" it shows you.
5. Back in Supabase: Authentication -> Sign In / Up -> Google:
   - Toggle it on, paste the Client ID and Client secret, save.
6. Keep email/password and magic-link sign-in disabled. Fourth Canal uses
   Google OAuth only.

## Step 4 — Connect this app to Supabase

1. In Supabase: Project Settings -> API. You'll see three things you need.
2. In the `webapp` folder, copy `.env.example` to a new file named
   `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` = the "Project URL"
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the "anon public" key
   - `SUPABASE_SECRET_KEY` = the "service_role" key (keep this one secret!)
3. Each approved student can add their own Canvas calendar feed from the
   profile page after signing in.

## Step 5 — Load your course library into the database

In a terminal, from the `webapp` folder:

```bash
npm install
node scripts/seed.mjs
node scripts/apply-resource-collections.mjs
```

This reads the course data from the static site (including your private
YouTube IDs and transcripts, which live only on your Mac) and loads it into
the database, where only approved accounts can read it.
The resource collection migration creates the default D1 resource set and
backfills approved accounts that already have matching D1 access.

## Step 6 — Make yourself the owner

1. Start the site: `npm run dev`, then open http://localhost:3000
2. Sign in with YOUR Google account (this creates your pending account).
3. Back in the terminal:

```bash
node scripts/make-owner.mjs your-email@gmail.com
```

4. Refresh the site. You now have full access plus an "Accounts" page where
   you approve or revoke everyone else.

## Step 7 (optional) — Upload the actual course files

Slides, PDFs, and other documents can be stored privately in Supabase Storage
so the "Open" buttons work:

```bash
node scripts/upload-files.mjs --dry   # see what it would upload
node scripts/upload-files.mjs         # actually upload
```

It matches your downloaded course folder (set `COURSE_FILES_DIR` in
`.env.local` if it's not in `~/Downloads/Case Western D1 2025-2026`).

## Step 8 — Put it on the internet

The easiest host for Next.js is Vercel (free for this size):

1. Push this repo to GitHub (already done).
2. Go to https://vercel.com, sign in with GitHub, click "Add New -> Project",
   pick the `dental-courses` repo.
3. Set "Root Directory" to `webapp`.
4. Add the same three environment variables from `.env.local`.
5. Click Deploy.
6. After it deploys, add your live URL to two allow-lists:
   - Supabase: Authentication -> URL Configuration -> Site URL + Redirect URLs
     (set `https://fourthcanal.com` and add
     `https://fourthcanal.com/auth/callback`).

That's it. Students sign in, you approve them, they get everything.

---

## Safety notes

- `.env.local` is git-ignored. Never commit or share the `SUPABASE_SECRET_KEY`.
- Transcripts and YouTube IDs now live in the database, not in public files.
- Files in storage are in a PRIVATE bucket; the site hands out links that
  expire after 10 minutes, and only to approved accounts.
- The old static site (the HTML files in the repo root) is still there and
  still public-safe; it contains no private data.
