import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'ES2022',
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 3000,
  },
});
