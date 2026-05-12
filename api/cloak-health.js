// The relay's /health endpoint is slow/unreliable on devnet.
// Return a stub so the SDK doesn't stall waiting for it.
export default function handler(_req, res) {
  res.status(200).json({ status: "ok", alt_addresses: [] });
}
