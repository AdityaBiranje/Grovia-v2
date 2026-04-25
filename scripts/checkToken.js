const { ethers } = require("hardhat");

async function main() {
  const governorAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  const governor = await ethers.getContractAt("GroviaGovernor", governorAddress);

  const tokenAddress = await governor.token();

  console.log("Governor is using token:", tokenAddress);
}

main().catch(console.error);