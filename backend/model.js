// backend/model.js
const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  name: String,
  location: String,
  energy_generated_kwh: Number,
  weather_score: Number,
  grid_emission_factor: Number,
  ownerAddress: String,
  ipfsHash: String,
  ml: {
    raw: mongoose.Schema.Types.Mixed,
    fraud_score_percent: Number,
    predicted_co2_tons: Number
  },
  status: { type: String, default: "pending" }, // "approved_auto", "pending_dao", "approved_by_dao", "rejected_by_dao"
  dao: {
    proposalId: String,
    description: String,
    descriptionHash: String,
    targets: [String],
    values: [Number],
    calldatas: [String]
  },
  minted: {
    ok: { type: Boolean, default: false },
    tokensMinted: Number,
    txHash: String,
    blockNumber: Number,
    flagged: { type: Boolean, default: false },
    overrideBy: String,
    overrideNote: String,
    overrideAt: Date,
    mintedAt: Date,
    error: String
  },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model("Submission", SubmissionSchema);
