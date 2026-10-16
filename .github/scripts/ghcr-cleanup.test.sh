#!/usr/bin/env bash
# Tests for ghcr-cleanup.sh using FIXTURE_DIR (no network, nothing is deleted).
# Run: ./.github/scripts/ghcr-cleanup.test.sh   (needs bash and jq)
set -uo pipefail

script="$(cd "$(dirname "$0")" && pwd)/ghcr-cleanup.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
now="$(date +%s)"
fails=0
n=0

# Fixture: 6 tagged indexes (sha-1aaaaaa oldest ... sha-6aaaaaa newest, latest on 6),
# each with 2 untagged children, plus 2 old orphans. Odd indexes carry a mediaType.
new_fixture() {
  FX="$tmp/fx$((++n))"
  mkdir -p "$FX/manifests"
  jq -n --argjson now "$now" '[
    (range(1; 7) as $n
      | {id: $n, name: "sha256:idx\($n)", created_at: ($now - (7 - $n) * 86400 | todate),
         metadata: {container: {tags: (["sha-\($n)aaaaaa"] + (if $n == 6 then ["latest"] else [] end))}}},
        ({id: ($n * 10), name: "sha256:img\($n)", created_at: ($now - (7 - $n) * 86400 | todate), metadata: {container: {tags: []}}}),
        ({id: ($n * 10 + 1), name: "sha256:att\($n)", created_at: ($now - (7 - $n) * 86400 | todate), metadata: {container: {tags: []}}})),
    {id: 100, name: "sha256:orphan1", created_at: ($now - 3 * 86400 | todate), metadata: {container: {tags: []}}},
    {id: 101, name: "sha256:orphan2", created_at: ($now - 9 * 86400 | todate), metadata: {container: {tags: []}}}
  ]' > "$FX/versions.json"
  for i in 1 2 3 4 5 6; do
    jq -n --argjson i "$i" '{manifests: [{digest: "sha256:img\($i)"}, {digest: "sha256:att\($i)"}]}
      + (if $i % 2 == 1 then {mediaType: "application/vnd.oci.image.index.v1+json"} else {} end)' \
      > "$FX/manifests/sha256_idx$i.json"
  done
  echo '{"workflow_runs":[]}' > "$FX/runs.json"
}

# run_script <expected exit: 0|fail> [GITHUB_SHA]; output goes to $out
run_script() {
  local want="$1" rc=0
  out="$(FIXTURE_DIR="$FX" PACKAGE=p GITHUB_REPOSITORY=o/r GITHUB_SHA="${2:-6aaaaaa00}" "$script" 2>&1)" || rc=$?
  if { [ "$want" = 0 ] && [ "$rc" -ne 0 ]; } || { [ "$want" = fail ] && [ "$rc" -eq 0 ]; }; then
    echo "  FAIL: unexpected exit code $rc"; fails=$((fails + 1))
  fi
}
kept() { grep -Eq "^KEEP .*$1 " <<< "$out" || { echo "  FAIL: $1 should be kept"; fails=$((fails + 1)); }; }
deleted() { grep -Eq "^DELETE .*$1 " <<< "$out" || { echo "  FAIL: $1 should be deleted"; fails=$((fails + 1)); }; }
no_delete() { ! grep -q '^DELETE' <<< "$out" || { echo "  FAIL: nothing should be deleted"; fails=$((fails + 1)); }; }
case_() { echo "- $1"; new_fixture; }

case_ "nominal: 3 newest and children kept, the rest deleted"
run_script 0
for i in 6 5 4; do kept "sha256:idx$i"; kept "sha256:img$i"; kept "sha256:att$i"; done
for i in 3 2 1; do deleted "sha256:idx$i"; deleted "sha256:img$i"; done
deleted "sha256:orphan1"; deleted "sha256:orphan2"

case_ "deployed tag of a failure run is kept"
echo '{"workflow_runs":[{"status":"completed","conclusion":"failure","display_title":"deploy sha-1aaaaaa"}]}' > "$FX/runs.json"
run_script 0; kept "sha256:idx1"; kept "sha256:img1"

case_ "in-progress deploy tag is kept"
echo '{"workflow_runs":[{"status":"in_progress","conclusion":null,"display_title":"deploy sha-2aaaaaa"}]}' > "$FX/runs.json"
run_script 0; kept "sha256:idx2"

case_ "cancelled run tag is not kept"
echo '{"workflow_runs":[{"status":"completed","conclusion":"cancelled","display_title":"deploy sha-3aaaaaa"}]}' > "$FX/runs.json"
run_script 0; deleted "sha256:idx3"

case_ "unexpected runs response ({}) fails"
echo '{}' > "$FX/runs.json"
run_script fail; no_delete

case_ "invalid manifest JSON fails"
echo 'not json' > "$FX/manifests/sha256_idx6.json"
run_script fail; no_delete

case_ "index without mediaType: children kept"
run_script 0; kept "sha256:att4"; kept "sha256:img4"

case_ "untagged version younger than 1 hour is kept"
jq --argjson now "$now" '. + [{id: 200, name: "sha256:fresh", created_at: ($now - 600 | todate), metadata: {container: {tags: []}}}]' \
  "$FX/versions.json" > "$FX/v.json" && mv "$FX/v.json" "$FX/versions.json"
run_script 0; kept "sha256:fresh"

case_ "pushed tag missing fails"
run_script fail 9999999aa; no_delete

case_ "empty listing fails"
echo '[]' > "$FX/versions.json"
run_script fail; no_delete

if [ "$fails" -eq 0 ]; then echo "All tests passed."; else echo "$fails check(s) failed."; exit 1; fi
