import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app from /scrabbleio-client/.
// three.js only ships with the lazily loaded home hero (Hero3D chunk).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/scrabbleio-client/' : '/',
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
}));
