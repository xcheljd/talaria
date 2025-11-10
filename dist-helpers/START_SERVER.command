#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Communication Template Generator..."
echo "Opening browser at http://localhost:8081"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
python3 -m http.server 8081
