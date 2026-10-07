#!/usr/bin/env python3
"""Stream one IRS extract through the authenticated, idempotent ingest protocol."""
from __future__ import annotations

import csv
import datetime as dt
import http.client
import io
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
import uuid

from ingest_irs_nonprofits import (
    BATCH_SIZE,
    MAX_CANDIDATES,
    SOURCE_ID,
    STATES,
    candidate_from_row,
    chunks,
    discover_files,
    request,
)

BASE_URL = os.getenv("LEADS_BASE_URL", "https://rukhlabs.com").rstrip("/")
POST_ATTEMPTS = 3
BACKPRESSURE_LABELS = {"normal", "moderate", "high", "heavy", "critical"}
REQUIRED_CSV_COLUMNS = {
    "EIN", "NAME", "STATUS", "RULING", "NTEE_CD", "STATE",
    "ASSET_AMT", "REVENUE_AMT",
}


class WorkerError(RuntimeError):
    """A deliberately sanitized message safe for reports and workflow logs."""


def safe_error(error: Exception) -> str:
    # Never serialize arbitrary exception text: network errors can include an
    # authenticated URL, response body, token, or another service's secrets.
    if isinstance(error, WorkerError):
        return str(error)[:900]
    if isinstance(error, urllib.error.HTTPError):
        return f"IRS HTTP request failed (status {error.code})"
    if isinstance(error, (urllib.error.URLError, TimeoutError, ConnectionError)):
        return "IRS network request failed"
    if isinstance(error, (ValueError, csv.Error)):
        return "IRS import received invalid data or configuration"
    return "IRS import failed"


def run_id() -> str:
    """Keep re-invocations within one GitHub run attempt idempotent."""
    identity = tuple(os.getenv(key, "").strip() for key in (
        "GITHUB_REPOSITORY", "GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT",
    ))
    if all(identity):
        return str(uuid.uuid5(uuid.NAMESPACE_URL, "rukh-irs:" + "/".join(identity)))
    return str(uuid.uuid4())


