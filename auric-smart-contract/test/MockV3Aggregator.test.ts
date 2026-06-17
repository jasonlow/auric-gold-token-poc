import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployAuric } from "../scripts/deploy";

const usd = (n: string) => ethers.parseUnits(n, 8); // 8-decimal XAU/USD

describe("MockV3Aggregator (XAU/USD) — CONTRACT-04", () => {
  async function fixture() {
    return deployAuric();
  }

  it("reports decimals, description and the initial price", async () => {
    const { priceFeed } = await loadFixture(fixture);
    expect(await priceFeed.decimals()).to.equal(8);
    expect(await priceFeed.description()).to.equal("XAU / USD");
    const [, answer] = await priceFeed.latestRoundData();
    expect(answer).to.equal(usd("2400"));
  });

  it("updates the price and advances the round id", async () => {
    const { priceFeed } = await loadFixture(fixture);
    const [r0] = await priceFeed.latestRoundData();
    await priceFeed.updateAnswer(usd("2500"));
    const [r1, answer, , updatedAt] = await priceFeed.latestRoundData();
    expect(answer).to.equal(usd("2500"));
    expect(r1).to.equal(r0 + 1n);
    expect(updatedAt).to.be.greaterThan(0n);
  });
});
