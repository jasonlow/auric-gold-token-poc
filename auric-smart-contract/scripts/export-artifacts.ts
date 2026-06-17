import { artifacts } from "hardhat";
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Exports contract ABIs (network-independent) + any recorded deployment addresses
 * to `exports/`, the shared source consumed by auric-api (Web3j) and auric-web (viem).
 * Run: npm run export
 */
const CONTRACTS = ["GoldToken", "IdentityRegistry", "ComplianceModule", "TrustedIssuers", "MockV3Aggregator"];

async function main() {
  const root = join(__dirname, "..");
  const abiDir = join(root, "exports", "abis");
  mkdirSync(abiDir, { recursive: true });

  for (const name of CONTRACTS) {
    const art = await artifacts.readArtifact(name);
    writeFileSync(join(abiDir, `${name}.json`), JSON.stringify(art.abi, null, 2));
    console.log(`ABI  → exports/abis/${name}.json`);
  }

  // Merge deployments/<network>.json into a single exports/deployments.json
  const depDir = join(root, "deployments");
  const deployments: Record<string, unknown> = {};
  if (existsSync(depDir)) {
    for (const f of readdirSync(depDir).filter((f) => f.endsWith(".json"))) {
      deployments[f.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(depDir, f), "utf8"));
    }
  }
  writeFileSync(join(root, "exports", "deployments.json"), JSON.stringify(deployments, null, 2));
  const nets = Object.keys(deployments);
  console.log(`Addr → exports/deployments.json (${nets.length ? nets.join(", ") : "no deployments yet"})`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
