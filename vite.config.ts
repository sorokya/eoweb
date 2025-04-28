import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "ES2022",
  },
  server: {
    port: 3000,
  },
});
