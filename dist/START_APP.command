#!/usr/bin/env bash
# Simple launcher for Communication Template Generator
# Opens the built app directly in a browser without starting a local server.

# Move to the directory containing this script (i.e., the built dist/ folder)
cd "$(dirname "$0")" || exit 1

HTML="start.html"
if [ ! -f "$HTML" ]; then
  HTML="index.html"
fi

APP_PATH="$PWD/$HTML"

echo "Opening Communication Template Generator..."
echo "  File: $APP_PATH"

# Prefer Google Chrome if available (often handles file:// + modules more reliably)
if command -v open >/dev/null 2>&1; then
  if open -Ra "Google Chrome" >/dev/null 2>&1; then
    open -a "Google Chrome" "$APP_PATH"
  else
    # Fallback: use the system default browser
    open "$APP_PATH"
  fi
else
  echo "Could not find the 'open' command. Please open this file manually in your browser:"
  echo "  $APP_PATH"
fi
