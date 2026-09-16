#!/usr/bin/env bash
# Build dash-producao only when dash-related paths change.
# exit 0 = skip · exit 1 = build
set -euo pipefail
files="$(git diff --name-only HEAD^ HEAD 2>/dev/null || true)"
if echo "$files" | grep -qE '^(dash-producao/|scripts/dash-producao/|docs/dash-producao/|docs/PLANO_DASHBOARD_PRODUCAO_COMERCIAL\.md$|scripts/vercel-ignore-dash\.sh$)'; then
  exit 1
fi
exit 0
