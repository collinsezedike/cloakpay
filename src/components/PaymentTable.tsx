
import type { PaymentRow, PaymentResult, PaymentStatus } from "@/types";

function StatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-white/5 text-white/40 border-white/10",
    },
    processing: {
      label: "Sending…",
      className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    success: {
      label: "Sent",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    error: {
      label: "Failed",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
    },
  };

  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${className}`}>
      {status === "processing" && (
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
      )}
      {status === "success" && (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {label}
    </span>
  );
}

interface Props {
  rows: PaymentRow[];
  results?: PaymentResult[];
}

function truncateAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export function PaymentTable({ rows, results }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02]">
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider w-8">#</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Recipient</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Amount (USDC)</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Tx</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, i) => {
            const result = results?.[i];
            const status: PaymentStatus = result?.status ?? "pending";

            return (
              <tr key={`${row.address}-${i}`} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-white/30 tabular-nums">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-white/70 text-xs">{truncateAddr(row.address)}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-white tabular-nums">
                  {row.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={status} />
                </td>
                <td className="px-4 py-3">
                  {result?.txSignature ? (
                    <a
                      href={`https://solscan.io/tx/${result.txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {result.txSignature.slice(0, 8)}…
                    </a>
                  ) : result?.error ? (
                    <span className="text-xs text-red-400 truncate max-w-[120px] block">{result.error}</span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
