import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Sends MATIC from the DEPLOYER wallet to the MINTER address on Amoy.
 * Avoids the faucet's 24h cooldown when you just need to seed the minter.
 *
 * Run:  npm run fund-minter            (default 0.03 MATIC)
 *       npm run fund-minter -- 0.05    (custom amount)
 */
async function main() {
  const { AMOY_RPC_URL, DEPLOYER_PRIVATE_KEY, MINTER_ADDRESS } = process.env;
  if (!AMOY_RPC_URL || !DEPLOYER_PRIVATE_KEY || !MINTER_ADDRESS) {
    throw new Error("AMOY_RPC_URL, DEPLOYER_PRIVATE_KEY and MINTER_ADDRESS must be set in .env");
  }
  if (!ethers.isAddress(MINTER_ADDRESS)) throw new Error("MINTER_ADDRESS is not a valid address");

  const amount = process.argv[2] || "0.03";
  const provider = new ethers.JsonRpcProvider(AMOY_RPC_URL);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  const before = await provider.getBalance(deployer.address);
  const value = ethers.parseEther(amount);
  if (before <= value) throw new Error(`Deployer balance ${ethers.formatEther(before)} MATIC too low to send ${amount}`);

  console.log(`Sending ${amount} MATIC: ${deployer.address} → ${MINTER_ADDRESS} …`);
  const tx = await deployer.sendTransaction({ to: MINTER_ADDRESS, value });
  console.log(`tx: ${tx.hash}  (https://amoy.polygonscan.com/tx/${tx.hash})`);
  await tx.wait();

  const minterBal = await provider.getBalance(MINTER_ADDRESS);
  const deployerBal = await provider.getBalance(deployer.address);
  console.log(`✅ Done. Minter: ${ethers.formatEther(minterBal)} MATIC | Deployer left: ${ethers.formatEther(deployerBal)} MATIC`);
}

main().catch((e) => { console.error(e.shortMessage || e.message); process.exitCode = 1; });
