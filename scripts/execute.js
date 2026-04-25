const { ethers } = require("hardhat");

async function main() {
  const governorAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  const description = "Approve Solar Project #3";
  const descriptionHash = ethers.utils.id(description);

  const [signer] = await ethers.getSigners();

  const governor = await ethers.getContractAt("GroviaGovernor", governorAddress);

  const targets = [signer.address];
  const values = [0];
  const calldatas = ["0x"];

  console.log("Executing proposal...");

  const tx = await governor.execute(
    targets,
    values,
    calldatas,
    descriptionHash
  );

  await tx.wait();

  console.log("Proposal executed 🚀");
}

main().catch(console.error);