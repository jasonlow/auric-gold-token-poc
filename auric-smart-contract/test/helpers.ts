import { ethers } from "hardhat";
import { deployAuric } from "../scripts/deploy";

export const SG = 702; // Singapore — ISO 3166-1 numeric
export const US = 840; // United States — used as a "not allowed" jurisdiction
export const g = (n: string) => ethers.parseEther(n); // 1 token = 1 gram (18 dec)

/**
 * Base fixture: deploys the suite (owner = minter = deployer so the deployer can
 * administer and mint), makes the deployer an agent on the registry + token, and
 * allows Singapore. Returns contracts + named signers.
 */
export async function baseFixture() {
  const [deployer, alice, bob, carol, dave, mallory] = await ethers.getSigners();
  const c = await deployAuric(deployer.address, deployer.address);
  await c.identityRegistry.addAgent(deployer.address);
  await c.token.addAgent(deployer.address);
  await c.compliance.setCountryAllowed(SG, true);
  return { ...c, deployer, alice, bob, carol, dave, mallory };
}

/** Register a verified identity (defaults: Singapore, accredited, no expiry). */
export async function registerVerified(
  c: any,
  who: string,
  opts: { country?: number; accredited?: boolean; expiry?: number } = {}
) {
  await c.identityRegistry.registerIdentity(
    who,
    ethers.id(`kyc:${who}`),
    opts.country ?? SG,
    opts.accredited ?? true,
    opts.expiry ?? 0
  );
}
