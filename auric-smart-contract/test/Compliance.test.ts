import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { baseFixture, registerVerified, SG, US, g } from "./helpers";

describe("Compliance (jurisdiction & accreditation) — CONTRACT-05", () => {
  describe("jurisdiction allowlist", () => {
    it("rejects minting to a disallowed jurisdiction", async () => {
      const c = await loadFixture(baseFixture);
      await registerVerified(c, c.carol.address, { country: US }); // US not allowed
      await expect(c.token.mint(c.carol.address, g("1"))).to.be.revertedWith(
        "GoldToken: mint not compliant"
      );
    });

    it("rejects transfers to a disallowed jurisdiction", async () => {
      const c = await loadFixture(baseFixture);
      await registerVerified(c, c.alice.address); // SG
      await registerVerified(c, c.carol.address, { country: US });
      await c.token.mint(c.alice.address, g("5"));
      await expect(c.token.connect(c.alice).transfer(c.carol.address, g("1"))).to.be.revertedWith(
        "GoldToken: transfer not compliant"
      );
    });

    it("allows once the jurisdiction is enabled (rule update, no redeploy)", async () => {
      const c = await loadFixture(baseFixture);
      await registerVerified(c, c.carol.address, { country: US });
      await c.compliance.setCountryAllowed(US, true);
      await c.token.mint(c.carol.address, g("2"));
      expect(await c.token.balanceOf(c.carol.address)).to.equal(g("2"));
    });
  });

  describe("accreditation", () => {
    it("rejects minting to a non-accredited investor by default", async () => {
      const c = await loadFixture(baseFixture);
      await registerVerified(c, c.dave.address, { accredited: false });
      await expect(c.token.mint(c.dave.address, g("1"))).to.be.revertedWith(
        "GoldToken: mint not compliant"
      );
    });

    it("allows non-accredited once the requirement is turned off", async () => {
      const c = await loadFixture(baseFixture);
      await registerVerified(c, c.dave.address, { accredited: false });
      await c.compliance.setRequireAccredited(false);
      await c.token.mint(c.dave.address, g("1"));
      expect(await c.token.balanceOf(c.dave.address)).to.equal(g("1"));
    });
  });

  it("compliance rule setters are owner-only", async () => {
    const c = await loadFixture(baseFixture);
    await expect(c.compliance.connect(c.mallory).setCountryAllowed(SG, false)).to.be.revertedWithCustomError(
      c.compliance,
      "OwnableUnauthorizedAccount"
    );
    await expect(c.compliance.connect(c.mallory).setRequireAccredited(false)).to.be.revertedWithCustomError(
      c.compliance,
      "OwnableUnauthorizedAccount"
    );
  });
});
