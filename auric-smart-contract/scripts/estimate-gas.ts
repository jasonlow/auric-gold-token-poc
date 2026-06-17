import { ethers } from "hardhat";
import { deployAuric } from "./deploy";

/** Deploys locally to measure exact deployment gas, then prices it at Amoy gwei. */
async function main() {
  const c = await deployAuric();
  const parts: [string, any][] = [
    ["IdentityRegistry", c.identityRegistry],
    ["ComplianceModule", c.compliance],
    ["TrustedIssuers", c.trustedIssuers],
    ["GoldToken", c.token],
    ["MockV3Aggregator", c.priceFeed],
  ];

  let total = 0n;
  for (const [name, inst] of parts) {
    const rec = await inst.deploymentTransaction().wait();
    console.log(`${name.padEnd(18)} ${rec.gasUsed.toString()} gas`);
    total += rec.gasUsed;
  }
  const wiring = 400_000n; // bindToken + addTrustedIssuer + 2x addAgent + setCountryAllowed
  total += wiring;
  console.log(`${"wiring/bootstrap".padEnd(18)} ~${wiring} gas`);
  console.log(`${"TOTAL".padEnd(18)} ~${total} gas`);

  for (const gwei of [32n, 40n]) {
    const cost = total * gwei * 10n ** 9n;
    console.log(`cost @ ${gwei} gwei  ~ ${ethers.formatEther(cost)} MATIC`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
