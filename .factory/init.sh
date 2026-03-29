#!/usr/bin/env bash
set -euo pipefail

# Idempotent environment setup for worker sessions
cd "$(git rev-parse --show-toplevel)"

# Install dependencies if node_modules missing or package-lock changed
if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
  npm install
fi

echo "Environment ready."
