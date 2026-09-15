#!/usr/bin/env bash
# Tapping the iOS simulator by accessibility label.
#
# Simulator.app is missing from this Xcode install, so there is no window to click and simctl
# has no tap verb — which is why every interactive check in this portfolio has been driven on
# Android. idb fills the gap, and the labels matter more than the coordinates: `idb ui tap`
# takes POINTS, which differ between a phone and a 13" iPad, so a coordinate script has to be
# rewritten per device while a label script does not.
#
#   source scripts/idb-tap.sh <udid>
#   idb_start;  tap_label "Allow";  describe | head;  idb_stop
#
# Recipe from dev-7b, 2026-09-15.
IDB="${IDB:-$HOME/idbenv/bin/idb}"
UDID="${1:-$(xcrun simctl list devices booted -j | python3 -c 'import json,sys;d=json.load(sys.stdin)["devices"];print(next((x["udid"] for v in d.values() for x in v if x["state"]=="Booted"), ""))')}"
export IDB_COMPANION="${IDB_COMPANION:-localhost:10882}"

idb_start() {
  # `describe-all` fails with "invalid or invisible due to a fullscreen dialog" while the
  # simulator is still booting, which reads like a dialog is up when nothing is.
  xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1 || true
  pgrep -f "idb_companion --udid $UDID" >/dev/null && return 0
  idb_companion --udid "$UDID" --only simulator >"${TMPDIR:-/tmp}/idb-companion.log" 2>&1 &
  for _ in $(seq 1 30); do
    "$IDB" ui describe-all --udid "$UDID" >/dev/null 2>&1 && return 0
    sleep 1
  done
  echo "idb companion did not come up; see ${TMPDIR:-/tmp}/idb-companion.log" >&2
  return 1
}

idb_stop() { pkill -f "idb_companion --udid $UDID" >/dev/null 2>&1 || true; }

describe() { "$IDB" ui describe-all --udid "$UDID"; }

# Taps the centre of the first element whose AXLabel matches exactly.
tap_label() {
  local label="$1"
  local point
  point=$(describe | python3 -c '
import json, sys
want = sys.argv[1]
for el in json.load(sys.stdin):
    if el.get("AXLabel") == want:
        f = el["frame"]
        print(int(f["x"] + f["width"] / 2), int(f["y"] + f["height"] / 2))
        break
' "$label")
  if [ -z "$point" ]; then echo "no element labelled \"$label\"" >&2; return 1; fi
  # shellcheck disable=SC2086
  "$IDB" ui tap --udid "$UDID" $point
}

# Every label currently on screen, for working out what to tap.
labels() { describe | python3 -c 'import json,sys; [print(repr(e.get("AXLabel")), e.get("type")) for e in json.load(sys.stdin) if e.get("AXLabel")]'; }
