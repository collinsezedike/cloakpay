import { useState } from "react";
import { loadHistory, clearHistory, type PayrollBatch } from "@/lib/history";
import { buildPayStubUrl } from "@/lib/paystub";
import type { PaymentResult } from "@/types";

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function batchSummary(results: PaymentResult[]) {
  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;
  const total = results.reduce((acc, r) => acc + r.amount, 0);
  return { succeeded, failed, total };
}

interface RowProps {
  result: PaymentResult;
}

function PaymentRow({ result }: RowProps) {
  const [copied, setCopied] = useState(false);
  const canShare = result.status === "success" && result.txSignature && result.viewingKey;

  const share = async () => {
    await navigator.clipboard.writeText(buildPayStubUrl(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-white/60">{truncateAddr(result.address)}</span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-white/80 tabular-nums">
        {result.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3 text-center">
        {result.status === "success" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400 font-medium">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Sent
          </span>
        )}
        {result.status === "error" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-xs text-red-400 font-medium">
            Failed
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {canShare ? (
          <button
            onClick={share}
            title="Copy pay stub link"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-white/10 text-xs text-white/40 hover:text-white hover:border-white/20 transition-colors"
          >
            {copied ? (
              <>
                <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Share
              </>
            )}
          </button>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

interface BatchCardProps {
  batch: PayrollBatch;
  expanded: boolean;
  onToggle: () => void;
}

function BatchCard({ batch, expanded, onToggle }: BatchCardProps) {
  const { succeeded, failed, total } = batchSummary(batch.results);

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-white/80">{formatDate(batch.dispatchedAt)}</p>
          <p className="text-xs text-white/40">
            {batch.results.length} payment{batch.results.length !== 1 ? "s" : ""} ·{" "}
            <span className="tabular-nums">
              {total.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC
            </span>
            {" · "}
            <span className="text-emerald-400">{succeeded} sent</span>
            {failed > 0 && <span className="text-red-400"> · {failed} failed</span>}
          </p>
        </div>
        <svg
          className={`h-4 w-4 text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded rows */}
      {expanded && (
        <div className="border-t border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-white/30 uppercase tracking-wider">Recipient</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-white/30 uppercase tracking-wider">USDC</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-white/30 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-white/30 uppercase tracking-wider">Pay Stub</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {batch.results.map((r, i) => (
                <PaymentRow key={i} result={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function HistoryPanel() {
  const [batches, setBatches] = useState<PayrollBatch[]>(() => loadHistory());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(batches.length > 0 ? [batches[0].id] : []),
  );
  const [confirming, setConfirming] = useState(false);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleClear = () => {
    clearHistory();
    setBatches([]);
    setExpandedIds(new Set());
    setConfirming(false);
  };

  if (batches.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center space-y-2">
        <p className="text-sm font-medium text-white/60">No payroll history yet</p>
        <p className="text-xs text-white/30">
          Dispatched payrolls will appear here. History is stored locally in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white/90">Payroll History</h2>
          <p className="text-xs text-white/30 mt-0.5">Stored locally · {batches.length} batch{batches.length !== 1 ? "es" : ""}</p>
        </div>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="text-xs text-white/20 hover:text-red-400 transition-colors"
          >
            Clear history
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Are you sure?</span>
            <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300 transition-colors">
              Yes, clear
            </button>
            <button onClick={() => setConfirming(false)} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {batches.map((batch) => (
          <BatchCard
            key={batch.id}
            batch={batch}
            expanded={expandedIds.has(batch.id)}
            onToggle={() => toggle(batch.id)}
          />
        ))}
      </div>

      <p className="text-xs text-white/20 text-center pt-2">
        History is device-local. Export JSON from the Dispatch tab for a portable record.
      </p>
    </div>
  );
}