def oidc_token() -> str:
    request_url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL", "")
    request_token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "")
    if not request_url or not request_token:
        raise WorkerError("GitHub Actions OIDC environment is unavailable")
    separator = "&" if "?" in request_url else "?"
    req = urllib.request.Request(
        f"{request_url}{separator}audience=rukhlabs.com",
        headers={"Authorization": f"bearer {request_token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    token = payload.get("value") if isinstance(payload, dict) else None
    if not isinstance(token, str) or not token.strip():
        raise WorkerError("GitHub Actions did not issue an OIDC token")
    return token.strip()


def counter(value: object, maximum: int) -> bool:
    return type(value) is int and 0 <= value <= maximum


def validate_response(stage: str, result: object, payload: dict[str, object]) -> dict[str, object]:
    valid = isinstance(result, dict) and result.get("ok") is True
    if valid:
        valid = isinstance(result.get("replayed"), bool)
    if valid and stage == "candidates":
        received = len(payload["candidates"])
        valid = (
            counter(result.get("received"), received) and result["received"] == received
            and counter(result.get("stored"), received)
            and counter(result.get("runStored"), 1500)
            and counter(result.get("allowance"), 1500)
            and result["stored"] <= result["runStored"] <= result["allowance"]
            and isinstance(result.get("backpressure"), str)
            and result["backpressure"] in BACKPRESSURE_LABELS
        )
    elif valid and stage == "report":
        status = "error" if payload.get("error") else "success"
        valid = (
            result.get("status") == status
            and counter(result.get("stored"), payload["qualified"])
            and result["stored"] >= payload["stored"]
            # An error report may reconcile a committed batch whose response
            # was lost. A successful run has acknowledged every batch.
            and (status == "error" or result["stored"] == payload["stored"])
        )
    else:
        valid = False
    if not valid:
        raise WorkerError(f"Invalid IRS {stage} response")
    return result


def transient_error(error: Exception) -> bool:
    if isinstance(error, urllib.error.HTTPError):
        return error.code == 429 or 500 <= error.code <= 599
    if isinstance(error, ssl.SSLError):
        return False
    if isinstance(error, urllib.error.URLError):
        return not isinstance(error.reason, ssl.SSLError)
    return isinstance(error, (TimeoutError, ConnectionError, http.client.IncompleteRead))


def post(stage: str, payload: dict[str, object]) -> dict[str, object]:
    if stage not in ("candidates", "report"):
        raise WorkerError("Invalid IRS request stage")
    # Serialize once so every retry uses exactly the same idempotency payload.
    data = json.dumps(payload, allow_nan=False, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    for attempt in range(POST_ATTEMPTS):
        try:
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
                result = json.loads(response.read().decode("utf-8"))
            return validate_response(stage, result, payload)
        except Exception as error:  # noqa: BLE001
            if isinstance(error, urllib.error.HTTPError):
                error.close()
            if transient_error(error) and attempt + 1 < POST_ATTEMPTS:
                time.sleep(2 ** attempt)
                continue
            if isinstance(error, WorkerError):
                raise
            if isinstance(error, urllib.error.HTTPError):
                message = f"IRS {stage} request failed (HTTP {error.code})"
            elif isinstance(error, (ValueError, UnicodeError)):
                message = f"Invalid IRS {stage} response"
            else:
                message = f"IRS {stage} request failed"
            raise WorkerError(message) from None
    raise WorkerError(f"IRS {stage} request failed")


def main() -> int:
    identity = run_id()
    selected: list[dict[str, object]] = []
    selected_eins: set[str] = set()
    seen = 0
    stored = 0
    allowance = None
    backpressure = None
    cursor = None
    report_attempted = False
    try:
        files = discover_files()
        if not files:
            raise WorkerError("No official IRS state extracts are available")
        index = int(os.getenv("IRS_FILE_INDEX", str(dt.date.today().toordinal()))) % len(files)
        csv_url = files[index]
        official_files = [f"https://www.irs.gov/pub/irs-soi/eo_{state}.csv" for state in STATES]
        if csv_url not in official_files:
            raise WorkerError("Invalid official IRS state extract")
        file_index = official_files.index(csv_url)
        cursor = {"file": csv_url, "fileIndex": file_index}
        state_file = STATES[file_index]
        today = dt.datetime.now(dt.timezone.utc).date()
        print(f"Streaming official IRS extract {index + 1}/{len(files)}: {csv_url}")
        with request(csv_url, timeout=240) as response:
            reader = csv.DictReader(io.TextIOWrapper(response, encoding="latin-1", newline=""), strict=True)
            headers = [name.upper().strip() for name in reader.fieldnames or []]
            if (not headers or any(not name for name in headers)
                    or len(set(headers)) != len(headers)
                    or not REQUIRED_CSV_COLUMNS.issubset(headers)):
                raise WorkerError("Invalid IRS CSV headers")
            reader.fieldnames = headers
            for raw in reader:
                seen += 1
                # DictReader otherwise pads missing columns with None and
                # silently collects extra columns under a None key.
                if None in raw or any(value is None for value in raw.values()):
                    raise WorkerError("Malformed IRS CSV row")
                row = {key: str(value) for key, value in raw.items()}
                candidate = candidate_from_row(row, state_file=state_file, today=today)
                if candidate and candidate["sourceKey"] not in selected_eins:
                    selected_eins.add(candidate["sourceKey"])
                    selected.append(candidate)
                    if len(selected) >= MAX_CANDIDATES:
                        break

        envelope = {"sourceId": SOURCE_ID, "runId": identity, "cursor": cursor}
        for batch_index, batch in enumerate(chunks(selected, BATCH_SIZE)):
            payload = {**envelope, "batchIndex": batch_index, "candidates": batch}
            result = post("candidates", payload)
            if result["runStored"] != stored + result["stored"]:
                raise WorkerError("Inconsistent IRS batch stored total")
            if allowance is not None and (result["allowance"] != allowance or result["backpressure"] != backpressure):
                raise WorkerError("Inconsistent IRS run allowance")
            allowance, backpressure = result["allowance"], result["backpressure"]
            stored += result["stored"]
            print(f"Uploaded {len(batch)} recent nonprofits; endpoint stored {result['stored']}")

        summary: dict[str, object] = {
            **envelope, "seen": seen, "qualified": len(selected), "stored": stored,
        }
        report_attempted = True
        post("report", summary)
        print(json.dumps(summary))
        return 0
    except Exception as error:  # noqa: BLE001
        message = safe_error(error)
        # Before discovery succeeds no valid cursor exists. Once a report has
        # been sent its outcome may be ambiguous, so never change its payload.
        if cursor is not None and not report_attempted:
            try:
                post("report", {
                    "sourceId": SOURCE_ID, "runId": identity, "cursor": cursor,
                    "seen": seen, "qualified": len(selected), "stored": stored,
                    "error": message,
                })
            except Exception:
                print("IRS failure report could not be confirmed", file=sys.stderr)
        raise WorkerError(message) from None


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001
        print(safe_error(error), file=sys.stderr)
        raise SystemExit(1) from None
