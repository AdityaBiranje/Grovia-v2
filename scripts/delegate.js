const { ethers } = require("hardhat");

async function main() {
  const carbonAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
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