
import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { sendPrivateUsdc } from "@/lib/cloak";
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

  const dispatch = useCallback(
    async (rows: PaymentRow[]) => {
      if (!wallet.publicKey) return;

      setDispatching(true);
      setProgress({ done: 0, total: rows.length });

      const initialResults: PaymentResult[] = rows.map((r) => ({
        address: r.address,
        amount: r.amount,
        status: "pending",
      }));
      setResults(initialResults);

      const final = [...initialResults];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Mark as processing
        final[i] = { ...final[i], status: "processing" };
        setResults([...final]);

        try {
          const { txSignature, viewingKey } = await sendPrivateUsdc(
            connection,
            wallet,
            row.address,
            row.amount,
          );

          final[i] = {
            ...final[i],
            status: "success",
            txSignature,
            viewingKey,
          };
        } catch (err) {
          final[i] = {
            ...final[i],
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          };
        }

        setResults([...final]);
        setProgress({ done: i + 1, total: rows.length });
      }

      setDispatching(false);
    },
    [connection, wallet],
  );

  const reset = useCallback(() => {
    setResults([]);
    setProgress(null);
    setDispatching(false);
  }, []);

  return { dispatch, results, progress, dispatching, reset };
}
