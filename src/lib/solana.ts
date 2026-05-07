import { clusterApiUrl, Connection } from "@solana/web3.js";

export const RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_URL ?? clusterApiUrl("devnet");

export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}
