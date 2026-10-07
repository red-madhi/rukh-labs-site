"""Standard-library IRS EO BMF parsing shared by the scheduled OIDC worker.

Candidate fields and scores follow the existing TypeScript IRS collector.
Alongside its prospect filters, this worker requires a nine-digit EIN and a
valid, nonfuture ruling month within the configured recent-month window.
Importing this module never fetches data or writes to the lead database.
"""

from __future__ import annotations

import datetime as dt
import html
import math
import os
import re
import urllib.request
from collections.abc import Iterator, Sequence
from typing import TypeVar

SOURCE_ID = "national-nonprofits"
SOURCE_URL = (
    "https://www.irs.gov/charities-non-profits/"
    "exempt-organizations-business-master-file-extract-eo-bmf"
)
STATES = (
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "dc", "fl", "ga", "hi",
    "id", "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn",
    "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh",
    "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa",
    "wv", "wi", "wy",
)


def positive_setting(name: str, default: int, *, maximum: int | None = None) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError as exc:
        raise ValueError(f"{name} must be a positive integer") from exc
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    if maximum is not None and value > maximum:
        raise ValueError(f"{name} must not exceed {maximum}")
    return value


BATCH_SIZE = 100
MAX_CANDIDATES = positive_setting("IRS_MAX_CANDIDATES", 1500, maximum=1500)
RECENT_MONTHS = positive_setting("IRS_RECENT_MONTHS", 60, maximum=60)

NTEE_LABELS = dict(zip(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    (
        "Arts and culture nonprofit", "Education nonprofit", "Environmental nonprofit",
        "Animal welfare nonprofit", "Health nonprofit", "Mental health nonprofit",
        "Disease and disorder nonprofit", "Medical research nonprofit", "Crime and legal nonprofit",
        "Employment nonprofit", "Food and agriculture nonprofit", "Housing nonprofit",
        "Public safety nonprofit", "Recreation and sports nonprofit", "Youth development nonprofit",
        "Human services nonprofit", "International nonprofit", "Civil rights nonprofit",
        "Community improvement nonprofit", "Philanthropy nonprofit", "Science and technology nonprofit",
        "Social science nonprofit", "Public benefit nonprofit", "Religious nonprofit",
        "Mutual benefit organization", "Unclassified nonprofit",
    ),
))

NON_PROSPECT_NAME = re.compile(
    r"\b(?:registered agent|statutory agent|holdings?|investment holdings?|property holdings?|"
    r"series llc|trust|estate of|condominium association|homeowners? association|hoa|"
    r"capital management|acquisition|special purpose|management company)\b", re.I,
)
LARGE_INSTITUTION = re.compile(
    r"\b(?:university|college system|medical center|health system|hospital system|"
    r"department of|state of |county of |city of |federal|national headquarters)\b", re.I,
)
INDUSTRIES = (
    (r"dent|orthodont|oral surgery|endodont|periodont", "Dental practice"),
    (r"therapy|therapist|counsel|behavioral|mental health|psycholog", "Behavioral health"),
    (r"chiro|physical therapy|rehab|wellness", "Health and wellness"),
    (r"clinic|medical|healthcare|health care|family medicine|pediatr", "Healthcare practice"),
    (r"vet|veterinary|animal hospital|pet care", "Veterinary services"),
    (r"plumb|electric|roof|hvac|heating|cooling|landscap|contract|construction", "Home services"),
    (r"cleaning|janitorial|maid", "Cleaning services"),
    (r"restaurant|cafe|coffee|bakery|kitchen|grill|bistro|tavern", "Food and hospitality"),
    (r"salon|barber|spa|beauty|nail", "Personal services"),
    (r"law|legal|attorney", "Legal services"),
    (r"account|bookkeep|tax service|payroll", "Financial services"),
    (r"nonprofit|foundation|association|society|coalition|alliance|ministry|church", "Nonprofit organization"),
    (r"daycare|child care|preschool|academy|learning center", "Education and childcare"),
    (r"realty|real estate|property management", "Real estate"),
    (r"auto|automotive|collision|tire|garage", "Automotive services"),
    (r"photo|creative|studio|design|media|marketing", "Creative services"),
)


def clean_text(value: str, limit: int = 500) -> str:
    value = " ".join(html.unescape(re.sub(r"<[^>]*>", " ", value)).split())
    return value if len(value) <= limit else value[:limit - 1].rstrip() + "…"


