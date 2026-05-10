import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { sendPrivateUsdc, assertUsdcBalance, type MerkleTree } from "@/lib/cloak";
import { totalUsdc } from "@/lib/csv";
import { saveBatch } from "@/lib/history";
import type { PaymentRow, PaymentResult } from "@/types";

interface Progress {
  done: number;
  total: number;
}

export function usePayroll() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [results, setResults] = useState<PaymentResult[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const dispatch = useCallback(
    async (rows: PaymentRow[]) => {
      if (!wallet.publicKey) return;

      setBalanceError(null);
      setDispatching(true);
      setProgress({ done: 0, total: rows.length });

      // Pre-flight: check USDC balance before touching the chain
      try {
        await assertUsdcBalance(connection, wallet.publicKey, totalUsdc(rows));
      } catch (err) {
        setBalanceError(err instanceof Error ? err.message : "Balance check failed");
        setDispatching(false);
        setProgress(null);
        return;
      }

      const initialResults: PaymentResult[] = rows.map((r) => ({
        address: r.address,
        amount: r.amount,
        status: "pending",
      }));
      setResults(initialResults);

      const final = [...initialResults];
      let cachedMerkleTree: MerkleTree | undefined;

      for (let i = 0; i < rows.length; i++) {
        final[i] = { ...final[i], status: "processing" };
        setResults([...final]);

        try {
          const result = await sendPrivateUsdc(
            connection,
            wallet,
            rows[i].address,
            rows[i].amount,
            cachedMerkleTree,
          );

          cachedMerkleTree = result.merkleTree;

          final[i] = {
            ...final[i],
            status: "success",
            txSignature: result.txSignature,
            viewingKey: result.viewingKey,
          };
        } catch (err) {
          final[i] = {
            ...final[i],
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          };
          // Don't carry a stale tree past a failed payment
          cachedMerkleTree = undefined;
        }

        setResults([...final]);
        setProgress({ done: i + 1, total: rows.length });
      }

      saveBatch(final);
      setDispatching(false);
    },
    [connection, wallet],
  );

  const retryPayment = useCallback(
    async (index: number, row: PaymentRow) => {
      if (!wallet.publicKey) return;

      setResults((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status: "processing", error: undefined };
        return next;
      });

      try {
        const result = await sendPrivateUsdc(connection, wallet, row.address, row.amount);
        setResults((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            status: "success",
            txSignature: result.txSignature,
            viewingKey: result.viewingKey,
            error: undefined,
          };
          return next;
        });
      } catch (err) {
        setResults((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          };
          return next;
        });
      }
    },
    [connection, wallet],
  );

  const reset = useCallback(() => {
    setResults([]);
    setProgress(null);
    setDispatching(false);
    setBalanceError(null);
  }, []);

  return { dispatch, retryPayment, results, progress, dispatching, balanceError, reset };
}
