"""Offline regressions for the scheduled IRS worker. No service credentials needed."""

import contextlib
import csv
import datetime as dt
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import ssl
import sys
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts" / "leads"
sys.path.insert(0, str(SCRIPTS))


def deny_network(*args, **kwargs):
    raise AssertionError("Real network is forbidden")


# Cover import-time regressions as well as calls made inside individual tests.
urllib.request.urlopen = deny_network

import ingest_irs_nonprofits as irs  # noqa: E402
import run_irs_nonprofits_oidc as worker  # noqa: E402

TODAY = dt.date(2026, 10, 7)


def row(**changes):
    result = {
        "EIN": "000000001", "NAME": "EXAMPLE COMMUNITY ARTS", "STATUS": "01",
        "RULING": "202509", "NTEE_CD": "A20", "SUBSECTION": "03",
        "STREET": "1 EXAMPLE STREET", "CITY": "EXAMPLE CITY", "STATE": "CO",
        "ZIP": "00001", "SORT_NAME": "", "ICO": "", "TAX_PERIOD": "202512",
        "ASSET_AMT": "100000", "REVENUE_AMT": "50000", "INCOME_AMT": "60000",
    }
    result.update(changes)
    return result


def batch_response(stored, received=None, run_stored=None, *, allowance=1500, backpressure="normal", replayed=False):
    return {
        "ok": True, "stored": stored,
        "received": stored if received is None else received,
        "runStored": stored if run_stored is None else run_stored,
        "allowance": allowance, "backpressure": backpressure, "replayed": replayed,
    }


def report_response(stored=0, *, status="success", replayed=False):
    return {"ok": True, "stored": stored, "status": status, "replayed": replayed}


def batch_payload(count=1):
    return {
        "sourceId": irs.SOURCE_ID, "runId": "080bdb8e-520a-44bb-90f8-73aabf113018",
        "batchIndex": 0, "cursor": {"file": irs.discover_files()[5], "fileIndex": 5},
        "candidates": [irs.candidate_from_row(row(EIN=f"{index:09}"), today=TODAY)
                       for index in range(count)],
    }


def json_bytes(value):
    return io.BytesIO(json.dumps(value).encode("utf-8"))


def csv_bytes(rows):
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode("latin-1")


