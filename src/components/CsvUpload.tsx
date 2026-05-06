
import { useCallback, useState } from "react";
import { parseCsv, generateSampleCsv, totalUsdc } from "@/lib/csv";
import type { PaymentRow, CsvValidationError } from "@/types";

interface Props {
  onParsed: (rows: PaymentRow[]) => void;
}

export function CsvUpload({ onParsed }: Props) {
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<CsvValidationError[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setErrors([{ row: 0, field: "file", message: "File must be a .csv" }]);
        return;
      }
      setFileName(file.name);
      const { rows, errors: parseErrors } = await parseCsv(file);
      setErrors(parseErrors);
      if (rows.length > 0) onParsed(rows);
    },
    [onParsed],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const downloadSample = () => {
    const blob = new Blob([generateSampleCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-payroll.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-12 text-center transition-colors cursor-pointer
          ${dragging
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
          }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={onInputChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
          <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        {fileName ? (
          <div>
            <p className="text-sm font-medium text-white">{fileName}</p>
            <p className="text-xs text-white/40 mt-0.5">Click or drag to replace</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-white">Drop your CSV here</p>
            <p className="text-xs text-white/40 mt-0.5">
              or <span className="text-indigo-400">click to browse</span>
            </p>
          </div>
        )}

        <p className="text-xs text-white/30">
          Required columns: <code className="text-white/50">address</code>, <code className="text-white/50">amount</code>
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={downloadSample}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download sample CSV
        </button>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-400">
              {e.row > 0 ? `Row ${e.row}: ` : ""}{e.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function PaymentSummaryBanner({ rows }: { rows: PaymentRow[] }) {
  const total = totalUsdc(rows);

  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3">
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Recipients</p>
          <p className="text-xl font-semibold text-white tabular-nums">{rows.length}</p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Total USDC</p>
          <p className="text-xl font-semibold text-white tabular-nums">
            {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        <span className="text-xs text-violet-400 font-medium">Private</span>
      </div>
    </div>
  );
}
