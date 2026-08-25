'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mic, ArrowRight, Activity, Shield, Users, Map, Lightbulb, CheckCircle2, Ear, Brain, LineChart, FileText } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[var(--nk-bg-deep)] text-[var(--nk-text)] overflow-x-hidden selection:bg-[var(--nk-golden-beige)] selection:text-[var(--nk-deep-charcoal)]">
      {/* ─── 1. HERO SECTION ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/hero-bg.png" 
            alt="Rural Tamil Nadu" 
            fill 
            className="object-cover object-center opacity-90"
            priority
          />
          <div className="hero-overlay" />
        </div>

        <div className="container relative z-10 mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center gap-12 pt-20">
          {/* Left Text */}
          <div className="flex-1 max-w-2xl fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--nk-success)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--nk-success)]"></span>
              </span>
              <span className="text-sm font-semibold tracking-wide text-[var(--nk-earth-brown)]">LIVE IN INDIA</span>
            </div>
            
            <h1 className="text-display mb-6">
              AI-Powered <br />
              <span className="gradient-text">Governance</span> <br />
              Intelligence.
            </h1>
            
            <p className="text-subheading mb-4 text-[var(--nk-text-secondary)] font-tamil">
              Our voice. Our issues. Towards the right solution.
            </p>
            <p className="text-lg text-[var(--nk-text-muted)] mb-10 max-w-xl">
              Our voice is an AI-powered intelligence layer that converts natural citizen speech into structured, validated, and actionable government service requests.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => router.push('/citizen/intake')}
                className="btn-primary text-lg flex items-center justify-center gap-3 group"
              >
                <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Speak Your Issue</span>
              </button>
              <button 
                onClick={() => router.push('/officer/dashboard')}
                className="btn-secondary text-lg flex items-center justify-center gap-3 group"
              >
                <span>Officer Dashboard</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Floating Elements */}
          <div className="flex-1 w-full relative h-[400px] hidden lg:block">
            {/* Floating Card 1 */}
            <div className="absolute top-[10%] left-[10%] w-64 glass-card p-4 float-particle" style={{ animationDelay: '0s' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-blue-700" />
                </div>
                <div className="h-2 w-24 bg-[var(--nk-glass-border)] rounded"></div>
              </div>
              <p className="text-sm text-[var(--nk-text-secondary)]">"No water supply in our area for 3 days"</p>
            </div>

            {/* Floating Card 2 */}
            <div className="absolute top-[40%] right-[0%] w-72 glass-card p-4 float-particle shadow-xl border-[var(--nk-golden-beige)]" style={{ animationDelay: '1s' }}>
               <div className="flex items-center justify-between mb-3">
                 <span className="text-xs font-bold text-[var(--nk-earth-brown)]">AI EXTRACTION</span>
                 <span className="badge-high">HIGH PRIORITY</span>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm"><span className="text-[var(--nk-text-muted)]">Category:</span> <span className="font-semibold text-blue-700">WATER</span></div>
                 <div className="flex justify-between text-sm"><span className="text-[var(--nk-text-muted)]">Issue:</span> <span className="font-semibold text-[var(--nk-earth-brown)]">NO_SUPPLY</span></div>
                 <div className="flex justify-between text-sm"><span className="text-[var(--nk-text-muted)]">Duration:</span> <span className="font-semibold text-[var(--nk-earth-brown)]">3 days</span></div>
               </div>
            </div>

             {/* Floating Card 3 */}
             <div className="absolute bottom-[10%] left-[20%] w-64 glass-card p-4 float-particle" style={{ animationDelay: '2s' }}>
               <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-[var(--nk-success)]" />
                  <div>
                    <p className="text-sm font-bold text-[var(--nk-text)]">Routed to TWAD</p>
                    <p className="text-xs text-[var(--nk-text-muted)]">SLA: 24 Hours</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. HOW IT WORKS (PIPELINE) ────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--nk-bg-base)]">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-heading mb-4">The Our voice Workflow</h2>
            <div className="section-divider mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 stagger-reveal">
            {[
              { icon: Ear, title: "1. Citizen Voice", desc: "Citizen speaks naturally in Tamil or Tanglish." },
              { icon: Brain, title: "2. AI Understanding", desc: "AI extracts intent, category, and urgency." },
              { icon: Shield, title: "3. Rule Validation", desc: "Deterministic rules validate and route." },
              { icon: Activity, title: "4. Human Action", desc: "Officers resolve based on clear intelligence." },
            ].map((step, i) => (
              <div key={i} className="glass-card p-6 text-center card-hover relative group">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--nk-sand)] flex items-center justify-center mb-6 group-hover:bg-[var(--nk-golden-beige)] transition-colors">
                  <step.icon className="w-8 h-8 text-[var(--nk-earth-brown)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                <p className="text-sm text-[var(--nk-text-secondary)]">{step.desc}</p>
                {/* Arrow connector for desktop */}
                {i < 3 && <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-[var(--nk-golden-beige)] opacity-30 z-0"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. WHY OUR VOICE (FEATURES) ────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--nk-bg-deep)]">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-heading mb-6">Not just another grievance portal.</h2>
              <div className="section-divider mb-8"></div>
              <p className="text-lg text-[var(--nk-text-secondary)] mb-8">
                Traditional portals force citizens to navigate complex bureaucratic menus. Our voice listens, understands, and structures the data for both the citizen and the state.
              </p>
              
              <div className="space-y-6">
                {[
                  { title: "Native Tamil Support", desc: "Understands pure Tamil, regional dialects, and Tanglish out of the box." },
                  { title: "Smart Clarification", desc: "If a location is missing, the AI gently asks for it before submitting." },
                  { title: "SLA & Priority Engine", desc: "Automatically calculates urgency based on duration, history, and category." }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="mt-1 w-8 h-8 rounded-full bg-[var(--nk-success)]/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-[var(--nk-success)]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{feature.title}</h4>
                      <p className="text-sm text-[var(--nk-text-muted)]">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative h-[500px] w-full rounded-2xl overflow-hidden glass-card p-6 flex flex-col justify-between border-[var(--nk-golden-beige)]/30">
               <div className="space-y-4">
                 <div className="flex gap-3 items-end">
                    <div className="bg-[var(--nk-sand)] p-3 rounded-2xl rounded-bl-none text-sm text-[var(--nk-earth-brown)] shadow-sm max-w-[80%]">
                      No water supply in our area for 3 days. No action taken despite previous complaints.
                    </div>
                 </div>
                 <div className="flex justify-center my-2">
                    <div className="flex flex-col items-center">
                       <div className="w-px h-6 bg-[var(--nk-golden-beige)]/50"></div>
                       <div className="px-3 py-1.5 rounded-full border border-[var(--nk-golden-beige)] bg-white shadow-sm flex items-center gap-2 z-10">
                          <Brain className="w-4 h-4 text-[var(--nk-golden-beige)]" />
                          <span className="text-xs font-bold tracking-wide text-[var(--nk-earth-brown)]">Gemini AI Engine</span>
                       </div>
                       <div className="w-px h-6 bg-[var(--nk-golden-beige)]/50"></div>
                       <ArrowRight className="w-4 h-4 text-[var(--nk-golden-beige)] rotate-90 -mt-2" />
                    </div>
                 </div>
                 <div className="flex gap-3 items-end justify-end">
                    <div className="bg-white p-4 rounded-2xl rounded-br-none shadow-sm max-w-[90%] border border-[var(--nk-glass-border)]">
                      <p className="text-xs font-bold text-[var(--nk-golden-beige)] mb-2">STRUCTURED OUTPUT</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-[var(--nk-bg-deep)] rounded"><span className="text-[var(--nk-text-muted)]">Intent:</span> <br/><b>GRIEVANCE</b></div>
                        <div className="p-2 bg-[var(--nk-bg-deep)] rounded"><span className="text-[var(--nk-text-muted)]">Category:</span> <br/><b>WATER</b></div>
                        <div className="p-2 bg-[var(--nk-bg-deep)] rounded"><span className="text-[var(--nk-text-muted)]">Duration:</span> <br/><b>3 DAYS</b></div>
                        <div className="p-2 bg-[var(--nk-bg-deep)] rounded"><span className="text-[var(--nk-text-muted)]">History:</span> <br/><b className="text-[var(--nk-critical)]">YES</b></div>
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. COMMUNITY INTELLIGENCE ───────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--nk-bg-surface)]">
         <div className="container mx-auto px-6 lg:px-12 text-center">
            <Map className="w-12 h-12 mx-auto text-[var(--nk-golden-beige)] mb-6" />
            <h2 className="text-heading mb-4">Community-Level Intelligence</h2>
            <div className="section-divider mx-auto mb-8"></div>
            <p className="text-lg text-[var(--nk-text-secondary)] mb-12 max-w-2xl mx-auto">
              Our voice generates embeddings of every grievance to detect hidden clusters. A single complaint is a grievance; 50 complaints in a 2km radius is an emerging public infrastructure crisis.
            </p>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto stagger-reveal">
              <div className="glass-card p-6 text-left border-[var(--nk-critical)]/30">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[var(--nk-critical)]" />
                  </div>
                  <span className="badge-critical">EMERGING</span>
                </div>
                <h4 className="font-bold text-lg mb-1">Water Scarcity Cluster</h4>
                <p className="text-sm text-[var(--nk-text-muted)] mb-4">Sennimalai • 42 complaints in 48h</p>
                <div className="w-full bg-red-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[var(--nk-critical)] h-full w-[85%]"></div>
                </div>
              </div>

              <div className="glass-card p-6 text-left border-[var(--nk-warning)]/30">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[var(--nk-warning)]" />
                  </div>
                  <span className="badge-high">MONITORING</span>
                </div>
                <h4 className="font-bold text-lg mb-1">Road Damage</h4>
                <p className="text-sm text-[var(--nk-text-muted)] mb-4">Erode North • 15 complaints this week</p>
                <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[var(--nk-warning)] h-full w-[45%]"></div>
                </div>
              </div>

              <div className="glass-card p-6 text-left border-[var(--nk-success)]/30 flex flex-col justify-center items-center opacity-70 border-dashed">
                <Map className="w-8 h-8 text-[var(--nk-text-muted)] mb-2" />
                <p className="text-sm font-semibold">Live Geospatial View</p>
                <p className="text-xs text-[var(--nk-text-muted)] text-center">Available in Officer Dashboard</p>
              </div>
            </div>
         </div>
      </section>

      {/* ─── 5. GOVERNMENT SCHEMES ───────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--nk-bg-deep)]">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div className="order-2 lg:order-1 glass-card p-8 bg-gradient-to-br from-[var(--nk-sand)] to-[var(--nk-bg-deep)]">
                <Lightbulb className="w-10 h-10 text-[var(--nk-golden-beige)] mb-6" />
                <h3 className="text-xl font-bold mb-4">Smart Eligibility Engine</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-white/60 rounded-xl">
                    <p className="text-sm font-semibold text-[var(--nk-earth-brown)]">"I need a house, I am a daily wage worker."</p>
                  </div>
                  <div className="flex justify-center"><ArrowRight className="w-5 h-5 text-[var(--nk-text-muted)] rotate-90" /></div>
                  <div className="p-4 bg-[var(--nk-success)]/10 border border-[var(--nk-success)]/30 rounded-xl">
                    <p className="text-sm font-bold text-[var(--nk-success)] mb-1">Match: Kalaignar Kanavu Illam</p>
                    <p className="text-xs text-[var(--nk-text-muted)]">Requires: Income Cert, Land Patta. Subsidy: ₹3.1 Lakhs.</p>
                  </div>
                </div>
             </div>

             <div className="order-1 lg:order-2">
                <h2 className="text-heading mb-6">Proactive Scheme Discovery.</h2>
                <div className="section-divider mb-8"></div>
                <p className="text-lg text-[var(--nk-text-secondary)]">
                  Often, a grievance is actually a request for a service. Our voice's AI identifies when a citizen is asking for help and seamlessly connects them to relevant Tamil Nadu government schemes like Kalaignar Kanavu Illam.
                </p>
             </div>
          </div>
        </div>
      </section>

      {/* ─── 6. RESPONSIBLE AI ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--nk-deep-charcoal)] text-[var(--nk-white)]">
         <div className="container mx-auto px-6 lg:px-12 text-center max-w-4xl">
            <Shield className="w-16 h-16 mx-auto text-[var(--nk-golden-beige)] mb-8" />
            <h2 className="text-heading mb-6">Responsible AI Architecture</h2>
            <p className="text-xl text-gray-300 mb-12 font-light leading-relaxed">
              "AI proposes, rules validate, and humans act."
            </p>
            <div className="grid md:grid-cols-3 gap-8 text-left border-t border-gray-700 pt-12">
               <div>
                  <h4 className="font-bold text-lg mb-2 text-[var(--nk-sand)]">No Hallucinations</h4>
                  <p className="text-sm text-gray-400">Strict JSON schemas and confidence scoring prevent the AI from inventing information.</p>
               </div>
               <div>
                  <h4 className="font-bold text-lg mb-2 text-[var(--nk-sand)]">Deterministic Routing</h4>
                  <p className="text-sm text-gray-400">LLMs only extract data. Routing and priority are handled by strict, auditable Python rules.</p>
               </div>
               <div>
                  <h4 className="font-bold text-lg mb-2 text-[var(--nk-sand)]">Human in the Loop</h4>
                  <p className="text-sm text-gray-400">Final resolution requires officer action and citizen confirmation. AI never closes a ticket.</p>
               </div>
            </div>
         </div>
      </section>

      {/* ─── 7. FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className="py-32 bg-[var(--nk-bg-deep)] text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--nk-golden-beige)] rounded-full blur-[100px] mix-blend-multiply"></div>
        </div>
        
        <div className="container relative z-10 mx-auto px-6">
          <h2 className="text-display mb-8">Ready to make your voice heard?</h2>
          <p className="text-xl text-[var(--nk-text-secondary)] mb-12 font-tamil">
            Our voice. Our issues. Towards the right solution.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button 
              onClick={() => router.push('/citizen/intake')}
              className="btn-primary text-xl px-10 py-5 flex items-center justify-center gap-3 shadow-2xl"
            >
              <Mic className="w-6 h-6" />
              <span>Record Grievance</span>
            </button>
            <button 
              onClick={() => router.push('/officer/dashboard')}
              className="btn-secondary text-xl px-10 py-5 bg-white/80"
            >
              Officer Portal
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[var(--nk-deep-charcoal)] text-gray-500 text-center text-sm">
        <p>© 2024 Our voice. Created for Government of Tamil Nadu Hackathon.</p>
      </footer>
    </div>
  );
}
