require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
const bodyParser = require("body-parser");

const { connectContract, getContract, getGovernorContract } = require("./contract");
const { ethers } = require("ethers");
const Submission = require("./model");
const Retirement = require("./retirementModel");
const { adminOnly, simpleLogin } = require("./auth");
const verifyProject = require("./services/verificationService");

const app = express();
app.use(bodyParser.json({ limit: "1mb" }));

// ---------------- CORS ----------------
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(s => s.trim());

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (FRONTEND_ORIGINS.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed"));
    }
  }
}));

// ---------------- CONFIG ----------------
const PORT = process.env.PORT || 4000;
const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/carbon_proto";
const ML_URL = process.env.ML_URL || "http://127.0.0.1:8001/predict";
const FRAUD_THRESHOLD = Number(process.env.FRAUD_THRESHOLD ?? 40);

// ---------------- DB ----------------
mongoose.set("strictQuery", false);
mongoose.connect(MONGO)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("Mongo error:", err);
    process.exit(1);
  });

// ---------------- CONTRACT ----------------
(async () => {
  try {
    await connectContract();
    console.log("Contract initialized");
  } catch (e) {
    console.warn("Contract init failed:", e.message);
  }
})();

// ---------------- ROUTES ----------------

// Health
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "Grovia Backend OK" });
});

