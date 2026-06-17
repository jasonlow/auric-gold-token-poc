import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { baseFixture, registerVerified, g } from "./helpers";

describe("Freezing — CONTRACT-05", () => {
  async function funded() {
    const c = await loadFixture(baseFixture);
    await registerVerified(c, c.alice.address);
    await registerVerified(c, c.bob.address);
    await c.token.mint(c.alice.address, g("10"));
    return c;
  }

  describe("full address freeze", () => {
    it("blocks transfers from a frozen sender", async () => {
      const c = await funded();
      await c.token.setAddressFrozen(c.alice.address, true);
      await expect(c.token.connect(c.alice).transfer(c.bob.address, g("1"))).to.be.revertedWith(
        "GoldToken: sender frozen"
      );
    });

    it("blocks transfers to a frozen recipient", async () => {
      const c = await funded();
      await c.token.setAddressFrozen(c.bob.address, true);
      await expect(c.token.connect(c.alice).transfer(c.bob.address, g("1"))).to.be.revertedWith(
        "GoldToken: recipient frozen"
      );
    });

    it("restores transfers after unfreeze", async () => {
      const c = await funded();
      await c.token.setAddressFrozen(c.alice.address, true);
      await c.token.setAddressFrozen(c.alice.address, false);
      await c.token.connect(c.alice).transfer(c.bob.address, g("1"));
      expect(await c.token.balanceOf(c.bob.address)).to.equal(g("1"));
    });

    it("emits AddressFrozen", async () => {
      const c = await funded();
      await expect(c.token.setAddressFrozen(c.alice.address, true))
        .to.emit(c.token, "AddressFrozen")
        .withArgs(c.alice.address, true);
    });
  });

  describe("partial token freeze", () => {
    it("blocks transferring the frozen portion but allows the free portion", async () => {
      const c = await funded();
      await c.token.freezePartialTokens(c.alice.address, g("8")); // 2 free of 10
      await expect(c.token.connect(c.alice).transfer(c.bob.address, g("3"))).to.be.revertedWith(
        "GoldToken: insufficient unfrozen balance"
      );
      await c.token.connect(c.alice).transfer(c.bob.address, g("2"));
      expect(await c.token.balanceOf(c.bob.address)).to.equal(g("2"));
    });

    it("cannot freeze more than the balance", async () => {
      const c = await funded();
      await expect(c.token.freezePartialTokens(c.alice.address, g("11"))).to.be.revertedWith(
        "GoldToken: amount exceeds balance"
      );
    });

    it("unfreezing restores transferability", async () => {
      const c = await funded();
      await c.token.freezePartialTokens(c.alice.address, g("8"));
      await c.token.unfreezePartialTokens(c.alice.address, g("8"));
      await c.token.connect(c.alice).transfer(c.bob.address, g("9"));
      expect(await c.token.balanceOf(c.bob.address)).to.equal(g("9"));
    });

    it("cannot unfreeze more than is frozen", async () => {
      const c = await funded();
      await c.token.freezePartialTokens(c.alice.address, g("3"));
      await expect(c.token.unfreezePartialTokens(c.alice.address, g("4"))).to.be.revertedWith(
        "GoldToken: amount exceeds frozen"
      );
    });
  });
});
