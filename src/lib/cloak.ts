import {
  CLOAK_PROGRAM_ID,
  DEVNET_MOCK_USDC_MINT,
  TransactOptions,
  createUtxo,
  createZeroUtxo,
  fullWithdraw,
  generateUtxoKeypair,
  getNkFromUtxoPrivateKey,
  transact,
  type MerkleTree
} from "@cloak.dev/sdk-devnet";
export { type MerkleTree } from "@cloak.dev/sdk-devnet";
import { getAssociatedTokenAddressSync, getAccount, TokenAccountNotFoundError, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

const USDC_DECIMALS = 6;

function usdcToRaw(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

function rawToUsdc(raw: bigint): number {
  return Number(raw) / 10 ** USDC_DECIMALS;
}

/** Throws a human-readable error if the wallet has insufficient USDC. */
export async function assertUsdcBalance(
  connection: Connection,
  owner: PublicKey,
  requiredUsdc: number,
): Promise<void> {
  const ata = getAssociatedTokenAddressSync(DEVNET_MOCK_USDC_MINT, owner);
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

export interface SendPrivateUsdcResult {
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
): Promise<SendPrivateUsdcResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  const rawAmount = usdcToRaw(amount);
  const recipient = new PublicKey(recipientAddress);
  const senderUtxoKp = await generateUtxoKeypair();
  const senderNk = getNkFromUtxoPrivateKey(senderUtxoKp.privateKey);

  const transactOptions: TransactOptions = {
    connection,
    programId: CLOAK_PROGRAM_ID,
    chainNoteViewingKeyNk: senderNk,
    depositorPublicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    relayUrl: "/cloak-relay",
    riskQuoteUrl: "/risk-quote",
    enforceViewingKeyRegistration: false,
    ...(cachedMerkleTree ? { cachedMerkleTree } : {}),
  };

  const outputUtxo = await createUtxo(rawAmount, senderUtxoKp, DEVNET_MOCK_USDC_MINT);
  const zeroInput = await createZeroUtxo(DEVNET_MOCK_USDC_MINT);

  const deposited = await transact(
    {
      inputUtxos: [zeroInput],
      outputUtxos: [outputUtxo],
      externalAmount: rawAmount,
      depositor: wallet.publicKey,
    },
    transactOptions,
  );

  const recipientAta = getAssociatedTokenAddressSync(DEVNET_MOCK_USDC_MINT, recipient);
  try {
    await getAccount(connection, recipientAta);
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) {
      const instructions = [
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          recipientAta,
          recipient,
          DEVNET_MOCK_USDC_MINT,
        ),
      ];
      const { blockhash } = await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();
      const createAtaTx = new VersionedTransaction(messageV0);
      const ataSig = await wallet.sendTransaction(createAtaTx, connection);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature: ataSig,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );
    }
  }

  const withdrawn = await fullWithdraw(deposited.outputUtxos, recipient, {
    ...transactOptions,
    cachedMerkleTree: deposited.merkleTree,
  });

  const viewingKeyBytes = getNkFromUtxoPrivateKey(senderUtxoKp.privateKey);
  const viewingKey = Buffer.from(viewingKeyBytes).toString("hex");

  return { txSignature: withdrawn.signature, viewingKey, merkleTree: withdrawn.merkleTree };
}
