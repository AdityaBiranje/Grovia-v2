import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Wallet, TrendingUp, FileText, Calendar, Award, Flame, X } from "lucide-react";
import { ethers } from "ethers";
import { GlassCard } from "@/components/GlassCard";
import { MoleculeBackground } from "@/components/MoleculeBackground";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import CarbonTokenABI from "../abi/CarbonToken.json";

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const { toast } = useToast();

  const [account, setAccount] = useState("");
  const [retireModalOpen, setRetireModalOpen] = useState(false);
  const [retireAmount, setRetireAmount] = useState("");
  const [selectedProject, setSelectedProject] = useState("1");
  const [nfts, setNfts] = useState<any[]>([]);

  const [isDemoWallet, setIsDemoWallet] = useState(false);

  const CARBON_TOKEN_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

  const projects = [
    { id: "1", name: "Solar Valley Farm", location: "California, USA", co2: 85.4, status: "approved_auto", date: "2025-11-10" },
    { id: "2", name: "Wind Ridge Station", location: "Texas, USA", co2: 124.7, status: "pending_dao", date: "2025-11-12" },
    { id: "3", name: "Green Energy Hub", location: "Oregon, USA", co2: 96.2, status: "approved_by_dao", date: "2025-11-15" }
  ];

  useEffect(() => {
    // Try to auto-connect real wallet if already authorized
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      provider.listAccounts().then(accounts => {
        if(accounts.length > 0) {
          setAccount(accounts[0]);
          fetchNFTs(accounts[0]);
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
        setIsDemoWallet(false);
        fetchNFTs(accounts[0]);
      } catch (err) {
        console.error(err);
      }
    } else {
      toast({ variant: "destructive", title: "MetaMask not found" });
    }
  };

  const connectDemoWallet = () => {
    const demoAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    setAccount(demoAddress);
    setIsDemoWallet(true);
    fetchNFTs(demoAddress);
    toast({ title: "Demo Wallet Connected", description: "Using Hardhat Account #0" });
  };

  const fetchNFTs = async (address: string) => {
    try {
      const res = await fetch(`http://localhost:4000/retirements/${address}`);
      const data = await res.json();
      if (Array.isArray(data)) setNfts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetire = async () => {
    if (!account) return toast({ variant: "destructive", title: "Connect Wallet first" });
    if (!retireAmount || isNaN(Number(retireAmount))) return toast({ variant: "destructive", title: "Invalid amount" });

    try {
      let signer;
      if (isDemoWallet) {
        const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
        signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
      } else {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
      }

      const carbon = new ethers.Contract(CARBON_TOKEN_ADDRESS, CarbonTokenABI.abi || CarbonTokenABI, signer);

      toast({ title: "Burning tokens..." });
      const tx = await carbon.retire(ethers.utils.parseEther(retireAmount.toString())); 
      
      await tx.wait();
      toast({ title: "Tokens Burned!", description: "Minting Impact NFT..." });

      // Call backend to mint NFT
      const res = await fetch("http://localhost:4000/retire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: account,
          projectId: selectedProject,
          amount: retireAmount,
          txHash: tx.hash
        })
      });
      const data = await res.json();

      if (data.ok) {
        toast({ title: "🎉 NFT Minted Successfully", description: `NFT ID: ${data.nftId}` });
        setRetireModalOpen(false);
        fetchNFTs(account);
      } else {
        toast({ variant: "destructive", title: "Mint Failed", description: data.error });
      }

    } catch (err: any) {
      toast({ variant: "destructive", title: "Retirement Failed", description: err.message });
    }
  };

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case "approved_auto": return { label: "Approved (auto)", color: "text-primary" };
      case "pending_dao": return { label: "Under DAO Review", color: "text-accent" };
      case "approved_by_dao": return { label: "Approved (DAO)", color: "text-primary" };
      case "rejected_by_dao": return { label: "Rejected (DAO)", color: "text-destructive" };
      default: return { label: status, color: "text-muted-foreground" };
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <MoleculeBackground />
      
      <div className="relative z-10 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">User Dashboard</h1>
              <p className="text-xl text-muted-foreground">Welcome back, {user?.name || "User"}</p>
            </div>
            {!account ? (
              <div className="flex gap-4">
                <Button onClick={connectDemoWallet} variant="outline" className="border-secondary text-secondary hover:bg-secondary/20">
                  <Wallet className="w-4 h-4 mr-2" /> Demo Wallet
                </Button>
                <Button onClick={connectWallet} className="glow-primary bg-primary/20 hover:bg-primary/30 border border-primary text-primary">
                  <Wallet className="w-4 h-4 mr-2" /> Connect MetaMask
                </Button>
              </div>
            ) : (
              <GlassCard className="p-3 py-2">
                <p className="text-sm text-muted-foreground">Connected Wallet</p>
                <p className="text-sm font-bold text-primary">{account.slice(0,6)}...{account.slice(-4)}</p>
              </GlassCard>
            )}
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <GlassCard><div className="flex justify-between items-center"><div><p className="text-sm text-muted-foreground">Total Projects</p><p className="text-3xl font-bold">12</p></div><FileText className="w-10 h-10 text-primary" /></div></GlassCard>
            <GlassCard><div className="flex justify-between items-center"><div><p className="text-sm text-muted-foreground">CO₂ Saved</p><p className="text-3xl font-bold">1,247</p></div><TrendingUp className="w-10 h-10 text-secondary" /></div></GlassCard>
            <GlassCard><div className="flex justify-between items-center"><div><p className="text-sm text-muted-foreground">Impact NFTs</p><p className="text-3xl font-bold">{nfts.length}</p></div><Award className="w-10 h-10 text-accent" /></div></GlassCard>
            <GlassCard><div className="flex justify-between items-center"><div><p className="text-sm text-muted-foreground">Active Days</p><p className="text-3xl font-bold">45</p></div><Calendar className="w-10 h-10 text-primary" /></div></GlassCard>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="md:col-span-2 space-y-4">
              <GlassCard>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Your Submissions</h3>
                </div>
                <div className="space-y-4">
                  {projects.map((project, index) => (
                    <motion.div key={project.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="glass rounded-xl p-4 flex items-center justify-between hover:glow-primary transition-smooth">
                      <div className="flex-1">
                        <h4 className="font-bold">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">{project.location}</p>
                      </div>
                      <div className="flex items-center space-x-8">
                        <div className="text-right"><p className="text-sm text-muted-foreground">CO₂ Saved</p><p className="font-bold text-primary">{project.co2}t</p></div>
                        <div className="text-right"><p className="text-sm text-muted-foreground">Status</p><p className={`font-bold ${getStatusDisplay(project.status).color}`}>{getStatusDisplay(project.status).label}</p></div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="space-y-4">
              <GlassCard>
                <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
                <div className="space-y-4">
                  <Button className="w-full glow-primary bg-primary/20 border border-primary hover:bg-primary/30">Submit Project</Button>
                  <Button onClick={() => setRetireModalOpen(true)} className="w-full glow-accent bg-accent/20 border border-accent text-accent hover:bg-accent/30"><Flame className="w-4 h-4 mr-2" /> Retire Credits</Button>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* MY IMPACT NFTS SECTION */}
          <GlassCard>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center"><Award className="w-6 h-6 mr-2 text-accent" /> My Impact NFTs</h3>
            </div>
            {nfts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">You haven't retired any credits yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {nfts.map((nft) => (
                  <GlassCard key={nft._id} className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 bg-accent/20 rounded-bl-xl border-b border-l border-accent">
                      <span className="font-bold text-accent">#{nft.nftId}</span>
                    </div>
                    <div className="mt-6 space-y-2">
                      <h4 className="font-bold text-lg">Project #{nft.projectId}</h4>
                      <p className="text-muted-foreground">Amount Retired: <span className="text-foreground font-bold">{nft.amount} CO₂T</span></p>
                      <p className="text-xs text-muted-foreground truncate pt-4">Tx: {nft.txHash}</p>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </GlassCard>

        </div>
      </div>

      {/* Retire Modal */}
      <AnimatePresence>
        {retireModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md">
              <GlassCard className="relative border-accent">
                <button onClick={() => setRetireModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-2xl font-bold mb-2 flex items-center"><Flame className="w-6 h-6 mr-2 text-accent" /> Retire Credits</h3>
                <p className="text-muted-foreground mb-6">Burn your CarbonTokens to mint a Proof of Impact NFT.</p>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Project</label>
                    <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full bg-background border border-border rounded-md p-2">
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount to Retire (CO₂T)</label>
                    <input type="number" value={retireAmount} onChange={(e) => setRetireAmount(e.target.value)} placeholder="e.g. 50" className="w-full bg-background border border-border rounded-md p-2" />
                  </div>
                </div>

                <Button onClick={handleRetire} className="w-full glow-accent bg-accent/20 border border-accent text-accent hover:bg-accent/30">
                  Confirm Retirement
                </Button>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
