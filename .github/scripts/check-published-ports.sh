#!/usr/bin/env bash
# Checks that the production compose file publishes no port outside the port rule.
#
# Why: Docker publishes ports around the host firewall (ufw does not filter them).
# The protection is the rule "only Traefik publishes 80 and 443; every other
# published port is bound to a loopback address".
#
# Fails when a service:
#   - publishes a port with no host_ip, or with any host_ip that is not
#     127.0.0.1 or ::1 (0.0.0.0, ::, [::] and empty included);
#   - uses network_mode: host.
# Only the Traefik service may publish published ports 80 and 443 on any address,
# for any protocol (tcp or udp).
# A port range (8000-8010) is checked like a single port: it must be loopback,
# and it is never exempt (the exemption is for exactly 80 or 443).
# Services under a profile are checked too (--profile '*').
#
# Only the production compose file is checked, never the dev one. .env is not
# in CI (gitignored), so the file is copied to a temp dir with an empty .env and
# dummy values, and nothing is written into the repo. A compose file that needs
# other relative files (an env_file other than .env, extends) makes config fail:
# the script then exits 2 and shows the compose error.
#
# Env: COMPOSE_FILE_PATH=docker-compose.prod.yaml (relative to the current dir),
#      TRAEFIK_SERVICE=traefik,
#      DUMMY_ENV="KEY=VAL KEY2=VAL2" (extra dummy values for ${VAR:?} in the file;
#      IMAGE_TAG=sha-0000000 is always set).
# Needs: docker compose v2 and jq. Works with bash 3.2 (macOS) and later.
# Exit: 0 = ok, 1 = rule broken, 2 = usage or compose config error.
set -euo pipefail

file="${COMPOSE_FILE_PATH:-docker-compose.prod.yaml}"
traefik="${TRAEFIK_SERVICE:-traefik}"

[ -f "$file" ] || { echo "Compose file not found: $file" >&2; exit 2; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cp "$file" "$tmp/compose.yaml"
: > "$tmp/.env"

# DUMMY_ENV is split on spaces on purpose.
read -r -a extra <<< "${DUMMY_ENV:-}"
# stdout (the JSON) and stderr (errors, warnings) are kept apart: a warning
# must not end up in the JSON given to jq.
rc=0
# ${extra[@]+...}: an empty array with set -u fails on bash 3.2 (macOS).
json="$(cd "$tmp" && env IMAGE_TAG=sha-0000000 ${extra[@]+"${extra[@]}"} \
  docker compose -f compose.yaml --profile '*' config --format json 2> "$tmp/config.err")" || rc=$?
if [ "$rc" -ne 0 ]; then
  echo "docker compose config failed for $file (exit $rc):" >&2
  if [ -s "$tmp/config.err" ]; then
    cat "$tmp/config.err" >&2
  else
    echo "(docker compose printed no error message)" >&2
  fi
  exit 2
fi
if [ -z "$json" ]; then
  echo "docker compose config printed nothing for $file: cannot check the ports." >&2
  exit 2
fi

# One tab-separated row per published port: service, host_ip, published, target, protocol.
# Empty values become "-" because read would merge empty tab-separated fields.
# A service with network_mode host gives one row with the marker "network_mode_host".
rows="$(jq -r '.services | to_entries[] | .key as $s
  | ((if .value.network_mode == "host" then [[$s, "network_mode_host", "-", "-", "-"]] else [] end)
    + [.value.ports[]? | [$s, ((.host_ip // "") | if . == "" then "-" else . end),
                          ((.published // "-") | tostring), ((.target // "-") | tostring),
                          (.protocol // "tcp")]])
  | .[] | @tsv' <<< "$json")"

checked=0
failures=0
while IFS=$'\t' read -r svc ip pub target proto; do
  [ -n "$svc" ] || continue
  if [ "$ip" = network_mode_host ]; then
    echo "FAIL $svc: network_mode host"
    failures=$((failures + 1))
    continue
  fi
  checked=$((checked + 1))
  [ "$ip" != - ] || ip=""
  [ "$pub" != - ] || pub=random
  desc="$svc: ${ip:-all interfaces}:$pub -> $target/$proto"
  if [ "$svc" = "$traefik" ] && { [ "$pub" = 80 ] || [ "$pub" = 443 ]; }; then
    echo "OK $desc (Traefik)"
  elif [ "$ip" = 127.0.0.1 ] || [ "$ip" = ::1 ]; then
    echo "OK $desc"
  else
    echo "FAIL $desc"
    failures=$((failures + 1))
  fi
done <<< "$rows"

echo "$checked published ports checked, $failures failures"
[ "$failures" -eq 0 ]
