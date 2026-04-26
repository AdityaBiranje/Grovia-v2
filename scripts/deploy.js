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

  console.log("CarbonRetirementNFT deployed at:", nft.address);

  // =========================
  // 6. Deploy CarbonAMM
  // =========================
  const AMM = await ethers.getContractFactory("CarbonAMM");
  const amm = await AMM.deploy(carbon.address);
  await amm.deployed();

  console.log("CarbonAMM deployed at:", amm.address);

  // =========================
  // 7. Seed AMM Liquidity
  // =========================
  // Mint an extra 100,000 to deployer to use for AMM and backend pool
  await carbon.mint(deployer.address, ethers.utils.parseEther("100000"));
  
  const tokenAmount = ethers.utils.parseEther("10000"); // 10,000 CO2T
  const ethAmount = ethers.utils.parseEther("10"); // 10 ETH

  console.log("Approving tokens for AMM...");
  await carbon.approve(amm.address, tokenAmount);
  
  console.log("Adding initial liquidity to AMM...");
  await amm.addLiquidity(tokenAmount, { value: ethAmount });
  console.log("AMM Liquidity seeded: 10 ETH + 10,000 CO2T");

  console.log("DAO & AMM setup complete ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});