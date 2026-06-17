import { ethers } from "hardhat";

/**
 * Updates the XAU/USD price on the deployed MockV3Aggregator (per troy ounce).
 *
 * Run:  PRICE_USD_OZ=2450 npm run set-price
 *       (PRICE_FEED_ADDRESS must be set in .env — populated after deploy in CONTRACT-06.)
 */
async function main() {
  const addr = process.env.PRICE_FEED_ADDRESS;
  if (!addr) throw new Error("PRICE_FEED_ADDRESS not set in .env (deploy the contracts first).");
  if (!ethers.isAddress(addr)) throw new Error(`PRICE_FEED_ADDRESS is not a valid address: ${addr}`);

  const usdPerOz = process.env.PRICE_USD_OZ ?? "2400";

  const feed = await ethers.getContractAt("MockV3Aggregator", addr);
  const decimals = Number(await feed.decimals());
  const answer = ethers.parseUnits(usdPerOz, decimals); // USD/oz scaled to feed decimals

  console.log(`Setting XAU/USD = ${usdPerOz} USD/oz (×10^${decimals}) on ${addr} …`);
  const tx = await feed.updateAnswer(answer);
  console.log(`tx: ${tx.hash}`);
  await tx.wait();

  const [, latest] = await feed.latestRoundData();
  console.log(`✅ latestAnswer = ${ethers.formatUnits(latest, decimals)} USD/oz`);
}

main().catch((e) => {
  console.error(e.shortMessage || e.message);
  process.exitCode = 1;
});
