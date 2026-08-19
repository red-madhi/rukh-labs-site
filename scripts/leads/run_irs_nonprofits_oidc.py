#!/usr/bin/env python3
from __future__ import annotations

import csv
import datetime as dt
import io
import json
import os
import sys
import urllib.request

from ingest_irs_nonprofits import (
    BATCH_SIZE,
    MAX_CANDIDATES,
    candidate_from_row,
    chunks,
    discover_files,
    request,
)

BASE_URL = os.getenv("LEADS_BASE_URL", "https://rukhlabs.com").rstrip("/")


def oidc_token() -> str:
    request_url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL", "")
    request_token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "")
    if not request_url or not request_token:
        raise RuntimeError("GitHub Actions OIDC environment is unavailable")
    separator = "&" if "?" in request_url else "?"
    req = urllib.request.Request(
        f"{request_url}{separator}audience=rukhlabs.com",
        headers={"Authorization": f"bearer {request_token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    token = str(payload.get("value") or "").strip()
    if not token:
        raise RuntimeError("GitHub Actions did not issue an OIDC token")
    return token


def post(stage: str, payload: dict[str, object]) -> dict[str, object]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/github-crawl-ingest?stage={stage}",
        data=data,
        headers={
            "Authorization": f"Bearer {oidc_token()}",
            "Content-Type": "application/json",
            "User-Agent": "Rukh-Leads-IRS-OIDC/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    files = discover_files()
    index = int(os.getenv("IRS_FILE_INDEX", str(dt.date.today().toordinal()))) % len(files)
    csv_url = files[index]
    selected: list[dict[str, object]] = []
    seen = 0
    stored = 0
    try:
        print(f"Streaming official IRS extract {index + 1}/{len(files)}: {csv_url}")
        with request(csv_url, timeout=240) as response:
            reader = csv.DictReader(io.TextIOWrapper(response, encoding="latin-1", newline=""))
            for raw in reader:
                seen += 1
                row = {str(key or "").upper().strip(): str(value or "") for key, value in raw.items()}
                candidate = candidate_from_row(row)
                if candidate:
                    selected.append(candidate)
                    if len(selected) >= MAX_CANDIDATES:
                        break

        for batch in chunks(selected, BATCH_SIZE):
            result = post("candidates", {"sourceId": "irs-nonprofits", "candidates": batch})
            stored += int(result.get("stored", 0) or 0)
            print(f"Uploaded {len(batch)} recent nonprofits; endpoint stored {result.get('stored', 0)}")

        summary: dict[str, object] = {
            "sourceId": "irs-nonprofits",
            "seen": seen,
            "qualified": len(selected),
            "stored": stored,
            "cursor": {"file": csv_url, "fileIndex": index},
        }
        post("report", summary)
        print(json.dumps(summary))
        return 0
    except Exception as exc:  # noqa: BLE001
        try:
            post(
                "report",
                {
                    "sourceId": "irs-nonprofits",
                    "seen": seen,
                    "qualified": len(selected),
                    "stored": stored,
                    "error": str(exc),
                    "cursor": {"file": csv_url, "fileIndex": index},
                },
            )
        except Exception:
            pass
        raise


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001
        print(str(error), file=sys.stderr)
        raise
