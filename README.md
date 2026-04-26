# 🚀 **Grovia – Intelligence That Sustains Trust**

### *AI-Driven Carbon Credit Verification Using Blockchain, ML & Real-Time Forensics*

Grovia is a high-impact, full-stack sustainability platform that verifies carbon offset project authenticity using **AI anomaly detection** and **blockchain-based tokenization**, ensuring trust, transparency, and fraud-proof carbon markets.

Grovia has evolved into a complete **DeFi + Governance** ecosystem for carbon assets.

---

## 🧬 **Updated System Architecture**

```
 ┌──────────────────────────────────────────────────────┐
 │                      FRONTEND                        │
 │ React + Vite + Framer Motion (Glassmorphism UI)      │
 │ Dashboard | DAO | Market (AMM) | NFT Retirement      │
 └───────────────────────────────┬──────────────────────┘
                                 │ REST API Calls
                                 ▼
 ┌──────────────────────────────────────────────────────┐
 │                     BACKEND (Node.js)                │
 │ Express Server + MongoDB                             │
 │ - AI Auto-Approval (Low Fraud) -> Direct Minting     │
 │ - Flagged (High Fraud) -> Create DAO Proposal        │
 │ - Auto-Injection of AMM Liquidity on Approval        │
 └───────────────┬───────────────────────────────┬──────┘
                 │ HTTP Predict                  │ Contract Calls
                 ▼                               ▼
 ┌──────────────────────────────────────────────────────┐
 │             ML SERVICE (FastAPI)       BLOCKCHAIN    │
 │ Isolation Forest Anomaly Detection     Ethereum (L2)  │
 │ - CO₂ Prediction                       - CarbonToken │
 │ - Fraud Probability                   - Governor DAO │
 │ - Outlier Detection                   - V2 AMM Pool  │
 │                                       - Impact NFT   │
 └──────────────────────────────────────────────────────┘
```

---

## 🔥 **Key Features**

### 🗳️ **DAO Governance**
- **Decentralized Accountability:** High-fraud projects are not rejected by a central admin but are flagged for a community DAO vote.
- **On-Chain Lifecycle:** Proposals follow a strict `Propose -> Vote -> Queue -> Execute` flow using **OpenZeppelin Governor** and **TimelockController**.
- **Transparent Voting:** Token holders use their CO2T (ERC20Votes) to decide which projects are genuine.

### 📈 **CarbonAMM V2 (DEX)**
- **Bidirectional Trading:** Swap ETH for CO2T or sell CO2T back for ETH in a professional DEX interface.
- **Constant Product Formula:** Price is determined organically by supply and demand ($x \cdot y = k$).
- **Realistic Fees:** 0.3% trading fee applied to all swaps.
- **Price Impact & UX:** Live price impact visualization and automated ERC20 approval flow.

### 🛡️ **Proof of Impact (NFT)**
- **Credit Retirement:** Users can "retire" their carbon credits by burning CO2T tokens.
- **Verifiable NFTs:** Burning tokens automatically mints a unique **"Proof of Impact" NFT** (ERC721) containing project metadata, timestamp, and retired amount.
- **Impact Tracking:** Verifiable on-chain record of individual environmental contribution.

### 🧠 **AI Integration**
- **Auto-Approval:** Projects with a fraud score < 55% are instantly minted.
- **Liquidity Feedback Loop:** AI/DAO approvals automatically inject fresh CO2T liquidity into the AMM, naturally adjusting the global price based on verified supply.
- **Mocked Forensics:** Weather, grid emission, and location data mocking for reliable hackathon demonstrations.

### 🦊 **Demo Wallet**
- **One-Click Onboarding:** No MetaMask? No problem. Use the built-in Demo Wallet to interact with all Web3 features instantly.

---

## 🛠️ **Tech Stack**

- **Frontend:** React, Vite, TailwindCSS, Framer Motion, Lucide Icons, Recharts.
- **Backend:** Node.js, Express, MongoDB, Ethers.js v5.
- **Machine Learning:** FastAPI, Python, Scikit-learn (Isolation Forest).
- **Blockchain:** Solidity, Hardhat, OpenZeppelin (ERC20Votes, Governor, Timelock, ERC721URIStorage).

---

## 📦 **Installation & Setup**

### 1. Setup Blockchain
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```
*Note: Deployment seeds the AMM with 10 ETH and 10,000 CO2T initial liquidity.*

### 2. Setup Backend
```bash
cd backend
npm install
node index.js
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔗 **Ecosystem API**

- `POST /submit`: AI-driven project submission.
- `GET /dao/proposals`: Fetch live governance proposals.
- `POST /dao/execute`: Synchronize on-chain execution with database state.
- `GET /dashboard/stats`: Global carbon metrics.

---

## 📜 **License**
MIT License

---

## ⭐ **Support the Project**
If you like Grovia, star the repo on GitHub! ⭐
