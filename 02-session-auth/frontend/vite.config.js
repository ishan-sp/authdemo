import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Same origin for the browser, so the session cookie just works.
    proxy: {
      '/api': 'http://127.0.0.1:4001',
    },
  },
});
