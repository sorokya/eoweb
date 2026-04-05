import path from 'node:path';
import preact from '@preact/preset-vite';
import tailwind from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [preact(), tailwind()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
    },
  },
  server: {
    port: 3000,
  },
});
