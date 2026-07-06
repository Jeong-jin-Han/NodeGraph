#!/usr/bin/env bash
# Regenerate .html next to every *.nodegraph.json found under a root directory
# (default: the 2026_CAMEL vault). Usage: ./export-all-html.sh [rootDir]
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/export-all-html.js" "$@"
