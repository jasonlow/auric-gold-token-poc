import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployAuric } from "../scripts/deploy";

const SG = 702; // Singapore — ISO 3166-1 numeric
const g = (n: string) => ethers.parseEther(n); // 1 token = 1 gram, 18 decimals

describe("GoldToken (ERC-3643-style) — CONTRACT-01 smoke", () => {
  // owner = minter = deployer so the deployer can both administer and mint in tests.
  async function fixture() {
    const [deployer, alice, bob] = await ethers.getSigners();
    const c = await deployAuric(deployer.address, deployer.address);
    await c.identityRegistry.addAgent(deployer.address); // register identities
    await c.token.addAgent(deployer.address); // freeze / forced transfer
    await c.compliance.setCountryAllowed(SG, true); // allow Singapore
    return { ...c, deployer, alice, bob };
  }

  const register = (c: any, who: string) =>
    c.identityRegistry.registerIdentity(who, ethers.id(`kyc:${who}`), SG, true, 0);

  it("deploys and wires the four contracts", async () => {
    const { token } = await loadFixture(fixture);
    expect(await token.name()).to.equal("Auric Gold Token");
    expect(await token.symbol()).to.equal("XAUg");
    expect(await token.decimals()).to.equal(18n);
  });

  it("mints to a verified, accredited, allowed-jurisdiction wallet", async () => {
    const c = await loadFixture(fixture);
    await register(c, c.alice.address);
    await c.token.mint(c.alice.address, g("10"));
    expect(await c.token.balanceOf(c.alice.address)).to.equal(g("10"));
    expect(await c.token.totalSupply()).to.equal(g("10"));
  });

  it("reverts mint by a non-trusted-issuer", async () => {
    const c = await loadFixture(fixture);
    await register(c, c.alice.address);
    await expect(c.token.connect(c.bob).mint(c.alice.address, g("1"))).to.be.revertedWith(
      "GoldToken: caller not a trusted issuer"
    );
  });

  it("reverts mint to a non-verified wallet", async () => {
    const c = await loadFixture(fixture);
    await expect(c.token.mint(c.alice.address, g("1"))).to.be.revertedWith(
      "GoldToken: recipient not verified"
    );
  });

  it("reverts transfer to a non-whitelisted wallet", async () => {
    const c = await loadFixture(fixture);
    await register(c, c.alice.address);
    await c.token.mint(c.alice.address, g("5"));
    await expect(c.token.connect(c.alice).transfer(c.bob.address, g("1"))).to.be.revertedWith(
      "GoldToken: recipient not verified"
    );
  });

  it("allows transfer between two whitelisted wallets", async () => {
    const c = await loadFixture(fixture);
    await register(c, c.alice.address);
    await register(c, c.bob.address);
    await c.token.mint(c.alice.address, g("5"));
    await c.token.connect(c.alice).transfer(c.bob.address, g("2"));
    expect(await c.token.balanceOf(c.bob.address)).to.equal(g("2"));
    expect(await c.token.balanceOf(c.alice.address)).to.equal(g("3"));
  });

  it("burns from a holder (trusted issuer only)", async () => {
    const c = await loadFixture(fixture);
    await register(c, c.alice.address);
    await c.token.mint(c.alice.address, g("5"));
    await c.token.burn(c.alice.address, g("2"));
    expect(await c.token.balanceOf(c.alice.address)).to.equal(g("3"));
    expect(await c.token.totalSupply()).to.equal(g("3"));
  });
});
