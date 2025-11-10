#!/bin/bash
cd "$(dirname "$0")"

# Try different ports if 8000 is in use
PORT=8000
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; do
    echo "Port $PORT is in use, trying next port..."
    PORT=$((PORT + 1))
done

echo "Starting local server on port $PORT..."
echo ""
echo "====================================="
echo "  Open your browser to:"
echo "  http://localhost:$PORT"
echo "====================================="
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server $PORT
