const { ethers } = require("hardhat");

async function main() {
  const governorAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";

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