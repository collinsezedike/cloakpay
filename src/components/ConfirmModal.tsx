interface Props {
  open: boolean;
  count: number;
  total: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, count, total, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#16161f] p-6 space-y-5 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">Confirm payroll dispatch</h2>
          <p className="text-xs text-white/40">This action cannot be undone. Each payment will be submitted to the blockchain.</p>
        </div>

        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] divide-y divide-white/[0.06]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-white/50">Recipients</span>
            <span className="text-sm font-semibold text-white tabular-nums">{count}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-white/50">Total USDC</span>
            <span className="text-sm font-semibold text-white tabular-nums">
              {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-white/50">Privacy</span>
            <span className="flex items-center gap-1.5 text-xs text-violet-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Shielded via Cloak
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors"
          >
            Send payroll
          </button>
        </div>
      </div>
    </div>
  );
}
