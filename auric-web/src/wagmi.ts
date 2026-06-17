import { http, createConfig } from "wagmi";
import { polygonAmoy, hardhat } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/**
 * wagmi configuration (WALLET-01).
 * - Target chain: Polygon Amoy testnet (chainId 80002).
 * - `hardhat` (31337) is included so the portal can also run against the local
 *   Hardhat deployment during development.
 * - MetaMask / injected connector.
 */
const amoyRpc = import.meta.env.VITE_RPC_URL || "https://rpc-amoy.polygon.technology";

export const config = createConfig({
  chains: [polygonAmoy, hardhat],
  connectors: [injected()],
  transports: {
    [polygonAmoy.id]: http(amoyRpc),
    [hardhat.id]: http("http://localhost:8545"),
  },
});

type AppChainId = (typeof config.chains)[number]["id"];

/** The chain the app expects users to be on (override via VITE_CHAIN_ID). */
export const TARGET_CHAIN_ID: AppChainId =
  Number(import.meta.env.VITE_CHAIN_ID ?? polygonAmoy.id) === hardhat.id ? hardhat.id : polygonAmoy.id;

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
