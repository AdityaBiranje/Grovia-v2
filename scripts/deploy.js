const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  // 🪙 1. Deploy CarbonToken
  const Carbon = await ethers.getContractFactory("CarbonToken");
  const carbon = await Carbon.deploy();
  await carbon.deployed();
  console.log("CarbonToken deployed at:", carbon.address);

  // ⏱️ 2. Deploy Timelock
  const minDelay = 60; // 1 minute

  const Timelock = await ethers.getContractFactory("GroviaTimelock");
  const timelock = await Timelock.deploy(
    minDelay,
    [],
    [],
    deployer.address
  );
  await timelock.deployed();
  console.log("Timelock deployed at:", timelock.address);

  // 🗳️ 3. Deploy Governor
  // Deploy Governor
const Governor = await ethers.getContractFactory("GroviaGovernor");
const governor = await Governor.deploy(
  carbon.address,
  timelock.address
);
await governor.deployed();
console.log("Governor deployed at:", governor.address);
  // 🔐 4. Setup Roles

  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const adminRole = await timelock.DEFAULT_ADMIN_ROLE();

  // Grant roles
  await timelock.grantRole(proposerRole, governor.address);
  await timelock.grantRole(executorRole, ethers.constants.AddressZero);

  // Revoke admin
 // await timelock.revokeRole(adminRole, deployer.address);

  console.log("DAO setup complete ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});