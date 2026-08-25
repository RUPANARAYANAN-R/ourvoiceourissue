'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, MapPin, Activity, Clock, CheckCircle2, AlertTriangle, ShieldCheck, FileText, Briefcase, ChevronRight, XCircle } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import api from '@/lib/api';

const STATE_STEPS = [
  { state: 'CREATED', label: 'Created', icon: FileText },
  { state: 'CLASSIFIED', label: 'Classified', icon: Activity },
  { state: 'ROUTED', label: 'Routed', icon: ShieldCheck },
  { state: 'ACKNOWLEDGED', label: 'Acknowledged', icon: Briefcase },
  { state: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
  { state: 'RESOLVED', label: 'Resolved', icon: CheckCircle2 },
  { state: 'CITIZEN_CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
];

const STATE_ORDER: Record<string, number> = {};
STATE_STEPS.forEach((s, i) => STATE_ORDER[s.state] = i);

function TrackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [grievanceId, setGrievanceId] = useState(searchParams.get('id') || '');
  const [grievance, setGrievance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setGrievanceId(id);
      fetchGrievance(id);
    }
  }, [searchParams]);

  const fetchGrievance = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGrievance(id);
      setGrievance(data);
    } catch (err: any) {
      setError(err.message || 'Grievance not found');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (confirmed: boolean) => {
    try {
      await api.confirmResolution(grievance.grievance_id, confirmed, feedback);
      await fetchGrievance(grievance.grievance_id);
      setShowConfirm(false);
      setFeedback('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const currentStep = grievance ? (STATE_ORDER[grievance.state] ?? -1) : -1;
  const isTerminal = grievance && ['CLOSED', 'RESOLVED', 'CITIZEN_CONFIRMED'].includes(grievance.state);

  // SLA formatting
  const slaDeadlineDate = grievance?.sla_deadline ? new Date(grievance.sla_deadline) : null;
  const isSlaBreached = grievance?.sla_status === 'BREACHED' || (slaDeadlineDate && isPast(slaDeadlineDate) && !isTerminal);
  
  let slaBadgeText = 'Calculating...';
  let slaBadgeColor = 'bg-gray-100 text-gray-600';
  let slaProgressWidth = grievance?.sla_progress_pct || 0;

  if (isTerminal) {
    slaBadgeText = 'Resolution Complete';
    slaBadgeColor = 'bg-green-100 text-green-700';
    slaProgressWidth = 100;
  } else if (isSlaBreached) {
    slaBadgeText = 'SLA Breached (Escalated)';
    slaBadgeColor = 'bg-red-100 text-red-700';
    slaProgressWidth = 100;
  } else if (grievance?.sla_status === 'WARNING') {
    slaBadgeText = 'Deadline Approaching';
    slaBadgeColor = 'bg-orange-100 text-orange-700';
  } else if (grievance?.sla_status === 'WITHIN_SLA') {
    slaBadgeText = 'On Track';
    slaBadgeColor = 'bg-green-100 text-green-700';
  }

  return (
    <div className="min-h-screen nk-bg flex flex-col">
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-[var(--nk-earth-brown)]" />
          <h1 className="text-lg font-bold text-[var(--nk-earth-brown)]">Track Complaint & Accountability</h1>
        </div>
        <button onClick={() => router.push('/')} className="text-sm font-semibold text-[var(--nk-text-muted)] hover:text-[var(--nk-text)]">
          ← Home
        </button>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="flex gap-3 mb-10 fade-in-up">
          <input
            type="text"
            value={grievanceId}
            onChange={(e) => setGrievanceId(e.target.value)}
            placeholder="Enter Grievance ID (e.g., TN-WTR-10482)"
            className="input-field text-lg py-4 shadow-sm"
            onKeyDown={(e) => e.key === 'Enter' && fetchGrievance(grievanceId)}
          />
          <button
            onClick={() => fetchGrievance(grievanceId)}
            disabled={!grievanceId.trim() || loading}
            className="btn-primary px-8 flex items-center gap-2"
          >
            {loading ? <div className="processing-ring w-5 h-5 border-2"></div> : 'Track'}
          </button>
        </div>

        {error && <p className="text-sm text-[var(--nk-critical)] text-center font-bold mb-4">{error}</p>}

        {grievance && (
          <div className="stagger-reveal space-y-6">
            {/* Header Card */}
            <div className={`glass-card p-8 text-center border-t-4 relative overflow-hidden ${
              isSlaBreached ? 'border-t-red-500' : 'border-t-[var(--nk-golden-beige)]'
            }`}>
              <p className="text-sm font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2">Tracking ID</p>
              <p className="text-4xl font-bold text-[var(--nk-deep-charcoal)] tracking-wider mb-4 font-mono">{grievance.grievance_id}</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold badge-${(grievance.priority_level || 'medium').toLowerCase()}`}>
                  {grievance.priority_level} Priority
                </span>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-[var(--nk-glass)] border border-[var(--nk-glass-border)] text-[var(--nk-earth-brown)]">
                  {grievance.category}
                </span>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${slaBadgeColor}`}>
                  {slaBadgeText}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-12 gap-6">
              
              {/* Left Column: Details & SLA */}
              <div className="md:col-span-8 space-y-6">
                
                {/* SLA Countdown Widget */}
                {grievance.sla_deadline && (
                  <div className={`glass-card p-6 border ${isSlaBreached ? 'border-red-200 bg-red-50/30' : 'border-[var(--nk-glass-border)]'}`}>
                     <div className="flex justify-between items-start mb-6">
                       <div>
                         <h3 className="text-sm font-bold text-[var(--nk-earth-brown)] uppercase tracking-wider mb-1 flex items-center gap-2">
                           <Clock className="w-4 h-4" /> 
                           SLA Countdown Tracker
                         </h3>
                         <p className="text-xs text-[var(--nk-text-muted)]">Target Resolution Deadline</p>
                       </div>
                       <div className="text-right">
                         <div className={`text-xl font-bold ${isSlaBreached ? 'text-red-600' : 'text-[var(--nk-deep-charcoal)]'}`}>
                           {slaDeadlineDate ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(slaDeadlineDate) : '—'}
                         </div>
                         <div className={`text-sm font-bold ${isSlaBreached ? 'text-red-500' : 'text-orange-600'}`}>
                           {!isTerminal && slaDeadlineDate ? (
                              isSlaBreached ? 'Overdue by ' + formatDistanceToNow(slaDeadlineDate) : formatDistanceToNow(slaDeadlineDate) + ' remaining'
                           ) : ''}
                         </div>
                       </div>
                     </div>
                     
                     <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
                        <div 
                           className={`h-3 rounded-full transition-all duration-1000 ${
                             isSlaBreached ? 'bg-red-500' : 
                             grievance.sla_status === 'WARNING' ? 'bg-orange-400' : 'bg-green-500'
                           }`}
                           style={{ width: `${Math.min(100, Math.max(0, slaProgressWidth))}%` }}
                        ></div>
                     </div>
                     <div className="flex justify-between text-xs text-[var(--nk-text-muted)] font-medium">
                       <span>Reported</span>
                       <span>Deadline ({grievance.sla_hours} hrs)</span>
                     </div>
                  </div>
                )}

                {/* Progress Tracker */}
                <div className="glass-card p-6">
                  <h3 className="text-sm font-bold text-[var(--nk-earth-brown)] uppercase tracking-wider mb-8">Process Timeline</h3>
                  <div className="relative mb-4">
                    <div className="absolute top-5 left-[5%] w-[90%] h-1 bg-[var(--nk-glass-border)] z-0 rounded-full" />
                    <div 
                      className="absolute top-5 left-[5%] h-1 bg-[var(--nk-golden-beige)] z-0 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_var(--nk-golden-beige)]" 
                      style={{ width: `${(Math.max(0, currentStep) / (STATE_STEPS.length - 1)) * 90}%` }}
                    />
                    <div className="flex justify-between relative z-10">
                      {STATE_STEPS.map((step, i) => {
                        const isCompleted = currentStep >= i;
                        const isCurrent = currentStep === i;
                        const Icon = step.icon;
                        return (
                          <div key={step.state} className="flex flex-col items-center flex-1 px-1 group hidden sm:flex">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                              isCurrent ? 'bg-[var(--nk-golden-beige)] scale-110 pulse-glow text-white border-2 border-white' :
                              isCompleted ? 'bg-[var(--nk-earth-brown)] text-white border-2 border-transparent' : 'bg-white border-2 border-[var(--nk-glass-border)] text-[var(--nk-text-muted)]'
                            }`}>
                              <Icon className={isCurrent ? "w-5 h-5" : "w-4 h-4"} />
                            </div>
                            <p className={`mt-3 text-[10px] text-center break-words leading-tight max-w-[70px] transition-colors ${
                              isCurrent ? 'text-[var(--nk-earth-brown)] font-bold' : 
                              isCompleted ? 'text-[var(--nk-text-secondary)] font-medium' : 'text-[var(--nk-text-muted)]'
                            }`}>
                              {step.label}
                            </p>
                          </div>
                        );
                      })}
                      {/* Mobile compact view */}
                      <div className="sm:hidden flex items-center justify-center w-full">
                         <div className="text-lg font-bold text-[var(--nk-earth-brown)] bg-white px-4 py-2 rounded-full shadow border border-[var(--nk-glass-border)]">
                           Status: {grievance.state.replace(/_/g, ' ')}
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issue Details */}
                <div className="glass-card p-6">
                  <h3 className="text-sm font-bold text-[var(--nk-earth-brown)] uppercase tracking-wider mb-4">Complaint Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-[var(--nk-text-muted)] mb-1">Issue Description</p>
                      <p className="text-sm font-semibold text-[var(--nk-deep-charcoal)]">{grievance.issue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--nk-text-muted)] mb-1">Location</p>
                      <div className="flex items-center gap-1 text-sm font-semibold text-[var(--nk-deep-charcoal)]">
                        <MapPin className="w-4 h-4 text-[var(--nk-earth-brown)]" />
                        {grievance.location_name || '—'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Resolution Action */}
                {grievance.state === 'RESOLVED' && (
                  <div className="glass-card p-8 border-[var(--nk-success)]/30 bg-green-50/50">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-[var(--nk-success)]/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-[var(--nk-success)]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[var(--nk-success)] mb-1">Issue Resolved by Authority</h3>
                        <p className="text-sm font-medium text-[var(--nk-deep-charcoal)]">{grievance.resolution_notes || 'The assigned officer has marked this issue as resolved.'}</p>
                      </div>
                    </div>
                    
                    {!showConfirm ? (
                      <button
                        onClick={() => setShowConfirm(true)}
                        className="w-full py-4 rounded-xl bg-[var(--nk-success)] text-white font-bold text-lg hover:bg-[var(--nk-success)]/90 transition-all shadow-lg"
                      >
                        Confirm Resolution
                      </button>
                    ) : (
                      <div className="space-y-4 scale-in border-t border-[var(--nk-glass-border)] pt-6 mt-6">
                        <h4 className="font-bold text-[var(--nk-deep-charcoal)] text-sm">Did this solve your problem?</h4>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Add any feedback (optional)..."
                          className="input-field h-24 resize-none"
                        />
                        <div className="flex gap-3">
                          <button onClick={() => handleConfirm(true)} className="flex-1 py-3 rounded-xl bg-[var(--nk-success)] text-white font-bold hover:bg-[var(--nk-success)]/90 transition-all">
                            Yes, it's fixed
                          </button>
                          <button onClick={() => handleConfirm(false)} className="flex-1 py-3 rounded-xl bg-[var(--nk-critical)] text-white font-bold hover:bg-[var(--nk-critical)]/90 transition-all">
                            No, reopen issue
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Event Log */}
                {grievance.events && grievance.events.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-bold text-[var(--nk-earth-brown)] uppercase tracking-wider mb-6">Action History</h3>
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:h-full before:w-0.5 before:bg-[var(--nk-glass-border)]">
                      {[...grievance.events].reverse().map((e: any, i: number) => (
                        <div key={e.id} className="relative flex items-start gap-4">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white text-white shadow shrink-0 z-10 mt-1 ${
                             e.to_state === 'ESCALATED' ? 'bg-red-500' :
                             e.to_state === 'RESOLVED' ? 'bg-green-500' : 'bg-[var(--nk-earth-brown)]'
                          }`}>
                            {e.to_state === 'ESCALATED' ? <AlertTriangle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                          </div>
                          <div className="glass-card p-4 flex-1 card-subtle border-l-4 border-l-transparent hover:border-l-[var(--nk-golden-beige)] transition-colors">
                            <div className="flex justify-between items-start mb-1">
                               <div className="font-bold text-sm text-[var(--nk-deep-charcoal)]">{e.to_state?.replace(/_/g, ' ')}</div>
                               <time className="text-xs font-medium text-[var(--nk-text-muted)] whitespace-nowrap ml-2">
                                 {e.created_at ? new Date(e.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : ''}
                               </time>
                            </div>
                            {e.notes && <div className="text-xs text-[var(--nk-text-secondary)] leading-relaxed mt-2">{e.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column: Authority Hierarchy (Escalation Path) */}
              <div className="md:col-span-4">
                <div className="glass-card p-6 sticky top-6">
                   <h3 className="text-sm font-bold text-[var(--nk-earth-brown)] uppercase tracking-wider mb-2 flex items-center gap-2">
                     <ShieldCheck className="w-4 h-4" />
                     Authority Chain
                   </h3>
                   <p className="text-xs text-[var(--nk-text-muted)] mb-6 font-medium leading-relaxed">
                     Every complaint has an owner. If not resolved in time, it automatically escalates up this chain.
                   </p>
                   
                   <div className="space-y-0">
                     {grievance.authority_chain?.map((auth: any, index: number) => {
                        // Determine the visual state of this level
                        const level = auth.level;
                        const currentLevel = grievance.current_authority_level || 1;
                        
                        let status: 'completed' | 'current' | 'breached' | 'future' = 'future';
                        let statusText = 'Pending';
                        
                        // Check history to see if it was breached
                        const historyRecord = grievance.authority_history?.find((h: any) => h.authority_level === level);
                        
                        if (historyRecord) {
                           if (historyRecord.result === 'SLA_BREACHED' || historyRecord.result === 'ESCALATED') {
                              status = 'breached';
                              statusText = 'SLA Breached';
                           } else if (historyRecord.result === 'RESOLVED') {
                              status = 'completed';
                              statusText = 'Resolved Here';
                           }
                        }
                        
                        if (level === currentLevel) {
                           status = isSlaBreached ? 'breached' : 'current';
                           statusText = isSlaBreached ? 'SLA Breached' : 'Current Owner';
                           if (isTerminal) {
                              status = 'completed';
                              statusText = 'Resolved Here';
                           }
                        } else if (level < currentLevel && status === 'future') {
                           // Fallback if no history record exists
                           status = 'breached';
                           statusText = 'Escalated';
                        }
                        
                        return (
                          <div key={level} className="relative pl-6 pb-6 last:pb-0">
                             {/* Connecting line */}
                             {index < grievance.authority_chain.length - 1 && (
                                <div className={`absolute top-6 left-[11px] bottom-[-6px] w-0.5 ${
                                   status === 'completed' || status === 'breached' ? 'bg-gray-300' : 'bg-gray-200'
                                }`}></div>
                             )}
                             
                             {/* Node indicator */}
                             <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white z-10 ${
                                status === 'completed' ? 'border-green-500 text-green-500' :
                                status === 'breached' ? 'border-red-500 text-red-500' :
                                status === 'current' ? 'border-[var(--nk-golden-beige)] shadow-[0_0_8px_var(--nk-golden-beige)]' :
                                'border-gray-300'
                             }`}>
                                {status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                {status === 'breached' && <XCircle className="w-3 h-3" />}
                                {status === 'current' && <div className="w-2 h-2 rounded-full bg-[var(--nk-golden-beige)] animate-pulse"></div>}
                             </div>
                             
                             {/* Content */}
                             <div className={`ml-3 transition-opacity ${status === 'future' ? 'opacity-50' : 'opacity-100'}`}>
                                <div className="flex items-center justify-between mb-1">
                                   <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white ${
                                      status === 'completed' ? 'bg-green-500' :
                                      status === 'breached' ? 'bg-red-500' :
                                      status === 'current' ? 'bg-[var(--nk-earth-brown)]' :
                                      'bg-gray-400'
                                   }`}>
                                      Level {level}
                                   </span>
                                   <span className={`text-[10px] font-bold ${
                                      status === 'completed' ? 'text-green-600' :
                                      status === 'breached' ? 'text-red-600' :
                                      status === 'current' ? 'text-[var(--nk-earth-brown)]' :
                                      'text-gray-400'
                                   }`}>
                                      {statusText}
                                   </span>
                                </div>
                                <p className="text-sm font-bold text-[var(--nk-deep-charcoal)] leading-snug">{auth.name}</p>
                                <p className="text-xs text-[var(--nk-text-muted)] mt-1"></p>
                                
                                {status === 'current' && !isTerminal && (
                                   <div className="mt-2 text-xs font-medium text-[var(--nk-text-secondary)] bg-[var(--nk-sand)] p-2 rounded border border-[var(--nk-glass-border)]">
                                      Allocated Time: {grievance.sla_hours} hrs
                                   </div>
                                )}
                                
                                {status === 'breached' && historyRecord?.escalated_at && (
                                   <div className="mt-2 text-[10px] font-medium text-red-600 bg-red-50 p-2 rounded">
                                      Escalated: {new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(historyRecord.escalated_at))}
                                   </div>
                                )}
                             </div>
                          </div>
                        );
                     })}
                     
                     {(!grievance.authority_chain || grievance.authority_chain.length === 0) && (
                        <p className="text-sm text-[var(--nk-text-muted)] italic">Authority chain loading...</p>
                     )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen nk-bg flex items-center justify-center"><div className="processing-ring w-12 h-12 border-4"></div></div>}>
      <TrackContent />
    </Suspense>
  );
}
