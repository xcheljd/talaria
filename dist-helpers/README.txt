COMMUNICATION TEMPLATE GENERATOR
=================================

HOW TO RUN THE APP:
-------------------

OPTION 1: Double-click START_SERVER.command
  - This will start a local web server on port 8081
  - Open your browser and go to: http://localhost:8081
  - Press Ctrl+C in the terminal to stop the server

OPTION 2: Use any web server
  - The app requires a web server due to ES modules
  - You can use Python: python3 -m http.server 8081
  - Or use Node: npx serve -p 8081
  - Or use any other web server of your choice

WHY A SERVER IS REQUIRED:
-------------------------
Modern JavaScript modules (ES modules) don't work when opening HTML files 
directly (file:// protocol) due to browser security restrictions (CORS).
A simple local web server solves this by serving files via http://.

The server runs only on your computer and doesn't require internet.
