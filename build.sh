#!/usr/bin/env bash
# Builds the deployable site into dist/ — only the public files.
# Used by Cloudflare Pages / Netlify: build command "bash build.sh", output directory "dist".
# docs/, supabase/, AGENTS.md, README.md and content/ are never published.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist
mkdir -p dist
cp index.html favicon.svg dist/
cp -r css js samples dist/

# security headers (Cloudflare Pages and Netlify both read this file)
cat > dist/_headers <<'EOF'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
EOF

echo "Built dist/:"
find dist -type f | sort
