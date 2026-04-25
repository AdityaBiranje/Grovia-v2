const { ethers } = require("hardhat");

async function main() {
  const governorAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";

  const description = "Approve Solar Project #3";
  const descriptionHash = ethers.utils.id(description);

  const [signer] = await ethers.getSigners();

  const governor = await ethers.getContractAt("GroviaGovernor", governorAddress);

  const targets = [signer.address];
  const values = [0];
  const calldatas = ["0x"];

  console.log("Queueing proposal...");

  const tx = await governor.queue(
    targets,
    values,
    calldatas,
    descriptionHash
  );

  await tx.wait();

  console.log("Proposal queued ✅");
}

main().catch(console.error);