import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { CLOAK_PROGRAM_ID } from "@cloak.dev/sdk-devnet";
import { parsePayStubParams, type PayStubParams } from "@/lib/paystub";

type VerifyStatus = "idle" | "loading" | "verified" | "unverified" | "invalid";

interface Props {
  initialParams?: PayStubParams | null;
}

function truncate(s: string, n = 8) {
  return `${s.slice(0, n)}…${s.slice(-n)}`;
}

function formatBlockTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VerifyPanel({ initialParams }: Props) {
  const { connection } = useConnection();

  const [params, setParams] = useState<PayStubParams | null>(initialParams ?? null);
  const [status, setStatus] = useState<VerifyStatus>(initialParams ? "loading" : "idle");
  const [blockTime, setBlockTime] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const verify = useCallback(
    async (p: PayStubParams) => {
      setStatus("loading");
      setBlockTime(null);
      try {
        const tx = await connection.getTransaction(p.tx, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });

        if (!tx) {
          setStatus("unverified");
          return;
        }

        if (tx.meta?.err !== null) {
          setStatus("unverified");
          return;
        }

        setBlockTime(tx.blockTime ?? null);

        const staticKeys = tx.transaction.message.staticAccountKeys.map((k) =>
          k.toBase58(),
        );
        const writableAlt =
          tx.meta?.loadedAddresses?.writable?.map((k) => k.toBase58()) ?? [];
        const readonlyAlt =
          tx.meta?.loadedAddresses?.readonly?.map((k) => k.toBase58()) ?? [];
        const allKeys = [...staticKeys, ...writableAlt, ...readonlyAlt];

        setStatus(
          allKeys.includes(CLOAK_PROGRAM_ID.toBase58()) ? "verified" : "unverified",
        );
      } catch {
        setStatus("unverified");
      }
    },
    [connection],
  );

  useEffect(() => {
    if (params && status === "loading") {
      verify(params);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleVerify() {
    const search = urlInput.includes("?")
      ? "?" + urlInput.split("?").slice(1).join("?")
      : urlInput;
    const parsed = parsePayStubParams(search);
    if (!parsed) {
      setStatus("invalid");
      return;
    }
    setParams(parsed);
    verify(parsed);
  }

  // ── Idle: manual URL entry ───────────────────────────────────────────────
  if (status === "idle") {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <div>
          <h2 className="text-sm font-semibold text-white/90">Verify a Payment</h2>
          <p className="text-xs text-white/40 mt-1 leading-relaxed">
            Paste a pay stub link shared by the payment issuer to verify the
            transfer on-chain and view the receipt.
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://cloakpay.app/?verify=1&tx=…"
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-mono text-white/70 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 resize-none"
          />
          <button
            onClick={handleVerify}
            disabled={!urlInput.trim()}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Verify Payment
          </button>
        </div>

        <div className="rounded-lg bg-violet-500/5 border border-violet-500/15 p-3 flex gap-3">
          <svg className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <p className="text-xs text-violet-300/80 leading-relaxed">
            The viewing key in the link is a cryptographic credential issued by
            the payer. Holding it proves the payment was designated for you
            without revealing any other transaction.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
        <p className="text-sm text-white/40">Verifying on-chain…</p>
      </div>
    );
  }

  // ── Invalid URL ──────────────────────────────────────────────────────────
  if (status === "invalid") {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-white">Invalid Pay Stub Link</p>
          <p className="text-xs text-white/40 leading-relaxed">
            The link appears to be malformed or missing required fields.
            Make sure you copied the full URL.
          </p>
        </div>
        <button
          onClick={() => { setStatus("idle"); setUrlInput(""); }}
          className="w-full py-2 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/20 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Verified / Unverified ────────────────────────────────────────────────
  const isVerified = status === "verified";

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Status banner */}
      <div className={`rounded-2xl border p-8 space-y-6 ${
        isVerified
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/20 bg-red-500/5"
      }`}>
        {/* Icon + status */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${
            isVerified
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-red-500/10 border-red-500/20"
          }`}>
            {isVerified ? (
              <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <p className={`text-sm font-semibold ${isVerified ? "text-emerald-400" : "text-red-400"}`}>
              {isVerified ? "Payment Verified" : "Could Not Verify"}
            </p>
            {!isVerified && (
              <p className="text-xs text-white/40 mt-1 max-w-xs">
                Transaction not found or not a Cloak Protocol transaction. The link may be incorrect or the transaction is still propagating.
              </p>
            )}
          </div>
        </div>

        {/* Amount — prominent */}
        {params && (
          <div className="text-center">
            <p className="text-4xl font-bold tabular-nums text-white">
              {params.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-white/40 mt-1">USDC</p>
          </div>
        )}

        {/* Details grid */}
        {params && (
          <div className="rounded-xl border border-white/10 bg-black/20 divide-y divide-white/5">
            {/* Recipient */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-white/40">Recipient</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-white/80">{truncate(params.to, 6)}</span>
                <button
                  onClick={() => copy(params.to, "recipient")}
                  className="text-white/30 hover:text-white/60 transition-colors"
                  title="Copy address"
                >
                  {copiedField === "recipient" ? (
                    <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-white/40">Date</span>
              <span className="text-xs text-white/80">
                {blockTime ? formatBlockTime(blockTime) : "—"}
              </span>
            </div>

            {/* Network */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-white/40">Network</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-white/80">Solana Devnet</span>
              </div>
            </div>

            {/* Transaction */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-white/40">Transaction</span>
              <a
                href={`https://solscan.io/tx/${params.tx}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {truncate(params.tx, 6)}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* Viewing key */}
        {params && (
          <div className="space-y-2">
            <p className="text-xs text-white/40">Viewing Key</p>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2.5">
              <span className="font-mono text-xs text-emerald-400/80 truncate">
                {params.nk}
              </span>
              <button
                onClick={() => copy(params.nk, "nk")}
                className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
                title="Copy viewing key"
              >
                {copiedField === "nk" ? (
                  <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-white/25 leading-relaxed">
              This key cryptographically proves access to this payment record.
              The transfer was routed through Cloak Protocol's shielded pool —
              the sender's identity and other payments remain private.
            </p>
          </div>
        )}
      </div>

      {/* Try another */}
      <button
        onClick={() => { setStatus("idle"); setParams(null); setUrlInput(""); }}
        className="w-full py-2 rounded-xl border border-white/10 text-xs text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
      >
        Verify another payment
      </button>
    </div>
  );
}
