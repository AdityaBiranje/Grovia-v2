const mongoose = require("mongoose");

const RetirementSchema = new mongoose.Schema({
  user: { type: String, required: true, index: true },
  projectId: { type: String, required: true },
  amount: { type: Number, required: true },
  nftId: { type: Number },
  txHash: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model("Retirement", RetirementSchema);
