#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

# Ensure TipTap packages are available (newsletter card feature)
npm ls @tiptap/react 2>/dev/null || npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-highlight

echo "Environment setup complete."
