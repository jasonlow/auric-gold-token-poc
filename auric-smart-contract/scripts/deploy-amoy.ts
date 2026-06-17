import { ethers, run, network } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { deployAuric, PRICE_FEED_DECIMALS, INITIAL_XAU_USD } from "./deploy";

const SG = 702; // Singapore (ISO 3166-1 numeric)

async function verify(address: string, constructorArguments: any[]) {
  try {
    await run("verify:verify", { address, constructorArguments });
    console.log(`  ✅ verified ${address}`);
  } catch (e: any) {
    const msg = (e.message || String(e)).split("\n")[0];
    if (/already verified/i.test(msg)) console.log(`  ✅ already verified ${address}`);
    else console.log(`  ⚠ verify skipped for ${address}: ${msg}`);
  }
}

async function main() {
  if (network.name !== "amoy") throw new Error(`Run with --network amoy (got "${network.name}")`);
  const [deployer] = await ethers.getSigners();
  const minter = process.env.MINTER_ADDRESS;
  if (!minter || !ethers.isAddress(minter)) throw new Error("MINTER_ADDRESS missing/invalid in .env");

  console.log(`Deploying Auric suite to Amoy as ${deployer.address} …`);
  const c = await deployAuric(deployer.address, minter);

  // Bootstrap so the Token Engine (minter) can operate from day one.
  console.log("Bootstrapping roles + compliance …");
  await (await c.identityRegistry.addAgent(minter)).wait(); // register identities
  await (await c.token.addAgent(minter)).wait(); // freeze / forced transfer
  await (await c.compliance.setCountryAllowed(SG, true)).wait(); // allow Singapore

  const contracts = {
    identityRegistry: await c.identityRegistry.getAddress(),
    complianceModule: await c.compliance.getAddress(),
    trustedIssuers: await c.trustedIssuers.getAddress(),
    goldToken: await c.token.getAddress(),
    priceFeed: await c.priceFeed.getAddress(),
  };

  const record = {
    network: "amoy",
    chainId: 80002,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    minter,
    contracts,
  };

  mkdirSync(join(__dirname, "..", "deployments"), { recursive: true });
  const file = join(__dirname, "..", "deployments", "amoy.json");
  writeFileSync(file, JSON.stringify(record, null, 2));
  console.log("\nDeployed:");
  console.table(contracts);
  console.log(`Saved → ${file}`);

  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("\nVerifying on PolygonScan (Amoy) — may take a moment …");
    const initialAnswer = ethers.parseUnits(INITIAL_XAU_USD, PRICE_FEED_DECIMALS);
    await verify(contracts.identityRegistry, [deployer.address]);
    await verify(contracts.complianceModule, [deployer.address, contracts.identityRegistry]);
    await verify(contracts.trustedIssuers, [deployer.address]);
    await verify(contracts.goldToken, [
      deployer.address,
      contracts.identityRegistry,
      contracts.complianceModule,
      contracts.trustedIssuers,
    ]);
    await verify(contracts.priceFeed, [PRICE_FEED_DECIMALS, initialAnswer, "XAU / USD"]);
  } else {
    console.log("\n(Skipping verification — POLYGONSCAN_API_KEY not set.)");
  }

  console.log(
    "\nNext: copy these addresses into .env (PRICE_FEED_ADDRESS, GOLD_TOKEN_ADDRESS, …); CONTRACT-07 exports ABIs+addresses for the apps."
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
