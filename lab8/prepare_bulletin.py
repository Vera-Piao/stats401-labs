from collections import defaultdict
import re
import unicodedata

import pandas as pd
from pypdf import PdfReader


PDF_PATH = "../data/V2021-22_DKU_UG_Bulletin.pdf"
OUTPUT_PATH = "../data/bulletin_passages.csv"
DOCUMENT_TITLE = "Bulletin of Duke Kunshan University Undergraduate Instruction"
DOCUMENT_VERSION = "2021-2022"


def flatten_outline(reader):
    """Return PDF bookmark destinations with their complete hierarchy path."""

    records = []

    def visit(items, parent_path=()):
        last_path = parent_path

        for item in items:
            if isinstance(item, list):
                visit(item, last_path)
                continue

            try:
                page = reader.get_destination_page_number(item) + 1
            except Exception:
                continue

            title = re.sub(r"\s+", " ", item.title).strip()
            path = parent_path + (title,)

            records.append({
                "page": page,
                "title": title,
                "path": path
            })

            last_path = path

    visit(reader.outline)
    return records


def normalize_heading(text):
    """Normalize a heading so bookmark text can be matched to extracted text."""

    text = unicodedata.normalize("NFKC", text)
    text = text.lower().replace("–", "-").replace("—", "-")
    text = re.sub(r"\s*-\s*", "-", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def clean_passage(text):
    """Clean common whitespace and PDF line-break artifacts."""

    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(
        r"(?<=[A-Za-z])\s*-\s+(?=[a-z])",
        "-",
        text
    )
    return text


def metadata_from_path(path):
    """Convert the bookmark path into assignment-ready hierarchy fields."""

    section = path[0] if path else "Unknown Section"
    subsection = " › ".join(path[1:]) if len(path) > 1 else ""

    return {
        "chapter": f"{DOCUMENT_TITLE}, {DOCUMENT_VERSION}",
        "section": section,
        "subsection": subsection
    }


reader = PdfReader(PDF_PATH)
outline = flatten_outline(reader)

headings_by_page = defaultdict(list)

for heading in outline:
    headings_by_page[heading["page"]].append(heading)

rows = []
current_path = ()
passage_number = 1


def add_passage(page_number, path, lines):
    global passage_number

    if not lines:
        return

    text = clean_passage(" ".join(lines))

    if len(text.split()) < 5:
        return

    metadata = metadata_from_path(path)

    rows.append({
        "passage_id": f"p{passage_number:05d}",
        **metadata,
        "page": page_number,
        "text": text
    })

    passage_number += 1


for page_number, page in enumerate(reader.pages, start=1):
    # Pages 1-9 are the cover and table of contents. Task 3 asks us
    # to remove table-of-contents artifacts before semantic analysis.
    if page_number < 10:
        continue

    page_headings = headings_by_page.get(page_number, [])
    lines = (page.extract_text() or "").replace("\r", "\n").splitlines()
    lines = [line.strip() for line in lines]

    if lines and re.fullmatch(r"\d+", lines[0]):
        lines = lines[1:]

    block = []
    index = 0

    while index < len(lines):
        line = lines[index]

        if not line:
            add_passage(page_number, current_path, block)
            block = []
            index += 1
            continue

        matched_heading = None
        consumed_lines = 1

        # Some long bookmark titles wrap across several extracted lines.
        for span in range(1, min(4, len(lines) - index) + 1):
            candidate = " ".join(lines[index:index + span])
            normalized_candidate = normalize_heading(candidate)

            for heading in page_headings:
                normalized_title = normalize_heading(heading["title"])

                exact_match = normalized_candidate == normalized_title
                close_wrapped_match = (
                    len(normalized_title) > 18
                    and (
                        normalized_title in normalized_candidate
                        or normalized_candidate in normalized_title
                    )
                    and abs(
                        len(normalized_title)
                        - len(normalized_candidate)
                    ) < 18
                )

                if exact_match or close_wrapped_match:
                    matched_heading = heading
                    consumed_lines = span
                    break

            if matched_heading:
                break

        if matched_heading:
            add_passage(page_number, current_path, block)
            block = []
            current_path = matched_heading["path"]
            index += consumed_lines
            continue

        block.append(line)
        index += 1

    add_passage(page_number, current_path, block)

    # If a bookmark title was not printed verbatim on the page, its path
    # still becomes the starting hierarchy for the following page.
    if page_headings:
        current_path = page_headings[-1]["path"]


df = pd.DataFrame(rows)
df.to_csv(OUTPUT_PATH, index=False)

print(df.head())
print("\nRaw passages:", len(df))
print("\nColumns:")
print(df.columns.tolist())
