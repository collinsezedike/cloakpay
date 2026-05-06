
import { useState } from "react";
import type { PaymentResult } from "@/types";

interface Props {
  results: PaymentResult[];
}

function truncate(s: string, n = 20): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function ViewingKeysPanel({ results }: Props) {
  const successful = results.filter((r) => r.status === "success" && r.viewingKey);
  const [copied, setCopied] = useState<string | null>(null);

  if (successful.length === 0) return null;

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportJson = () => {
    const data = successful.map((r) => ({
      recipient: r.address,
      amount_usdc: r.amount,
      tx_signature: r.txSignature,
      viewing_key: r.viewingKey,
      timestamp: new Date().toISOString(),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cloakpay-viewing-keys-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const header = "recipient,amount_usdc,tx_signature,viewing_key,timestamp";
    const rows = successful.map((r) =>
      `${r.address},${r.amount},${r.txSignature ?? ""},${r.viewingKey ?? ""},${new Date().toISOString()}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cloakpay-viewing-keys-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const failed = results.filter((r) => r.status === "error");

  return (
    <div className="space-y-4">
      {/* Success summary */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Payroll Dispatched</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {successful.length} of {results.length} payments succeeded
            {failed.length > 0 && ` · ${failed.length} failed`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/20 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
          <button
            onClick={exportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-xs text-indigo-400 hover:bg-indigo-600/30 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            JSON
          </button>
        </div>
      </div>

      {/* Compliance note */}
      <div className="rounded-lg bg-violet-500/5 border border-violet-500/15 p-3 flex gap-3">
        <svg className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <p className="text-xs text-violet-300/80 leading-relaxed">
          Each viewing key cryptographically proves receipt without revealing your identity or other payments.
          Share individual keys with recipients or auditors for compliance verification.
        </p>
      </div>

      {/* Viewing keys table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Recipient</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">USDC</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Viewing Key</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {successful.map((r, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-white/60">
                    {r.address.slice(0, 6)}…{r.address.slice(-6)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-white/80 tabular-nums text-xs">
                  {r.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-emerald-400/80 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                    {truncate(r.viewingKey ?? "", 28)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => copyKey(r.viewingKey!)}
                    title="Copy viewing key"
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >
                    {copied === r.viewingKey ? (
                      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
