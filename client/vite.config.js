import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // While running `npm run dev` in /client, proxy API calls to the
    // Express server so you can test the whole thing locally.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
