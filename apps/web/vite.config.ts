import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_URL = process.env.VITE_API_PROXY ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Same origin in dev → the session cookie just works, no CORS setup
    proxy: {
      '/api': API_URL,
      '/socket.io': { target: API_URL, ws: true },
    },
  },
  build: {
    target: 'es2023',
  },
});
