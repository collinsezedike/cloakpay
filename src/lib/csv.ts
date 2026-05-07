import Papa from "papaparse";
import { PublicKey } from "@solana/web3.js";
import type { ParsedCsv, PaymentRow, CsvValidationError } from "@/types";

export function parseCsv(file: File): Promise<ParsedCsv> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows: PaymentRow[] = [];
        const errors: CsvValidationError[] = [];

        result.data.forEach((raw, idx) => {
          const rowNum = idx + 2; // 1-indexed + header row

          // Normalise header names: accept "address"/"wallet"/"recipient"
          const address = (
            raw["address"] ??
            raw["wallet"] ??
            raw["recipient"] ??
            ""
          ).trim();

          // Normalise amount header: "amount"/"usdc"/"usd"
          const rawAmount = (
            raw["amount"] ??
            raw["usdc"] ??
            raw["usd"] ??
            ""
          ).trim();

          if (!address) {
            errors.push({ row: rowNum, field: "address", message: "Missing wallet address" });
            return;
          }

          try {
            new PublicKey(address);
          } catch {
            errors.push({ row: rowNum, field: "address", message: `Invalid Solana address: ${address}` });
            return;
          }

          const amount = parseFloat(rawAmount);
          if (!rawAmount || isNaN(amount) || amount <= 0) {
            errors.push({ row: rowNum, field: "amount", message: `Invalid amount: "${rawAmount}"` });
            return;
          }

          rows.push({ address, amount });
        });

        resolve({ rows, errors });
      },
      error: (err) => {
        resolve({ rows: [], errors: [{ row: 0, field: "file", message: err.message }] });
      },
    });
  });
}

export function totalUsdc(rows: PaymentRow[]): number {
  return rows.reduce((acc, r) => acc + r.amount, 0);
}

export function generateSampleCsv(): string {
  return [
    "address,amount",
    "3NKdgjCbVa4fdFaz8S42kP1UELwT1vyZaH3827iJRCtc,100.00",
    "3NKdgjCbVa4fdFaz8S42kP1UELwT1vyZaH3827iJRCtc,250.50",
    "3NKdgjCbVa4fdFaz8S42kP1UELwT1vyZaH3827iJRCtc,75.00",
  ].join("\n");
}
