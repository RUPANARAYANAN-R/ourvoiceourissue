'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, Clock, Map as MapIcon, ArrowRight, CheckCircle2, ShieldAlert, ListFilter } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

const DashboardMap = dynamic(() => import('@/app/components/DashboardMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-xs text-[var(--nk-text-muted)]">Loading Map...</div>,
});

const CATEGORY_INFO: Record<string, { icon: string; color: string; name: string }> = {
  WATER: { icon: '💧', color: 'text-[var(--nk-cat-water)]', name: 'Water' },
  ROADS: { icon: '🛣️', color: 'text-[var(--nk-cat-roads)]', name: 'Roads' },
  ELECTRICITY: { icon: '⚡', color: 'text-[var(--nk-cat-electricity)]', name: 'Electricity' },
  SANITATION: { icon: '🚿', color: 'text-[var(--nk-cat-sanitation)]', name: 'Sanitation' },
  GOVERNMENT_SERVICES: { icon: '🏛️', color: 'text-[var(--nk-cat-gov)]', name: 'Govt Services' },
};

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
};

export default function OfficerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [grievances, setGrievances] = useState<any[]>([]);
  const [slaRisks, setSlaRisks] = useState<any[]>([]);
  const [emergingIssues, setEmergingIssues] = useState<any[]>([]);
  const [mapPoints, setMapPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('nk_user') || '{}') : {};

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsData, grievanceData, slaData, emergingData, mapData] = await Promise.all([
        api.getDashboardStats(),
        api.listGrievances({ page_size: 20, sort_by: 'priority_score', sort_order: 'desc', state: 'ROUTED' }),
        api.getSlaRisks(),
        api.getEmergingIssues(),
        api.getHeatmap()
      ]);
      setStats(statsData);
      setGrievances(grievanceData.items || []);
      setSlaRisks(Array.isArray(slaData) ? slaData : slaData.items || []);
      setEmergingIssues(Array.isArray(emergingData) ? emergingData : emergingData.items || []);
      setMapPoints(Array.isArray(mapData) ? mapData : mapData.points || []);
    } catch (err) {
      console.error('Dashboard load failed:', err);
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

  // Calculate 2x2 grid data
  const criticalQueue = grievances.filter(g => g.priority_level === 'CRITICAL' || g.priority_level === 'HIGH').slice(0, 5);

  return (
    <div className="min-h-screen nk-bg flex flex-col">
      {/* Header */}
      <header className="glass-card mx-4 mt-4 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--nk-golden-beige)] flex items-center justify-center text-white font-bold text-lg">
            {user.name?.charAt(0) || 'O'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--nk-deep-charcoal)]">Good Morning, {user.name || 'Officer'}.</h1>
            <p className="text-sm text-[var(--nk-text-muted)]">Here's what needs attention today.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadDashboard} className="btn-ghost">Refresh</button>
          <button onClick={() => { localStorage.removeItem('nk_token'); router.push('/'); }} className="btn-secondary px-6">Logout</button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-[1600px] mx-auto w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 fade-in-up">
          <div className="glass-card p-5">
            <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-1">Total Active</p>
            <p className="text-3xl font-bold text-[var(--nk-deep-charcoal)]">{stats?.total_grievances || 0}</p>
          </div>
          <div className="glass-card p-5 border-l-4 border-[var(--nk-priority-critical)]">
            <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-1">Critical Priority</p>
            <p className="text-3xl font-bold text-[var(--nk-priority-critical)]">{stats?.critical || 0}</p>
          </div>
          <div className="glass-card p-5 border-l-4 border-[var(--nk-priority-high)]">
            <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-1">High Priority</p>
            <p className="text-3xl font-bold text-[var(--nk-priority-high)]">{stats?.high || 0}</p>
          </div>
          <div className="glass-card p-5 border-l-4 border-[var(--nk-warning)]">
            <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-1">SLA Risks</p>
            <p className="text-3xl font-bold text-[var(--nk-warning)]">{stats?.sla_risks || 0}</p>
          </div>
          <div className="glass-card p-5 border-l-4 border-[var(--nk-golden-beige)] cursor-pointer hover:bg-[var(--nk-white)]/50 transition-colors" onClick={() => router.push('/officer/community')}>
            <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-1">Emerging Issues</p>
            <div className="flex items-center justify-between">
               <p className="text-3xl font-bold text-[var(--nk-golden-beige)]">{emergingIssues.length}</p>
               <ArrowRight className="w-5 h-5 text-[var(--nk-golden-beige)] opacity-50" />
            </div>
          </div>
        </div>

        {/* 2x2 Grid Layout */}
        <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-220px)] min-h-[600px] stagger-reveal">
          
          {/* Top Left: Priority Queue */}
          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[var(--nk-glass-border)] flex justify-between items-center bg-white/40">
              <div className="flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-[var(--nk-earth-brown)]" />
                <h3 className="font-bold text-[var(--nk-deep-charcoal)]">Priority Queue</h3>
              </div>
              <button className="text-xs font-bold text-[var(--nk-golden-beige)] hover:text-[var(--nk-earth-brown)]">View All</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {criticalQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--nk-text-muted)]">
                   <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                   <p>Queue is clear.</p>
                </div>
              ) : (
                criticalQueue.map((g) => (
                  <div key={g.grievance_id} onClick={() => router.push(`/officer/grievance/${g.grievance_id}`)} className="p-4 m-2 rounded-xl bg-white/60 hover:bg-white border border-[var(--nk-glass-border)] cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${PRIORITY_BADGE[g.priority_level]}`}>{g.priority_level}</span>
                        <span className="text-xs font-mono text-[var(--nk-text-muted)]">{g.grievance_id}</span>
                      </div>
                      <span className="text-xs font-bold text-[var(--nk-earth-brown)] group-hover:translate-x-1 transition-transform">Review →</span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--nk-deep-charcoal)] mb-2 line-clamp-1">{g.issue}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--nk-text-muted)]">
                      <span className="flex items-center gap-1" title={g.latitude ? `${g.latitude}, ${g.longitude}` : ''}>
                        <MapIcon className="w-3 h-3" /> 
                        {g.location_name || (g.latitude ? `${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)}` : 'Unknown')}
                      </span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {g.duration_days ? `${g.duration_days} days` : 'New'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Right: Emerging Issues */}
          <div className="glass-card flex flex-col overflow-hidden border-[var(--nk-critical)]/20 relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-[var(--nk-critical)]"></div>
             <div className="p-5 border-b border-[var(--nk-glass-border)] flex justify-between items-center bg-red-50/30">
               <div className="flex items-center gap-2">
                 <ShieldAlert className="w-5 h-5 text-[var(--nk-critical)] emerging-pulse rounded-full" />
                 <h3 className="font-bold text-[var(--nk-critical)]">Emerging Community Issues</h3>
               </div>
               <button onClick={() => router.push('/officer/community')} className="text-xs font-bold text-[var(--nk-critical)] hover:underline">Deep Dive</button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 bg-red-50/10">
                {emergingIssues.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--nk-text-muted)]">
                     <p>No anomalous clusters detected.</p>
                  </div>
                ) : (
                  emergingIssues.map((issue, i) => (
                    <div key={i} className="mb-4 last:mb-0 p-5 rounded-xl bg-white border border-[var(--nk-critical)]/20 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5">
                          <Activity className="w-24 h-24 text-[var(--nk-critical)]" />
                       </div>
                       <div className="flex justify-between items-start mb-3 relative z-10">
                         <span className={`text-xs font-bold px-2 py-1 rounded bg-red-100 text-[var(--nk-critical)]`}>{issue.severity}</span>
                         <span className="text-xs font-bold text-[var(--nk-text-muted)]">{issue.time_window_hours}h trend</span>
                       </div>
                       <h4 className="font-bold text-lg text-[var(--nk-deep-charcoal)] mb-1 relative z-10">{CATEGORY_INFO[issue.category]?.icon} {issue.description}</h4>
                       <p className="text-sm text-[var(--nk-text-secondary)] mb-2 relative z-10">
                         {CATEGORY_INFO[issue.category]?.name || issue.category} disruption detected in this locality — {issue.complaint_count} related complaints within {issue.time_window_hours}h.
                       </p>
                       <p className="text-xs text-[var(--nk-text-muted)] mb-4 relative z-10">Radius: {issue.radius_km}km • {issue.grievance_ids?.length || issue.complaint_count} linked cases</p>
                       <button onClick={() => router.push('/officer/community')} className="text-sm font-bold text-[var(--nk-critical)] flex items-center gap-1 hover:gap-2 transition-all">
                         View Heatmap <ArrowRight className="w-4 h-4" />
                       </button>
                    </div>
                  ))
                )}
             </div>
          </div>

          {/* Bottom Left: Live Map / Geographic Distribution */}
          <div className="glass-card flex flex-col overflow-hidden relative">
            <div className="p-5 border-b border-[var(--nk-glass-border)] flex justify-between items-center bg-white/80 absolute top-0 left-0 w-full z-10 backdrop-blur-md shadow-sm">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-[var(--nk-earth-brown)]" />
                <h3 className="font-bold text-[var(--nk-deep-charcoal)]">Live Geospatial View</h3>
              </div>
            </div>
            
            <div className="flex-1 w-full h-full relative bg-[#e5e3df]">
              <DashboardMap mapPoints={mapPoints} />
            </div>
          </div>

          {/* Bottom Right: SLA Monitor */}
          <div className="glass-card flex flex-col overflow-hidden">
             <div className="p-5 border-b border-[var(--nk-glass-border)] flex justify-between items-center bg-white/40">
               <div className="flex items-center gap-2">
                 <Clock className="w-5 h-5 text-[var(--nk-warning)]" />
                 <h3 className="font-bold text-[var(--nk-deep-charcoal)]">SLA Monitor</h3>
               </div>
               <span className="text-xs font-bold text-[var(--nk-text-muted)]">{slaRisks.length} At Risk</span>
             </div>
             <div className="flex-1 overflow-y-auto p-4 bg-amber-50/30">
               {slaRisks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--nk-text-muted)]">
                     <p>All cases on track. No SLA breaches.</p>
                  </div>
                ) : (
                  slaRisks.map((risk) => (
                    <div key={risk.grievance_id} onClick={() => router.push(`/officer/grievance/${risk.grievance_id}`)} className="mb-3 last:mb-0 p-4 rounded-xl bg-white border border-[var(--nk-glass-border)] shadow-sm flex items-center justify-between cursor-pointer hover:border-[var(--nk-warning)] transition-colors">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="text-sm font-bold text-[var(--nk-deep-charcoal)]">{risk.grievance_id}</span>
                           <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${risk.risk_level === 'RED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                             {risk.risk_level === 'RED' ? 'BREACHED' : 'WARNING'}
                           </span>
                         </div>
                         <p className="text-xs text-[var(--nk-text-muted)]">{risk.priority_level} Priority</p>
                       </div>
                       <div className={`text-right ${risk.risk_level === 'RED' ? 'text-red-700' : 'text-amber-700'}`}>
                         <p className="text-lg font-bold">{Math.abs(Math.round(risk.hours_remaining))}h</p>
                         <p className="text-[10px] font-bold uppercase">{risk.hours_remaining < 0 ? 'Overdue' : 'Remaining'}</p>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
