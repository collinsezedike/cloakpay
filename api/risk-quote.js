// Vercel serverless function — mirrors the Vite dev middleware in vite.config.ts.
// Proxies /risk-quote → https://api.devnet.cloak.ag/range-quote
// stripping the token param (relay rejects the mock USDC mint).
// Fast-fails on ETIMEDOUT instead of retrying — a dead relay causes the
// Solana blockhash to expire while we wait, breaking the transaction.

export default async function handler(req, res) {
  const params = new URLSearchParams((req.url ?? "").split("?")[1] ?? "");
  const wallet = params.get("wallet");
  const recipient = params.get("recipient");

  if (!wallet) {
    return res.status(400).json({ error: "Missing wallet param" });
  }

  const relayQs = new URLSearchParams({ wallet });
  if (recipient) relayQs.set("recipient", recipient);

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);
      const relayRes = await fetch(
        `https://api.devnet.cloak.ag/range-quote?${relayQs}`,
        { signal: controller.signal },
      );
      clearTimeout(timer);

      if (!relayRes.ok) {
        const body = await relayRes.text().catch(() => relayRes.statusText);
        return res.status(relayRes.status).json({ error: `Relay error (${relayRes.status}): ${body}` });
      }

      const data = await relayRes.json();
      return res.status(200).json(data);
    } catch (err) {
      lastErr = err;
      const code = err?.cause?.code ?? err?.code ?? "";
      const isDown =
        code === "ETIMEDOUT" ||
        code === "UND_ERR_CONNECT_TIMEOUT" ||
        code === "ECONNREFUSED";
      console.warn(`[risk-quote] attempt ${attempt} failed:`, err.message, code);
      if (isDown) {
        console.warn("[risk-quote] relay unreachable, aborting retries");
        break;
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1_500 * attempt));
    }
  }

  console.error("[risk-quote] failed:", lastErr);
  return res.status(502).json({
    error: "Cloak devnet relay is currently unreachable. Please try again in a few minutes.",
  });
}
