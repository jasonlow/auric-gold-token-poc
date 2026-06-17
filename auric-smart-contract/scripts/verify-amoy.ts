import { ethers, run } from "hardhat";
import { readFileSync } from "fs";
import { join } from "path";
import { PRICE_FEED_DECIMALS, INITIAL_XAU_USD } from "./deploy";

/**
 * Verifies the already-deployed Amoy contracts on PolygonScan (no redeploy).
 * Reads deployments/amoy.json. Needs an Etherscan V2 API key in .env
 * (POLYGONSCAN_API_KEY). Run: npm run verify:amoy
 */
async function verify(address: string, constructorArguments: unknown[]) {
  try {
    await run("verify:verify", { address, constructorArguments });
    console.log(`  ✅ ${address}`);
  } catch (e: any) {
    const msg = (e.message || String(e)).split("\n")[0];
    console.log(/already verified/i.test(msg) ? `  ✅ already verified ${address}` : `  ⚠ ${address}: ${msg}`);
  }
}

async function main() {
  const rec = JSON.parse(readFileSync(join(__dirname, "..", "deployments", "amoy.json"), "utf8"));
  const c = rec.contracts;
  const deployer = rec.deployer;
  const initialAnswer = ethers.parseUnits(INITIAL_XAU_USD, PRICE_FEED_DECIMALS);

  await verify(c.identityRegistry, [deployer]);
  await verify(c.complianceModule, [deployer, c.identityRegistry]);
  await verify(c.trustedIssuers, [deployer]);
  await verify(c.goldToken, [deployer, c.identityRegistry, c.complianceModule, c.trustedIssuers]);
  await verify(c.priceFeed, [PRICE_FEED_DECIMALS, initialAnswer, "XAU / USD"]);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
