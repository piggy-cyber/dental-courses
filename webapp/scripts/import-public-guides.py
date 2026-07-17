#!/usr/bin/env python3
"""Convert the canonical Course Mastery Guides and Textbook Companions to web data.

The source DOCX files stay outside git. This script uses LibreOffice's DOCX
reader, then reduces the generated HTML to a small, safe set of semantic tags.
"""

from __future__ import annotations

import argparse
import html as html_stdlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Iterator

from lxml import html


DEFAULT_SOURCE = Path(
    "~/Library/Mobile Documents/com~apple~CloudDocs/Dentistry/"
    "Course Website/Case Western D1 Assets"
).expanduser()
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "src/data/public-guides.json"
COURSE_DIR_PATTERN = re.compile(r"^(?P<code>[A-Z]{4} \d{3}) - (?P<title>.+)$")
FONT_SIZE_PATTERN = re.compile(r"font-size:\s*([0-9.]+)pt", re.IGNORECASE)
HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-f]{6}$", re.IGNORECASE)
SPACE_PATTERN = re.compile(r"\s+")
BACK_TO_TOC_PATTERN = re.compile(
    r"\s*<a[^>]+href=[\"']#toc[\"'][^>]*>.*?</a>\s*", re.IGNORECASE | re.DOTALL
)


def normalized_text(value: str) -> str:
    return SPACE_PATTERN.sub(" ", value).strip()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "section"


def font_size(element) -> float:
    sizes: list[float] = []
    for descendant in element.iter():
        style = descendant.get("style", "")
        sizes.extend(float(match) for match in FONT_SIZE_PATTERN.findall(style))
    return max(sizes, default=0.0)


def inline_markup(element) -> str:
    def render(node) -> str:
        output = html_stdlib.escape(node.text or "")
        for child in node:
            tag = child.tag.lower() if isinstance(child.tag, str) else ""
            child_content = render(child)
            if tag in {"b", "strong"}:
                output += f"<strong>{child_content}</strong>"
            elif tag in {"i", "em"}:
                output += f"<em>{child_content}</em>"
            elif tag in {"sup", "sub"}:
                output += f"<{tag}>{child_content}</{tag}>"
            elif tag == "br":
                output += "<br>"
            elif tag == "a":
                href = child.get("href", "")
                if href.startswith("#"):
                    output += f'<a href="{html_stdlib.escape(href, quote=True)}">{child_content}</a>'
                elif href.startswith("https://") or href.startswith("http://"):
                    safe_href = html_stdlib.escape(href, quote=True)
                    output += f'<a href="{safe_href}" target="_blank" rel="noreferrer">{child_content}</a>'
                else:
                    output += child_content
            else:
                output += child_content
            output += html_stdlib.escape(child.tail or "")
        return output

    return BACK_TO_TOC_PATTERN.sub("", render(element)).strip()


def anchor_name(element) -> str | None:
    for anchor in element.xpath(".//a[@name]"):
        name = normalized_text(anchor.get("name", ""))
        if name:
            return slugify(name)
    return None


def render_cell(cell) -> str:
    blocks: list[str] = []
    for child in cell:
        tag = child.tag.lower() if isinstance(child.tag, str) else ""
        if tag == "p":
            text = normalized_text(child.text_content())
            if text:
                blocks.append(f"<p>{inline_markup(child)}</p>")
        elif tag in {"ul", "ol"}:
            items = [
                f"<li>{inline_markup(item)}</li>"
                for item in child.xpath("./li")
                if normalized_text(item.text_content())
            ]
            if items:
                blocks.append(f"<{tag}>{''.join(items)}</{tag}>")
        elif tag == "table":
            blocks.append(render_table(child))
        else:
            text = normalized_text(child.text_content())
            if text:
                blocks.append(f"<p>{inline_markup(child)}</p>")
    if not blocks:
        text = normalized_text(cell.text_content())
        if text:
            blocks.append(f"<p>{html_stdlib.escape(text)}</p>")
    return "".join(blocks)


