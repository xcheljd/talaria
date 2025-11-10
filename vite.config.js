import { defineConfig } from 'vite';
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
      // Render legacy chunks as system modules to avoid CORS issues
      renderLegacyChunks: true,
      // Modernize polyfills to reduce bundle size
      modernPolyfills: true,
    }),
  ],
  // Configure as multi-page app with two entry points
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        start: resolve(__dirname, 'start.html'),
      },
      output: {
        // Use es format but inline everything
        format: 'es',
        // Inline all dynamic imports to avoid module splitting
        inlineDynamicImports: false,
      },
    },
    // Output to dist folder
    outDir: 'dist',
    // Enable relative paths for file:// protocol compatibility
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
