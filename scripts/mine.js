const { network } = require("hardhat");

async function main() {
  console.log("Mining 1 block...");

  await network.provider.send("evm_mine");

  console.log("Block mined ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});