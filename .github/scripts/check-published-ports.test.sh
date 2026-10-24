#!/usr/bin/env bash
# Tests for check-published-ports.sh using small compose fixtures (no daemon needed).
# Run: ./.github/scripts/check-published-ports.test.sh   (needs bash, jq and docker compose v2)
set -uo pipefail

script="$(cd "$(dirname "$0")" && pwd)/check-published-ports.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
fails=0
n=0

# fixture <service name> <yaml lines of the service body> [image]: writes $tmp/fx<n>/docker-compose.prod.yaml
fixture() {
  FX="$tmp/fx$((++n))"
  mkdir -p "$FX"
  printf 'services:\n  %s:\n    image: %s\n%s\n' "$1" "${3:-example/app:latest}" "$2" > "$FX/docker-compose.prod.yaml"
}

# run_check <expected exit code> <expected text in output, or "">
run_check() {
  local want="$1" rc=0
  out="$(cd "$FX" && COMPOSE_FILE_PATH=docker-compose.prod.yaml "$script" 2>&1)" || rc=$?
  [ "$rc" -eq "$want" ] || { echo "  FAIL: exit code $rc, wanted $want"; echo "$out"; fails=$((fails + 1)); }
  if [ -n "${2:-}" ]; then
    grep -Fq -- "$2" <<< "$out" || { echo "  FAIL: output lacks '$2'"; echo "$out"; fails=$((fails + 1)); }
  fi
}
case_() { echo "- $1"; }

case_ "no ports is valid"
fixture app '    restart: always'
run_check 0 "0 published ports checked, 0 failures"

case_ "port without address fails"
fixture app '    ports: ["5432:5432"]'
run_check 1 "FAIL app: all interfaces:5432 -> 5432/tcp"

case_ "0.0.0.0 fails"
fixture app '    ports: ["0.0.0.0:5432:5432"]'
run_check 1 "FAIL app: 0.0.0.0:5432"

case_ "[::] fails"
fixture app '    ports: ["[::]:5432:5432"]'
run_check 1 "FAIL app: :::5432"

case_ "non-loopback address fails"
fixture app '    ports: ["192.168.1.10:5432:5432"]'
run_check 1 "FAIL app: 192.168.1.10:5432"

case_ "network_mode host fails"
fixture app '    network_mode: host'
run_check 1 "FAIL app: network_mode host"

case_ "127.0.0.1 and ::1 are accepted"
fixture app '    ports: ["127.0.0.1:5432:5432", "[::1]:5433:5432"]'
run_check 0 "2 published ports checked, 0 failures"

case_ "port range on all interfaces fails, on loopback is accepted"
fixture app '    ports: ["8000-8001:8000-8001"]'
run_check 1 "FAIL app: all interfaces:8000"
fixture app '    ports: ["127.0.0.1:8000-8001:8000-8001"]'
run_check 0 "OK app: 127.0.0.1:8000"

case_ "Traefik 80 and 443 on all interfaces are accepted"
fixture traefik '    ports: ["80:80", "443:443"]'
run_check 0 "2 published ports checked, 0 failures"

case_ "Traefik on another port without address fails"
fixture traefik '    ports: ["8080:8080"]'
run_check 1 "FAIL traefik: all interfaces:8080"

case_ "Traefik range containing 80 fails"
fixture traefik '    ports: ["80-81:80-81"]'
run_check 1 "FAIL traefik"

case_ "another service on 443 without address fails"
fixture app '    ports: ["443:443"]'
run_check 1 "FAIL app: all interfaces:443"

case_ "env_file .env and \${IMAGE_TAG:?} work without a .env"
# shellcheck disable=SC2016 # the ${...} must reach compose unexpanded
fixture app '    env_file:
      - .env
    ports: ["127.0.0.1:9000:9000"]' 'example/app:${IMAGE_TAG:?set IMAGE_TAG}'
run_check 0 "1 published ports checked, 0 failures"

case_ "DUMMY_ENV supplies extra required variables"
# shellcheck disable=SC2016 # the ${...} must reach compose unexpanded
fixture app '    restart: always' 'example/app:${OTHER:?set OTHER}'
out="$(cd "$FX" && DUMMY_ENV="OTHER=x" "$script" 2>&1)" || { echo "  FAIL: DUMMY_ENV not used"; echo "$out"; fails=$((fails + 1)); }

case_ "missing compose file exits 2"
FX="$tmp/empty"; mkdir -p "$FX"
run_check 2 "not found"

case_ "unusable compose file exits 2 and shows the error"
fixture app '    env_file:
      - missing.env'
run_check 2 "docker compose config failed"

case_ "a service under a profile is checked too"
fixture app '    restart: always
  db:
    image: example/db:latest
    profiles: [debug]
    ports: ["5432:5432"]'
run_check 1 "FAIL db: all interfaces:5432 -> 5432/tcp"

case_ "a compose warning on stderr does not break the check"
fixture app '    ports: ["127.0.0.1:5432:5432"]'
printf 'version: "3.8"\n' | cat - "$FX/docker-compose.prod.yaml" > "$FX/c.tmp" && mv "$FX/c.tmp" "$FX/docker-compose.prod.yaml"
run_check 0 "1 published ports checked, 0 failures"

case_ "the repo is not written to"
[ ! -e "$FX/.env" ] || { echo "  FAIL: .env created in the fixture dir"; fails=$((fails + 1)); }

if [ "$fails" -eq 0 ]; then echo "All tests passed."; else echo "$fails check(s) failed."; exit 1; fi
