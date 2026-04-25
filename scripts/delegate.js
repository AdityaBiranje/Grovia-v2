const { ethers } = require("hardhat");

async function main() {
  const tokenAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

  const [signer] = await ethers.getSigners();

  const token = await ethers.getContractAt("CarbonToken", tokenAddress);

  console.log("Delegating votes to:", signer.address);

  const tx = await token.delegate(signer.address);
  await tx.wait();

  console.log("Delegation complete ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
