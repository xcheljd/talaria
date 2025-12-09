COMMUNICATION TEMPLATE GENERATOR
=================================

HOW TO RUN THE APP:
-------------------

QUICKEST: Double-click START_APP
  - macOS: double-click START_APP.command
  - Windows: double-click START_APP.bat
  - This will open the built app HTML (start.html, or index.html as fallback)
  - No server process is started; it just opens the file in your browser

FALLBACK OPTION 1: Double-click START_SERVER.command (macOS)
  - This will start a local web server on port 8081
  - Open your browser and go to: http://localhost:8081
  - Press Ctrl+C in the terminal to stop the server

FALLBACK OPTION 2: Use any web server
  - If your browser does not fully support running ES modules from file://,
    you can still serve the dist/ folder with any simple static server
  - You can use Python: python3 -m http.server 8081
  - Or use Node: npx serve -p 8081
  - Or use any other web server of your choice

NOTES ABOUT SERVERS:
--------------------
In some environments, modern JavaScript modules (ES modules) may not work
when opening HTML files directly (file:// protocol) due to browser security
restrictions (CORS). A simple local web server solves this by serving files
via http://.

The server runs only on your computer and doesn't require internet.