// Auth
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const token = simpleLogin(email, password, role);

    if (!token) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    res.json({ ok: true, token, role: role || "user" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- MAIN SUBMIT FLOW ----------------
app.post("/submit", async (req, res) => {
  try {
    const payload = req.body;

    // -------- Validation --------
    const required = [
      "projectId",
      "name",
      "location",
      "energy_generated_kwh",
      "weather_score",
      "grid_emission_factor",
      "ownerAddress"
    ];

    for (let f of required) {
      if (!payload[f]) {
        return res.status(400).json({ error: `missing ${f}` });
      }
    }

    if (!ethers.utils.isAddress(payload.ownerAddress)) {
      return res.status(400).json({ error: "Invalid Ethereum address provided for Owner Wallet." });
    }

    // -------- Verification --------
    const verificationResult = await verifyProject(payload);
    // Stop process if location is invalid
    if (
      verificationResult.suspicious &&
      verificationResult.reasons.includes("Invalid project location")
    ) {
    return res.status(400).json({
      success: false,
      error: "Invalid location entered. Please enter a valid location."
    });
    }
    
    // Normal suspicious logic
    payload.status = verificationResult.suspicious
      ? "FLAGGED_FOR_DAO"
      : "VERIFIED";

    // -------- Save initial --------
    const doc = new Submission({
      ...payload,
      verification: verificationResult,
      createdAt: new Date(),
      minted: { ok: false }
    });

    await doc.save();

    // -------- ML CALL --------
    let mlResponse = null;

    try {
      const mlRes = await axios.post(ML_URL, {
        project_id: doc.projectId,
        energy_generated_kwh: Number(doc.energy_generated_kwh),
        weather_score: Number(doc.weather_score),
        grid_emission_factor: Number(doc.grid_emission_factor)
      });

      mlResponse = mlRes.data;
    } catch (err) {
      console.warn("ML failed:", err.message);
    }

    if (mlResponse) {
      doc.ml = {
        raw: mlResponse,
        fraud_score_percent: Number(
          mlResponse.fraud_score_percent ?? 100
        ),
        predicted_co2_tons: Number(
          mlResponse.predicted_co2_tons ?? 0
        )
      };

      await doc.save();
    }

    // -------- DECISION --------
    const fraud = doc.ml?.fraud_score_percent ?? 100;

    if (fraud < FRAUD_THRESHOLD) {
      // 🟢 AUTO APPROVE
      try {
        const contract = getContract();
        if (!contract) throw new Error("contract not initialized");

        const tokens = Math.round(
          (doc.ml?.predicted_co2_tons ?? 0) * 1000
        );

        const tx = await contract.mintForProject(
          doc.ownerAddress,
          tokens,
          doc.ipfsHash || ""
        );

        const receipt = await tx.wait();

        doc.minted = {
          ok: true,
          tokensMinted: tokens,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          mintedAt: new Date()
        };
        doc.status = "approved_auto";

        try {
          const { getAMMContract } = require("./contract");
          const amm = getAMMContract();
          if (amm) {
            // Add 10 CO2T to AMM liquidity to represent market supply increase
            const tokenAmount = ethers.utils.parseEther("10");
            
            // First approve AMM
            const approveTx = await contract.approve(amm.address, tokenAmount);
            await approveTx.wait();

            // Add liquidity with 0 ETH, 10 Tokens. 
            // Wait, addLiquidity requires msg.value > 0.
            // For a simple demo, we can just send the tokens directly to the AMM contract
            // and NOT call addLiquidity (which requires ETH), or we can send 0.001 ETH.
            // Let's send 0.001 ETH to addLiquidity to avoid require(msg.value > 0)
            const addLiqTx = await amm.addLiquidity(tokenAmount, { value: ethers.utils.parseEther("0.001") });
            await addLiqTx.wait();
            console.log("AMM Liquidity increased on Auto-Approval");
          }
        } catch (ammErr) {
          console.error("Failed to add AMM liquidity:", ammErr.message);
        }

        await doc.save();

        return res.json({
          ok: true,
          minted: doc.minted,
          ml: doc.ml,
          status: doc.status
        });

      } catch (err) {
        doc.minted = { ok: false, error: err.message };
        await doc.save();

        return res.json({
          ok: false,
          error: "mint_failed",
          reason: err.message
        });
      }
    } else {
      // 🔴 CREATE DAO PROPOSAL
      try {
        const { getGovernorContract } = require("./contract");
        const contract = getContract();
        const governor = getGovernorContract();
        
        if (!governor || !contract) throw new Error("Contracts not initialized");

        const tokens = Math.round((doc.ml?.predicted_co2_tons ?? 0) * 1000);
        const description = `Mint ${tokens} CTK for Project ${doc.projectId} (Fraud Score: ${fraud}%) - UniqueID: ${Date.now()}`;
        const descriptionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(description));

        const encoded = contract.interface.encodeFunctionData("mintForProject", [
          doc.ownerAddress,
          ethers.utils.parseEther(tokens.toString()),
          doc.ipfsHash || ""
        ]);

        console.log("Creating DAO proposal...");
        const tx = await governor.propose(
          [contract.address],
          [0],
          [encoded],
          description
        );
        const receipt = await tx.wait();

        const event = receipt.events?.find(e => e.event === 'ProposalCreated');
        let proposalId = event ? event.args.proposalId.toString() : "0";

        // Mine 1 block so the proposal becomes active immediately
        await contract.provider.send("evm_mine", []);

        doc.status = "pending_dao";
        doc.dao = {
          proposalId,
          description,
          descriptionHash,
          targets: [contract.address],
          values: [0],
          calldatas: [encoded]
        };
        
        doc.minted = { ok: false, flagged: true };
        await doc.save();

        return res.json({
          ok: true,
          flagged: true,
          status: doc.status,
          dao: doc.dao,
          ml: doc.ml
        });

      } catch (err) {
        console.error("Propose failed:", err);
        return res.json({
          ok: false,
          error: "proposal_failed",
          reason: err.message
        });
      }
    }

  } catch (err) {
    console.error("submit error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- FETCH ----------------
app.get("/submissions", async (req, res) => {
  try {
    const docs = await Submission.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/submission/:projectId", async (req, res) => {
  try {
    const doc = await Submission.findOne({
      projectId: req.params.projectId
    }).lean();

    if (!doc) return res.status(404).json({ error: "not found" });

    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- RETIREMENT ----------------
app.post("/retire", async (req, res) => {
  try {
    const { user, projectId, amount, txHash } = req.body;
    if (!user || !projectId || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { getNFTContract } = require("./contract");
    const nft = getNFTContract();

    if (!nft) throw new Error("NFT contract not initialized");

    const metadataURI = `ipfs://impact/${projectId}`;
    console.log(`Minting NFT for ${user}...`);
    const tx = await nft.mintRetirementNFT(user, Number(projectId), Number(amount), metadataURI);
    const receipt = await tx.wait();

    // Find the event to extract tokenId
    const event = receipt.events?.find(e => e.event === 'RetirementNFTMinted');
    let nftId = event ? event.args.tokenId.toString() : "0";

    const record = new Retirement({
      user,
      projectId,
      amount: Number(amount),
      nftId: Number(nftId),
      txHash: txHash || receipt.transactionHash
    });
    await record.save();

    res.json({ ok: true, nftId, txHash: receipt.transactionHash });
  } catch (e) {
    console.error("Retire error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/retirements/:user", async (req, res) => {
  try {
    const docs = await Retirement.find({ user: req.params.user })
      .sort({ createdAt: -1 })
      .lean();
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- DAO ----------------
app.get("/dao/proposals", async (req, res) => {
  try {
    const docs = await Submission.find({ status: "pending_dao" })
      .sort({ createdAt: -1 })
      .lean();
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/dao/vote", async (req, res) => {
  try {
    // Just a stub for UI updates if needed. The real vote happens on-chain.
    res.json({ ok: true, msg: "Vote recorded on UI" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/dao/execute", async (req, res) => {
  try {
    const { proposalId, success } = req.body;
    const newStatus = success ? "approved_by_dao" : "rejected_by_dao";
    
    if (success) {
      try {
        const { getContract, getAMMContract } = require("./contract");
        const contract = getContract();
        const amm = getAMMContract();
        if (amm && contract) {
          const tokenAmount = ethers.utils.parseEther("10");
          const approveTx = await contract.approve(amm.address, tokenAmount);
          await approveTx.wait();

          const addLiqTx = await amm.addLiquidity(tokenAmount, { value: ethers.utils.parseEther("0.001") });
          await addLiqTx.wait();
          console.log("AMM Liquidity increased on DAO Execution");
        }
      } catch (ammErr) {
        console.error("Failed to add AMM liquidity:", ammErr.message);
      }
    }

    await Submission.updateOne(
      { "dao.proposalId": proposalId },
      { $set: { status: newStatus } }
    );
    res.json({ ok: true, status: newStatus });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Hackathon helpers for local Hardhat
app.post("/dao/advance-blocks", async (req, res) => {
  try {
    const rpc = process.env.RPC_URL || "http://127.0.0.1:8545";
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    await provider.send("hardhat_mine", ["0xB300"]); // Mine 45824 blocks (passes 45818 votingPeriod)
    res.json({ ok: true, msg: "Advanced blocks successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/dao/advance-time", async (req, res) => {
  try {
    const rpc = process.env.RPC_URL || "http://127.0.0.1:8545";
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    await provider.send("evm_increaseTime", [86400 * 7]); // Advance 7 days
    await provider.send("evm_mine", []);
    res.json({ ok: true, msg: "Advanced time successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- ADMIN ----------------
app.get("/admin/flagged", adminOnly, async (req, res) => {
  try {
    const list = await Submission.find({
      "minted.ok": { $ne: true },
      "ml.fraud_score_percent": { $gte: FRAUD_THRESHOLD }
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/admin/override-mint", adminOnly, async (req, res) => {
  try {
    const { projectId, to, amount, ipfsHash } = req.body;

    const contract = getContract();
    const tx = await contract.mintForProject(
      to,
      Number(amount),
      ipfsHash || ""
    );

    const receipt = await tx.wait();

    await Submission.updateOne(
      { projectId },
      {
        $set: {
          "minted.ok": true,
          "minted.tokensMinted": amount,
          "minted.txHash": receipt.transactionHash
        }
      }
    );

    res.json({ ok: true, txHash: receipt.transactionHash });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});