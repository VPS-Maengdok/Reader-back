#!/usr/bin/env bash
# Tests check-published-ports.sh with bash 3.2 (the bash of macOS), where an
# empty array with set -u fails. docker is replaced by a stub that prints a
# fixed JSON, so no compose plugin is needed; jq is the real one.
# Run in CI: docker run --rm -v "$PWD:/w:ro" -w /w bash:3.2 \
#   sh -c 'apk add -q jq >/dev/null && bash .github/scripts/check-published-ports.bash32.test.sh'
set -uo pipefail

script="$(cd "$(dirname "$0")" && pwd)/check-published-ports.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
fails=0
echo "bash $BASH_VERSION"

# Stub: "docker ..." prints $STUB_JSON (a file) on stdout and exits $STUB_RC.
mkdir -p "$tmp/bin" "$tmp/repo"
cat > "$tmp/bin/docker" <<'STUB'
#!/bin/sh
[ -n "${STUB_JSON:-}" ] && cat "$STUB_JSON"
exit "${STUB_RC:-0}"
STUB
chmod +x "$tmp/bin/docker"
printf 'services: {}\n' > "$tmp/repo/docker-compose.prod.yaml"

# run_check <expected exit code> <expected text>; uses STUB_JSON and STUB_RC.
run_check() {
  local want="$1" rc=0 out
  out="$(cd "$tmp/repo" && PATH="$tmp/bin:$PATH" "$script" 2>&1)" || rc=$?
  [ "$rc" -eq "$want" ] || { echo "  FAIL: exit code $rc, wanted $want"; echo "$out"; fails=$((fails + 1)); }
  case "$out" in *"$2"*) ;; *) echo "  FAIL: output lacks '$2'"; echo "$out"; fails=$((fails + 1)) ;; esac
}

echo "- DUMMY_ENV not set, no ports"
unset DUMMY_ENV
printf '{"services":{"app":{"image":"a"}}}' > "$tmp/ok.json"
STUB_JSON="$tmp/ok.json" STUB_RC=0 run_check 0 "0 published ports checked, 0 failures"

echo "- DUMMY_ENV not set, port on all interfaces fails"
printf '{"services":{"db":{"ports":[{"target":5432,"published":"5432","protocol":"tcp"}]}}}' > "$tmp/bad.json"
STUB_JSON="$tmp/bad.json" STUB_RC=0 run_check 1 "FAIL db: all interfaces:5432 -> 5432/tcp"

echo "- DUMMY_ENV set"
DUMMY_ENV="A=1 B=2" STUB_JSON="$tmp/ok.json" STUB_RC=0 run_check 0 "0 published ports checked"

echo "- empty output from compose exits 2"
STUB_JSON="" STUB_RC=0 run_check 2 "printed nothing"

echo "- compose fails with no message exits 2"
STUB_JSON="" STUB_RC=1 run_check 2 "(docker compose printed no error message)"

if [ "$fails" -eq 0 ]; then echo "All tests passed."; else echo "$fails check(s) failed."; exit 1; fi
