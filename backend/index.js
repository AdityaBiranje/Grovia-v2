require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
const bodyParser = require("body-parser");

const { connectContract, getContract } = require("./contract");
const Submission = require("./model");
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

    // -------- Verification --------
    const verificationResult = await verifyProject(payload);

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

        await doc.save();

        return res.json({
          ok: true,
          minted: doc.minted,
          ml: doc.ml
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
      doc.minted = { ok: false, flagged: true };
      await doc.save();

      return res.json({
        ok: false,
        flagged: true,
        ml: doc.ml
      });
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