def render_table(table) -> str:
    source_rows = table.xpath("./thead/tr | ./tbody/tr | ./tr")
    first_cells = source_rows[0].xpath("./th | ./td") if source_rows else []
    has_header = len(source_rows) > 1 and len(first_cells) > 1 and all(
        cell.tag.lower() == "th" or bool(cell.xpath(".//b | .//strong"))
        for cell in first_cells
    )
    headers = [normalized_text(cell.text_content()) for cell in first_cells] if has_header else []
    rendered_rows: list[str] = []

    for row_index, row in enumerate(source_rows):
        cells: list[str] = []
        for cell_index, cell in enumerate(row.xpath("./th | ./td")):
            is_header_cell = has_header and row_index == 0
            tag = "th" if is_header_cell or cell.tag.lower() == "th" else "td"
            color = cell.get("bgcolor", "").lower()
            style = f' style="--guide-cell-bg:{color}"' if HEX_COLOR_PATTERN.fullmatch(color) else ""
            scope = ' scope="col"' if is_header_cell else ""
            data_label = ""
            if tag == "td" and cell_index < len(headers):
                escaped_label = html_stdlib.escape(headers[cell_index], quote=True)
                data_label = f' data-label="{escaped_label}"'
            cells.append(f"<{tag}{scope}{style}{data_label}>{render_cell(cell)}</{tag}>")
        if cells:
            rendered_rows.append(f"<tr>{''.join(cells)}</tr>")

    if has_header:
        head = f"<thead>{rendered_rows[0]}</thead>"
        body_rows = rendered_rows[1:]
    else:
        head = ""
        body_rows = rendered_rows
    return (
        "<div class=\"guide-table-scroll\"><table>"
        f"{head}<tbody>{''.join(body_rows)}</tbody></table></div>"
    )


def iter_blocks(body) -> Iterator:
    for child in body:
        tag = child.tag.lower() if isinstance(child.tag, str) else ""
        if tag == "div" and child.get("title") in {"header", "footer"}:
            continue
        if tag in {"p", "h1", "h2", "h3", "table", "ul", "ol"}:
            yield child
        elif tag in {"center", "div", "section"}:
            yield from iter_blocks(child)


def convert_docx(docx_path: Path, soffice: str) -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="fourth-canal-guide-") as temp_name:
        temp_dir = Path(temp_name)
        home_dir = temp_dir / "home"
        profile_dir = temp_dir / "profile"
        home_dir.mkdir()
        profile_dir.mkdir()
        env = os.environ.copy()
        env["HOME"] = str(home_dir)
        subprocess.run(
            [
                soffice,
                "--headless",
                f"-env:UserInstallation=file://{profile_dir}",
                "--convert-to",
                "html",
                "--outdir",
                str(temp_dir),
                str(docx_path),
            ],
            check=True,
            capture_output=True,
            text=True,
            env=env,
        )
        html_path = temp_dir / f"{docx_path.stem}.html"
        if not html_path.exists():
            raise RuntimeError(f"LibreOffice did not create HTML for {docx_path.name}")
        document = html.fromstring(html_path.read_bytes())

    body = document.find("body")
    if body is None:
        raise RuntimeError(f"Converted document has no body: {docx_path.name}")

    title = docx_path.stem
    summary = ""
    body_parts: list[str] = []
    sections: list[dict[str, str]] = []
    used_ids: set[str] = set()
    title_seen = False
    skipping_toc = False

    for block in iter_blocks(body):
        tag = block.tag.lower()
        text = normalized_text(block.text_content())
        if tag in {"p", "h1", "h2", "h3"}:
            if not text:
                continue
            size = font_size(block)
            bold = bool(block.xpath(".//b | .//strong"))
            is_title = size >= 20 or (
                size >= 16 and ("Course Mastery Guide" in text or "Textbook Companion" in text)
            )
            if is_title and not title_seen:
                title = text
                title_seen = True
                continue
            if not title_seen and re.fullmatch(r"[A-Z]{4} \d{3}", text):
                continue
            if title_seen and not summary and 8 <= size <= 12.5 and text != title:
                summary = text
                continue

            level = (
                2
                if tag == "h1"
                else 3
                if tag in {"h2", "h3"}
                else 2
                if size >= 14
                else 3
                if size >= 11.5 and bold
                else 0
            )
            if level:
                heading_text = normalized_text(re.sub(r"Back to TOC", "", text, flags=re.IGNORECASE))
                if heading_text.lower() == "table of contents":
                    skipping_toc = True
                    continue
                skipping_toc = False
                preferred_id = anchor_name(block) or slugify(heading_text)
                section_id = preferred_id
                suffix = 2
                while section_id in used_ids:
                    section_id = f"{preferred_id}-{suffix}"
                    suffix += 1
                used_ids.add(section_id)
                if level == 2:
                    sections.append({"id": section_id, "title": heading_text})
                body_parts.append(
                    f'<h{level} id="{html_stdlib.escape(section_id, quote=True)}">'
                    f"{html_stdlib.escape(heading_text)}</h{level}>"
                )
                continue
            if skipping_toc or text.lower() in {"back to toc", "top"}:
                continue
            body_parts.append(f"<p>{inline_markup(block)}</p>")
        elif tag == "table":
            if not skipping_toc:
                body_parts.append(render_table(block))
        elif tag in {"ul", "ol"}:
            if skipping_toc:
                continue
            items = [
                f"<li>{inline_markup(item)}</li>"
                for item in block.xpath("./li")
                if normalized_text(item.text_content())
            ]
            if items:
                body_parts.append(f"<{tag}>{''.join(items)}</{tag}>")

    if not summary:
        summary = f"A web-readable version of {title}."
    rendered = "".join(body_parts)
    if len(rendered) < 500 or not sections:
        raise RuntimeError(f"Guide conversion produced too little structured content: {docx_path.name}")
    return {"title": title, "summary": summary, "sections": sections, "html": rendered}


