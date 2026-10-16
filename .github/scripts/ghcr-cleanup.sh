#!/usr/bin/env bash
# Prunes old versions of a private GHCR container package.
#
# Kept versions:
#   - the KEEP most recent tagged versions (by created_at);
#   - the tags of every deploy.yml run on main that is not completed yet, plus
#     the last KEEP_DEPLOYS distinct tags among completed runs that ended in
#     success or failure (current deploy + rollback target). A "failure" run
#     can still have deployed: the SSH step passed, the public checks failed;
#   - untagged versions created less than 1 hour ago (a release may be
#     pushing right now);
#   - the version tagged "latest" and the version just pushed (sha-<GITHUB_SHA>);
#   - every child manifest of a kept version. A multi-platform image is an OCI
#     index: its platform image and provenance attestation show up in GHCR as
#     UNTAGGED versions, and deleting them would break the kept image.
# Everything else (tagged or untagged) is deleted.
#
# Known limit: a tag deployed by hand on the VPS (sudo deploy script) is not
# visible here. The newest tags plus the last GitHub deploys cover the normal
# and rollback cases.
#
# Env: PACKAGE (required), GITHUB_REPOSITORY and GITHUB_SHA (required), GH_TOKEN,
#      KEEP=3, KEEP_DEPLOYS=2, ORG=vps-maengdok, DRY_RUN=1 (delete nothing).
#      FIXTURE_DIR (tests only): read versions.json, runs.json and
#      manifests/<digest with ":" as "_">.json from this directory, no network.
set -euo pipefail

: "${PACKAGE:?PACKAGE is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
KEEP="${KEEP:-3}"
KEEP_DEPLOYS="${KEEP_DEPLOYS:-2}"
ORG="${ORG:-vps-maengdok}"
DRY_RUN="${DRY_RUN:-0}"
FIXTURE_DIR="${FIXTURE_DIR:-}"
[ -n "$FIXTURE_DIR" ] && DRY_RUN=1
IMAGE="ghcr.io/${ORG}/${PACKAGE}"
PUSHED_TAG="sha-${GITHUB_SHA::7}"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
keep_file="$work/keep.tsv" # lines: <digest> TAB <reason>
: > "$keep_file"

keep() { printf '%s\t%s\n' "$1" "$2" >> "$keep_file"; }
short() { printf '%s' "${1:0:19}"; }

# 1. List the versions (id, digest, created_at, tags).
if [ -n "$FIXTURE_DIR" ]; then
  raw="$(cat "$FIXTURE_DIR/versions.json")"
else
  raw="$(gh api --paginate "/orgs/${ORG}/packages/container/${PACKAGE}/versions?per_page=100" | jq -s 'add // []')"
fi
jq '[.[] | {id, digest: .name, created: .created_at, epoch: (.created_at | fromdateiso8601), tags: (.metadata.container.tags // [])}]' \
  <<< "$raw" > "$work/versions.json"

total="$(jq 'length' "$work/versions.json")"
tagged="$(jq '[.[] | select(.tags | length > 0)] | length' "$work/versions.json")"
if [ "$tagged" -eq 0 ]; then
  echo "::error::No tagged version found in ${PACKAGE} (${total} versions listed). Nothing deleted."
  exit 1
fi

# 2. The version just pushed must exist, and is never deleted.
pushed_digest="$(jq -r --arg t "$PUSHED_TAG" '[.[] | select(.tags | index($t))][0].digest // empty' "$work/versions.json")"
if [ -z "$pushed_digest" ]; then
  echo "::error::Tag ${PUSHED_TAG} not found in ${PACKAGE}. Nothing deleted."
  exit 1
fi
keep "$pushed_digest" "just pushed (${PUSHED_TAG})"

# 3. The newest tagged versions.
jq -r --argjson n "$KEEP" \
  '[.[] | select(.tags | length > 0)] | sort_by(.created) | reverse | .[:$n][] | .digest' \
  "$work/versions.json" | while read -r d; do keep "$d" "newest ${KEEP} tagged"; done

# 4. The tags of recent deploys on main (display_title = "deploy sha-xxxxxxx").
if [ -n "$FIXTURE_DIR" ]; then
  runs="$(cat "$FIXTURE_DIR/runs.json")"
else
  runs="$(gh api "repos/${GITHUB_REPOSITORY}/actions/workflows/deploy.yml/runs?branch=main&per_page=30")"
fi
# A jq failure (unexpected response) aborts here; an empty list is fine.
pending_titles="$(jq -r '.workflow_runs
  | if type == "array" then .[] | select(.status != "completed") | .display_title
    else error("unexpected runs response") end' <<< "$runs")"
