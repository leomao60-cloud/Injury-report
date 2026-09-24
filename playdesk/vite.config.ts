/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Export libraries are loaded on demand; pre-bundle them so the dev server never reloads mid-export.
  optimizeDeps: {
    include: ['jspdf', 'svg2pdf.js', 'pptxgenjs', 'jszip', 'react-dom/server'],
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
