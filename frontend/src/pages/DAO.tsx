import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import { Wallet, CheckCircle, XCircle, Clock, Play } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { MoleculeBackground } from "@/components/MoleculeBackground";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// Assuming ABIs are present in frontend/src/abi
import GovernorABI from "../abi/GroviaGovernor.json";

export default function DAO() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [account, setAccount] = useState("");
  const [votingPower, setVotingPower] = useState("0");
  const { toast } = useToast();

  const [isDemoWallet, setIsDemoWallet] = useState(false);

  const GOVERNOR_ADDRESS = import.meta.env.VITE_GOVERNOR_ADDRESS || "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";

  useEffect(() => {
    fetchProposals();
    // Try auto connect
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      provider.listAccounts().then(accounts => {
        if(accounts.length > 0) {
          setAccount(accounts[0]);
          setVotingPower("Active");
        }
      });
    }
  }, []);

  const fetchProposals = async () => {
    try {
      const res = await fetch("http://localhost:4000/dao/proposals");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProposals(data);
      }
    } catch (err) {
      console.error("Failed to fetch proposals", err);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        setIsDemoWallet(false);
        setVotingPower("Active"); 
        toast({ title: "Wallet Connected", description: `Address: ${address}` });
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error", description: err.message });
      }
    } else {
      toast({ variant: "destructive", title: "MetaMask not found", description: "Please install MetaMask" });
    }
  };

  const connectDemoWallet = () => {
    setAccount("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    setIsDemoWallet(true);
    setVotingPower("Active (Demo)");
    toast({ title: "Demo Wallet Connected" });
  };

  const getSigner = () => {
    if (isDemoWallet) {
      const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
      return new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  };

  const castVote = async (proposalId: string, support: number) => {
    try {
      if (!account) return toast({ variant: "destructive", title: "Connect Wallet first" });
      const signer = getSigner();
      const governor = new ethers.Contract(GOVERNOR_ADDRESS, GovernorABI.abi || GovernorABI, signer);
      
      const tx = await governor.castVote(proposalId, support);
      toast({ title: "Voting...", description: `Tx Hash: ${tx.hash}` });
      await tx.wait();
      toast({ title: "Vote Cast Successfully!" });
      
      // Update backend state if needed
      await fetch("http://localhost:4000/dao/vote", { method: "POST" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Vote Failed", description: err.message });
    }
  };

  const queueProposal = async (dao: any) => {
    try {
      if (!account) return toast({ variant: "destructive", title: "Connect Wallet first" });
      const signer = getSigner();
      const governor = new ethers.Contract(GOVERNOR_ADDRESS, GovernorABI.abi || GovernorABI, signer);
      
      const tx = await governor.queue(dao.targets, dao.values, dao.calldatas, dao.descriptionHash);
      toast({ title: "Queueing...", description: `Tx Hash: ${tx.hash}` });
      await tx.wait();
      toast({ title: "Proposal Queued Successfully!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Queue Failed", description: err.message });
    }
  };

  const executeProposal = async (dao: any, projectId: string) => {
    try {
      if (!account) return toast({ variant: "destructive", title: "Connect Wallet first" });
      const signer = getSigner();
      const governor = new ethers.Contract(GOVERNOR_ADDRESS, GovernorABI.abi || GovernorABI, signer);
      
      const tx = await governor.execute(dao.targets, dao.values, dao.calldatas, dao.descriptionHash);
      toast({ title: "Executing...", description: `Tx Hash: ${tx.hash}` });
      await tx.wait();
      toast({ title: "Proposal Executed Successfully!" });

      // Notify backend to update DB status
      await fetch("http://localhost:4000/dao/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: dao.proposalId, success: true })
      });
      fetchProposals();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Execute Failed", description: err.message });
    }
  };

  const advanceBlocks = async () => {
    try {
      const res = await fetch("http://localhost:4000/dao/advance-blocks", { method: "POST" });
      const data = await res.json();
      if(data.ok) toast({ title: "Blocks Advanced", description: "Mined 256 blocks to end voting period." });
    } catch (e) {
      console.error(e);
    }
  };

  const advanceTime = async () => {
    try {
      const res = await fetch("http://localhost:4000/dao/advance-time", { method: "POST" });
      const data = await res.json();
      if(data.ok) toast({ title: "Time Advanced", description: "Advanced time by 7 days to pass timelock." });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <MoleculeBackground />
      <div className="relative z-10 pt-24 pb-12">
        <div className="container mx-auto px-4">
          
          <div className="flex justify-between items-center mb-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text">DAO Governance</h1>
              <p className="text-muted-foreground">Vote on flagged projects</p>
            </motion.div>
            
            <div className="text-right">
              {!account ? (
                <div className="flex gap-4">
                  <Button onClick={connectDemoWallet} variant="outline" className="border-secondary text-secondary hover:bg-secondary/20">
                    <Wallet className="w-4 h-4 mr-2" /> Demo Wallet
                  </Button>
                  <Button onClick={connectWallet} className="glow-primary bg-primary/20 hover:bg-primary/30 text-primary border border-primary">
                    <Wallet className="w-4 h-4 mr-2" /> Connect MetaMask
                  </Button>
                </div>
              ) : (
                <GlassCard className="p-3 py-2 flex flex-col items-end">
                  <p className="text-sm text-muted-foreground">Connected: {account.slice(0,6)}...{account.slice(-4)}</p>
                  <p className="text-sm font-bold text-primary">Voting Power: {votingPower}</p>
                </GlassCard>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-8">
             <Button onClick={advanceBlocks} variant="outline" className="border-secondary text-secondary hover:bg-secondary/20">
               Advance Blocks (End Vote)
             </Button>
             <Button onClick={advanceTime} variant="outline" className="border-accent text-accent hover:bg-accent/20">
               Advance Time (End Timelock)
             </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proposals.length === 0 && (
              <p className="col-span-full text-center py-12 text-muted-foreground">No pending proposals found.</p>
            )}
            {proposals.map((p, idx) => (
              <motion.div key={p.projectId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                <GlassCard className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="text-xl font-bold">Project {p.projectId}</h3>
                       <span className="px-2 py-1 text-xs rounded bg-accent/20 text-accent border border-accent">Pending</span>
                    </div>
                    <div className="space-y-2 mb-6 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Fraud Score:</strong> <span className="text-red-400">{p.ml?.fraud_score_percent}%</span></p>
                      <p><strong className="text-foreground">CO₂ Reduction:</strong> {p.ml?.predicted_co2_tons} tons</p>
                      <p className="truncate"><strong className="text-foreground">Proposal ID:</strong> {p.dao?.proposalId}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-primary/20">
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => castVote(p.dao?.proposalId, 1)} className="bg-primary/20 hover:bg-primary/40 border-primary text-primary">
                        <CheckCircle className="w-4 h-4 mr-2" /> For
                      </Button>
                      <Button onClick={() => castVote(p.dao?.proposalId, 0)} className="bg-destructive/20 hover:bg-destructive/40 border-destructive text-destructive">
                        <XCircle className="w-4 h-4 mr-2" /> Against
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button onClick={() => queueProposal(p.dao)} variant="outline" className="border-secondary text-secondary">
                        <Clock className="w-4 h-4 mr-2" /> Queue
                      </Button>
                      <Button onClick={() => executeProposal(p.dao, p.projectId)} variant="outline" className="border-accent text-accent">
                        <Play className="w-4 h-4 mr-2" /> Execute
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
