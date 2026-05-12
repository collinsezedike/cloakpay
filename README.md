# CloakPay

**Private payroll on Solana.** Upload a CSV of recipients and amounts, dispatch USDC through Cloak's shielded pool in one click, and export a cryptographic viewing key per recipient for compliance — without leaking who was paid or how much to the public ledger.

---

## The problem with on-chain payroll

Every USDC transfer on Solana is publicly visible. Anyone who knows your employer wallet can see the full payroll — which staff you have, how much each person earns, and when they get paid. For businesses, that's a liability. For employees, it's a privacy violation.

Existing "privacy" workarounds (mixing, OTC desks, CEX withdrawals) break the compliance chain. There's no audit trail, no receipts, and no way to prove a specific payment was made without revealing everything else.

## How CloakPay solves it

CloakPay routes each payment through [Cloak Protocol's](https://cloak.ag) UTXO shielded pool. Amounts and recipient addresses are hidden from public explorers. After dispatch, the employer holds a **viewing key** per payment — a minimal cryptographic credential that proves a specific transfer occurred without exposing any other payment.

```text
Employer wallet
      │
      ▼
  CloakPay
      │
      ├── generates ephemeral UTXO keypair (per payment, unlinkable)
      │
      ├── ZK deposit → Cloak shielded pool
      │
      └── private withdrawal → recipient wallet
                │
                └── viewing key → employer / recipient / auditor
```

The employer's wallet address never appears on-chain as a direct sender of the final transfer. Each payment is processed as an independent shielded note — even a full history of all payments reveals nothing about the others.

---

## Compliance without transparency

Each viewing key (`nk`) is derived from the note's private key. It lets any holder verify:

- **Who** received the payment (recipient address)
- **How much** was transferred (exact USDC amount)
- **When** it settled (on-chain timestamp via tx signature)

…without revealing any other payment, the employer's identity, or the total payroll.

Hand a viewing key to a recipient as their pay stub. Hand it to an auditor to satisfy a compliance request. Hand it to your accountant to reconcile the books. The key proves exactly what it needs to and nothing more.

CloakPay exports all keys as JSON or CSV in one click — ready to attach to an audit response or email to recipients.

---

## Demo (devnet)

> Running on Solana devnet with mock USDC. No real funds required.

**Live:** [usecloakpay.vercel.app](https://usecloakpay.vercel.app)

**Try it locally:**

```bash
git clone https://github.com/collinsezedike/cloakpay.git
cd cloakpay
pnpm install

cp .env.local.example .env.local
# Add a free Helius devnet key at https://helius.dev → New Project → Devnet
# VITE_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

pnpm dev
```

Then:

1. Connect Phantom (switch to **devnet** in wallet settings)
2. Airdrop devnet SOL: `solana airdrop 2 <YOUR_ADDRESS> --url devnet`
3. Mint mock USDC from [spl-token-faucet.com](https://spl-token-faucet.com/?token-name=USDC-Dev)
4. Upload the sample CSV from the app, confirm, dispatch

Each payment requires **3 wallet signatures**: ALT account creation, shielded deposit, and private withdrawal — that's the Cloak protocol's ZK proof flow, not a bug.

---

## CSV format

```csv
address,amount
7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHkz,100.00
9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM,250.50
```

Column names are flexible: `address` / `wallet` / `recipient` and `amount` / `usdc` / `usd` are all accepted. A sample CSV is downloadable from inside the app.

---

## Under the hood

### Cloak SDK integration

- `generateUtxoKeypair()` — fresh ephemeral note keypair per payment, ensuring unlinkability across recipients
- `createZeroUtxo` + `transact` — deposit path: a zero-value input note bootstraps the shielded deposit with the sender's USDC
- `fullWithdraw` — withdrawal path: the relay privately delivers funds to the recipient
- `getNkFromUtxoPrivateKey` — derives the viewing key (`nk`) from the note's private key for export
- Merkle tree result from each `transact` / `fullWithdraw` is passed as `cachedMerkleTree` into the next payment, avoiding relay round-trips on batch sends
- `enforceViewingKeyRegistration: false` — allows dispatch without prior viewing key registration on devnet

### Transaction size constraint (solved)

Solana's hard 1232-byte transaction limit made the Switchboard oracle instruction (207 bytes) incompatible with Cloak's ZK proof instruction. CloakPay instead uses Cloak's relay `/range-quote` endpoint via a server-side Vite middleware proxy, which returns a compact ~145-byte Ed25519 Range.org sanctions-check instruction — leaving enough room for the ZK proof.

### Relay reliability

The devnet relay occasionally drops TCP connections. A Vite middleware layer proxies `/risk-quote` with 3 retries, a 20-second `AbortController` timeout per attempt, and exponential backoff — keeping batch payrolls resilient without user intervention.

---

## Stack

| Layer    | Technology                                            |
| -------- | ----------------------------------------------------- |
| Frontend | Vite 6 + React 19 + TypeScript                        |
| Privacy  | [@cloak.dev/sdk-devnet](https://docs.cloak.ag)        |
| Wallet   | @solana/wallet-adapter (Phantom, Solflare, Coinbase)  |
| RPC      | Helius (CORS-enabled, no socket hang-ups)             |
| Styling  | Tailwind CSS v4                                       |

---

Built for the [Superteam Frontier](https://superteam.fun) hackathon · Cloak Protocol track
