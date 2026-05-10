import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import { CsvUpload, PaymentSummaryBanner } from "@/components/CsvUpload";
import { PaymentTable } from "@/components/PaymentTable";
import { DispatchButton } from "@/components/DispatchButton";
import { ViewingKeysPanel } from "@/components/ViewingKeysPanel";
import { ConfirmModal } from "@/components/ConfirmModal";
import { VerifyPanel } from "@/components/VerifyPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { usePayroll } from "@/hooks/usePayroll";
import { totalUsdc } from "@/lib/csv";
import { parsePayStubParams } from "@/lib/paystub";
import type { PaymentRow } from "@/types";

type Tab = "dispatch" | "history" | "verify";

function detectInitialTab(): Tab {
  const params = new URLSearchParams(window.location.search);
  return params.get("verify") === "1" ? "verify" : "dispatch";
}

export default function App() {
  const { publicKey } = useWallet();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(detectInitialTab);
  const verifyParams = parsePayStubParams(window.location.search);

  const { dispatch, retryPayment, results, progress, dispatching, balanceError, reset } = usePayroll();

  const isComplete = results.length > 0 && !dispatching;
  const hasResults = results.length > 0;

  const handleParsed = (parsed: PaymentRow[]) => {
    setRows(parsed);
    reset();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "dispatch", label: "Dispatch" },
    { id: "history", label: "History" },
    { id: "verify", label: "Verify" },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white">
      <header className="border-b border-white/[0.06] bg-[#0d0d12]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">CloakPay</span>
            <span className="hidden sm:block text-xs text-white/30 border border-white/10 rounded px-1.5 py-0.5">
              Private Payroll
            </span>
          </div>
          <WalletButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        {/* Hero */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span className="text-xs text-violet-300">Powered by Cloak Protocol · Solana</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Private Payroll,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              on-chain.
            </span>
          </h1>
          <p className="text-white/50 text-sm max-w-xl leading-relaxed">
            Upload a CSV with recipient wallets and USDC amounts. CloakPay routes each payment
            through Cloak's shielded pool — amounts and recipients stay private. Generate
            compliance-ready viewing keys for every recipient.
          </p>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 w-fit">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === id
                  ? "bg-indigo-600 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Dispatch tab ─────────────────────────────────────────────── */}
        {activeTab === "dispatch" && (
          <>
            {!publicKey && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                    <svg className="h-7 w-7 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Connect your employer wallet</p>
                  <p className="text-xs text-white/40 mt-1">Phantom, Solflare, or Coinbase Wallet</p>
                </div>
                <div className="flex justify-center">
                  <WalletButton />
                </div>
              </div>
            )}

            {publicKey && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { step: "01", title: "Upload CSV", desc: "Wallet addresses + USDC amounts" },
                    { step: "02", title: "Dispatch", desc: "Cloak shields each payment privately" },
                    { step: "03", title: "Export Keys", desc: "Viewing keys for compliance proof" },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1">
                      <span className="text-xs font-mono text-indigo-400/60">{step}</span>
                      <p className="text-xs font-semibold text-white/90">{title}</p>
                      <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>

                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                  <h2 className="text-sm font-semibold text-white/90">Upload Payroll CSV</h2>
                  <CsvUpload onParsed={handleParsed} />
                </section>

                {rows.length > 0 && (
                  <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-white/90">Payment Preview</h2>
                      {isComplete && (
                        <button
                          onClick={() => { setRows([]); reset(); }}
                          className="text-xs text-white/30 hover:text-white/60 transition-colors"
                        >
                          New payroll
                        </button>
                      )}
                    </div>

                    <PaymentSummaryBanner rows={rows} />
                    <PaymentTable rows={rows} results={hasResults ? results : undefined} />

                    {balanceError && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 flex items-start gap-3">
                        <svg className="h-4 w-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <p className="text-xs pt-0.25 text-red-400">{balanceError}</p>
                      </div>
                    )}

                    {!isComplete && (
                      <DispatchButton
                        onClick={() => setConfirming(true)}
                        disabled={dispatching}
                        loading={dispatching}
                        total={totalUsdc(rows)}
                        count={rows.length}
                        progress={progress ?? undefined}
                      />
                    )}
                  </section>
                )}

                {isComplete && (
                  <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <ViewingKeysPanel
                      results={results}
                      onRetry={(index) => retryPayment(index, rows[index])}
                    />
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {/* ── History tab ───────────────────────────────────────────────── */}
        {activeTab === "history" && <HistoryPanel />}

        {/* ── Verify tab ────────────────────────────────────────────────── */}
        {activeTab === "verify" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <VerifyPanel initialParams={verifyParams} />
          </section>
        )}

        <footer className="border-t border-white/[0.06] pt-6 flex items-center justify-between text-xs text-white/25">
          <span>CloakPay · Private payroll on Solana</span>
          <span>Powered by Cloak Protocol</span>
        </footer>
      </main>

      <ConfirmModal
        open={confirming}
        count={rows.length}
        total={totalUsdc(rows)}
        onConfirm={() => { setConfirming(false); dispatch(rows); }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
