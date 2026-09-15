#!/usr/bin/env python3
"""
Refuses a build whose shipped binary carries a broken AdMob identifier.

Six apps went to TestFlight with `GADApplicationIdentifier` set to the literal
string `-`. The Google Mobile Ads SDK treats a malformed application identifier
as a programming error and deliberately raises at startup, so the app dies on
its first frame with nothing on screen. Four of those reached Apple and were
rejected.

`check:release` now refuses a malformed identifier at *build* time. This is the
other end: it reads the value back out of the **binary that was actually
produced**, which is the only evidence that the fix reached the artifact.

Why not a date cutoff. The obvious guard — "refuse anything built before the
secrets were fixed" — is right about the past and wrong about the future. A run
*created* before a secret changes still carries the old value even if its job
starts long afterwards, because a run binds its secrets when it is created. A
build uploaded after the cutoff can therefore still contain the old identifier.
The clock cannot see that; the binary can.

Usage:
    verify-build-identifier.py <slug> [expected_build_number]

Exit 0 when the newest retrievable binary carries a well formed id, 1 when it
does not, and 2 when there is nothing to check — which is deliberately *not*
a pass.
"""

from __future__ import annotations

import plistlib
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

# ca-app-pub-<publisher>~<app>, the app-id form. An ad *unit* id uses "/" and is
# the single easiest thing to paste into this slot by mistake.
APP_ID = re.compile(r"^ca-app-pub-\d{10,}~\d{6,}$")


def newest_ios_artifact(slug: str) -> tuple[str, str] | None:
    """The most recent unexpired iOS artifact for a repo, as (run_id, name)."""
    out = subprocess.run(
        [
            "gh",
            "api",
            f"/repos/AltixCode/{slug}/actions/artifacts",
            "-q",
            '[.artifacts[] | select(.name=="ios-release-artifacts" and .expired==false)]'
            ' | sort_by(.created_at) | last | "\\(.workflow_run.id) \\(.created_at)"',
        ],
        capture_output=True,
        text=True,
    ).stdout.strip()
    # jq renders a missing record as the literal "null null"; treat any null
    # part as absent rather than letting it through as a run id called "null",
    # which produced a misleading "artifact null contained no readable IPA".
    if not out or out.startswith("null") or out == "null":
        return None
    run_id, created = out.split(" ", 1)
    return run_id, created


def read_identifier(slug: str, run_id: str, work: Path) -> tuple[str, str, str] | None:
    """Returns (bundle_id, build_number, GADApplicationIdentifier) from the IPA."""
    subprocess.run(
        [
            "gh",
            "run",
            "download",
            run_id,
            "-R",
            f"AltixCode/{slug}",
            "-n",
            "ios-release-artifacts",
            "-D",
            str(work),
        ],
        capture_output=True,
        text=True,
    )
    ipas = sorted(work.glob("*.ipa"))
    if not ipas:
        return None
    with zipfile.ZipFile(ipas[0]) as z:
        plists = [
            n
            for n in z.namelist()
            if n.count("/") == 2
            and n.startswith("Payload/")
            and n.endswith(".app/Info.plist")
        ]
        if not plists:
            return None
        info = plistlib.loads(z.read(plists[0]))
    # The bundle id is read too, and it matters: reading a path instead of an
    # identity is how a check ends up reporting confidently on the wrong app.
    return (
        info.get("CFBundleIdentifier", "?"),
        str(info.get("CFBundleVersion", "?")),
        str(info.get("GADApplicationIdentifier", "")),
    )


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__.strip().splitlines()[-4], file=sys.stderr)
        return 2
    slug = sys.argv[1]
    expected_build = sys.argv[2] if len(sys.argv) > 2 else None

    found = newest_ios_artifact(slug)
    if not found:
        print(f"{slug}: no retrievable iOS artifact — cannot verify the binary")
        # Deliberately not a pass. "I could not check" and "it is fine" are
        # different answers, and only one of them is safe to submit on.
        return 2
    run_id, created = found

    work = Path(tempfile.mkdtemp())
    try:
        result = read_identifier(slug, run_id, work)
        if result is None:
            print(f"{slug}: artifact {run_id} contained no readable IPA")
            return 2
        bundle_id, build, gad = result

        if expected_build and build != expected_build:
            print(
                f"{slug}: newest artifact is build {build}, but build "
                f"{expected_build} is attached — cannot verify what will ship"
            )
            return 2

        if APP_ID.match(gad):
            print(
                f"{slug}: build {build} ({bundle_id}) GADApplicationIdentifier={gad} — OK"
            )
            return 0

        shown = gad if gad else "<absent>"
        print(f"{slug}: build {build} ({bundle_id}) GADApplicationIdentifier={shown!r}")
        print("  This binary crashes on launch. The Google Mobile Ads SDK raises at")
        print("  startup on a malformed application identifier, so the app dies on its")
        print(
            "  first frame. Fix the repository secret and rebuild; a corrected secret"
        )
        print("  does nothing for a run that was already queued.")
        return 1
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
