#!/usr/bin/env python3
"""
Attaches the newest build to an app's version — but only after reading the
binary and confirming it does not crash on launch.

Four apps were rejected by Apple tonight carrying
`GADApplicationIdentifier = "-"`, which makes the Google Mobile Ads SDK raise at
startup. Their versions still point at those binaries. When the rebuilds land,
somebody has to swap each one — and the temptation at that point is to attach
"the newest build" and move on, which is exactly how the broken ones got
attached in the first place.

So this refuses to attach anything it has not verified:

    verify-build-identifier.py <slug>   ->  0 good, 1 crashes, 2 cannot tell

and treats *cannot tell* as a refusal, not a pass. The whole evening turned on
that distinction.

It also declines to attach a build that is already attached, so it is safe to
run repeatedly while waiting for a queue to drain.

Usage:
    attach-verified-build.py <slug> [<slug> ...]      # attach where safe
    attach-verified-build.py --dry-run <slug> ...     # report only
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from asc import AppStoreConnect  # noqa: E402

VERIFIER = HERE / "verify-build-identifier.py"


def verdict(slug: str) -> tuple[int, str]:
    """(exit code, first line) from the binary verifier."""
    r = subprocess.run(
        [sys.executable, str(VERIFIER), slug], capture_output=True, text=True
    )
    first = (r.stdout.strip().splitlines() or [""])[0]
    return r.returncode, first


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if not args:
        print("usage: attach-verified-build.py [--dry-run] <slug> ...", file=sys.stderr)
        return 2

    a = AppStoreConnect()
    fleet = json.loads((HERE / "fleet.json").read_text()).get("apps", {})
    failures = 0

    for slug in args:
        meta = fleet.get(slug) or {}
        app_id = meta.get("ascAppId")
        if not app_id:
            print(f"{slug}: not in fleet.json")
            failures += 1
            continue

        versions = a.paged(f"/apps/{app_id}/appStoreVersions")
        if not versions:
            print(f"{slug}: no version to attach to")
            failures += 1
            continue
        version = versions[0]
        state = version["attributes"].get("appStoreState")

        builds = a.builds(str(app_id))
        if not builds:
            print(f"{slug}: no uploaded build")
            failures += 1
            continue
        newest = builds[0]
        newest_no = newest["attributes"].get("version")

        try:
            current = a.call("GET", f"/appStoreVersions/{version['id']}/build").get(
                "data"
            )
            current_no = (current or {}).get("attributes", {}).get("version")
        except Exception:
            current_no = None

        if current_no == newest_no:
            print(
                f"{slug}: build {newest_no} already attached ({state}) — nothing to do"
            )
            continue

        code, line = verdict(slug)
        if code == 1:
            print(f"{slug}: REFUSING — {line}")
            failures += 1
            continue
        if code == 2:
            # Not a pass. An unverifiable binary is the case this exists for.
            print(f"{slug}: REFUSING — cannot verify the binary ({line})")
            failures += 1
            continue

        if dry:
            print(f"{slug}: would attach build {newest_no} (was {current_no}) — {line}")
            continue

        a.attach_build(version["id"], newest["id"])
        # Read it back rather than trusting the write, because a 200 from this
        # API has meant nothing at least once tonight.
        after = a.call("GET", f"/appStoreVersions/{version['id']}/build").get("data")
        after_no = (after or {}).get("attributes", {}).get("version")
        ok = "OK" if after_no == newest_no else f"MISMATCH (reads back as {after_no})"
        print(f"{slug}: attached build {newest_no} (was {current_no}) — {ok}")
        if after_no != newest_no:
            failures += 1

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
