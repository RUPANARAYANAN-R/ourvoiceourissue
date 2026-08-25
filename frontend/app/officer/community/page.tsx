'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Map as MapIcon, Activity, TrendingUp, AlertTriangle, Filter } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

const CommunityMap = dynamic(() => import('@/app/components/CommunityMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-xs text-[var(--nk-text-muted)]">Loading Map...</div>,
});

const CATEGORY_INFO: Record<string, { icon: string; name: string }> = {
  WATER: { icon: '💧', name: 'Water' },
  ROADS: { icon: '🛣️', name: 'Roads' },
  ELECTRICITY: { icon: '⚡', name: 'Electricity' },
  SANITATION: { icon: '🚿', name: 'Sanitation' },
  GOVERNMENT_SERVICES: { icon: '🏛️', name: 'Govt Services' },
};

export default function CommunityIntelligencePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emergingIssues, setEmergingIssues] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emergingData, clusterData] = await Promise.all([
        api.getEmergingIssues(),
        api.getClusters(),
      ]);
      setEmergingIssues(Array.isArray(emergingData) ? emergingData : emergingData.items || []);
      setClusters(Array.isArray(clusterData) ? clusterData : clusterData.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen nk-bg flex items-center justify-center">
        <div className="processing-ring w-12 h-12 border-4"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen nk-bg pb-12 flex flex-col">
      {/* Header */}
      <header className="glass-card mx-4 mt-4 px-6 py-4 flex items-center justify-between sticky top-4 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full hover:bg-[var(--nk-glass-border)] flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--nk-deep-charcoal)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--nk-deep-charcoal)]">Community Intelligence</h1>
            <p className="text-sm text-[var(--nk-text-muted)]">Geospatial cluster analysis and emerging trends</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button className="btn-ghost flex items-center gap-2"><Filter className="w-4 h-4"/> Filter Region</button>
           <button onClick={loadData} className="btn-secondary px-4">Refresh Data</button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 mt-8">
        
        {/* Top KPI Row */}
        <div className="grid md:grid-cols-3 gap-6 mb-8 stagger-reveal">
           <div className="glass-card p-6 border-l-4 border-[var(--nk-critical)]">
              <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[var(--nk-critical)]"/> Anomalous Clusters</p>
              <div className="flex items-baseline gap-2">
                 <p className="text-4xl font-black text-[var(--nk-critical)]">{emergingIssues.length}</p>
                 <p className="text-sm font-bold text-[var(--nk-text-muted)]">detected past 48h</p>
              </div>
           </div>
           
           <div className="glass-card p-6 border-l-4 border-[var(--nk-golden-beige)]">
              <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2"><MapIcon className="w-4 h-4 text-[var(--nk-golden-beige)]"/> Active Hotspots</p>
              <div className="flex items-baseline gap-2">
                 <p className="text-4xl font-black text-[var(--nk-golden-beige)]">{clusters.length}</p>
                 <p className="text-sm font-bold text-[var(--nk-text-muted)]">across all categories</p>
              </div>
           </div>
           
           <div className="glass-card p-6 border-l-4 border-[var(--nk-info)]">
              <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[var(--nk-info)]"/> Primary Trend</p>
              <div className="flex items-baseline gap-2">
                 <p className="text-3xl font-black text-[var(--nk-info)]">Water Supply</p>
                 <p className="text-sm font-bold text-[var(--nk-success)]">+12% WoW</p>
              </div>
           </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[600px] stagger-reveal">
           
           {/* Left: Emerging Issues List */}
           <div className="glass-card flex flex-col overflow-hidden">
              <div className="p-5 border-b border-[var(--nk-glass-border)] bg-white/40">
                <h3 className="font-bold text-[var(--nk-deep-charcoal)]">Critical Emerging Issues</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-red-50/20">
                {emergingIssues.map((issue, i) => (
                  <div key={i} className="mb-4 last:mb-0 p-5 rounded-xl bg-white border border-[var(--nk-critical)]/20 shadow-sm relative overflow-hidden group hover:border-[var(--nk-critical)]/50 transition-colors cursor-pointer">
                     <div className="absolute top-0 left-0 w-1 h-full bg-[var(--nk-critical)]"></div>
                     <div className="flex justify-between items-start mb-2">
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-[var(--nk-critical)]`}>{issue.severity} ALERT</span>
                       <span className="text-[10px] font-bold text-[var(--nk-text-muted)]">RADIUS: {issue.radius_km}KM</span>
                     </div>
                     <h4 className="font-bold text-[var(--nk-deep-charcoal)] mb-1">{CATEGORY_INFO[issue.category]?.icon} {issue.description}</h4>
                     <p className="text-xs text-[var(--nk-text-secondary)]">{issue.complaint_count} identical cases reported.</p>
                  </div>
                ))}
                {emergingIssues.length === 0 && <p className="text-sm text-[var(--nk-text-muted)] text-center mt-10">No critical issues detected.</p>}
              </div>
           </div>

           {/* Center/Right: Heatmap MapLibre Integration */}
           <div className="lg:col-span-2 glass-card flex flex-col overflow-hidden relative">
              <div className="p-5 border-b border-[var(--nk-glass-border)] bg-white/80 absolute top-0 left-0 w-full z-10 backdrop-blur-md flex justify-between items-center shadow-sm">
                 <h3 className="font-bold text-[var(--nk-deep-charcoal)]">Cluster Heatmap</h3>
                 <div className="flex gap-4">
                    <span className="flex items-center gap-2 text-xs font-bold"><div className="w-3 h-3 rounded-full bg-[var(--nk-critical)]"></div> Critical Hotspot</span>
                    <span className="flex items-center gap-2 text-xs font-bold"><div className="w-3 h-3 rounded-full bg-[var(--nk-warning)]"></div> Emerging Trend</span>
                 </div>
              </div>
              
              <div className="flex-1 w-full h-full relative bg-[#e5e3df]">
                <CommunityMap clusters={clusters} />
              </div>
           </div>
        </div>

      </main>
    </div>
  );
}
