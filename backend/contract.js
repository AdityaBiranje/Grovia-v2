// backend/contract.js
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

let provider, wallet, contract, governorContract, nftContract;

async function connectContract() {
  const rpc = process.env.RPC_URL || "http://127.0.0.1:8545";
  provider = new ethers.providers.JsonRpcProvider(rpc);

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.warn("No PRIVATE_KEY in .env - contract interactions will fail");
    return;
  }
  wallet = new ethers.Wallet(privateKey, provider);

  const contractAddr = process.env.CONTRACT_ADDRESS;
  if (!contractAddr) {
    console.warn("No CONTRACT_ADDRESS in .env - cannot instantiate contract");
    return;
  }

  // load CarbonToken ABI
  const abiPath = path.join(__dirname, "abi", "CarbonToken.json");
  if (!fs.existsSync(abiPath)) {
    throw new Error(`ABI not found at ${abiPath} - put your ABI there`);
  }
  const abiJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const abi = abiJson.abi || abiJson; 

  contract = new ethers.Contract(contractAddr, abi, wallet);

  // Load Governor
  const govAddr = process.env.GOVERNOR_ADDRESS;
  if (govAddr) {
    const govAbiPath = path.join(__dirname, "abi", "GroviaGovernor.json");
    if (fs.existsSync(govAbiPath)) {
      const govAbiJson = JSON.parse(fs.readFileSync(govAbiPath, "utf8"));
      governorContract = new ethers.Contract(govAddr, govAbiJson.abi || govAbiJson, wallet);
      console.log("Governor Contract initialized");

      // Delegate votes to self if not already done (Required for proposing)
      try {
        const delegatee = await contract.delegates(wallet.address);
        if (delegatee !== wallet.address) {
          console.log("Delegating votes to self...");
          const tx = await contract.delegate(wallet.address);
          await tx.wait();
          console.log("Delegated successfully!");
        }
      } catch (err) {
        console.error("Delegate check failed:", err.message);
      }
    }
  } else {
    console.warn("No GOVERNOR_ADDRESS in .env");
  }

  // Load NFT Contract
  const nftAddr = process.env.NFT_ADDRESS;
  if (nftAddr) {
    const nftAbiPath = path.join(__dirname, "abi", "CarbonRetirementNFT.json");
    if (fs.existsSync(nftAbiPath)) {
      const nftAbiJson = JSON.parse(fs.readFileSync(nftAbiPath, "utf8"));
      nftContract = new ethers.Contract(nftAddr, nftAbiJson.abi || nftAbiJson, wallet);
      console.log("NFT Contract initialized");
    }
  }

  return contract;
}

function getContract() {
  if (!contract) {
    throw new Error("contract not initialized - call connectContract() first");
  }
  return contract;
}

function getGovernorContract() {
  if (!governorContract) {
    throw new Error("governor contract not initialized");
  }
  return governorContract;
}

function getNFTContract() {
  if (!nftContract) {
    throw new Error("NFT contract not initialized");
  }
  return nftContract;
}

module.exports = { connectContract, getContract, getGovernorContract, getNFTContract };
