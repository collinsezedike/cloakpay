import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

// Intercept /cloak-relay/health before the proxy — the relay times out on this endpoint.
const mockCloakHealth = () => ({
  name: "mock-cloak-health",
  configureServer(server: ViteDevServer) {
    server.middlewares.use("/cloak-relay/health", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "ok", alt_addresses: [] }));
    });
  },
});

// Proxies /risk-quote → the Cloak relay's /range-quote, stripping the token
// param so the relay doesn't reject mock USDC. The relay returns a compact
// { signature, message, signer_pubkey } Ed25519 instruction (~145 bytes) that
// fits alongside the Cloak ZK proof in a single transaction, whereas the
// Switchboard oracle instruction (207 bytes) overflows the 1232-byte limit.
const riskQuoteMiddleware = () => ({
  name: "risk-quote-middleware",
  configureServer(server: ViteDevServer) {
    server.middlewares.use("/risk-quote", async (req, res) => {
      try {
        const qs = req.url?.split("?")[1] ?? "";
        const params = new URLSearchParams(qs);
        const wallet = params.get("wallet");

        if (!wallet) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing wallet param" }));
          return;
        }

        // Call the relay server-side (bypasses browser CORS) with only the
        // wallet param — omitting token avoids the mock USDC 500 error.
        // Retry up to 3 times; the devnet relay occasionally drops TCP connections.
        let lastErr: unknown;
        let relayRes: Response | undefined;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20_000);
            relayRes = await fetch(
              `https://api.devnet.cloak.ag/range-quote?wallet=${wallet}`,
              { signal: controller.signal },
            );
            clearTimeout(timer);
            break;
          } catch (err) {
            lastErr = err;
            console.warn(`[risk-quote] attempt ${attempt} failed:`, (err as Error).message);
            if (attempt < 3) await new Promise((r) => setTimeout(r, 1_500 * attempt));
          }
        }

        if (!relayRes) {
          console.error("[risk-quote] all retries exhausted:", lastErr);
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Relay unreachable after 3 attempts: ${(lastErr as Error).message}` }));
          return;
        }

        if (!relayRes.ok) {
          const body = await relayRes.text().catch(() => relayRes!.statusText);
          console.error(`[risk-quote] relay ${relayRes.status}:`, body);
          res.writeHead(relayRes.status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Relay range-quote failed (${relayRes.status}): ${body}` }));
          return;
        }

        const data = await relayRes.json();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      } catch (err) {
        console.error("[risk-quote]", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
  },
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Polyfill Node built-ins required by @solana/web3.js and snarkjs
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util", "process"],
      globals: { Buffer: true, process: true },
    }),
    mockCloakHealth(),
    riskQuoteMiddleware(),
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
        proxyTimeout: 120_000,
        timeout: 120_000,
      },
      // Fallback proxy for when VITE_SOLANA_RPC_URL is not set.
      // Public devnet drops keep-alive connections, so force Connection:close
      // to get a fresh TCP socket per request and avoid socket hang ups.
      "/solana-devnet-rpc": {
        target: "https://api.devnet.solana.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/solana-devnet-rpc/, ""),
        headers: { Connection: "close" },
        proxyTimeout: 30_000,
      },
    },
  },
});
