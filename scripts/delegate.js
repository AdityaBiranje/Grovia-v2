const { ethers } = require("hardhat");

async function main() {
  const carbonAddress = "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F";

  const [deployer] = await ethers.getSigners();

  const carbon = await ethers.getContractAt("CarbonToken", carbonAddress);

  console.log("Delegating votes to:", deployer.address);

  const tx = await carbon.delegate(deployer.address);
  await tx.wait();

  console.log("Delegation complete ✅");

  // 🔥 Check voting power
  const votes = await carbon.getVotes(deployer.address);
  console.log("Current voting power:", votes.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});