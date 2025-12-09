import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  // Configure as multi-page app with three entry points
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        start: resolve(__dirname, 'start.html'),
        promotion: resolve(__dirname, 'promotion.html'),
      },
      output: {
        // Use es format - requires local server due to CORS
        format: 'es',
      },
    },
    // Output to dist folder
    outDir: 'dist',
    // Enable relative paths for server compatibility
    assetsDir: 'assets',
  },
  // Base path for assets - use relative for offline compatibility
  base: './',
  // Development server configuration
  server: {
    port: 8080,
    open: '/index.html',
  },
});
