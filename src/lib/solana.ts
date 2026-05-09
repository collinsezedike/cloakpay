import { Connection } from "@solana/web3.js";

// In dev the proxy path must be an absolute URL — Connection rejects relative paths.
// The path name contains "devnet" so Switchboard's detectNetworkFromRpcUrl works correctly.
export const RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_URL ??
  `${window.location.origin}/solana-devnet-rpc`;

export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}
