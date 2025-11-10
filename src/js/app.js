// Import dependencies
import { initIndexedDB } from './db.js';
import { initTheme } from './theme.js';
import { init } from './ui.js';

// Start the application
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize theme first (must happen before UI renders)
  initTheme();

  // Initialize IndexedDB
  await initIndexedDB();

  // Initialize UI
  init();
});
