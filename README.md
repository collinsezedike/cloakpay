# CloakPay

Private payroll on Solana. Upload a CSV, dispatch USDC to any number of recipients through [Cloak's](https://cloak.ag) shielded pool, and export a viewing key per recipient for compliance.

## How it works

1. **Connect** your employer wallet (Phantom, Solflare, Coinbase Wallet)
2. **Upload** a CSV with recipient wallet addresses and USDC amounts
3. **Dispatch** — CloakPay checks your balance, asks for confirmation, then sends each payment through Cloak's UTXO shielded pool. Amounts and recipient addresses are hidden from public explorers.
4. **Export** viewing keys — one per recipient. Each key lets the holder cryptographically prove they received a specific payment without revealing anything else.

## Privacy model

Each payment follows a deposit → shield → withdraw flow:

- A fresh ephemeral keypair is generated per payment (notes are unlinkable across recipients)
- Funds enter the Cloak shield pool via a ZK-proven deposit
- The relay submits a private withdrawal to the recipient's wallet
- The viewing key (`nk`) is derived from the note's private key — share it with auditors or recipients for compliance without exposing other payments

## CSV format

```csv
address,amount
7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHkz,100.00
9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM,250.50
```

Column names are flexible — `address`/`wallet`/`recipient` and `amount`/`usdc`/`usd` are all accepted. Download a sample from inside the app.

## Setup

```bash
pnpm install

cp .env.local.example .env.local
# Add your mainnet RPC URL — the public endpoint is rate-limited
# VITE_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

pnpm dev
```

> **Mainnet only.** The Cloak shield pool is not deployed on devnet.

## Stack

- [Vite](https://vitejs.dev) + React 19 + TypeScript
- [@cloak.dev/sdk](https://docs.cloak.ag) — ZK shielded transfers
- [@solana/wallet-adapter](https://github.com/anza-xyz/wallet-adapter) — wallet connection
- [Tailwind CSS v4](https://tailwindcss.com)
