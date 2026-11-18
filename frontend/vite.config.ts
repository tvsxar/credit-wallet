import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
  },
});
