// Connection rejects relative paths, so the proxy fallback uses an absolute URL.
export const RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_URL ??
  `${window.location.origin}/solana-devnet-rpc`;
