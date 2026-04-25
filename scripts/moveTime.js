const { network } = require("hardhat");

async function moveTime(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
  console.log("Time advanced ✅");
}

moveTime(120);