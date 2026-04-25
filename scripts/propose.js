const { ethers } = require("hardhat");

async function main() {
  const governorAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";
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