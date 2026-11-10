import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // forward local API requests to our deployed backend
      "/api": {
        target: "https://predictionmarketucf.site",
        changeOrigin: true,
      },
    },
  },
});