import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { baseFixture, registerVerified, g } from "./helpers";

describe("Issuer & role controls — CONTRACT-05", () => {
  describe("TrustedIssuers", () => {
    it("a removed issuer can no longer mint", async () => {
      const c = await loadFixture(baseFixture);
      await registerVerified(c, c.alice.address);
      await c.trustedIssuers.removeTrustedIssuer(c.deployer.address);
      await expect(c.token.mint(c.alice.address, g("1"))).to.be.revertedWith(
        "GoldToken: caller not a trusted issuer"
      );
    });

    it("add/remove issuer is owner-only", async () => {
      const c = await loadFixture(baseFixture);
      await expect(
        c.trustedIssuers.connect(c.mallory).addTrustedIssuer(c.mallory.address)
      ).to.be.revertedWithCustomError(c.trustedIssuers, "OwnableUnauthorizedAccount");
    });

    it("emits on add", async () => {
      const c = await loadFixture(baseFixture);
      await expect(c.trustedIssuers.addTrustedIssuer(c.bob.address))
        .to.emit(c.trustedIssuers, "TrustedIssuerAdded")
        .withArgs(c.bob.address);
    });
  });

  describe("AgentRole on the token", () => {
    it("agent-only actions revert for non-agents", async () => {
      const c = await loadFixture(baseFixture);
      await expect(c.token.connect(c.mallory).setAddressFrozen(c.alice.address, true)).to.be.revertedWith(
        "AgentRole: caller is not an agent"
      );
    });

    it("addAgent is owner-only", async () => {
      const c = await loadFixture(baseFixture);
      await expect(
        c.token.connect(c.mallory).addAgent(c.mallory.address)
      ).to.be.revertedWithCustomError(c.token, "OwnableUnauthorizedAccount");
    });
  });

  describe("ComplianceModule accounting hooks", () => {
    it("hooks are restricted to the bound token", async () => {
      const c = await loadFixture(baseFixture);
      await expect(
        c.compliance.connect(c.mallory).transferred(c.alice.address, c.bob.address, g("1"))
      ).to.be.revertedWith("ComplianceModule: caller is not the token");
    });
  });
});