class CandidateTests(unittest.TestCase):
    def candidate(self, **changes):
        return irs.candidate_from_row(row(**changes), state_file="CO", today=TODAY)

    def test_exact_candidate_contract_and_leading_zero_ein(self):
        candidate = self.candidate(SORT_NAME="EXAMPLE ARTS", ICO="IGNORED")
        self.assertEqual(candidate, {
            "source": "national-nonprofits", "sourceKey": "000000001",
            "organizationName": "EXAMPLE COMMUNITY ARTS", "alternateName": "EXAMPLE ARTS",
            "category": "Arts and culture nonprofit", "addressLine1": "1 EXAMPLE STREET",
            "city": "EXAMPLE CITY", "state": "CO", "postalCode": "00001",
            "countryCode": "US", "sourceUrl": irs.SOURCE_URL, "formedAt": "2025-09-01",
            "prioritySeed": 75,
            "metadata": {
                "ein": "000000001", "subsection": "03", "nteeCode": "A20",
                "ruling": "202509", "taxPeriod": "202512", "assetAmount": 100000,
                "revenueAmount": 50000, "incomeAmount": 60000, "irsStateFile": "CO",
            },
        })
        self.assertEqual(json.loads(json.dumps(candidate)), candidate)

    def test_filters_reject_nonprospects(self):
        for changes in (
            {"EIN": ""}, {"EIN": "1e8"}, {"EIN": "1234567890"}, {"NAME": "AB"},
            {"STATUS": "02"}, {"NAME": "EXAMPLE HOLDINGS"}, {"NAME": "EXAMPLE TRUST"},
            {"NAME": "EXAMPLE HOMEOWNER ASSOCIATION"}, {"NAME": "EXAMPLE UNIVERSITY"},
            {"NAME": "EXAMPLE MEDICAL CENTER"}, {"ASSET_AMT": "100000001"},
            {"REVENUE_AMT": "50000001"},
        ):
            with self.subTest(changes=changes):
                self.assertIsNone(self.candidate(**changes))

    def test_status_and_financial_boundaries(self):
        for status in ("", "1", "01", " 01 "):
            with self.subTest(status=status):
                self.assertIsNotNone(self.candidate(STATUS=status, ASSET_AMT="100000000", REVENUE_AMT="50000000"))

    def test_sixty_calendar_months_include_current_and_prior_fifty_nine(self):
        with patch.object(irs, "RECENT_MONTHS", 60):
            self.assertIsNotNone(self.candidate(RULING="202610"))
            self.assertIsNotNone(self.candidate(RULING="202111"))
            self.assertIsNone(self.candidate(RULING="202110"))
            self.assertIsNone(self.candidate(RULING="202611"))

    def test_invalid_or_missing_ruling_is_not_recent(self):
        for ruling in ("", "202600", "202613", "2026-1", "abcdef", "000001", "189912"):
            with self.subTest(ruling=ruling):
                self.assertIsNone(self.candidate(RULING=ruling))

    def test_ntee_fallback_name_cleaning_and_alternate_name(self):
        candidate = self.candidate(NTEE_CD="", NAME="  EXAMPLE <b>ARTS</b> &amp; STUDIO ", ICO="EXAMPLE OFFICE")
        self.assertEqual(candidate["category"], "Creative services")
        self.assertEqual(candidate["organizationName"], "EXAMPLE ARTS & STUDIO")
        self.assertEqual(candidate["alternateName"], "EXAMPLE OFFICE")
        self.assertEqual(self.candidate(NTEE_CD="X00")["prioritySeed"], 63)

    def test_file_provenance_and_missing_row_state(self):
        candidate = self.candidate(STATE="")
        self.assertEqual(candidate["state"], "CO")
        self.assertEqual(candidate["metadata"]["irsStateFile"], "CO")
        candidate = self.candidate(STATE="NY")
        self.assertEqual(candidate["state"], "NY")
        self.assertEqual(candidate["metadata"]["irsStateFile"], "CO")
        without_file = irs.candidate_from_row(row(), today=TODAY)
        self.assertNotIn("irsStateFile", without_file["metadata"])

    def test_invalid_state_is_rejected_and_fields_match_server_limits(self):
        for state in ("XX", "CANADA", "PR"):
            with self.subTest(state=state):
                self.assertIsNone(self.candidate(STATE=state))
        candidate = self.candidate(SORT_NAME="X" * 500, STREET="X" * 500,
                                  CITY="X" * 500, ZIP="X" * 500, SUBSECTION="X" * 500,
                                  NTEE_CD="A" * 500, TAX_PERIOD="X" * 500)
        for field, maximum in (("alternateName", 260), ("addressLine1", 220), ("city", 120), ("postalCode", 24)):
            self.assertEqual(len(candidate[field]), maximum)
        for field in ("subsection", "nteeCode", "taxPeriod"):
            self.assertEqual(len(candidate["metadata"][field]), 20)

    def test_amounts_are_json_finite(self):
        for value, expected in (("$1,234.50", 1234.5), ("-12", -12), ("", 0), ("nan", 0), ("1.2.3", 0), ("9" * 400, 0)):
            with self.subTest(value=value):
                self.assertEqual(irs.amount(value), expected)

    def test_state_files_match_existing_collector(self):
        source = (ROOT / "src/app/api/leads/collect/irs-nonprofits/route.ts").read_text()
        import re
        block = re.search(r"const states = \[(.*?)\] as const", source, re.S).group(1)
        states = re.findall(r'"([a-z]{2})"', block)
        self.assertEqual(list(irs.STATES), states)
        files = irs.discover_files()
        self.assertEqual(len(files), 51)
        self.assertEqual(len(set(files)), 51)
        self.assertEqual(files, [f"https://www.irs.gov/pub/irs-soi/eo_{state}.csv" for state in states])

    def test_chunks_and_invalid_configuration(self):
        self.assertEqual(list(irs.chunks([1, 2, 3], 2)), [[1, 2], [3]])
        self.assertEqual(list(irs.chunks([], 2)), [])
        with self.assertRaises(ValueError):
            list(irs.chunks([1], 0))
        for invalid in ("0", "-1", "bad"):
            with patch.dict(os.environ, {"IRS_MAX_CANDIDATES": invalid}):
                with self.assertRaisesRegex(ValueError, "IRS_MAX_CANDIDATES"):
                    irs.positive_setting("IRS_MAX_CANDIDATES", 1500)


    def test_configured_limits_cannot_expand_approved_scope(self):
        for name, maximum in (("IRS_MAX_CANDIDATES", 1500), ("IRS_RECENT_MONTHS", 60)):
            for value in ("0", "-1", "not-an-integer", str(maximum + 1)):
                with self.subTest(name=name, value=value), patch.dict(os.environ, {name: value}):
                    with self.assertRaisesRegex(ValueError, name):
                        irs.positive_setting(name, maximum, maximum=maximum)
            for value in (1, maximum):
                with self.subTest(name=name, value=value), patch.dict(os.environ, {name: str(value)}):
                    self.assertEqual(irs.positive_setting(name, maximum, maximum=maximum), value)
            environment = {key: value for key, value in os.environ.items() if not key.startswith("IRS_")}
            environment.update({name: str(maximum + 1), "PYTHONPATH": str(SCRIPTS)})
            result = subprocess.run(
                [sys.executable, "-c", "import ingest_irs_nonprofits"],
                cwd=ROOT, env=environment, capture_output=True, text=True, timeout=10,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(f"{name} must not exceed {maximum}", result.stderr)

    def test_narrower_recent_window_remains_supported(self):
        with patch.object(irs, "RECENT_MONTHS", 12):
            self.assertIsNotNone(self.candidate(RULING="202511"))
            self.assertIsNone(self.candidate(RULING="202510"))


class WorkerTests(unittest.TestCase):
    def setUp(self):
        # Fail closed if a test accidentally escapes its request/post fixtures.
        self.network = patch("urllib.request.urlopen", side_effect=AssertionError("Real network is forbidden"))
        self.network.start()
        self.addCleanup(self.network.stop)

    def test_clean_checkout_entrypoint_imports_without_hidden_dependency(self):
        with tempfile.TemporaryDirectory() as directory:
            checkout = Path(directory) / "checkout"
            scripts = checkout / "scripts/leads"
            scripts.mkdir(parents=True)
            for name in ("ingest_irs_nonprofits.py", "run_irs_nonprofits_oidc.py"):
                shutil.copyfile(SCRIPTS / name, scripts / name)
            guard = Path(directory) / "guard"
            guard.mkdir()
            (guard / "sitecustomize.py").write_text(
                "import urllib.request\n"
                "def blocked(*args, **kwargs):\n"
                "    raise RuntimeError('OFFLINE_TEST_NETWORK_BLOCKED')\n"
                "urllib.request.urlopen = blocked\n"
            )
            environment = {key: value for key, value in os.environ.items()
                           if not key.startswith(("IRS_", "ACTIONS_ID_TOKEN_"))}
            environment.update(PYTHONPATH=str(guard), PYTHONDONTWRITEBYTECODE="1")
            result = subprocess.run(
                [sys.executable, str(scripts / "run_irs_nonprofits_oidc.py")],
                cwd=directory, env=environment, capture_output=True, text=True, timeout=10,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("IRS import failed", result.stderr)
            self.assertNotIn("OFFLINE_TEST_NETWORK_BLOCKED", result.stderr)
            self.assertNotIn("ModuleNotFoundError", result.stderr)

    def test_stream_limit_latin1_csv_batches_and_success_report(self):
        ruling = dt.datetime.now(dt.timezone.utc).strftime("%Y%m")
        rows = [row(EIN=f"{index:09}", NAME='EXAMPLE CAFÉ, "ARTS"', RULING=ruling) for index in range(1, 5)]
        rows.insert(1, row(STATUS="02", RULING=ruling))
        with patch.object(worker, "discover_files", return_value=["https://www.irs.gov/pub/irs-soi/eo_co.csv"]), \
             patch.object(worker, "request", return_value=io.BytesIO(csv_bytes(rows))), \
             patch.object(worker, "post", side_effect=[batch_response(2), batch_response(1, run_stored=3), report_response(3)]) as post, \
             patch.object(worker, "MAX_CANDIDATES", 3), patch.object(worker, "BATCH_SIZE", 2), \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(worker.main(), 0)
        calls = post.call_args_list
        self.assertEqual([call.args[0] for call in calls], ["candidates", "candidates", "report"])
        self.assertEqual([len(call.args[1]["candidates"]) for call in calls[:2]], [2, 1])
        self.assertEqual(calls[0].args[1]["candidates"][0]["organizationName"], 'EXAMPLE CAFÉ, "ARTS"')
        self.assertEqual(calls[0].args[1]["candidates"][0]["metadata"]["irsStateFile"], "CO")
        self.assertEqual(calls[-1].args[1]["seen"], 4)
        self.assertEqual(calls[-1].args[1]["qualified"], 3)
        self.assertEqual(calls[-1].args[1]["stored"], 3)
        identity = calls[0].args[1]["runId"]
        self.assertEqual(str(uuid.UUID(identity)), identity)
        for call in calls:
            self.assertEqual(call.args[1]["sourceId"], "national-nonprofits")
            self.assertEqual(call.args[1]["runId"], identity)
            self.assertEqual(call.args[1]["cursor"], {
                "file": "https://www.irs.gov/pub/irs-soi/eo_co.csv", "fileIndex": 5,
            })
        self.assertEqual([call.args[1]["batchIndex"] for call in calls[:2]], [0, 1])

    def test_all_rejected_rows_still_report_without_upload(self):
        with patch.object(worker, "discover_files", return_value=["https://www.irs.gov/pub/irs-soi/eo_co.csv"]), \
             patch.object(worker, "request", return_value=io.BytesIO(csv_bytes([row(STATUS="02")]))), \
             patch.object(worker, "post", return_value=report_response()) as post, \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(worker.main(), 0)
        post.assert_called_once()
        self.assertEqual(post.call_args.args[0], "report")
        self.assertEqual(post.call_args.args[1]["seen"], 1)
        self.assertEqual(post.call_args.args[1]["qualified"], 0)
        self.assertEqual(post.call_args.args[1]["stored"], 0)

    def test_upload_error_is_reported_and_reraised(self):
        ruling = dt.datetime.now(dt.timezone.utc).strftime("%Y%m")
        with patch.object(worker, "discover_files", return_value=["https://www.irs.gov/pub/irs-soi/eo_co.csv"]), \
             patch.object(worker, "request", return_value=io.BytesIO(csv_bytes([row(RULING=ruling)]))), \
             patch.object(worker, "post", side_effect=[RuntimeError("Upload unavailable secret-token"), report_response(status="error")]) as post, \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(worker.WorkerError, "IRS import failed"):
                worker.main()
        self.assertEqual(post.call_args_list[-1].args[0], "report")
        self.assertEqual(post.call_args_list[-1].args[1]["error"], "IRS import failed")
        self.assertNotIn("secret-token", json.dumps(post.call_args_list[-1].args[1]))

    def test_missing_oidc_environment_fails_before_token_request(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "OIDC environment is unavailable"):
                worker.oidc_token()

    def test_oidc_request_audience_and_empty_token_handling(self):
        for base, separator in (("https://token.invalid/request", "?"), ("https://token.invalid/request?x=1", "&")):
            with self.subTest(base=base), patch.dict(os.environ, {
                "ACTIONS_ID_TOKEN_REQUEST_URL": base,
                "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "test-request-token",
            }), patch("urllib.request.urlopen", return_value=io.BytesIO(b'{"value":"test-jwt"}')) as opened:
                self.assertEqual(worker.oidc_token(), "test-jwt")
                request = opened.call_args.args[0]
                self.assertEqual(request.full_url, base + separator + "audience=rukhlabs.com")
                self.assertEqual(request.get_header("Authorization"), "bearer test-request-token")
                self.assertEqual(opened.call_args.kwargs["timeout"], 30)
        with patch.dict(os.environ, {
            "ACTIONS_ID_TOKEN_REQUEST_URL": "https://token.invalid/request",
            "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "test-request-token",
        }), patch("urllib.request.urlopen", return_value=io.BytesIO(b'{}')):
            with self.assertRaisesRegex(RuntimeError, "did not issue an OIDC token"):
                worker.oidc_token()

    def test_post_uses_authenticated_json_gateway(self):
        payload = batch_payload()
        with patch.object(worker, "BASE_URL", "https://example.invalid"), \
             patch.object(worker, "oidc_token", return_value="test-jwt"), \
             patch("urllib.request.urlopen", return_value=json_bytes(batch_response(1))) as opened:
            self.assertEqual(worker.post("candidates", payload), batch_response(1))
        request = opened.call_args.args[0]
        self.assertEqual(request.full_url, "https://example.invalid/api/github-crawl-ingest?stage=candidates")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-jwt")
        self.assertEqual(request.get_header("Content-type"), "application/json")
        self.assertEqual(json.loads(request.data), payload)

    def test_irs_download_uses_bounded_timeout_and_identified_agent(self):
        fixture = io.BytesIO(b"csv fixture")
        with patch("urllib.request.urlopen", return_value=fixture) as opened:
            self.assertIs(irs.request(irs.discover_files()[0], timeout=240), fixture)
        request = opened.call_args.args[0]
        self.assertEqual(request.get_header("Accept-encoding"), "identity")
        self.assertIn("Rukh-Leads", request.get_header("User-agent"))
        self.assertEqual(opened.call_args.kwargs["timeout"], 240)


    def test_run_id_stable_for_github_attempt_and_distinct_between_attempts(self):
        environment = {"GITHUB_REPOSITORY": "example/project", "GITHUB_RUN_ID": "123", "GITHUB_RUN_ATTEMPT": "1"}
        with patch.dict(os.environ, environment, clear=True):
            identity = worker.run_id()
            self.assertEqual(worker.run_id(), identity)
            self.assertEqual(uuid.UUID(identity).version, 5)
            for name, value in (("GITHUB_REPOSITORY", "another/project"), ("GITHUB_RUN_ID", "124"), ("GITHUB_RUN_ATTEMPT", "2")):
                with patch.dict(os.environ, {name: value}):
                    self.assertNotEqual(worker.run_id(), identity)
        with patch.dict(os.environ, {}, clear=True):
            first, second = worker.run_id(), worker.run_id()
            self.assertEqual(uuid.UUID(first).version, 4)
            self.assertNotEqual(first, second)
        with patch.dict(os.environ, {"GITHUB_RUN_ID": "123"}, clear=True):
            self.assertEqual(uuid.UUID(worker.run_id()).version, 4)

    def test_duplicate_eins_do_not_consume_run_cap_or_cross_batch_boundary(self):
        ruling = dt.datetime.now(dt.timezone.utc).strftime("%Y%m")
        rows = [row(EIN=f"{index:09}", RULING=ruling) for index in (1, 1, 2, 1, 3, 4)]
        with patch.object(worker, "discover_files", return_value=[irs.discover_files()[5]]), \
             patch.object(worker, "request", return_value=io.BytesIO(csv_bytes(rows))), \
             patch.object(worker, "post", side_effect=[batch_response(2), batch_response(1, run_stored=3), report_response(3)]) as post, \
             patch.object(worker, "MAX_CANDIDATES", 3), patch.object(worker, "BATCH_SIZE", 2), \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(worker.main(), 0)
        uploaded = [candidate["sourceKey"] for call in post.call_args_list[:2] for candidate in call.args[1]["candidates"]]
        self.assertEqual(uploaded, ["000000001", "000000002", "000000003"])
        self.assertEqual(post.call_args_list[-1].args[1]["seen"], 5)
        self.assertEqual(post.call_args_list[-1].args[1]["qualified"], 3)

    def test_same_github_invocation_replays_identical_batches_and_report(self):
        ruling = dt.datetime.now(dt.timezone.utc).strftime("%Y%m")
        data = csv_bytes([row(RULING=ruling), row(EIN="000000002", RULING=ruling)])
        environment = {"GITHUB_REPOSITORY": "example/project", "GITHUB_RUN_ID": "123",
                       "GITHUB_RUN_ATTEMPT": "1", "IRS_FILE_INDEX": "5"}
        invocations = []
        for replayed in (False, True):
            with patch.dict(os.environ, environment), \
                 patch.object(worker, "request", return_value=io.BytesIO(data)), \
                 patch.object(worker, "post", side_effect=[batch_response(1, replayed=replayed),
                     batch_response(1, run_stored=2, replayed=replayed), report_response(2, replayed=replayed)]) as post, \
                 patch.object(worker, "BATCH_SIZE", 1), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(worker.main(), 0)
            invocations.append(post.call_args_list)
        self.assertEqual(invocations[0], invocations[1])
        self.assertEqual(invocations[1][-1].args[1]["stored"], 2)

    def test_file_selection_override_uses_canonical_state_index(self):
        for index in ("-1", "52"):
            files = irs.discover_files()
            with self.subTest(index=index), patch.dict(os.environ, {"IRS_FILE_INDEX": index}), \
                 patch.object(worker, "request", return_value=io.BytesIO(csv_bytes([row(STATUS="02")]))), \
                 patch.object(worker, "post", return_value=report_response()) as post, \
                 contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(worker.main(), 0)
            expected = int(index) % len(files)
            self.assertEqual(post.call_args.args[1]["cursor"], {"file": files[expected], "fileIndex": expected})

    def test_run_backpressure_allowance_remains_fixed_across_batches(self):
        ruling = dt.datetime.now(dt.timezone.utc).strftime("%Y%m")
        rows = [row(EIN=f"{index:09}", RULING=ruling) for index in range(1, 4)]
        replies = [batch_response(1, 2, allowance=1, backpressure="critical"),
                   batch_response(0, 1, 1, allowance=1, backpressure="critical"), report_response(1)]
        with patch.object(worker, "discover_files", return_value=[irs.discover_files()[5]]), \
             patch.object(worker, "request", return_value=io.BytesIO(csv_bytes(rows))), \
             patch.object(worker, "post", side_effect=replies) as post, \
             patch.object(worker, "BATCH_SIZE", 2), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(worker.main(), 0)
        self.assertEqual(post.call_args_list[-1].args[1]["stored"], 1)
        self.assertEqual(post.call_args_list[-1].args[1]["qualified"], 3)

    def test_changed_allowance_or_inconsistent_totals_fail_the_run(self):
        ruling = dt.datetime.now(dt.timezone.utc).strftime("%Y%m")
        for second in (batch_response(1, run_stored=1), batch_response(1, run_stored=2, allowance=100),
                       batch_response(1, run_stored=2, backpressure="heavy")):
            with self.subTest(second=second), \
                 patch.object(worker, "discover_files", return_value=[irs.discover_files()[5]]), \
                 patch.object(worker, "request", return_value=io.BytesIO(csv_bytes([row(RULING=ruling), row(EIN="000000002", RULING=ruling)]))), \
                 patch.object(worker, "post", side_effect=[batch_response(1), second, report_response(2, status="error")]) as post, \
                 patch.object(worker, "BATCH_SIZE", 1), contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaisesRegex(worker.WorkerError, "Inconsistent IRS"):
                    worker.main()
            self.assertEqual(post.call_args_list[-1].args[0], "report")
            self.assertEqual(post.call_args_list[-1].args[1]["stored"], 1)
            self.assertIn("error", post.call_args_list[-1].args[1])

    def test_discovery_failure_has_no_invalid_cursor_report(self):
        for files in ([], ["https://untrusted.invalid/eo_co.csv"]):
            with self.subTest(files=files), patch.object(worker, "discover_files", return_value=files), \
                 patch.object(worker, "post") as post, patch.object(worker, "request") as request:
                with self.assertRaises(worker.WorkerError):
                    worker.main()
            post.assert_not_called()
            request.assert_not_called()
        with patch.object(worker, "discover_files", side_effect=RuntimeError("secret-token")), \
             patch.object(worker, "post") as post:
            with self.assertRaisesRegex(worker.WorkerError, "IRS import failed"):
                worker.main()
        post.assert_not_called()

    def test_invalid_file_selection_is_sanitized_and_does_not_report(self):
        with patch.dict(os.environ, {"IRS_FILE_INDEX": "not-an-index"}), patch.object(worker, "post") as post:
            with self.assertRaisesRegex(worker.WorkerError, "invalid data or configuration"):
                worker.main()
        post.assert_not_called()

    def test_download_failure_reports_known_cursor_without_secrets(self):
        with patch.object(worker, "discover_files", return_value=[irs.discover_files()[5]]), \
             patch.object(worker, "request", side_effect=urllib.error.URLError("secret-token")), \
             patch.object(worker, "post", return_value=report_response(status="error")) as post, \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(worker.WorkerError, "network request failed"):
                worker.main()
        post.assert_called_once()
        summary = post.call_args.args[1]
        self.assertEqual(summary["cursor"], {"file": irs.discover_files()[5], "fileIndex": 5})
        self.assertEqual((summary["seen"], summary["qualified"], summary["stored"]), (0, 0, 0))
        self.assertNotIn("secret-token", json.dumps(summary))

    def test_missing_invalid_or_duplicate_csv_headers_fail_with_sanitized_report(self):
        fieldnames = list(row())
        invalid = [b"", b"<html>secret-token IRS temporarily unavailable</html>", b"WRONG,HEADER\nexample,text\n"]
        invalid += [( ",".join(name for name in fieldnames if name != missing) + "\n").encode()
                    for missing in worker.REQUIRED_CSV_COLUMNS]
        invalid += [( ",".join(fieldnames + [extra]) + "\n").encode() for extra in ("", "EIN", " ein ")]
        for data in invalid:
            with self.subTest(data=data), patch.object(worker, "request", return_value=io.BytesIO(data)), \
                 patch.object(worker, "post", return_value=report_response(status="error")) as post, \
                 contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaisesRegex(worker.WorkerError, "Invalid IRS CSV headers"):
                    worker.main()
            post.assert_called_once()
            self.assertEqual(post.call_args.args[0], "report")
            summary = post.call_args.args[1]
            self.assertEqual((summary["seen"], summary["qualified"], summary["stored"]), (0, 0, 0))
            self.assertEqual(summary["error"], "Invalid IRS CSV headers")
            self.assertNotIn("secret-token", json.dumps(summary))

    def test_csv_rows_with_missing_or_extra_columns_are_rejected(self):
        header, record = csv_bytes([row()]).decode().splitlines()
        for record in (record.rsplit(",", 1)[0], record + ",secret-token"):
            with self.subTest(record=record), \
                 patch.object(worker, "request", return_value=io.BytesIO((header + "\n" + record + "\n").encode())), \
                 patch.object(worker, "post", return_value=report_response(status="error")) as post, \
                 contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaisesRegex(worker.WorkerError, "Malformed IRS CSV row"):
                    worker.main()
            post.assert_called_once()
            summary = post.call_args.args[1]
            self.assertEqual((summary["seen"], summary["qualified"], summary["stored"]), (1, 0, 0))
            self.assertEqual(summary["error"], "Malformed IRS CSV row")

    def test_unclosed_csv_quote_is_rejected(self):
        header = csv_bytes([row()]).decode().splitlines()[0]
        with patch.object(worker, "request", return_value=io.BytesIO((header + '\n"secret-token').encode())), \
             patch.object(worker, "post", return_value=report_response(status="error")) as post, \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(worker.WorkerError, "invalid data or configuration"):
                worker.main()
        post.assert_called_once()
        self.assertNotIn("secret-token", post.call_args.args[1]["error"])

    def test_valid_header_only_csv_can_report_zero(self):
        header = ",".join(row()) + "\n"
        with patch.object(worker, "request", return_value=io.BytesIO(header.encode())), \
             patch.object(worker, "post", return_value=report_response()) as post, \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(worker.main(), 0)
        post.assert_called_once()
        summary = post.call_args.args[1]
        self.assertEqual((summary["seen"], summary["qualified"], summary["stored"]), (0, 0, 0))
        self.assertNotIn("error", summary)

    def test_csv_headers_are_case_and_whitespace_normalized(self):
        ruling = dt.datetime.now(dt.timezone.utc).strftime("%Y%m")
        header, record = csv_bytes([row(RULING=ruling)]).decode().splitlines()
        data = ",".join(" " + name.lower() + " " for name in header.split(",")) + "\n" + record + "\n"
        with patch.object(worker, "request", return_value=io.BytesIO(data.encode())), \
             patch.object(worker, "post", side_effect=[batch_response(1), report_response(1)]) as post, \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(worker.main(), 0)
        self.assertEqual(post.call_args_list[-1].args[1]["qualified"], 1)

    def test_processing_failure_reports_partial_selection(self):
        candidate = irs.candidate_from_row(row(), today=TODAY)
        with patch.object(worker, "discover_files", return_value=[irs.discover_files()[5]]), \
             patch.object(worker, "request", return_value=io.BytesIO(csv_bytes([row(), row(EIN="000000002")]))), \
             patch.object(worker, "candidate_from_row", side_effect=[candidate, ValueError("secret-token")]), \
             patch.object(worker, "post", return_value=report_response(status="error")) as post, \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(worker.WorkerError):
                worker.main()
        summary = post.call_args.args[1]
        self.assertEqual((summary["seen"], summary["qualified"], summary["stored"]), (2, 1, 0))
        self.assertNotIn("secret-token", json.dumps(summary))

    def test_unconfirmed_success_report_is_not_replaced_with_conflicting_error(self):
        with patch.object(worker, "discover_files", return_value=[irs.discover_files()[5]]), \
             patch.object(worker, "request", return_value=io.BytesIO(csv_bytes([row(STATUS="02")]))), \
             patch.object(worker, "post", side_effect=worker.WorkerError("IRS report request failed")) as post, \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(worker.WorkerError, "report request failed"):
                worker.main()
        post.assert_called_once()
        self.assertNotIn("error", post.call_args.args[1])

    def test_failed_error_report_does_not_hide_original_error_or_expose_secrets(self):
        stderr = io.StringIO()
        with patch.object(worker, "discover_files", return_value=[irs.discover_files()[5]]), \
             patch.object(worker, "request", side_effect=urllib.error.URLError("download-secret")), \
             patch.object(worker, "post", side_effect=RuntimeError("report-secret")), \
             contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(stderr):
            with self.assertRaisesRegex(worker.WorkerError, "IRS network request failed"):
                worker.main()
        self.assertEqual(stderr.getvalue(), "IRS failure report could not be confirmed\n")

    def test_transient_post_retries_keep_payload_and_refresh_oidc_token(self):
        for failure in (urllib.error.URLError("connection reset"), TimeoutError("timed out"),
                        urllib.error.HTTPError("https://example.invalid", 429, "secret", {}, None),
                        urllib.error.HTTPError("https://example.invalid", 500, "secret", {}, None),
                        urllib.error.HTTPError("https://example.invalid", 503, "secret", {}, None)):
            payload = batch_payload()
            with self.subTest(error=type(failure).__name__, code=getattr(failure, "code", None)), \
                 patch.object(worker, "oidc_token", side_effect=["token-1", "token-2"]) as token, \
                 patch("urllib.request.urlopen", side_effect=[failure, json_bytes(batch_response(1, replayed=True))]) as opened, \
                 patch.object(worker.time, "sleep") as sleep:
                self.assertEqual(worker.post("candidates", payload)["stored"], 1)
            self.assertEqual(token.call_count, 2)
            self.assertEqual(opened.call_count, 2)
            requests = [call.args[0] for call in opened.call_args_list]
            self.assertEqual(requests[0].data, requests[1].data)
            self.assertEqual(json.loads(requests[1].data)["runId"], payload["runId"])
            self.assertEqual(json.loads(requests[1].data)["batchIndex"], 0)
            self.assertEqual([request.get_header("Authorization") for request in requests], ["Bearer token-1", "Bearer token-2"])
            sleep.assert_called_once_with(1)

    def test_transient_token_request_retries_before_post(self):
        with patch.object(worker, "oidc_token", side_effect=[urllib.error.URLError("unavailable"), "token-2"]) as token, \
             patch("urllib.request.urlopen", return_value=json_bytes(batch_response(1))) as opened, \
             patch.object(worker.time, "sleep") as sleep:
            self.assertEqual(worker.post("candidates", batch_payload())["stored"], 1)
        self.assertEqual(token.call_count, 2)
        opened.assert_called_once()
        sleep.assert_called_once_with(1)

    def test_report_post_retries_exact_finalization_payload(self):
        payload = {**batch_payload(), "seen": 1, "qualified": 1, "stored": 1}
        del payload["candidates"], payload["batchIndex"]
        with patch.object(worker, "oidc_token", return_value="token"), \
             patch("urllib.request.urlopen", side_effect=[TimeoutError(), json_bytes(report_response(1, replayed=True))]) as opened, \
             patch.object(worker.time, "sleep"):
            self.assertTrue(worker.post("report", payload)["replayed"])
        self.assertEqual(opened.call_args_list[0].args[0].data, opened.call_args_list[1].args[0].data)

    def test_retry_budget_is_bounded_and_errors_are_redacted(self):
        with patch.object(worker, "oidc_token", return_value="secret-token") as token, \
             patch("urllib.request.urlopen", side_effect=urllib.error.URLError("secret-token")) as opened, \
             patch.object(worker.time, "sleep") as sleep:
            with self.assertRaisesRegex(worker.WorkerError, "^IRS candidates request failed$"):
                worker.post("candidates", batch_payload())
        self.assertEqual(token.call_count, 3)
        self.assertEqual(opened.call_count, 3)
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [1, 2])

    def test_permanent_http_or_certificate_failures_are_not_retried(self):
        failures = [urllib.error.HTTPError("https://example.invalid/secret", code, "secret-token", {}, None)
                    for code in (400, 401, 403, 404, 409, 413)]
        failures += [ssl.SSLCertVerificationError("secret-token"),
                     urllib.error.URLError(ssl.SSLCertVerificationError("secret-token"))]
        for failure in failures:
            with self.subTest(failure=type(failure).__name__, code=getattr(failure, "code", None)), \
                 patch.object(worker, "oidc_token", return_value="secret-token") as token, \
                 patch("urllib.request.urlopen", side_effect=failure) as opened, \
                 patch.object(worker.time, "sleep") as sleep:
                with self.assertRaises(worker.WorkerError) as raised:
                    worker.post("candidates", batch_payload())
            self.assertNotIn("secret", str(raised.exception))
            token.assert_called_once()
            opened.assert_called_once()
            sleep.assert_not_called()

    def test_malformed_batch_response_cannot_silently_succeed(self):
        invalid = [None, [], {}, {"stored": 1}, batch_response(1) | {"ok": False},
                   batch_response(1) | {"replayed": "false"}, batch_response(True),
                   batch_response(-1), batch_response(2), batch_response(1, received=0),
                   batch_response(1, received=True), batch_response(1, run_stored=0),
                   batch_response(1, run_stored=1501), batch_response(1, allowance=0),
                   batch_response(1, allowance=1501), batch_response(1, backpressure="invalid"),
                   batch_response(1) | {"runStored": 1.0}, batch_response(1) | {"allowance": True}]
        for reply in invalid:
            with self.subTest(reply=reply), patch.object(worker, "oidc_token", return_value="token"), \
                 patch("urllib.request.urlopen", return_value=json_bytes(reply)) as opened, \
                 patch.object(worker.time, "sleep") as sleep:
                with self.assertRaisesRegex(worker.WorkerError, "Invalid IRS candidates response"):
                    worker.post("candidates", batch_payload())
            opened.assert_called_once()
            sleep.assert_not_called()

    def test_malformed_json_response_is_sanitized_without_retry(self):
        for response in (b"secret response body", b"\xff"):
            with self.subTest(response=response), patch.object(worker, "oidc_token", return_value="secret-token"), \
                 patch("urllib.request.urlopen", return_value=io.BytesIO(response)) as opened, \
                 patch.object(worker.time, "sleep") as sleep:
                with self.assertRaisesRegex(worker.WorkerError, "^Invalid IRS candidates response$"):
                    worker.post("candidates", batch_payload())
            opened.assert_called_once()
            sleep.assert_not_called()

    def test_report_response_reconciles_only_error_reports(self):
        payload = {"qualified": 2, "stored": 1}
        self.assertEqual(worker.validate_response("report", report_response(1), payload), report_response(1))
        error_payload = {**payload, "error": "IRS candidates request failed"}
        self.assertEqual(worker.validate_response("report", report_response(2, status="error"), error_payload)["stored"], 2)
        for request, reply in ((payload, report_response(2)), (payload, report_response(0)),
                               (payload, report_response(1, status="error")),
                               (payload, report_response(True)), (payload, report_response(-1)),
                               (payload, report_response(1) | {"replayed": None}),
                               (error_payload, report_response(3, status="error")),
                               (error_payload, report_response(0, status="error")),
                               (error_payload, report_response(1))):
            with self.subTest(request=request, reply=reply):
                with self.assertRaisesRegex(worker.WorkerError, "Invalid IRS report response"):
                    worker.validate_response("report", reply, request)

    def test_malformed_http_200_from_batch_causes_sanitized_failure_report(self):
        ruling = dt.datetime.now(dt.timezone.utc).strftime("%Y%m")
        with patch.object(worker, "discover_files", return_value=[irs.discover_files()[5]]), \
             patch.object(worker, "request", return_value=io.BytesIO(csv_bytes([row(RULING=ruling)]))), \
             patch.object(worker, "oidc_token", return_value="token"), \
             patch("urllib.request.urlopen", side_effect=[json_bytes({"secret": "token"}), json_bytes(report_response(1, status="error"))]) as opened, \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(worker.WorkerError, "Invalid IRS candidates response"):
                worker.main()
        self.assertEqual(opened.call_count, 2)
        report = json.loads(opened.call_args_list[-1].args[0].data)
        self.assertEqual(report["stored"], 0)
        self.assertEqual(report["qualified"], 1)
        self.assertEqual(report["error"], "Invalid IRS candidates response")
        self.assertNotIn("token", report["error"])

    def test_malformed_oidc_token_payload_is_not_coerced_to_token(self):
        for value in ([], {"value": 123}, {"value": []}, {"value": " "}):
            with self.subTest(value=value), patch.dict(os.environ, {
                "ACTIONS_ID_TOKEN_REQUEST_URL": "https://token.invalid/request",
                "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "secret-token",
            }), patch("urllib.request.urlopen", return_value=json_bytes(value)):
                with self.assertRaisesRegex(worker.WorkerError, "did not issue an OIDC token"):
                    worker.oidc_token()


if __name__ == "__main__":
    unittest.main()
