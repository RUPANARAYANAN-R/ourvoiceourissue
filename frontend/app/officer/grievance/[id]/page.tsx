'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { ArrowLeft, Clock, MapPin, User, FileText, Activity, ShieldCheck, CheckCircle2, Play, Square, Upload } from 'lucide-react';
import api from '@/lib/api';

const CATEGORY_INFO: Record<string, { icon: string; name: string }> = {
  WATER: { icon: '💧', name: 'Water' },
  ROADS: { icon: '🛣️', name: 'Roads' },
  ELECTRICITY: { icon: '⚡', name: 'Electricity' },
  SANITATION: { icon: '🚿', name: 'Sanitation' },
  GOVERNMENT_SERVICES: { icon: '🏛️', name: 'Govt Services' },
};

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
};

export default function GrievanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const [grievance, setGrievance] = useState<any>(null);
  const [similarGrievances, setSimilarGrievances] = useState<any[]>([]);
  const [matchedSchemes, setMatchedSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  
  // Audio playback state (mock for now, as audio is not stored in DB directly in this prototype, only transcript)
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadGrievance();
  }, [id]);

  const loadGrievance = async () => {
    try {
      const data = await api.getGrievance(id);
      setGrievance(data);
      // Load related data in parallel
      try {
        const [simData, schemeData] = await Promise.all([
          api.getSimilar(String(data.id)),
          data.category ? api.matchSchemes(undefined, data.category) : Promise.resolve({ matched_schemes: [] }),
        ]);
        setSimilarGrievances(Array.isArray(simData) ? simData : simData.items || []);
        setMatchedSchemes(schemeData.matched_schemes || []);
      } catch { /* non-critical */ }
    } catch (err: any) {
      setError(err.message || 'Failed to load grievance');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    try {
      if (action === 'acknowledge') await api.acknowledgeGrievance(id);
      else if (action === 'start') await api.startProgress(id);
      else if (action === 'resolve') {
        if (!resolveNotes.trim()) {
          alert('Please enter resolution notes');
          return;
        }
        await api.resolveGrievance(id, resolveNotes);
        setShowResolve(false);
      }
      loadGrievance();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="min-h-screen nk-bg flex items-center justify-center"><div className="processing-ring w-12 h-12 border-4"></div></div>;
  if (error || !grievance) return <div className="min-h-screen nk-bg flex items-center justify-center"><p className="text-[var(--nk-critical)]">{error}</p></div>;

  return (
    <div className="min-h-screen nk-bg pb-12">
      {/* Header */}
      <header className="glass-card mx-4 mt-4 px-6 py-4 flex items-center justify-between sticky top-4 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full hover:bg-[var(--nk-glass-border)] flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--nk-deep-charcoal)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--nk-deep-charcoal)] font-mono">{grievance.grievance_id}</h1>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${PRIORITY_BADGE[grievance.priority_level]}`}>{grievance.priority_level}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--nk-glass-border)] text-[var(--nk-earth-brown)]">{grievance.state?.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
        
        {/* Workflow Actions */}
        <div className="flex gap-3">
          {['ROUTED'].includes(grievance.state) && (
            <button onClick={() => handleAction('acknowledge')} className="btn-secondary px-6">
              Acknowledge Case
            </button>
          )}
          {['ACKNOWLEDGED', 'REOPENED'].includes(grievance.state) && (
            <button onClick={() => handleAction('start')} className="btn-primary px-6">
              Begin Work
            </button>
          )}
          {['IN_PROGRESS', 'SLA_WARNING', 'ESCALATED'].includes(grievance.state) && (
            <button onClick={() => setShowResolve(true)} className="btn-primary px-6 bg-[var(--nk-success)] hover:bg-[var(--nk-success)]/90 text-white">
              <CheckCircle2 className="w-4 h-4 inline mr-2" /> Mark Resolved
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Issue Summary */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-4 border-b border-[var(--nk-glass-border)] pb-2">Issue Summary</h2>
            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl">{CATEGORY_INFO[grievance.category]?.icon}</div>
              <div>
                <p className="text-lg font-bold text-[var(--nk-deep-charcoal)] leading-snug">{grievance.issue}</p>
                <p className="text-sm text-[var(--nk-text-secondary)]">{grievance.subcategory?.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
               <div>
                 <p className="text-xs text-[var(--nk-text-muted)] mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</p>
                 <p className="text-sm font-semibold text-[var(--nk-deep-charcoal)]">
                   {grievance.location_name || (grievance.latitude ? 'GPS Location Provided' : '—')}
                 </p>
                 {grievance.latitude && grievance.longitude && (
                   <a 
                     href={`https://maps.google.com/?q=${grievance.latitude},${grievance.longitude}`} 
                     target="_blank" 
                     rel="noreferrer"
                     className="text-[10px] text-[var(--nk-golden-beige)] hover:underline flex items-center gap-1 mt-1 font-mono"
                   >
                     {grievance.latitude.toFixed(5)}, {grievance.longitude.toFixed(5)} ↗
                   </a>
                 )}
               </div>
               <div>
                 <p className="text-xs text-[var(--nk-text-muted)] mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Duration</p>
                 <p className="text-sm font-semibold text-[var(--nk-deep-charcoal)]">{grievance.duration_days ? `${grievance.duration_days} days` : '—'}</p>
               </div>
               <div>
                 <p className="text-xs text-[var(--nk-text-muted)] mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Department</p>
                 <p className="text-sm font-semibold text-[var(--nk-deep-charcoal)] truncate" title={grievance.department_name}>{grievance.department_name}</p>
               </div>
               <div>
                 <p className="text-xs text-[var(--nk-text-muted)] mb-1 flex items-center gap-1"><User className="w-3 h-3"/> Citizen</p>
                 <p className="text-sm font-semibold text-[var(--nk-deep-charcoal)]">{grievance.citizen_name || 'Anonymous'}</p>
               </div>
               <div>
                 <p className="text-xs text-[var(--nk-text-muted)] mb-1">Previous Complaint</p>
                 <p className={`text-sm font-semibold ${grievance.previous_complaint ? 'text-[var(--nk-warning)]' : 'text-[var(--nk-deep-charcoal)]'}`}>{grievance.previous_complaint ? 'Yes' : 'No'}</p>
               </div>
               <div>
                 <p className="text-xs text-[var(--nk-text-muted)] mb-1">Affected Population</p>
                 <p className="text-sm font-semibold text-[var(--nk-deep-charcoal)]">{grievance.affected_population || '—'}</p>
               </div>
               <div>
                 <p className="text-xs text-[var(--nk-text-muted)] mb-1">Evidence Attached</p>
                 <p className="text-sm font-semibold text-[var(--nk-deep-charcoal)]">{grievance.evidence?.length || 0} item(s)</p>
               </div>
               <div>
                 <p className="text-xs text-[var(--nk-text-muted)] mb-1">Related Complaints</p>
                 <p className={`text-sm font-semibold ${similarGrievances.length > 0 ? 'text-[var(--nk-critical)]' : 'text-[var(--nk-deep-charcoal)]'}`}>{similarGrievances.length} found</p>
               </div>
            </div>
          </div>

          {/* Related Complaints (Community Intelligence) */}
          {similarGrievances.length > 0 && (
            <div className="glass-card p-6 border-l-4 border-[var(--nk-critical)] fade-in-up">
              <h2 className="text-sm font-bold text-[var(--nk-critical)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4"/> 🚨 Community Alert — {similarGrievances.length} Related Complaints
              </h2>
              <p className="text-sm text-[var(--nk-text-secondary)] mb-4">
                Similar {CATEGORY_INFO[grievance.category]?.name || grievance.category} complaints detected nearby. This may indicate an emerging civic issue.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {similarGrievances.slice(0, 8).map((sim: any) => (
                  <div key={sim.grievance_id} onClick={() => router.push(`/officer/grievance/${sim.grievance_id}`)} className="flex items-center justify-between p-3 rounded-lg bg-white/60 border border-[var(--nk-glass-border)] cursor-pointer hover:bg-white transition-colors">
                    <div>
                      <span className="text-xs font-mono font-bold text-[var(--nk-earth-brown)]">{sim.grievance_id}</span>
                      <p className="text-xs text-[var(--nk-text-muted)] line-clamp-1">{sim.issue}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[var(--nk-golden-beige)]">{Math.round(sim.similarity_score * 100)}% match</p>
                      {sim.distance_km != null && <p className="text-[10px] text-[var(--nk-text-muted)]">{sim.distance_km}km away</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Government Schemes */}
          {matchedSchemes.length > 0 && (
            <div className="glass-card p-6 border-l-4 border-[var(--nk-cat-gov)] fade-in-up">
              <h2 className="text-sm font-bold text-[var(--nk-cat-gov)] uppercase tracking-wider mb-4 flex items-center gap-2">
                🏛️ Related Government Schemes
              </h2>
              <div className="space-y-3">
                {matchedSchemes.map((scheme: any) => (
                  <div key={scheme.scheme_id || scheme.id} className="p-4 rounded-lg bg-white/60 border border-[var(--nk-glass-border)]">
                    <p className="text-sm font-bold text-[var(--nk-deep-charcoal)]">{scheme.name}</p>
                    
                    {scheme.benefits && <p className="text-xs text-[var(--nk-success)] mt-1">💰 {scheme.benefits}</p>}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--nk-text-muted)] mt-3 italic">Preliminary matches only. Actual eligibility must be verified by the relevant authority.</p>
            </div>
          )}

          {/* Voice & Transcript */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-4 border-b border-[var(--nk-glass-border)] pb-2">Original Voice Input</h2>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
               <div className="w-full md:w-1/3 bg-[var(--nk-bg-surface)] p-4 rounded-xl flex flex-col items-center justify-center gap-4">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 rounded-full bg-[var(--nk-golden-beige)] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                    {isPlaying ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>
                  <div className="w-full h-8 flex items-center justify-center gap-1 opacity-50">
                     {[...Array(15)].map((_, i) => (
                       <div key={i} className={`w-1 bg-[var(--nk-earth-brown)] rounded-full ${isPlaying ? 'wave-bar' : ''}`} style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.05}s` }} />
                     ))}
                  </div>
               </div>
               <div className="w-full md:w-2/3">
                  <p className="text-xs font-bold text-[var(--nk-text-muted)] mb-2">Tamil Transcript</p>
                  <div className="p-4 rounded-xl bg-white/50 border border-[var(--nk-glass-border)] text-[var(--nk-deep-charcoal)] font-tamil text-lg">
                    "{grievance.transcript}"
                  </div>
                  {grievance.normalized_text && grievance.normalized_text !== grievance.transcript && (
                    <div className="mt-3 p-3 rounded-xl bg-white/30 text-[var(--nk-text-secondary)] font-tamil text-sm">
                      <span className="font-bold text-[var(--nk-text-muted)] text-xs mr-2">Normalized:</span>
                      {grievance.normalized_text}
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Resolution Panel (Slide down if active) */}
          {showResolve && (
             <div className="glass-card p-6 border-2 border-[var(--nk-success)]/50 bg-green-50/30 scale-in">
                <h2 className="text-lg font-bold text-[var(--nk-success)] mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Resolve Grievance</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[var(--nk-deep-charcoal)] mb-2">Resolution Notes (Visible to Citizen)</label>
                    <textarea 
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      placeholder="Explain how the issue was resolved..."
                      className="input-field h-24 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-[var(--nk-glass-border)] text-sm font-bold text-[var(--nk-text-muted)] hover:text-[var(--nk-deep-charcoal)] transition-colors">
                      <Upload className="w-4 h-4"/> Upload Evidence Photo
                    </button>
                    <span className="text-xs text-[var(--nk-text-muted)]">Optional but recommended</span>
                  </div>
                  <div className="flex gap-3 justify-end pt-4 border-t border-[var(--nk-glass-border)]">
                    <button onClick={() => setShowResolve(false)} className="btn-ghost">Cancel</button>
                    <button onClick={() => handleAction('resolve')} className="btn-primary bg-[var(--nk-success)] hover:bg-[var(--nk-success)]/90 text-white">Confirm Resolution</button>
                  </div>
                </div>
             </div>
          )}

        </div>

        {/* Right Column: AI Trace & Timeline */}
        <div className="space-y-6">
          
          {/* AI Decision Trace */}
          <div className="glass-card p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--nk-golden-beige)]/10 rounded-bl-full pointer-events-none"></div>
             <h2 className="text-sm font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-4 border-b border-[var(--nk-glass-border)] pb-2 flex items-center gap-2">
               <Activity className="w-4 h-4"/> AI Decision Trace
             </h2>
             
             <div className="space-y-4 relative z-10">
               {/* Priority Trace */}
               <div className="p-3 bg-white/50 rounded-xl border border-[var(--nk-glass-border)]">
                 <p className="text-xs font-bold text-[var(--nk-text-muted)] mb-2">Priority Calculation</p>
                 {grievance.priority_breakdown ? (
                   <div>
                     <div className="flex justify-between items-end mb-2">
                       <span className={`text-lg font-black ${PRIORITY_BADGE[grievance.priority_level]}`}>{grievance.priority_level}</span>
                       <span className="text-sm font-bold text-[var(--nk-earth-brown)]">Score: {grievance.priority_breakdown.total_score}</span>
                     </div>
                     <ul className="text-xs text-[var(--nk-text-secondary)] space-y-1">
                       <li className="flex justify-between"><span>Base (Category/Sub)</span> <span>{grievance.priority_breakdown.base_score}</span></li>
                       <li className="flex justify-between"><span>Duration Impact</span> <span>+{grievance.priority_breakdown.duration_modifier}</span></li>
                       <li className="flex justify-between"><span>History Impact</span> <span>+{grievance.priority_breakdown.history_modifier}</span></li>
                     </ul>
                   </div>
                 ) : (
                   <p className="text-sm text-[var(--nk-text-muted)]">No calculation trace available.</p>
                 )}
               </div>

               {/* SLA Trace */}
               <div className="p-3 bg-white/50 rounded-xl border border-[var(--nk-glass-border)]">
                 <p className="text-xs font-bold text-[var(--nk-text-muted)] mb-2">SLA Assignment</p>
                 <div className="flex justify-between items-center">
                   <span className="text-sm font-bold text-[var(--nk-deep-charcoal)]">{grievance.sla_hours} Hours Target</span>
                   {grievance.sla_deadline && (
                     <span className={`text-xs font-bold px-2 py-1 rounded ${grievance.sla_risk === 'RED' ? 'bg-red-100 text-red-700' : grievance.sla_risk === 'AMBER' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                       {grievance.sla_risk === 'RED' ? 'BREACHED' : grievance.sla_risk === 'AMBER' ? 'AT RISK' : 'ON TRACK'}
                     </span>
                   )}
                 </div>
                 <p className="text-[10px] text-[var(--nk-text-muted)] mt-1">Deadline: {grievance.sla_deadline ? new Date(grievance.sla_deadline).toLocaleString() : 'N/A'}</p>
               </div>
             </div>
          </div>

          {/* Timeline */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-6 border-b border-[var(--nk-glass-border)] pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4"/> Case Timeline
            </h2>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--nk-golden-beige)] before:via-[var(--nk-glass-border)] before:to-transparent">
              {grievance.events?.map((e: any, i: number) => (
                <div key={e.id} className="relative flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-[var(--nk-sand)] text-[var(--nk-earth-brown)] shadow shrink-0 z-10 mt-1">
                    <FileText className="w-3 h-3" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--nk-deep-charcoal)]">{e.to_state?.replace(/_/g, ' ')}</p>
                    <p className="text-xs font-medium text-[var(--nk-text-muted)] mb-1">{e.created_at ? new Date(e.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : ''}</p>
                    {e.notes && <p className="text-xs text-[var(--nk-text-secondary)] bg-white/50 p-2 rounded border border-[var(--nk-glass-border)]">{e.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
