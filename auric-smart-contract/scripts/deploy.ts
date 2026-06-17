import { ethers, network } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Initial mock price: XAU/USD per troy ounce, 8 decimals (matches Chainlink).
export const PRICE_FEED_DECIMALS = 8;
export const INITIAL_XAU_USD = "2400"; // USD per troy ounce

/**
 * Deploys and wires the Auric ERC-3643 suite + the XAU/USD mock price feed.
 * Reusable across local and Amoy.
 * - owner    : admin/owner of all contracts (defaults to the first signer)
 * - minter   : address registered as the TrustedIssuer / minter
 *              (defaults to MINTER_ADDRESS env, else the deployer)
 */
export async function deployAuric(ownerAddr?: string, minterAddr?: string) {
  const [deployer] = await ethers.getSigners();
  const owner = ownerAddr ?? deployer.address;
  const minter = minterAddr ?? process.env.MINTER_ADDRESS ?? deployer.address;

  const identityRegistry = await (await ethers.getContractFactory("IdentityRegistry")).deploy(owner);
  await identityRegistry.waitForDeployment();

  const compliance = await (await ethers.getContractFactory("ComplianceModule")).deploy(
    owner,
    await identityRegistry.getAddress()
  );
  await compliance.waitForDeployment();

  const trustedIssuers = await (await ethers.getContractFactory("TrustedIssuers")).deploy(owner);
  await trustedIssuers.waitForDeployment();

  const token = await (await ethers.getContractFactory("GoldToken")).deploy(
    owner,
    await identityRegistry.getAddress(),
    await compliance.getAddress(),
    await trustedIssuers.getAddress()
  );
  await token.waitForDeployment();

  const priceFeed = await (await ethers.getContractFactory("MockV3Aggregator")).deploy(
    PRICE_FEED_DECIMALS,
    ethers.parseUnits(INITIAL_XAU_USD, PRICE_FEED_DECIMALS),
    "XAU / USD"
  );
  await priceFeed.waitForDeployment();

  // Wiring (requires the caller to be `owner`; true for local + Amoy deploys).
  await (await compliance.bindToken(await token.getAddress())).wait();
  await (await trustedIssuers.addTrustedIssuer(minter)).wait();

  return { identityRegistry, compliance, trustedIssuers, token, priceFeed, owner, minter };
}

async function main() {
  // On a local node use Hardhat account #1 as the minter (funded + known key,
  // matches the engine's application-local.yml). On other networks, env/default.
  const isLocal = network.name === "localhost" || network.name === "hardhat";
  const localMinter = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // hardhat acct #1
  const minter = isLocal ? localMinter : process.env.MINTER_ADDRESS;

  const c = await deployAuric(undefined, minter);

  // Bootstrap so the engine (minter) can operate: agent on registry + token, allow SG.
  await (await c.identityRegistry.addAgent(c.minter)).wait();
  await (await c.token.addAgent(c.minter)).wait();
  await (await c.compliance.setCountryAllowed(702, true)).wait();

  const contracts = {
    identityRegistry: await c.identityRegistry.getAddress(),
    complianceModule: await c.compliance.getAddress(),
    trustedIssuers: await c.trustedIssuers.getAddress(),
    goldToken: await c.token.getAddress(),
    priceFeed: await c.priceFeed.getAddress(),
  };
  const dir = join(__dirname, "..", "deployments");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${network.name}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      { network: network.name, deployedAt: new Date().toISOString(), owner: c.owner, minter: c.minter, contracts },
      null,
      2
    )
  );
  console.log(`Network: ${network.name}`);
  console.table(contracts);
  console.log(`Owner: ${c.owner} | Minter (trusted issuer): ${c.minter}`);
  console.log(`Saved → ${file}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
