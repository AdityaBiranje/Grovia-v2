import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import { TrendingUp, RefreshCw, Activity, CheckCircle, Wallet } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { MoleculeBackground } from "@/components/MoleculeBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import AMMABI from "../abi/CarbonAMM.json";
import TokenABI from "../abi/CarbonToken.json";

export default function Market() {
  const [account, setAccount] = useState("");
  const [isDemoWallet, setIsDemoWallet] = useState(false);
  const [amountIn, setAmountIn] = useState("");
  const [estimatedOut, setEstimatedOut] = useState("0");
  const [priceImpact, setPriceImpact] = useState("0");
  const [isEthToToken, setIsEthToToken] = useState(true);
  
  const [price, setPrice] = useState("0");
  const [reserves, setReserves] = useState({ eth: "0", tokens: "0" });
  const [chartData, setChartData] = useState<{ time: string; price: number }[]>([]);
  const { toast } = useToast();

  const AMM_ADDRESS = import.meta.env.VITE_AMM_ADDRESS || "0x1291Be112d480055DaFd8a610b7d1e203891C274";
  const TOKEN_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0E801D84Fa97b50751Dbf25036d067dCf18858bF";

  useEffect(() => {
    fetchMarketData();
    generateMockChart();

    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      provider.listAccounts().then(accounts => {
        if(accounts.length > 0) setAccount(accounts[0]);
      });
    }
  }, []);

  // Recalculate estimate whenever amountIn or direction changes
  useEffect(() => {
    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) === 0) {
      setEstimatedOut("0");
      setPriceImpact("0");
      return;
    }
    fetchEstimate();
  }, [amountIn, isEthToToken, reserves]);

  const generateMockChart = () => {
    const data = [];
    let currentPrice = 0.001;
    for (let i = 0; i < 20; i++) {
      currentPrice += (Math.random() - 0.5) * 0.0002;
      data.push({ time: `Day ${i}`, price: Math.max(0.0001, currentPrice) });
    }
    setChartData(data);
  };

  const fetchMarketData = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
      const amm = new ethers.Contract(AMM_ADDRESS, AMMABI.abi || AMMABI, provider);

      const p = await amm.getPrice();
      setPrice(ethers.utils.formatEther(p));

      const res = await amm.getReserves();
      setReserves({
        eth: ethers.utils.formatEther(res[0]),
        tokens: ethers.utils.formatEther(res[1])
      });
      
      setChartData(prev => [...prev.slice(1), { time: "Now", price: parseFloat(ethers.utils.formatEther(p)) }]);
    } catch (err) {
      console.error("Failed to fetch market data:", err);
    }
  };

  const fetchEstimate = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
      const amm = new ethers.Contract(AMM_ADDRESS, AMMABI.abi || AMMABI, provider);
      
      const parsedIn = ethers.utils.parseEther(amountIn);
      const out = await amm.getAmountOut(parsedIn, isEthToToken);
      setEstimatedOut(ethers.utils.formatEther(out));

      // Calculate simple price impact
      if (isEthToToken && Number(reserves.eth) > 0) {
        setPriceImpact(((Number(amountIn) / Number(reserves.eth)) * 100).toFixed(2));
      } else if (!isEthToToken && Number(reserves.tokens) > 0) {
        setPriceImpact(((Number(amountIn) / Number(reserves.tokens)) * 100).toFixed(2));
      }
    } catch (err) {
      console.error("Estimation failed:", err);
      setEstimatedOut("0");
      setPriceImpact("0");
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
        setIsDemoWallet(false);
      } catch (err) {
        console.error(err);
      }
    } else {
      toast({ variant: "destructive", title: "MetaMask not found" });
    }
  };

  const connectDemoWallet = () => {
    setAccount("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    setIsDemoWallet(true);
    toast({ title: "Demo Wallet Connected" });
  };

  const toggleDirection = () => {
    setIsEthToToken(!isEthToToken);
    setAmountIn("");
  };

  const handleSwap = async () => {
    if (!account) return toast({ variant: "destructive", title: "Connect Wallet first" });
    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) === 0) return toast({ variant: "destructive", title: "Invalid amount" });

    try {
      let signer;
      if (isDemoWallet) {
        const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
        signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
      } else {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
      }

      const amm = new ethers.Contract(AMM_ADDRESS, AMMABI.abi || AMMABI, signer);
      const token = new ethers.Contract(TOKEN_ADDRESS, TokenABI.abi || TokenABI, signer);

      const parsedAmount = ethers.utils.parseEther(amountIn);

      if (isEthToToken) {
        toast({ title: "Swapping ETH for CO2T...", description: "Transaction pending" });
        const tx = await amm.swapETHForTokens({ value: parsedAmount });
        await tx.wait();
        toast({ title: "Swap Successful!", description: `Received ~${Number(estimatedOut).toFixed(2)} CO2T` });
      } else {
        toast({ title: "Approving CO2T...", description: "Transaction 1 of 2 pending" });
        const approveTx = await token.approve(AMM_ADDRESS, parsedAmount);
        await approveTx.wait();

        toast({ title: "Swapping CO2T for ETH...", description: "Transaction 2 of 2 pending" });
        const tx = await amm.swapTokensForETH(parsedAmount);
        await tx.wait();
        toast({ title: "Swap Successful!", description: `Received ~${Number(estimatedOut).toFixed(4)} ETH` });
      }

      setAmountIn("");
      fetchMarketData();

    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Swap Failed", description: err.reason || err.message });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <MoleculeBackground />
      <div className="relative z-10 pt-24 pb-12">
        <div className="container mx-auto px-4">
          
          <div className="flex justify-between items-center mb-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text">Carbon Market V2</h1>
              <p className="text-muted-foreground">Live Automated Market Maker with 0.3% Fees</p>
            </motion.div>
            
            <div className="text-right">
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
                <GlassCard className="p-3 py-2 flex flex-col items-end">
                  <p className="text-sm text-muted-foreground">Connected: {account.slice(0,6)}...{account.slice(-4)}</p>
                </GlassCard>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
              <GlassCard className="h-[450px] flex flex-col p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">CO2T Price Chart</h2>
                    <p className="text-primary font-mono text-xl">{Number(price).toFixed(6)} ETH</p>
                  </div>
                  <Button onClick={fetchMarketData} variant="outline" className="border-secondary text-secondary hover:bg-secondary/20">
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                </div>
                
                <div className="flex-1 w-full h-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#4b5563" fontSize={12} />
                      <YAxis stroke="#4b5563" fontSize={12} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(4)} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px' }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold flex items-center">
                    <Activity className="w-6 h-6 mr-2 text-primary" />
                    Swap V2
                  </h2>
                  <div className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded border border-primary/20">
                    Fee: 0.3%
                  </div>
                </div>
                
                <div className="space-y-6 flex-1">
                  <div className="p-4 rounded-lg bg-black/20 border border-primary/20">
                    <div className="flex justify-between text-sm mb-2 text-muted-foreground">
                      <span>Pool Reserves</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ETH Liquidity:</span>
                      <span className="font-mono text-primary">{Number(reserves.eth).toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>CO2T Liquidity:</span>
                      <span className="font-mono text-secondary">{Number(reserves.tokens).toFixed(2)} CO2T</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">You Pay ({isEthToToken ? "ETH" : "CO2T"})</label>
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={amountIn}
                        onChange={(e) => setAmountIn(e.target.value)}
                        className="bg-black/40 border-primary/20 font-mono text-lg"
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <Button onClick={toggleDirection} variant="ghost" className="rounded-full w-10 h-10 p-0 bg-secondary/10 hover:bg-secondary/20 text-secondary">
                        <RefreshCw className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                         <label className="text-sm text-muted-foreground">You Receive ({isEthToToken ? "CO2T" : "ETH"})</label>
                         <span className="text-xs text-muted-foreground">Impact: <span className={Number(priceImpact) > 5 ? "text-destructive" : "text-primary"}>~{priceImpact}%</span></span>
                      </div>
                      <div className="p-3 rounded-lg bg-black/40 border border-primary/20 font-mono text-lg text-secondary">
                        {Number(estimatedOut) > 0 ? Number(estimatedOut).toFixed(6) : "0.000000"}
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSwap}
                  className="w-full mt-6 glow-primary bg-primary/20 hover:bg-primary/30 border border-primary text-primary"
                  size="lg"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {isEthToToken ? "Swap ETH to CO2T" : "Approve & Swap to ETH"}
                </Button>
              </GlassCard>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
