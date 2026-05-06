
import {
  CLOAK_PROGRAM_ID,
  createUtxo,
  createZeroUtxo,
  fullWithdraw,
  generateUtxoKeypair,
  getNkFromUtxoPrivateKey,
  transact,
} from "@cloak.dev/sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const USDC_DECIMALS = 6;

export function usdcToRaw(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

export interface SendPrivateResult {
  txSignature: string;
  viewingKey: string;
}

/**
 * Privately send `amount` USDC to `recipientAddress` via Cloak's shielded UTXO pool.
 *
 * Flow:
 *   1. Generate ephemeral UTXO keypair (note owner — unlinkable per payment)
 *   2. Deposit USDC into the Cloak shield pool (signed by employer wallet)
 *   3. Immediately withdraw to recipient's wallet
 *   4. Derive viewing key from UTXO private key for compliance
 */
export async function sendPrivateUsdc(
  connection: Connection,
  wallet: WalletContextState,
  recipientAddress: string,
  amount: number,
): Promise<SendPrivateResult> {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signMessage) {
    throw new Error("Wallet not connected or does not support signMessage");
  }

  const rawAmount = usdcToRaw(amount);
  const recipient = new PublicKey(recipientAddress);

  const ownerKeypair = await generateUtxoKeypair();

  const depositorAta = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);

  const signTx = wallet.signTransaction as <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;

  const baseOptions = {
    connection,
    programId: CLOAK_PROGRAM_ID,
    depositorPublicKey: wallet.publicKey,
    signTransaction: signTx,
    signMessage: wallet.signMessage,
  };

  const outputUtxo = await createUtxo(rawAmount, ownerKeypair, USDC_MINT);
  const zeroInput = await createZeroUtxo(USDC_MINT);

  // Deposit: move USDC from employer ATA into the Cloak pool
  const deposited = await transact(
    {
      inputUtxos: [zeroInput],
      outputUtxos: [outputUtxo],
      externalAmount: rawAmount,
      depositor: depositorAta,
    },
    baseOptions,
  );

  // Withdraw: privately release funds to recipient wallet
  const withdrawn = await fullWithdraw(deposited.outputUtxos, recipient, baseOptions);

  // Derive viewing key — enables the recipient to prove receipt for compliance
  const viewingKeyBytes = getNkFromUtxoPrivateKey(ownerKeypair.privateKey);
  const viewingKey = Buffer.from(viewingKeyBytes).toString("hex");

  return { txSignature: withdrawn.signature, viewingKey };
}
