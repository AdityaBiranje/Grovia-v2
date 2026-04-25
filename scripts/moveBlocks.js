const { network } = require("hardhat");

async function moveBlocks(amount) {
  for (let i = 0; i < amount; i++) {
    await network.provider.send("evm_mine");
  }
  console.log(`${amount} blocks mined ✅`);
}

moveBlocks(50000);