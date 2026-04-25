const { ethers } = require("hardhat");

async function main() {
  const governorAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";
  const proposalId = "24829565617042109866529831957282381929482103738987011322933524967348567362811";

  const [voter] = await ethers.getSigners();

  const governor = await ethers.getContractAt("GroviaGovernor", governorAddress);

  // 0 = Against, 1 = For, 2 = Abstain
  const vote = 1;

  console.log("Casting vote...");

  const tx = await governor.castVote(proposalId, vote);
  await tx.wait();

  console.log("Vote casted ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});