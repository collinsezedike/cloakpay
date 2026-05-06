import {
  CLOAK_PROGRAM_ID,
  createUtxo,
  createZeroUtxo,
  fullWithdraw,
  generateUtxoKeypair,
  getNkFromUtxoPrivateKey,
  transact,
  type MerkleTree,
} from "@cloak.dev/sdk";
import { getAssociatedTokenAddressSync, getAccount, TokenAccountNotFoundError } from "@solana/spl-token";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const USDC_DECIMALS = 6;

export function usdcToRaw(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

export function rawToUsdc(raw: bigint): number {
  return Number(raw) / 10 ** USDC_DECIMALS;
}

/** Throws a human-readable error if the wallet has insufficient USDC. */
export async function assertUsdcBalance(
  connection: Connection,
  owner: PublicKey,
  requiredUsdc: number,
): Promise<void> {
  const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
  try {
    const account = await getAccount(connection, ata);
    const balance = rawToUsdc(account.amount);
    if (balance < requiredUsdc) {
      throw new Error(
        `Insufficient USDC: wallet has ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} but payroll requires ${requiredUsdc.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      );
    }
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) {
      throw new Error("Wallet has no USDC token account. Fund it with USDC before dispatching.");
    }
    throw e;
  }
}

export interface SendPrivateResult {
  txSignature: string;
  viewingKey: string;
  merkleTree: MerkleTree | undefined;
}

/**
 * Privately send `amount` USDC to `recipientAddress` via Cloak's shielded UTXO pool.
 * Pass `cachedMerkleTree` from the previous call to skip relay round-trips in batch sends.
 */
export async function sendPrivateUsdc(
  connection: Connection,
  wallet: WalletContextState,
  recipientAddress: string,
  amount: number,
  cachedMerkleTree?: MerkleTree,
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
    ...(cachedMerkleTree ? { cachedMerkleTree } : {}),
  };

  const outputUtxo = await createUtxo(rawAmount, ownerKeypair, USDC_MINT);
  const zeroInput = await createZeroUtxo(USDC_MINT);

  const deposited = await transact(
    {
      inputUtxos: [zeroInput],
      outputUtxos: [outputUtxo],
      externalAmount: rawAmount,
      depositor: depositorAta,
    },
    baseOptions,
  );

  const withdrawn = await fullWithdraw(deposited.outputUtxos, recipient, {
    ...baseOptions,
    cachedMerkleTree: deposited.merkleTree,
  });

  const viewingKeyBytes = getNkFromUtxoPrivateKey(ownerKeypair.privateKey);
  const viewingKey = Buffer.from(viewingKeyBytes).toString("hex");

  return { txSignature: withdrawn.signature, viewingKey, merkleTree: withdrawn.merkleTree };
}
