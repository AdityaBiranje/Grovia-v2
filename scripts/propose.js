const { ethers } = require("hardhat");

async function main() {
  const governorAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
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