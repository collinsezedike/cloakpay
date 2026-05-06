
interface Props {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  total: number;
  count: number;
  progress?: { done: number; total: number };
}

export function DispatchButton({ onClick, disabled, loading, total, count, progress }: Props) {
  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-3">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`relative w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm font-semibold transition-all overflow-hidden
          ${disabled || loading
            ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 border border-indigo-500"
          }`}
      >
        {loading && progress && (
          <div
            className="absolute inset-0 bg-indigo-500/30 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        )}

        <span className="relative flex items-center gap-2">
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {progress
                ? `Sending ${progress.done} / ${progress.total}…`
                : "Processing…"}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Dispatch Payroll — {count} payments · {total.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC
            </>
          )}
        </span>
      </button>

      {loading && progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/40">
            <span>Sending privately via Cloak…</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
