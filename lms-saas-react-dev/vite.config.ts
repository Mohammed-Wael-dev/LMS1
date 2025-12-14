import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  plugins: [react(), mkcert()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  server: {
    https: false,
    host: "localhost",
    port: 5173,
  },
});






















