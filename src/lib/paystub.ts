import type { PaymentResult } from "@/types";

export interface PayStubParams {
  tx: string;
  nk: string;
  amount: number;
  to: string;
}

export function buildPayStubUrl(result: PaymentResult): string {
  const params = new URLSearchParams({
    verify: "1",
    tx: result.txSignature ?? "",
    nk: result.viewingKey ?? "",
    amount: result.amount.toString(),
    to: result.address,
  });
  return `${window.location.origin}${window.location.pathname}?${params}`;
}

export function parsePayStubParams(search: string): PayStubParams | null {
  const params = new URLSearchParams(search);
  if (params.get("verify") !== "1") return null;
  const tx = params.get("tx");
  const nk = params.get("nk");
  const amountStr = params.get("amount");
  const to = params.get("to");
  if (!tx || !nk || !amountStr || !to) return null;
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;
  return { tx, nk, amount, to };
}
