const { ethers } = require("hardhat");

async function main() {
  const governorAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
  const [proposer] = await ethers.getSigners();

  const governor = await ethers.getContractAt("GroviaGovernor", governorAddress);

  const targets = [proposer.address];
  const values = [0];
  const calldatas = ["0x"];
  const description = "Approve Solar Project #3";

  const tx = await governor.propose(targets, values, calldatas, description);
  const receipt = await tx.wait();

  console.log("Proposal created!");
  console.log("Transaction:", receipt.transactionHash);

  // 🔥 CORRECT WAY TO FIND EVENT
  const event = receipt.events.find(
    (e) => e.event === "ProposalCreated"
  );

  const proposalId = event.args.proposalId;

  console.log("Proposal ID:", proposalId.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});