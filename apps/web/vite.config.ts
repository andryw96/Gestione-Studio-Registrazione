import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // raggiungibile dagli altri PC della rete locale
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
