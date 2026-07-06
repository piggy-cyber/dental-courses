#!/usr/bin/env python3
"""Upload course files to the dental-courses library as the course bot.

Auth comes from COURSE_BOT_API_KEY (env var, or automation/.env).

Examples:
    # Drop files into the course inbox (assign them in the admin UI later)
    python automation/course_uploader.py --course "DENT 101" lecture5.pdf notes.pdf

    # Replace the file behind an existing resource row
    python automation/course_uploader.py --course "DENT 101" --resource-id 42 syllabus.pdf
"""

import argparse
import os
import sys
from pathlib import Path

import requests

DEFAULT_SITE = "https://dental-courses-piggy-cybers-projects.vercel.app"
DEFAULT_COLLECTION = "d1-2025-2026"
ENV_FILE = Path(__file__).resolve().parent / ".env"


def load_api_key() -> str | None:
    key = os.environ.get("COURSE_BOT_API_KEY")
    if key:
        return key.strip()
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line.startswith("COURSE_BOT_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"')
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("files", nargs="+", help="Files to upload")
    parser.add_argument("--course", required=True, help='Course code, e.g. "DENT 101"')
    parser.add_argument("--collection", default=DEFAULT_COLLECTION, help=f"Collection id (default: {DEFAULT_COLLECTION})")
    parser.add_argument("--site", default=os.environ.get("COURSE_SITE_URL", DEFAULT_SITE), help="Site base URL")
    parser.add_argument("--resource-id", type=int, help="Replace the file on an existing resource row instead of using the inbox")
    args = parser.parse_args()

    api_key = load_api_key()
    if not api_key:
        print("error: COURSE_BOT_API_KEY is not set (env var or automation/.env)", file=sys.stderr)
        return 1

    paths = [Path(p) for p in args.files]
    missing = [str(p) for p in paths if not p.is_file()]
    if missing:
        print(f"error: file(s) not found: {', '.join(missing)}", file=sys.stderr)
        return 1

    data = {"courseCode": args.course, "collectionId": args.collection}
    if args.resource_id:
        data["resourceId"] = str(args.resource_id)
    else:
        data["inbox"] = "1"

    files = [("file", (p.name, p.open("rb"))) for p in paths]
    try:
        res = requests.post(
            f"{args.site.rstrip('/')}/api/admin/course-resource/upload",
            headers={"Authorization": f"Bearer {api_key}"},
            data=data,
            files=files,
            timeout=300,
        )
    finally:
        for _, (_, fh) in files:
            fh.close()

    if res.status_code == 401:
        print("error: not authorized — check COURSE_BOT_API_KEY", file=sys.stderr)
        return 1

    body = res.json()
    print(f"uploaded: {body.get('uploaded', 0)}")
    for rid, path in zip(body.get("resourceIds", []), paths):
        print(f"  resource {rid}: {path.name}")
    for err in body.get("errors", []):
        print(f"error: {err}", file=sys.stderr)
    return 0 if body.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
