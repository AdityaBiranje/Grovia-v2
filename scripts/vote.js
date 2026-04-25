const { ethers } = require("hardhat");

async function main() {
  const governorAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
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