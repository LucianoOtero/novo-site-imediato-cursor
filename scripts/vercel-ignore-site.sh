#!/usr/bin/env bash
# Skip Vercel build for imediato-seguros when only dash paths changed.
# exit 0 = skip · exit 1 = build
set -euo pipefail
files="$(git diff --name-only HEAD^ HEAD 2>/dev/null || true)"
[[ -z "$files" ]] && exit 0
if echo "$files" | grep -Ev '^(dash-producao/|scripts/dash-producao/|docs/dash-producao/|docs/PLANO_DASHBOARD_PRODUCAO_COMERCIAL\.md$|docs/VERSIONING\.md$|scripts/vercel-ignore-)' | grep -q .; then
  exit 1
fi
exit 0
