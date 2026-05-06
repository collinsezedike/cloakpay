import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SolanaWalletProvider } from "@/context/WalletProvider";
import App from "@/App";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<SolanaWalletProvider>
			<App />
		</SolanaWalletProvider>
	</StrictMode>,
);
