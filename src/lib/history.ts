import type { PaymentResult } from "@/types";

export interface PayrollBatch {
  id: string;
  dispatchedAt: string;
  results: PaymentResult[];
}

const STORAGE_KEY = "cloakpay_history";

export function loadHistory(): PayrollBatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PayrollBatch[]) : [];
  } catch {
    return [];
  }
}

export function saveBatch(results: PaymentResult[]): void {
  const batches = loadHistory();
  batches.unshift({
    id: Date.now().toString(),
    dispatchedAt: new Date().toISOString(),
    results,
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  } catch {
    // localStorage full — JSON export is the durable backup
  }
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
