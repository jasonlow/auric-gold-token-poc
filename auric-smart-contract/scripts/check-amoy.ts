import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Validates auric-smart-contract/.env for Amoy: RPC reachability, key/address
 * formats, and wallet funding. Secrets are masked in output.
 * Run: npm run check-amoy
 */
const mask = (s?: string) =>
  !s ? "(empty)" : s.length <= 12 ? "***" : `${s.slice(0, 6)}…${s.slice(-4)} [${s.length} chars]`;

let problems = 0;
const fail = (m: string) => { problems++; console.log(`  ❌ ${m}`); };
const ok = (m: string) => console.log(`  ✅ ${m}`);

async function main() {
  const { AMOY_RPC_URL, DEPLOYER_PRIVATE_KEY, MINTER_ADDRESS, POLYGONSCAN_API_KEY } = process.env;

  console.log("\n── RPC ──");
  let provider: ethers.JsonRpcProvider | undefined;
  if (!AMOY_RPC_URL) {
    fail("AMOY_RPC_URL is not set");
  } else if (!/^https?:\/\//.test(AMOY_RPC_URL)) {
    fail(`AMOY_RPC_URL doesn't look like a URL: ${mask(AMOY_RPC_URL)}`);
  } else {
    try {
      provider = new ethers.JsonRpcProvider(AMOY_RPC_URL);
      const net = await provider.getNetwork();
      if (net.chainId === 80002n) ok(`RPC reachable, chainId 80002 (Amoy) — host ${new URL(AMOY_RPC_URL).host}`);
      else fail(`RPC reachable but chainId is ${net.chainId}, expected 80002 (Amoy)`);
    } catch (e: any) {
      fail(`Could not reach RPC: ${e.shortMessage || e.message}`);
    }
  }

  console.log("\n── Deployer ──");
  let deployer: ethers.Wallet | undefined;
  if (!DEPLOYER_PRIVATE_KEY) {
    fail("DEPLOYER_PRIVATE_KEY is not set");
  } else {
    try {
      deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY);
      ok(`Valid key → address ${deployer.address}`);
      if (provider) {
        const bal = await provider.getBalance(deployer.address);
        bal > 0n ? ok(`Funded: ${ethers.formatEther(bal)} MATIC`)
                 : fail("Balance is 0 — fund this address from the Amoy faucet");
      }
    } catch {
      fail(`DEPLOYER_PRIVATE_KEY is not a valid private key (${mask(DEPLOYER_PRIVATE_KEY)})`);
    }
  }

  console.log("\n── Minter ──");
  if (!MINTER_ADDRESS) {
    fail("MINTER_ADDRESS is not set");
  } else if (ethers.isAddress(MINTER_ADDRESS)) {
    ok(`Valid address ${MINTER_ADDRESS}`);
    if (provider) {
      const bal = await provider.getBalance(MINTER_ADDRESS);
      bal > 0n ? ok(`Funded: ${ethers.formatEther(bal)} MATIC`)
               : console.log("  ⚠ Balance is 0 — fund it before minting (not needed just to deploy)");
    }
  } else {
    // Common mistake: a private key was pasted here.
    try {
      const w = new ethers.Wallet(MINTER_ADDRESS);
      fail(`MINTER_ADDRESS is NOT an address — it looks like a private key. Its address is ${w.address}. ` +
           `Put that 0x…(42-char) address in MINTER_ADDRESS, and keep the private key only in auric-api as MINTER_PRIVATE_KEY.`);
    } catch {
      fail(`MINTER_ADDRESS is not a valid address (${mask(MINTER_ADDRESS)})`);
    }
  }

  console.log("\n── Verify key ──");
  POLYGONSCAN_API_KEY ? ok(`POLYGONSCAN_API_KEY set ${mask(POLYGONSCAN_API_KEY)}`)
                      : console.log("  ⚠ POLYGONSCAN_API_KEY not set (only needed for contract verification)");

  console.log(`\n${problems === 0 ? "✅ All good." : `❌ ${problems} issue(s) to fix.`}\n`);
  process.exitCode = problems === 0 ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
