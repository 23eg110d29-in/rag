import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { documentApi, memoryApi, evaluationApi } from '../services/api';
import { FileText, Database, Activity, ShieldCheck, Search, AlertCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const Home = ({ setActivePage }) => {
  const [stats, setStats] = useState({
    documentsCount: 0,
    chunksCount: 0,
    sessionsCount: 0,
    evals: [],
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [docsRes, sessionsRes, evalsRes] = await Promise.all([
          documentApi.list(),
          memoryApi.listSessions(),
          evaluationApi.getMetrics()
        ]);
        
        const docs = docsRes.data?.data || [];
        const totalChunks = docs.reduce((sum, doc) => sum + (doc.totalChunks || 0), 0);
        const sessions = sessionsRes.data?.data || [];
        const evals = evalsRes.data?.data || [];

        setStats({
          documentsCount: docs.length,
          chunksCount: totalChunks,
          sessionsCount: sessions.length,
          evals: evals.slice(0, 10).reverse().map((e, idx) => ({
            name: `Q${idx+1}`,
            mrr: e.metrics.mrr * 100,
            faithfulness: e.metrics.faithfulness * 100,
            hitRate: e.metrics.hitRate * 100,
            hallucination: e.metrics.hallucinationRate * 100
          })),
          avgFaithfulness: evals.length > 0 
            ? (evals.reduce((sum, e) => sum + e.metrics.faithfulness, 0) / evals.length * 100).toFixed(1)
            : 0,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-8 md:p-12 border border-medical-500/20 bg-gradient-to-r from-medical-900/40 via-medical-800/20 to-transparent">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-medical-500/20 to-indigo-500/5 blur-[80px] pointer-events-none" />
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-500/20 border border-medical-500/30 text-medical-300 text-xs font-semibold mb-6">
            <ShieldCheck size={14} />
            Medical Grade Security
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            MedRAG <span className="bg-gradient-to-r from-medical-400 to-indigo-400 bg-clip-text text-transparent">AI Assistant</span>
          </h2>
          <p className="mt-4 text-slate-300 text-sm md:text-base leading-relaxed">
            Advanced Adaptive Corrective RAG pipeline designed for medical domain knowledge. 
            Upload clinical guidelines, research papers, and patient protocols. Get highly-grounded answers with verifiable citations and confidence metrics.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => setActivePage('upload')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-tr from-medical-600 to-medical-500 text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-medical-500/20"
            >
              Upload Clinical Docs
            </button>
            <button
              onClick={() => setActivePage('chat')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-medical-500/30 hover:border-medical-500 text-medical-100 font-semibold text-sm transition-all bg-medical-950/30"
            >
              Consult AI
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="relative overflow-hidden group border-l-4 border-l-medical-500" hoverEffect>
          <div className="absolute top-0 right-0 p-4 text-medical-500/10 transition-transform duration-300 group-hover:scale-110">
            <FileText size={64} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medical Docs</p>
          <h3 className="text-3xl font-extrabold text-white mt-1">
            {stats.loading ? '...' : stats.documentsCount}
          </h3>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group border-l-4 border-l-indigo-500" hoverEffect>
          <div className="absolute top-0 right-0 p-4 text-indigo-500/10 transition-transform duration-300 group-hover:scale-110">
            <Database size={64} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vector Chunks</p>
          <h3 className="text-3xl font-extrabold text-white mt-1">
            {stats.loading ? '...' : stats.chunksCount}
          </h3>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group border-l-4 border-l-emerald-500" hoverEffect>
          <div className="absolute top-0 right-0 p-4 text-emerald-500/10 transition-transform duration-300 group-hover:scale-110">
            <ShieldCheck size={64} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Faithfulness</p>
          <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">
            {stats.loading ? '...' : `${stats.avgFaithfulness}%`}
          </h3>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group border-l-4 border-l-amber-500" hoverEffect>
          <div className="absolute top-0 right-0 p-4 text-amber-500/10 transition-transform duration-300 group-hover:scale-110">
            <Activity size={64} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sessions</p>
          <h3 className="text-3xl font-extrabold text-white mt-1">
            {stats.loading ? '...' : stats.sessionsCount}
          </h3>
        </GlassCard>
      </div>

      {/* RAG Evaluation Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <Search className="text-medical-400" size={20} />
            <h3 className="text-lg font-bold text-white">Retrieval Performance (MRR & Hit Rate)</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.evals} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="mrr" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="MRR (%)" />
                <Line type="monotone" dataKey="hitRate" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="Hit Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="text-emerald-400" size={20} />
            <h3 className="text-lg font-bold text-white">Answer Quality (Faithfulness vs Hallucination)</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.evals} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="faithfulness" fill="#10b981" radius={[4, 4, 0, 0]} name="Faithfulness (%)" />
                <Bar dataKey="hallucination" fill="#ef4444" radius={[4, 4, 0, 0]} name="Hallucination (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Home;
