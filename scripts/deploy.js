const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  // =========================
  // 1. Deploy Carbon Token
  // =========================
  const Carbon = await ethers.getContractFactory("CarbonToken");
  const carbon = await Carbon.deploy();
  await carbon.deployed();

  console.log("CarbonToken deployed at:", carbon.address);

  // 🔥 MINT TOKENS (IMPORTANT)
  await carbon.mint(deployer.address, ethers.utils.parseEther("1000"));
  console.log("Minted 1000 tokens to deployer");

  // =========================
  // 2. Deploy Timelock
  // =========================
  const minDelay = 60; // seconds
  const proposers = [];
  const executors = [];

  const Timelock = await ethers.getContractFactory("GroviaTimelock");
  const timelock = await Timelock.deploy(
  minDelay,
  proposers,
  executors,
  deployer.address   // 🔥 REQUIRED ADMIN
);
  await timelock.deployed();

  console.log("Timelock deployed at:", timelock.address);

  // =========================
  // 3. Deploy Governor
  // =========================
  const Governor = await ethers.getContractFactory("GroviaGovernor");
  const governor = await Governor.deploy(
    carbon.address,
    timelock.address
  );
  await governor.deployed();

  console.log("Governor deployed at:", governor.address);

  // =========================
  // 4. Setup Roles
  // =========================
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();

  await timelock.grantRole(proposerRole, governor.address);
  await timelock.grantRole(executorRole, ethers.constants.AddressZero);

  console.log("Roles assigned");

  // =========================
  // 5. Deploy CarbonRetirementNFT
  // =========================
  const NFT = await ethers.getContractFactory("CarbonRetirementNFT");
  const nft = await NFT.deploy();
  await nft.deployed();

  console.log("CarbonRetirementNFT deployed at:", nft.address);

  console.log("DAO setup complete ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});