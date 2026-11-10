#!/usr/bin/env bash
# Publish SemPrep to https://qiscet-semprep.pages.dev
# First time on a new computer: npx wrangler login   (then click Allow in the browser)
set -euo pipefail
cd "$(dirname "$0")"
bash build.sh
npx --yes wrangler@4 pages deploy dist --project-name qiscet-semprep --branch main --commit-dirty=true