def ranked_candidates(paths: list[Path], preferred_root: Path) -> list[Path]:
    def rank(path: Path) -> tuple[int, int, str]:
        lower = str(path).lower()
        in_preferred = 0 if path.is_relative_to(preferred_root) else 1
        review_copy = 1 if "review-ready" in lower or "/approved/" in lower or "review ready" in lower else 0
        return (in_preferred, review_copy, str(path))

    return sorted(paths, key=rank)


def find_guide(course_dir: Path, code: str, guide_type: str, fallback_root: Path) -> Path:
    pattern = "*Course Mastery Guide.docx" if guide_type == "mastery" else "*Textbook Companion.docx"
    candidates = [p for p in course_dir.rglob(pattern) if not p.name.startswith("~$")]
    if not candidates:
        candidates = [
            p
            for p in fallback_root.rglob(f"{code}*{pattern.lstrip('*')}")
            if not p.name.startswith("~$")
        ]
    ranked = ranked_candidates(candidates, course_dir)
    if not ranked:
        raise FileNotFoundError(f"No {guide_type} DOCX found for {code}")
    return ranked[0]


def build_catalog(source_root: Path, soffice: str) -> dict[str, object]:
    fallback_root = source_root.parent / "cheat sheet final"
    course_dirs: list[tuple[str, Path]] = []
    for path in source_root.iterdir():
        if not path.is_dir():
            continue
        match = COURSE_DIR_PATTERN.match(path.name)
        if match:
            course_dirs.append((match.group("code"), path))
    course_dirs.sort(key=lambda item: item[0])

    courses: list[dict[str, object]] = []
    for code, course_dir in course_dirs:
        mastery_path = find_guide(course_dir, code, "mastery", fallback_root)
        textbook_path = find_guide(course_dir, code, "textbook", fallback_root)
        mastery = convert_docx(mastery_path, soffice)
        textbook = convert_docx(textbook_path, soffice)
        course_title = re.sub(r"\s+Course Mastery Guide$", "", str(mastery["title"]))
        course_title = re.sub(rf"^{re.escape(code)}\s+", "", course_title)
        courses.append(
            {
                "code": code,
                "slug": slugify(code),
                "title": course_title,
                "summary": mastery["summary"],
                "guides": {
                    "mastery": {"slug": "course-mastery-guide", **mastery},
                    "textbook": {"slug": "textbook-companion", **textbook},
                },
            }
        )

    if len(courses) != 19:
        raise RuntimeError(f"Expected 19 course folders, found {len(courses)}")
    return {"courses": courses}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    source_root = args.source.expanduser().resolve()
    output_path = args.output.expanduser().resolve()
    if not source_root.is_dir():
        raise FileNotFoundError(f"Guide source folder does not exist: {source_root}")
    soffice = shutil.which("soffice")
    if not soffice:
        raise RuntimeError("LibreOffice (soffice) is required to convert the guide DOCX files")

    catalog = build_catalog(source_root, soffice)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(catalog, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    guide_count = sum(len(course["guides"]) for course in catalog["courses"])
    print(f"Converted {guide_count} guides across {len(catalog['courses'])} courses")
    print(output_path)


if __name__ == "__main__":
    main()
