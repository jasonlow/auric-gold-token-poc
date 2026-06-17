import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { baseFixture, registerVerified, SG, g } from "./helpers";

describe("IdentityRegistry lifecycle — CONTRACT-05", () => {
  it("treats an identity as not verified after expiry", async () => {
    const c = await loadFixture(baseFixture);
    const expiry = (await time.latest()) + 3600;
    await registerVerified(c, c.alice.address, { expiry });
    expect(await c.identityRegistry.isVerified(c.alice.address)).to.equal(true);

    await time.increaseTo(expiry + 1);
    expect(await c.identityRegistry.isVerified(c.alice.address)).to.equal(false);

    // an expired recipient can no longer be minted to
    await expect(c.token.mint(c.alice.address, g("1"))).to.be.revertedWith(
      "GoldToken: recipient not verified"
    );
  });

  it("refreshes verification when the identity is updated", async () => {
    const c = await loadFixture(baseFixture);
    const expiry = (await time.latest()) + 100;
    await registerVerified(c, c.alice.address, { expiry });
    await time.increaseTo(expiry + 1);
    expect(await c.identityRegistry.isVerified(c.alice.address)).to.equal(false);

    const newExpiry = (await time.latest()) + 3600;
    await c.identityRegistry.updateIdentity(c.alice.address, SG, true, newExpiry);
    expect(await c.identityRegistry.isVerified(c.alice.address)).to.equal(true);
  });

  it("removes verification on deleteIdentity", async () => {
    const c = await loadFixture(baseFixture);
    await registerVerified(c, c.alice.address);
    await c.identityRegistry.deleteIdentity(c.alice.address);
    expect(await c.identityRegistry.isVerified(c.alice.address)).to.equal(false);
  });

  it("stores country, accreditation and a KYC hash (no PII)", async () => {
    const c = await loadFixture(baseFixture);
    await registerVerified(c, c.alice.address, { country: SG, accredited: true });
    expect(await c.identityRegistry.investorCountry(c.alice.address)).to.equal(SG);
    expect(await c.identityRegistry.isAccredited(c.alice.address)).to.equal(true);
    expect(await c.identityRegistry.kycHashOf(c.alice.address)).to.equal(ethers.id(`kyc:${c.alice.address}`));
  });

  it("register/update/delete are agent-only", async () => {
    const c = await loadFixture(baseFixture);
    await expect(
      c.identityRegistry
        .connect(c.mallory)
        .registerIdentity(c.alice.address, ethers.id("x"), SG, true, 0)
    ).to.be.revertedWith("AgentRole: caller is not an agent");
  });

  it("adding an agent is owner-only", async () => {
    const c = await loadFixture(baseFixture);
    await expect(
      c.identityRegistry.connect(c.mallory).addAgent(c.mallory.address)
    ).to.be.revertedWithCustomError(c.identityRegistry, "OwnableUnauthorizedAccount");
  });
});
