import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { baseFixture, registerVerified, g } from "./helpers";

describe("Pause — CONTRACT-05", () => {
  async function funded() {
    const c = await loadFixture(baseFixture);
    await registerVerified(c, c.alice.address);
    await registerVerified(c, c.bob.address);
    await c.token.mint(c.alice.address, g("10"));
    return c;
  }

  it("blocks transfers while paused and resumes after unpause", async () => {
    const c = await funded();
    await c.token.pause();
    await expect(c.token.connect(c.alice).transfer(c.bob.address, g("1"))).to.be.revertedWith(
      "GoldToken: token paused"
    );
    await c.token.unpause();
    await c.token.connect(c.alice).transfer(c.bob.address, g("1"));
    expect(await c.token.balanceOf(c.bob.address)).to.equal(g("1"));
  });

  it("blocks minting while paused", async () => {
    const c = await funded();
    await c.token.pause();
    await expect(c.token.mint(c.alice.address, g("1"))).to.be.revertedWithCustomError(
      c.token,
      "EnforcedPause"
    );
  });

  it("can only be paused/unpaused by an agent", async () => {
    const c = await funded();
    await expect(c.token.connect(c.mallory).pause()).to.be.revertedWith(
      "AgentRole: caller is not an agent"
    );
  });
});
