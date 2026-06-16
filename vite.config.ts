import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/superchain-liquidity-ops/",
  plugins: [react()],
  server: {
    port: 5175,
  },
});
