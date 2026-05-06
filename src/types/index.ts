export interface PaymentRow {
  address: string;
  amount: number; // USDC amount (human-readable, e.g. 100.50)
}

export type PaymentStatus =
  | "pending"
  | "processing"
  | "success"
  | "error";

export interface PaymentResult {
  address: string;
  amount: number;
  status: PaymentStatus;
  txSignature?: string;
  viewingKey?: string;
  error?: string;
}

export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedCsv {
  rows: PaymentRow[];
  errors: CsvValidationError[];
}
