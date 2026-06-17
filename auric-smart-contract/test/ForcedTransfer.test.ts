import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { baseFixture, registerVerified, g } from "./helpers";

describe("Forced transfer (recovery / regulatory) — CONTRACT-05", () => {
  async function funded() {
    const c = await loadFixture(baseFixture);
    await registerVerified(c, c.alice.address);
    await registerVerified(c, c.bob.address);
    await c.token.mint(c.alice.address, g("10"));
    return c;
  }

  it("moves tokens from a fully frozen wallet (lost-wallet recovery)", async () => {
    const c = await funded();
    await c.token.setAddressFrozen(c.alice.address, true);
    await c.token.forcedTransfer(c.alice.address, c.bob.address, g("4"));
    expect(await c.token.balanceOf(c.alice.address)).to.equal(g("6"));
    expect(await c.token.balanceOf(c.bob.address)).to.equal(g("4"));
  });

  it("unfreezes partially frozen tokens as needed", async () => {
    const c = await funded();
    await c.token.freezePartialTokens(c.alice.address, g("10")); // all frozen
    await c.token.forcedTransfer(c.alice.address, c.bob.address, g("3"));
    expect(await c.token.balanceOf(c.bob.address)).to.equal(g("3"));
    expect(await c.token.frozenTokens(c.alice.address)).to.equal(g("7"));
  });

  it("requires the recipient to be verified", async () => {
    const c = await funded();
    await expect(c.token.forcedTransfer(c.alice.address, c.carol.address, g("1"))).to.be.revertedWith(
      "GoldToken: recipient not verified"
    );
  });

  it("works even while paused", async () => {
    const c = await funded();
    await c.token.pause();
    await c.token.forcedTransfer(c.alice.address, c.bob.address, g("2"));
    expect(await c.token.balanceOf(c.bob.address)).to.equal(g("2"));
  });

  it("can only be called by an agent", async () => {
    const c = await funded();
    await expect(
      c.token.connect(c.mallory).forcedTransfer(c.alice.address, c.bob.address, g("1"))
    ).to.be.revertedWith("AgentRole: caller is not an agent");
  });

  it("emits ForcedTransferExecuted", async () => {
    const c = await funded();
    await expect(c.token.forcedTransfer(c.alice.address, c.bob.address, g("1")))
      .to.emit(c.token, "ForcedTransferExecuted")
      .withArgs(c.alice.address, c.bob.address, g("1"));
  });
});
