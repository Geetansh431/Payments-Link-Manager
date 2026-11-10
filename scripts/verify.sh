#!/usr/bin/env bash
# Verification gate for humans, CI and agents.
#   ./scripts/verify.sh          typecheck, lint, guards, unit tests (+coverage), build
#   ./scripts/verify.sh --quick  typecheck, lint, guards, unit tests
#   ./scripts/verify.sh --e2e    everything above + Playwright E2E/a11y
set -uo pipefail
cd "$(dirname "$0")/.."

MODE="full"
for arg in "$@"; do
  case "$arg" in
    --quick) MODE="quick" ;;
    --e2e) MODE="e2e" ;;
    -h|--help) sed -n '2,5p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [[ ! -f package.json ]]; then
  echo "verify: no package.json yet — scaffold the app first (see AGENTS.md)." >&2
  exit 1
fi
if [[ ! -d node_modules ]]; then
  echo "verify: installing dependencies…"; npm ci || npm install || exit 1
fi

RESULTS=()
FAILED=0

run_step() {
  local name="$1"; shift
  echo -e "\n\033[1m▶ $name\033[0m"
  local start=$SECONDS
  if "$@"; then
    RESULTS+=("PASS  $name ($((SECONDS - start))s)")
  else
    RESULTS+=("FAIL  $name ($((SECONDS - start))s)")
    FAILED=1
  fi
}

# Repo guards: rules from AGENTS.md that tools don't enforce by default.
guards() {
  local ok=0 hits
  local dirs=(src); [[ -d e2e ]] && dirs+=(e2e)

  hits=$(grep -rnE '\b(it|test|describe)\.(only|skip)\(' "${dirs[@]}" 2>/dev/null)
  [[ -n "$hits" ]] && { echo "Focused/skipped tests committed:"; echo "$hits"; ok=1; }

  hits=$(grep -rnE 'console\.log\(' src --include='*.ts' --include='*.tsx' 2>/dev/null)
  [[ -n "$hits" ]] && { echo "console.log in src:"; echo "$hits"; ok=1; }

  hits=$(grep -rnE '(:\s*any\b|as any\b|<any>)' src --include='*.ts' --include='*.tsx' 2>/dev/null)
  [[ -n "$hits" ]] && { echo "'any' type in src:"; echo "$hits"; ok=1; }

  if [[ -d src/domain ]]; then
    hits=$(grep -rnE 'Date\.now\(\)|new Date\(\)' src/domain --include='*.ts' \
           --exclude='*.test.ts' 2>/dev/null)
    [[ -n "$hits" ]] && { echo "Ambient time in src/domain (inject 'now' instead):"; echo "$hits"; ok=1; }

    hits=$(grep -rnE "from ['\"](react|\.\./(data|hooks|components))" src/domain 2>/dev/null)
    [[ -n "$hits" ]] && { echo "src/domain must not import React or outer layers:"; echo "$hits"; ok=1; }
  fi

  hits=$(grep -rnE 'localStorage' src/components --exclude='*.test.tsx' --exclude='*.test.ts' 2>/dev/null)
  [[ -n "$hits" ]] && { echo "Components must not access localStorage (use the repository):"; echo "$hits"; ok=1; }

  [[ $ok -eq 0 ]] && echo "All guards passed."
  return $ok
}

run_step "Typecheck" npm run --silent typecheck
run_step "Lint" npm run --silent lint
run_step "Repo guards" guards

if [[ "$MODE" == "quick" ]]; then
  run_step "Unit tests" npm test --silent
else
  run_step "Unit tests + coverage" npm run --silent coverage
  run_step "Build" npm run --silent build
fi

if [[ "$MODE" == "e2e" ]]; then
  run_step "E2E + a11y (Playwright)" npm run --silent e2e
fi

echo -e "\n\033[1mSummary\033[0m"
printf '  %s\n' "${RESULTS[@]}"
exit $FAILED
