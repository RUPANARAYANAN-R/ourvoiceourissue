'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const CATEGORY_INFO: Record<string, { icon: string; name: string }> = {
  WATER: { icon: '💧', name: 'Water' },
  ROADS: { icon: '🛣️', name: 'Roads' },
  ELECTRICITY: { icon: '⚡', name: 'Electricity' },
  SANITATION: { icon: '🚿', name: 'Sanitation' },
  GOVERNMENT_SERVICES: { icon: '🏛️', name: 'Govt Services' },
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, sch, g] = await Promise.all([
        api.getDashboardStats(),
        api.listSchemes(),
        api.listGrievances({ page_size: 100 }),
      ]);
      setStats(s);
      setSchemes(sch);
      setGrievances(g.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Build analytics from grievance data
  const categoryBreakdown = Object.entries(stats?.by_category || {}).map(([k, v]) => ({
    category: k, count: v as number, icon: CATEGORY_INFO[k]?.icon || '📋', name: CATEGORY_INFO[k]?.name || k,
  })).sort((a, b) => b.count - a.count);

  const stateBreakdown = Object.entries(stats?.by_state || {}).map(([k, v]) => ({
    state: k, count: v as number,
  })).sort((a, b) => b.count - a.count);

  const priorityBreakdown = [
    { level: 'CRITICAL', count: stats?.critical || 0, color: 'bg-red-500' },
    { level: 'HIGH', count: stats?.high || 0, color: 'bg-orange-500' },
    { level: 'MEDIUM', count: stats?.medium || 0, color: 'bg-amber-500' },
    { level: 'LOW', count: stats?.low || 0, color: 'bg-green-500' },
  ];
  const totalP = priorityBreakdown.reduce((s, p) => s + p.count, 0) || 1;

  // District breakdown
  const districtMap: Record<string, number> = {};
  grievances.forEach(g => {
    const d = g.district || 'Unknown';
    districtMap[d] = (districtMap[d] || 0) + 1;
  });
  const districtBreakdown = Object.entries(districtMap).map(([k, v]) => ({ district: k, count: v })).sort((a, b) => b.count - a.count);

  // SLA breakdown
  const escalatedGrievances = grievances.filter(g => g.escalation_count > 0 || g.sla_status === 'BREACHED');
  const warningGrievances = grievances.filter(g => g.sla_status === 'WARNING');
  const healthyGrievances = grievances.filter(g => g.sla_status === 'WITHIN_SLA' && g.state !== 'RESOLVED' && g.state !== 'CLOSED');

  if (loading) {
    return (
      <div className="min-h-screen nk-bg flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen nk-bg">
      <header className="glass-card mx-4 mt-4 px-6 py-4 flex items-center justify-between rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <h1 className="text-lg font-bold gradient-text">Our Voice — Administration</h1>
            <p className="text-xs text-orange-900/70">System overview & configuration</p>
          </div>
        </div>
        <button onClick={() => router.push('/')} className="text-sm text-orange-900/80 hover:text-orange-950 transition-colors">← Home</button>
      </header>

      <main className="px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: '📊 Analytics' },
            { id: 'sla_monitor', label: '🚨 SLA & Escalations' },
            { id: 'schemes', label: '📜 Schemes' },
            { id: 'rules', label: '⚙️ Rules' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-teal-500/20 text-teal-700 border border-teal-500/30' : 'text-orange-900/80 hover:text-orange-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Analytics Tab ──────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-card p-5 text-center">
                <p className="text-4xl font-bold text-nk-text">{stats?.total_grievances || 0}</p>
                <p className="text-xs text-nk-text-muted mt-1">Total Grievances</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-4xl font-bold text-nk-success">{stats?.resolved_today || 0}</p>
                <p className="text-xs text-nk-text-muted mt-1">Resolved Today</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-4xl font-bold text-nk-critical">{stats?.sla_risks || 0}</p>
                <p className="text-xs text-nk-text-muted mt-1">SLA Risks</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-4xl font-bold text-nk-warning">{stats?.pending_confirmation || 0}</p>
                <p className="text-xs text-nk-text-muted mt-1">Pending Confirmation</p>
              </div>
            </div>

            {/* Priority Distribution Bar */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-orange-900/80 mb-3">Priority Distribution</h3>
              <div className="flex rounded-lg overflow-hidden h-8 mb-3">
                {priorityBreakdown.map(p => (
                  <div key={p.level} className={`${p.color} flex items-center justify-center text-xs font-bold text-orange-950 transition-all`}
                    style={{ width: `${(p.count / totalP) * 100}%`, minWidth: p.count > 0 ? '30px' : '0' }}>
                    {p.count > 0 && p.count}
                  </div>
                ))}
              </div>
              <div className="flex gap-4 justify-center text-xs">
                {priorityBreakdown.map(p => (
                  <span key={p.level} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${p.color}`} />
                    {p.level}: {p.count}
                  </span>
                ))}
              </div>
            </div>

            {/* Category + State + District */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-orange-900/80 mb-3">By Category</h3>
                <div className="space-y-2">
                  {categoryBreakdown.map(c => (
                    <div key={c.category} className="flex items-center justify-between">
                      <span className="text-sm">{c.icon} {c.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-orange-900/5 overflow-hidden">
                          <div className="h-full bg-teal-500/60 rounded-full" style={{ width: `${(c.count / (stats?.total_grievances || 1)) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-orange-950 w-6 text-right">{c.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-orange-900/80 mb-3">By State</h3>
                <div className="space-y-2">
                  {stateBreakdown.slice(0, 8).map(s => (
                    <div key={s.state} className="flex items-center justify-between">
                      <span className="text-xs text-orange-900/90">{s.state.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-bold text-orange-950">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-orange-900/80 mb-3">By District</h3>
                <div className="space-y-2">
                  {districtBreakdown.map(d => (
                    <div key={d.district} className="flex items-center justify-between">
                      <span className="text-sm text-orange-900/90">📍 {d.district}</span>
                      <span className="text-sm font-bold text-orange-950">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── SLA Monitor Tab ─────────────────────────── */}
        {activeTab === 'sla_monitor' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-5 border-l-4 border-l-red-500">
                <h3 className="text-sm font-bold text-red-700 mb-1">SLA Breached (Escalated)</h3>
                <p className="text-4xl font-bold text-red-600">{escalatedGrievances.length}</p>
                <p className="text-xs text-red-900/60 mt-1">Requires immediate attention</p>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-orange-500">
                <h3 className="text-sm font-bold text-orange-700 mb-1">Deadline Approaching</h3>
                <p className="text-4xl font-bold text-orange-600">{warningGrievances.length}</p>
                <p className="text-xs text-orange-900/60 mt-1">Due within 24 hours</p>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-green-500">
                <h3 className="text-sm font-bold text-green-700 mb-1">On Track</h3>
                <p className="text-4xl font-bold text-green-600">{healthyGrievances.length}</p>
                <p className="text-xs text-green-900/60 mt-1">Within SLA limits</p>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-orange-900/80 mb-4 uppercase tracking-wider">Escalated Complaints</h3>
              {escalatedGrievances.length === 0 ? (
                <div className="text-center py-12 text-orange-900/60 italic border border-dashed border-orange-900/20 rounded-xl">
                  No escalated complaints. All departments are meeting SLAs.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-orange-900/10 text-xs font-bold text-orange-900/60 uppercase tracking-wider">
                        <th className="pb-3 pr-4">ID</th>
                        <th className="pb-3 pr-4">Category</th>
                        <th className="pb-3 pr-4">Current Authority</th>
                        <th className="pb-3 pr-4">Escalation Count</th>
                        <th className="pb-3 pr-4">Time Since Breach</th>
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-900/5">
                      {escalatedGrievances.map(g => (
                        <tr key={g.id} className="text-sm hover:bg-orange-900/5 transition-colors">
                          <td className="py-3 pr-4 font-mono font-medium text-orange-950">{g.grievance_id}</td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-orange-900/10 text-orange-900/80">
                              {g.category}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-bold text-orange-950">Level {g.current_authority_level}</div>
                            <div className="text-xs text-orange-900/70">{g.current_authority_name}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                              {g.escalation_count}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-red-600 font-medium text-xs">
                            {g.sla_breached_at ? new Date(g.sla_breached_at).toLocaleDateString() : 'Unknown'}
                          </td>
                          <td className="py-3">
                            <button onClick={() => router.push(`/citizen/track?id=${g.grievance_id}`)} className="text-xs font-bold text-teal-600 hover:text-teal-700">
                              Track &rarr;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Schemes Tab ────────────────────────────── */}
        {activeTab === 'schemes' && (
          <div className="space-y-3">
            <h3 className="text-sm text-orange-900/80 mb-2">{schemes.length} active government schemes</h3>
            {schemes.map((s: any) => (
              <div key={s.scheme_id || s.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-base font-bold text-orange-950">{s.name}</h4>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-teal-500/10 border border-teal-500/30 text-teal-700">
                    {CATEGORY_INFO[s.category]?.icon} {s.category}
                  </span>
                </div>
                {s.description && <p className="text-sm text-orange-900/80 mb-2">{s.description}</p>}
                {s.benefits && (
                  <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs text-emerald-700">💰 {s.benefits}</p>
                  </div>
                )}
                {s.required_documents && (
                  <div className="mt-2">
                    <p className="text-xs text-orange-900/70 mb-1">Required Documents:</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(s.required_documents) ? s.required_documents : []).map((doc: string) => (
                        <span key={doc} className="text-xs px-2 py-0.5 rounded bg-orange-900/5 text-orange-900/80">{doc}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── Rules Tab ──────────────────────────────── */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Category Rules', icon: '🏷️', desc: 'Grievance categories and subcategories with safety flags and essential service markers', file: 'categories.json' },
              { title: 'Routing Rules', icon: '➡️', desc: 'Category → Department mapping with subcategory overrides', file: 'routing_rules.json' },
              { title: 'Priority Rules', icon: '🔥', desc: 'Weighted scoring: safety (30) + essential (25) + duration (15) + previous (15) + population (10)', file: 'priority_rules.json' },
              { title: 'SLA Rules', icon: '⏰', desc: 'SLA hours per category × priority level, risk thresholds, and escalation chain', file: 'sla_rules.json' },
            ].map(rule => (
              <div key={rule.title} className="glass-card p-5">
                <div className="text-2xl mb-2">{rule.icon}</div>
                <h4 className="text-base font-bold text-orange-950 mb-1">{rule.title}</h4>
                <p className="text-sm text-orange-900/80 mb-3">{rule.desc}</p>
                <p className="text-xs text-orange-900/60">📁 rules/{rule.file}</p>
              </div>
            ))}

            {/* Architecture principles */}
            <div className="glass-card p-5 md:col-span-2 border-amber-500/20">
              <h4 className="text-base font-bold text-amber-700 mb-3">⚖️ Architecture Principles</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['AI proposes → Rules validate', 'LLM extracts info but cannot skip governance rules'],
                  ['Deterministic routing', 'Category→Department mapping, never AI-invented'],
                  ['SLA is policy, not preference', 'Calculated from configurable rules per category × priority'],
                  ['Audit everything', 'Every state transition creates an immutable event record'],
                  ['Prefer asking over hallucinating', 'Low confidence → clarification question, not guess'],
                  ['Surface clusters, never auto-merge', 'Similar complaints shown to officer, not auto-grouped'],
                ].map(([title, desc]) => (
                  <div key={title} className="p-3 rounded-lg bg-orange-900/5 border border-orange-900/10">
                    <p className="text-sm font-medium text-orange-950">{title}</p>
                    <p className="text-xs text-orange-900/80">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
