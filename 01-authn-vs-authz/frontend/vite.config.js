import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward /api/* to Express. The browser sees one origin,
    // so the session cookie just works — no CORS setup needed.
    proxy: {
      '/api': 'http://127.0.0.1:4000',
    },
  },
});
