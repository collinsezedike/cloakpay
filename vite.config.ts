import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Polyfill Node built-ins required by @solana/web3.js and snarkjs
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util", "process"],
      globals: { Buffer: true, process: true },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/cloak-relay": {
        target: "https://api.devnet.cloak.ag",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cloak-relay/, ""),
      },
    },
  },
});
