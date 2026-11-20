#!/bin/sh
# Keeps a same-site copy of the ISS TLE in data/iss.tle, downloaded from CelesTrak.
# Run it from cron on your web server, e.g. every 4 hours:
#   17 */4 * * *  /path/to/iss-passes/tools/update-tle.sh
# Then add "data/iss.tle" as the first entry of CONFIG.tleSources in index.html.
set -eu
DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DIR/data/iss.tle"
URL="https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"
mkdir -p "$DIR/data"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
curl -fsS --max-time 30 -A "iss-passes (astronomy club site)" "$URL" -o "$TMP"
# Only replace the file if we really got an ISS element set
if grep -q '^1 25544' "$TMP" && grep -q '^2 25544' "$TMP"; then
  chmod 644 "$TMP"
  mv "$TMP" "$OUT"
  trap - EXIT
else
  echo "update-tle: no ISS TLE in CelesTrak response; keeping the old file" >&2
  exit 1
fi
