
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Lock, 
  History, 
  AlertTriangle, 
  Cpu, 
  Fingerprint,
  RefreshCw,
  Search,
  Database,
  Server,
  Zap,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { Transaction, FraudStatus, SecurityStats, AnalysisResponse, SMPCShares } from './types';
import { processTransaction, encryptValue } from './services/securityEngine';
import { analyzeFraudCase } from './services/geminiService';

const SMPCVisualizer: React.FC<{ 
  isVisible: boolean; 
  amount: number; 
  shares: SMPCShares | null;
  reconstructedValue: number | null;
}> = ({ isVisible, amount, shares, reconstructedValue }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        
        <div className="relative z-10 text-center space-y-12">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">SMPC Private Computation</h3>
            <p className="text-slate-400">Distributing transaction data across isolated compute nodes</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:justify-between">
            {/* Input Node */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
                <Database className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest">Input Value</span>
                <span className="text-lg font-mono text-white">${amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Shares Split Visualization */}
            <div className="flex-1 flex flex-col gap-6 items-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {[
                  { name: 'Node Alpha', val: shares?.partyA, color: 'text-cyan-400', border: 'border-cyan-500/30' },
                  { name: 'Node Beta', val: shares?.partyB, color: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
                  { name: 'Node Gamma', val: shares?.partyC, color: 'text-emerald-400', border: 'border-emerald-500/30' }
                ].map((node, i) => (
                  <div key={i} className={`p-4 rounded-xl bg-slate-950/50 border ${node.border} flex flex-col items-center gap-2 group hover:scale-105 transition-transform`}>
                    <Server className={`w-6 h-6 ${node.color}`} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{node.name}</span>
                    <span className={`text-xs font-mono truncate w-full text-center ${node.color}`}>
                      {node.val ? node.val.toFixed(6) : 'Computing...'}
                    </span>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className={`h-full animate-progress-indefinite ${node.color.replace('text', 'bg')}`} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs italic">
                <Lock className="w-3 h-3" /> No single node can reconstruct the secret value
              </div>
            </div>

            {/* Result Node */}
            <div className="flex flex-col items-center gap-3">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-700 ${
                reconstructedValue !== null ? 'bg-emerald-600/20 border-emerald-500 shadow-emerald-500/20' : 'bg-slate-800 border-slate-700'
              }`}>
                {reconstructedValue !== null ? <Zap className="w-10 h-10 text-emerald-400" /> : <Activity className="w-10 h-10 text-slate-600 animate-spin" />}
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Risk Score</span>
                <span className={`text-lg font-mono font-bold ${reconstructedValue !== null ? 'text-white' : 'text-slate-600'}`}>
                  {reconstructedValue !== null ? (reconstructedValue * 100).toFixed(1) + '%' : '??.?%'}
                </span>
              </div>
            </div>
          </div>

          {reconstructedValue !== null && (
            <div className="pt-8 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-center gap-4 text-emerald-400 font-bold">
                <ShieldCheck className="w-6 h-6" />
                <span>Computation Verified & Reconstructed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [transactions, setTransactions] = useState<(Transaction & { shares: SMPCShares })[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [visualizingShares, setVisualizingShares] = useState<{ amount: number; shares: SMPCShares | null; val: number | null } | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<{ txn: Transaction; analysis: AnalysisResponse } | null>(null);

  const stats: SecurityStats = useMemo(() => {
    const fraud = transactions.filter(t => t.status === FraudStatus.FRAUD).length;
    const normal = transactions.length - fraud;
    const avgRisk = transactions.length > 0 
      ? transactions.reduce((acc, t) => acc + t.fraudScore, 0) / transactions.length 
      : 0;

    return {
      totalTransactions: transactions.length,
      fraudDetected: fraud,
      normalProcessed: normal,
      averageRisk: parseFloat(avgRisk.toFixed(2))
    };
  }, [transactions]);

  const chartData = useMemo(() => [
    { name: 'Legit', value: stats.normalProcessed, color: '#10b981' },
    { name: 'Flagged', value: stats.fraudDetected, color: '#f43f5e' },
  ], [stats]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !amount) return;

    setIsProcessing(true);
    const amtNum = parseFloat(amount);
    
    // 1. Initial State: Starting computation
    setVisualizingShares({ amount: amtNum, shares: null, val: null });

    // 2. Secret Sharing Split Phase
    await new Promise(resolve => setTimeout(resolve, 800));
    const result = processTransaction(email, amtNum);
    setVisualizingShares({ amount: amtNum, shares: result.shares, val: null });

    // 3. MPC Distributed Processing Phase
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 4. Reconstruction Phase
    setVisualizingShares({ amount: amtNum, shares: result.shares, val: result.fraudScore });
    
    // 5. Completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setTransactions(prev => [result, ...prev]);
    
    if (result.status === FraudStatus.FRAUD || result.fraudScore > 0.6) {
      const aiResponse = await analyzeFraudCase(result);
      setActiveAnalysis({ txn: result, analysis: aiResponse });
    } else {
      setActiveAnalysis(null);
    }

    setVisualizingShares(null);
    setIsProcessing(false);
    setEmail('');
    setAmount('');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <SMPCVisualizer 
        isVisible={!!visualizingShares} 
        amount={visualizingShares?.amount || 0}
        shares={visualizingShares?.shares || null}
        reconstructedValue={visualizingShares?.val ?? null}
      />

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">SENTINEL<span className="text-indigo-500">SMPC</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
            <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer group">
              <Activity className="w-4 h-4 text-emerald-500 group-hover:animate-pulse" /> Network Health
            </div>
            <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
              <Database className="w-4 h-4 text-indigo-400" /> MPC Vault
            </div>
            <div className="px-3 py-1 bg-indigo-500/10 rounded-full text-[10px] text-indigo-400 border border-indigo-500/30 uppercase font-bold tracking-widest">
              Automated Device Scan ACTIVE
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-8">
          
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5">
              <Fingerprint className="w-24 h-24" />
            </div>
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 text-indigo-400 ${isProcessing ? 'animate-spin' : ''}`} />
              Initiate Computation
            </h2>
            <form onSubmit={handleAnalyze} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Subject Identifier</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@domain.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm placeholder:text-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Transaction Value (USD)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-mono placeholder:text-slate-700"
                  required
                />
              </div>

              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Automated Engine</p>
                  <p className="text-xs text-slate-400 leading-tight">Device risk, geolocation, and behavioral patterns are computed via private MPC shares.</p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Distributed Processing...
                  </>
                ) : (
                  <>
                    Run Secure MPC Analysis
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Metrics */}
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Intelligence Dashboard
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 group hover:border-indigo-500/50 transition-colors">
                <span className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Total Verified</span>
                <span className="text-2xl font-mono font-bold">{stats.totalTransactions}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 group hover:border-red-500/50 transition-colors">
                <span className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Flagged Risk</span>
                <span className="text-2xl font-mono font-bold text-red-500">{stats.fraudDetected}</span>
              </div>
            </div>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* AI Insights */}
          {activeAnalysis && (
            <section className="bg-indigo-950/20 rounded-2xl border border-indigo-500/30 p-6 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-start gap-5">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/30">
                  <Cpu className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xl text-white">Gemini Threat Analysis</h3>
                    <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-tighter ${
                      activeAnalysis.analysis.threatLevel === 'High' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
                    }`}>
                      {activeAnalysis.analysis.threatLevel} Alert
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-6">
                    {activeAnalysis.analysis.summary}
                  </p>
                  <div className="flex items-center gap-3 p-4 bg-slate-900/80 rounded-xl border border-indigo-500/20">
                    <ShieldAlert className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm font-medium text-indigo-200">Recommended: {activeAnalysis.analysis.recommendation}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* History */}
          <section className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  Computation Audit Log
                </h2>
                <p className="text-xs text-slate-500">Live feed of re-combined MPC processing results</p>
              </div>
              <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                <Search className="w-4 h-4 text-slate-600" />
                <input type="text" placeholder="Filter audit trail..." className="bg-transparent text-xs focus:outline-none w-40" />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                    <th className="px-6 py-4">Transaction Identity</th>
                    <th className="px-6 py-4">SMPC Split Details</th>
                    <th className="px-6 py-4">Risk Aggregation</th>
                    <th className="px-6 py-4 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-slate-600 font-medium italic">
                        Node standby. Awaiting computation initiation...
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-200">${txn.amount.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{txn.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                              <span className="text-[10px] font-mono text-slate-500">A: {txn.shares.partyA.toFixed(4)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />
                              <span className="text-[10px] font-mono text-slate-500">B: {txn.shares.partyB.toFixed(4)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-mono text-slate-500">C: {txn.shares.partyC.toFixed(4)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div 
                                className={`h-full transition-all duration-1000 ${
                                  txn.fraudScore > 0.7 ? 'bg-red-500' : txn.fraudScore > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${txn.fraudScore * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-400">{(txn.fraudScore * 100).toFixed(1)}%</span>
                          </div>
                          <div className="mt-1 text-[9px] text-slate-600 uppercase font-black">Internal Risk Factor: {txn.deviceScore}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter border ${
                            txn.status === FraudStatus.FRAUD 
                              ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                          }`}>
                            {txn.status === FraudStatus.FRAUD ? 'REJECTED' : 'APPROVED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-12 bg-slate-950 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
          <div className="space-y-4 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 opacity-80">
              <ShieldCheck className="w-6 h-6 text-indigo-500" />
              <span className="font-black text-lg tracking-tighter">SENTINEL SMPC</span>
            </div>
            <p className="text-slate-500 max-w-sm leading-relaxed">
              Global privacy standard for secure financial fraud detection. Using mathematical proofs instead of trust.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-slate-400 uppercase tracking-widest">MPC Protocol</h4>
            <ul className="text-slate-500 space-y-2 font-medium">
              <li>• Additive Secret Sharing</li>
              <li>• Shamir's Secret Visualization</li>
              <li>• Oblivious Transfer Simulation</li>
              <li>• BMR Garbled Circuits logic</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-slate-400 uppercase tracking-widest">Legal</h4>
            <ul className="text-slate-500 space-y-2 font-medium">
              <li>• Privacy Policy</li>
              <li>• Audit Trail Verification</li>
              <li>• Terms of Computation</li>
            </ul>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress-indefinite {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 2s infinite linear;
        }
      `}} />
    </div>
  );
};

export default App;