done_titles="$(jq -r '.workflow_runs
  | if type == "array" then .[] | select(.status == "completed" and (.conclusion == "success" or .conclusion == "failure")) | .display_title
    else error("unexpected runs response") end' <<< "$runs")"
valid_tags() { { sed -n 's/^deploy //p' | grep -E '^sha-[0-9a-f]{7,40}$' || true; } | awk '!seen[$0]++'; }
pending_tags="$(valid_tags <<< "$pending_titles")"
done_tags="$(valid_tags <<< "$done_titles" | head -n "$KEEP_DEPLOYS")"
keep_tag() {
  local d
  d="$(jq -r --arg t "$1" '[.[] | select(.tags | index($t))][0].digest // empty' "$work/versions.json")"
  if [ -n "$d" ]; then
    keep "$d" "$2 ($1)"
  else
    echo "Note: deployed tag $1 no longer exists in the package."
  fi
}
for t in $pending_tags; do keep_tag "$t" "deploy in progress"; done
for t in $done_tags; do keep_tag "$t" "recent deploy"; done

# 5. The "latest" version.
latest_digest="$(jq -r '[.[] | select(.tags | index("latest"))][0].digest // empty' "$work/versions.json")"
[ -n "$latest_digest" ] && keep "$latest_digest" "tagged latest"

# 5b. Recent untagged versions (race with a release that is pushing).
cutoff=$(($(date +%s) - 3600))
for d in $(jq -r --argjson c "$cutoff" '.[] | select((.tags | length) == 0 and .epoch > $c) | .digest' "$work/versions.json"); do
  keep "$d" "recent untagged (<1h)"
done

# 6. Children of every kept index.
roots="$(cut -f1 "$keep_file" | sort -u)"
for d in $roots; do
  if [ -n "$FIXTURE_DIR" ]; then
    f="$FIXTURE_DIR/manifests/${d//:/_}.json"
    manifest="$([ -f "$f" ] && cat "$f" || echo '{}')"
  else
    manifest="$(docker buildx imagetools inspect --raw "${IMAGE}@${d}")"
  fi
  kind="$(jq -r 'if has("manifests") then "index" else "image" end' <<< "$manifest")"
  if [ "$kind" = index ]; then
    children="$(jq -r '.manifests[].digest' <<< "$manifest")"
    for c in $children; do
      keep "$c" "child of $(short "$d")"
    done
  fi
done

if [ ! -s "$keep_file" ]; then
  echo "::error::Keep set is empty. Nothing deleted."
  exit 1
fi

# 7. Report, then delete everything not kept.
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
{
  echo "### GHCR cleanup: ${PACKAGE}$([ "$DRY_RUN" = 1 ] && echo ' (dry run)')"
  echo
  echo "| Action | Tags | Digest | Reason |"
  echo "| --- | --- | --- | --- |"
} >> "$summary"

kept=0 deleted=0 failed=0
while IFS=$'\t' read -r id digest tags; do
  reasons="$(awk -F'\t' -v d="$digest" '$1 == d {print $2}' "$keep_file" | awk '!s[$0]++' | paste -sd, - | sed 's/,/, /g')"
  label="${tags:-<untagged>}"
  if [ -n "$reasons" ]; then
    echo "KEEP   ${label} $(short "$digest") (${reasons})"
    echo "| keep | ${label} | \`$(short "$digest")\` | ${reasons} |" >> "$summary"
    kept=$((kept + 1))
  elif [ "$DRY_RUN" = 1 ]; then
    echo "DELETE ${label} $(short "$digest") (not kept; dry run, nothing deleted)"
    echo "| would delete | ${label} | \`$(short "$digest")\` | not kept |" >> "$summary"
    deleted=$((deleted + 1))
  elif gh api -X DELETE "/orgs/${ORG}/packages/container/${PACKAGE}/versions/${id}" > /dev/null; then
    echo "DELETE ${label} $(short "$digest") (not kept)"
    echo "| deleted | ${label} | \`$(short "$digest")\` | not kept |" >> "$summary"
    deleted=$((deleted + 1))
  else
    echo "::error::Could not delete version ${id} (${label})."
    failed=$((failed + 1))
  fi
done < <(jq -r 'sort_by(.created) | reverse | .[] | [.id, .digest, (.tags | join(","))] | @tsv' "$work/versions.json")

echo "Done: ${kept} kept, ${deleted} deleted$([ "$DRY_RUN" = 1 ] && echo ' (dry run)'), ${failed} failed."
echo "${kept} kept, ${deleted} deleted, ${failed} failed." >> "$summary"
[ "$failed" -eq 0 ]
