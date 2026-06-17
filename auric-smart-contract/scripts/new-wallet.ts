import { ethers } from "ethers";

/**
 * Generates a fresh TEST keypair for Polygon Amoy (INFRA-04).
 * Run:  npm run new-wallet
 *
 * ⚠ TEST / TESTNET ONLY. Never use a generated key for real funds or mainnet.
 * Put the printed key into the relevant .env (DEPLOYER_PRIVATE_KEY and/or
 * MINTER_PRIVATE_KEY), then fund the address from the Amoy faucet.
 */
const wallet = ethers.Wallet.createRandom();

console.log("──────────────────────────────────────────────");
console.log("  New Amoy TEST wallet (do NOT use for real funds)");
console.log("──────────────────────────────────────────────");
console.log("Address:     ", wallet.address);
console.log("PrivateKey:  ", wallet.privateKey);
console.log("Mnemonic:    ", wallet.mnemonic?.phrase);
console.log("──────────────────────────────────────────────");
console.log("Next: fund this address with Amoy test MATIC, then set it in .env.");