def amount(value: str) -> float:
    try:
        number = float(re.sub(r"[^\d.-]", "", value))
    except ValueError:
        return 0
    return number if math.isfinite(number) else 0


def candidate_from_row(
    row: dict[str, str], *, state_file: str = "", today: dt.date | None = None,
) -> dict[str, object] | None:
    state_file = state_file.upper()
    if state_file and state_file.lower() not in STATES:
        raise ValueError("Unknown IRS state file")
    row = {key: clean_text(value) for key, value in row.items()}
    ein = row.get("EIN", "")
    name = clean_text(row.get("NAME", ""), 260)
    if not re.fullmatch(r"[0-9]{9}", ein) or len(name) < 3:
        return None
    if NON_PROSPECT_NAME.search(name) or LARGE_INSTITUTION.search(name):
        return None
    if row.get("STATUS", "") not in ("", "01", "1"):
        return None
    state = row.get("STATE", "").upper() or state_file
    if state.lower() not in STATES:
        return None

    assets = amount(row.get("ASSET_AMT", ""))
    revenue = amount(row.get("REVENUE_AMT", ""))
    if assets > 100_000_000 or revenue > 50_000_000:
        return None

    ruling = row.get("RULING", "")
    if not re.fullmatch(r"[0-9]{6}", ruling):
        return None
    try:
        formed = dt.date(int(ruling[:4]), int(ruling[4:]), 1)
    except ValueError:
        return None
    today = today or dt.datetime.now(dt.timezone.utc).date()
    age_months = (today.year - formed.year) * 12 + today.month - formed.month
    # A 60-month window includes this month and the preceding 59 months.
    if formed.year < 1900 or not 0 <= age_months < RECENT_MONTHS:
        return None

    ntee = clean_text(row.get("NTEE_CD", "").upper(), 20)
    category = NTEE_LABELS.get(ntee[:1])
    if not category:
        industry_text = f"{name} {row.get('ACTIVITY', '')}"
        category = next((label for pattern, label in INDUSTRIES
                         if re.search(rf"\b(?:{pattern})\b", industry_text, re.I)),
                        "Nonprofit organization")

    priority = 38
    if formed.year >= today.year - 1:
        priority += 22
    elif formed.year >= today.year - 4:
        priority += 14
    elif formed.year >= today.year - 8:
        priority += 7
    if 0 < revenue <= 2_000_000:
        priority += 8
    if re.search(r"community|animal|arts|recreation|youth|human services|food|housing", category, re.I):
        priority += 7
    if re.search(r"religious", category, re.I):
        priority -= 5

    return {
        "source": SOURCE_ID,
        "sourceKey": ein,
        "organizationName": name,
        "alternateName": clean_text(row.get("SORT_NAME") or row.get("ICO") or "", 260) or None,
        "category": category,
        "addressLine1": clean_text(row.get("STREET", ""), 220),
        "city": clean_text(row.get("CITY", ""), 120),
        "state": state,
        "postalCode": clean_text(row.get("ZIP", ""), 24),
        "countryCode": "US",
        "sourceUrl": SOURCE_URL,
        "formedAt": formed.isoformat(),
        "prioritySeed": max(0, min(100, priority)),
        "metadata": {
            "ein": ein,
            "subsection": clean_text(row.get("SUBSECTION", ""), 20) or None,
            "nteeCode": ntee or None,
            "ruling": ruling,
            "taxPeriod": clean_text(row.get("TAX_PERIOD", ""), 20) or None,
            "assetAmount": assets,
            "revenueAmount": revenue,
            "incomeAmount": amount(row.get("INCOME_AMT", "")),
            **({"irsStateFile": state_file} if state_file else {}),
        },
    }


def discover_files() -> list[str]:
    """Use the same official state extracts as the repository's IRS collector."""
    return [f"https://www.irs.gov/pub/irs-soi/eo_{state}.csv" for state in STATES]


def request(url: str, timeout: int = 60):
    req = urllib.request.Request(url, headers={
        "Accept": "text/csv,*/*;q=0.5",
        "Accept-Encoding": "identity",
        "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)",
    })
    return urllib.request.urlopen(req, timeout=timeout)


T = TypeVar("T")


def chunks(items: Sequence[T], size: int) -> Iterator[list[T]]:
    if size <= 0:
        raise ValueError("Batch size must be positive")
    for index in range(0, len(items), size):
        yield list(items[index:index + size])
