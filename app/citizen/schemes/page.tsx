'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, ArrowLeft, Lightbulb, CheckCircle2, ShieldCheck, MapPin, Filter, BookOpen, Printer, Share2, ExternalLink, X, GraduationCap, Heart, Users, Tractor, Zap, Droplets, Building2, HandHeart } from 'lucide-react';
import api from '@/lib/api';

/* ─── Category & Beneficiary Config ──────────────────────── */
const BENEFICIARY_GROUPS = [
  { id: 'ALL', label: 'All Categories', icon: '📋' },
  { id: 'GOVERNMENT_SERVICES', label: 'Students & Education', icon: '🎓' },
  { id: 'HEALTH', label: 'Health & Healthcare', icon: '🏥' },
  { id: 'WATER', label: 'Water Supply', icon: '💧' },
  { id: 'ELECTRICITY', label: 'Electricity & Energy', icon: '⚡' },
  { id: 'ROADS', label: 'Infrastructure & Agriculture', icon: '🏗️' },
  { id: 'SANITATION', label: 'Sanitation & Hygiene', icon: '🧹' },
];

const QUICK_SEARCHES = [
  { label: 'Student scholarship eligibility?' },
  { label: 'CM Solar Green House Scheme' },
  { label: 'Free electricity for farmers' },
  { label: 'How to get old age pension?' },
];

const VIEW_TABS = [
  { id: 'beneficiary', label: 'Beneficiary Wise' },
  { id: 'az', label: 'A to Z Index' },
  { id: 'search', label: 'Search & Filter' },
];

export default function SchemeDiscoveryPage() {
  const router = useRouter();
  
  /* ─── State ───────────────────────────────────────── */
  const [allSchemes, setAllSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('beneficiary');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  
  /* ─── Load all schemes ────────────────────────────── */
  useEffect(() => {
    loadSchemes();
  }, []);

  const loadSchemes = async () => {
    setLoading(true);
    try {
      const data = await api.listSchemes();
      setAllSchemes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load schemes', err);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Filtered schemes ────────────────────────────── */
  const filteredSchemes = useMemo(() => {
    let result = allSchemes;
    
    if (activeCategory !== 'ALL') {
      result = result.filter(s => s.category === activeCategory);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.name_ta || '').includes(searchQuery) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.description_ta || '').includes(searchQuery) ||
        (s.benefits || '').toLowerCase().includes(q) ||
        (s.benefits_ta || '').includes(searchQuery)
      );
    }
    
    if (activeTab === 'az') {
      result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    
    return result;
  }, [allSchemes, activeCategory, searchQuery, activeTab]);

  /* ─── Scheme Detail View ──────────────────────────── */
  if (selectedScheme) {
    return (
      <div className="min-h-screen nk-bg">
        {/* Header */}
        <header className="bg-[var(--nk-deep-charcoal)] text-[var(--nk-white)]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--nk-golden-beige)]/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[var(--nk-golden-beige)]" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Our voice — Scheme Navigator</h1>
                <p className="text-xs text-[var(--nk-sand)] opacity-70">Government of Tamil Nadu</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Back Link */}
          <button onClick={() => setSelectedScheme(null)} className="flex items-center gap-2 text-sm font-bold text-[var(--nk-golden-beige)] hover:text-[var(--nk-earth-brown)] mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> ← Back to Schemes
          </button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Scheme Details */}
            <div className="lg:col-span-2">
              <div className="glass-card p-8 fade-in-up">
                {/* Tamil Name */}
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--nk-golden-beige)] leading-snug mb-3">
                  {selectedScheme.name}
                </h2>
                {/* English Name */}
                <h3 className="text-xl md:text-2xl font-bold text-[var(--nk-deep-charcoal)] mb-4">
                  
                </h3>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-8">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--nk-deep-charcoal)] text-[var(--nk-sand)]">
                    Dept: {selectedScheme.application_channel || 'Government of Tamil Nadu'}
                  </span>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-[var(--nk-golden-beige)] text-[var(--nk-golden-beige)]">
                    {BENEFICIARY_GROUPS.find(b => b.id === selectedScheme.category)?.label || selectedScheme.category}
                  </span>
                </div>

                <hr className="border-[var(--nk-glass-border)] mb-8" />

                {/* Overview */}
                <div className="mb-8">
                  <h4 className="text-lg font-bold text-[var(--nk-deep-charcoal)] mb-1 flex items-center gap-2">
                    📋 Overview
                  </h4>
                  <div className="w-16 h-1 bg-[var(--nk-golden-beige)] rounded-full mb-4"></div>
                  <p className="text-[var(--nk-text-secondary)] leading-relaxed">{selectedScheme.description}</p>
                </div>

                {/* Benefits */}
                <div className="mb-8">
                  <h4 className="text-lg font-bold text-[var(--nk-deep-charcoal)] mb-1 flex items-center gap-2">
                    🎁 Benefits
                  </h4>
                  <div className="w-16 h-1 bg-[var(--nk-success)] rounded-full mb-4"></div>
                  <div className="p-4 rounded-xl bg-[var(--nk-success)]/5 border-l-4 border-[var(--nk-success)]">
                    <p className="text-[var(--nk-success)] font-bold">{selectedScheme.benefits}</p>
                  </div>
                </div>

                {/* Eligibility */}
                {selectedScheme.eligibility_rules && selectedScheme.eligibility_rules.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-[var(--nk-deep-charcoal)] mb-1 flex items-center gap-2">
                      ✅ Eligibility Criteria
                    </h4>
                    <div className="w-16 h-1 bg-[var(--nk-info)] rounded-full mb-4"></div>
                    <ul className="space-y-3">
                      {selectedScheme.eligibility_rules.map((rule: any, i: number) => (
                        <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/40 border border-[var(--nk-glass-border)]">
                          <CheckCircle2 className="w-5 h-5 text-[var(--nk-info)] mt-0.5 shrink-0" />
                          <span className="text-sm text-[var(--nk-deep-charcoal)]">{rule.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Required Documents */}
                {selectedScheme.required_documents && selectedScheme.required_documents.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-[var(--nk-deep-charcoal)] mb-1 flex items-center gap-2">
                      📄 Required Documents
                    </h4>
                    <div className="w-16 h-1 bg-[var(--nk-warning)] rounded-full mb-4"></div>
                    <div className="flex flex-wrap gap-2">
                      {selectedScheme.required_documents.map((doc: string, i: number) => (
                        <span key={i} className="text-sm px-3 py-1.5 rounded-lg bg-[var(--nk-bg-surface)] border border-[var(--nk-glass-border)] text-[var(--nk-earth-brown)]">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="p-4 rounded-xl bg-[var(--nk-warning)]/5 border border-[var(--nk-warning)]/20 mt-8">
                  <p className="text-xs text-[var(--nk-text-muted)] italic">
                    ⚠️ This information is for reference purposes only. Actual eligibility and benefits are subject to verification by the relevant government authority.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Actions */}
            <div className="space-y-6">
              <div className="glass-card p-6 sticky top-8">
                <h4 className="text-sm font-bold text-[var(--nk-deep-charcoal)] uppercase tracking-wider mb-6">Apply & Portal Actions</h4>
                
                <button className="w-full btn-primary py-4 text-base flex items-center justify-center gap-2 mb-4">
                  Visit Official Portal <ExternalLink className="w-4 h-4" />
                </button>

                <div className="space-y-3">
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--nk-glass-border)] hover:bg-[var(--nk-bg-surface)] transition-colors text-left">
                    <Printer className="w-5 h-5 text-[var(--nk-text-muted)]" />
                    <span className="text-sm font-bold text-[var(--nk-deep-charcoal)]">Print Summary</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--nk-glass-border)] hover:bg-[var(--nk-bg-surface)] transition-colors text-left">
                    <Share2 className="w-5 h-5 text-[var(--nk-text-muted)]" />
                    <span className="text-sm font-bold text-[var(--nk-deep-charcoal)]">Share Scheme</span>
                  </button>
                </div>

                <hr className="border-[var(--nk-glass-border)] my-6" />

                <div className="text-center">
                  <p className="text-xs text-[var(--nk-text-muted)] mb-2">Application Channel</p>
                  <p className="text-sm font-bold text-[var(--nk-earth-brown)]">{selectedScheme.application_channel || 'Contact local authority'}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ─── Directory View ──────────────────────────────── */
  return (
    <div className="min-h-screen nk-bg flex flex-col">
      
      {/* ─── Top Banner ──────────────────────────────── */}
      <div className="bg-[var(--nk-critical)] text-white text-center py-2 px-4 text-xs font-bold tracking-wide">
        📢 Citizen Notice: Access official e-Governance services, Helpline 1100 & Welfare Schemes in one place.
        <span className="hidden sm:inline ml-4 px-3 py-0.5 rounded-full border border-white/40 text-[10px]">Truth Alone Triumphs</span>
      </div>

      {/* ─── Header ──────────────────────────────────── */}
      <header className="bg-[var(--nk-deep-charcoal)] text-[var(--nk-white)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--nk-golden-beige)]/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[var(--nk-golden-beige)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Our voice — Scheme Navigator</h1>
              <p className="text-xs text-[var(--nk-sand)] opacity-70">Government of Tamil Nadu</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <button onClick={() => router.push('/')} className="hover:text-[var(--nk-golden-beige)] transition-colors">Home</button>
            <span className="px-4 py-1.5 rounded-full border border-[var(--nk-golden-beige)]/40 text-[var(--nk-golden-beige)]">Schemes Directory</span>
            <button onClick={() => router.push('/citizen/intake')} className="hover:text-[var(--nk-golden-beige)] transition-colors">File Grievance</button>
            <button className="px-4 py-1.5 rounded-full bg-[var(--nk-golden-beige)] text-[var(--nk-deep-charcoal)] font-bold hover:bg-[var(--nk-sand)] transition-colors">English</button>
          </nav>
        </div>
      </header>

      {/* ─── Hero Section ────────────────────────────── */}
      <section className="bg-gradient-to-br from-[var(--nk-deep-charcoal)] via-[#2a2520] to-[#1a1510] text-[var(--nk-white)] py-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNCODlBNjIiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0wIDM2YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <span className="inline-block text-xs font-bold px-4 py-1.5 rounded-full bg-[var(--nk-golden-beige)]/20 text-[var(--nk-golden-beige)] mb-6 tracking-wider">Government of Tamil Nadu</span>
          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">Find Tamil Nadu Government<br/>Schemes for You</h2>
          <p className="text-[var(--nk-sand)] opacity-80 max-w-xl mb-8">Easily discover welfare programs, scholarships, pensions, and subsidies organized by who you are.</p>
          
          {/* Thirukkural Quote */}
          <div className="p-4 rounded-xl border border-[var(--nk-golden-beige)]/20 bg-[var(--nk-golden-beige)]/5 max-w-xl mb-8">
            <p className="text-[10px] font-bold text-[var(--nk-golden-beige)] uppercase tracking-widest mb-2">📜 THIRUKKURAL — ON GOOD GOVERNANCE (COUPLET 385)</p>
            <p className="text-sm italic text-[var(--nk-sand)]">"A great government creates resources, preserves them, and distributes wealth wisely for citizen welfare."</p>
            <p className="text-xs text-[var(--nk-text-muted)] text-right mt-2">— Sage Thiruvalluvar</p>
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--nk-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by scheme name, eligibility, or keywords"
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-[var(--nk-white)] text-[var(--nk-deep-charcoal)] border-2 border-transparent focus:border-[var(--nk-golden-beige)] outline-none text-sm font-medium shadow-lg"
              />
            </div>
            <button className="px-6 py-4 rounded-xl bg-[var(--nk-golden-beige)] text-[var(--nk-deep-charcoal)] font-bold hover:bg-[var(--nk-sand)] transition-colors shadow-lg whitespace-nowrap">
              Search Schemes
            </button>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ───────────────────────────────── */}
      <div className="bg-white border-b border-[var(--nk-glass-border)] py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-12 text-center">
          <div>
            <p className="text-3xl font-black text-[var(--nk-golden-beige)]">{allSchemes.length}+</p>
            <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider">Active Schemes</p>
          </div>
          <div className="w-px h-10 bg-[var(--nk-glass-border)]"></div>
          <div>
            <p className="text-3xl font-black text-[var(--nk-golden-beige)]">{new Set(allSchemes.map(s => s.category)).size}</p>
            <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider">Departments</p>
          </div>
          <div className="w-px h-10 bg-[var(--nk-glass-border)]"></div>
          <div>
            <p className="text-3xl font-black text-[var(--nk-golden-beige)]">100%</p>
            <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider">Free to Access</p>
          </div>
        </div>
      </div>

      {/* ─── Directory Content ───────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        
        <h2 className="text-2xl font-black text-[var(--nk-deep-charcoal)] mb-2">Tamil Nadu Schemes Directory</h2>
        <p className="text-sm text-[var(--nk-text-muted)] mb-8">Filter by beneficiary category, department, or search keywords.</p>

        {/* View Tabs */}
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[var(--nk-bg-surface)] mb-6 w-fit">
          {VIEW_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--nk-golden-beige)] text-[var(--nk-deep-charcoal)] shadow-md'
                  : 'text-[var(--nk-text-muted)] hover:text-[var(--nk-deep-charcoal)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {BENEFICIARY_GROUPS.map(group => (
            <button
              key={group.id}
              onClick={() => setActiveCategory(group.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                activeCategory === group.id
                  ? 'bg-[var(--nk-deep-charcoal)] text-[var(--nk-sand)] border-[var(--nk-deep-charcoal)]'
                  : 'bg-white text-[var(--nk-deep-charcoal)] border-[var(--nk-glass-border)] hover:border-[var(--nk-golden-beige)] hover:bg-[var(--nk-bg-surface)]'
              }`}
            >
              {group.icon} {group.label}
            </button>
          ))}
        </div>

        {/* Quick Search Suggestions */}
        <div className="flex flex-wrap gap-2 mb-8">
          {QUICK_SEARCHES.map((qs, i) => (
            <button
              key={i}
              onClick={() => setSearchQuery(qs.label)}
              className="px-4 py-2 rounded-full text-xs font-bold border-2 border-[var(--nk-golden-beige)]/30 text-[var(--nk-earth-brown)] hover:bg-[var(--nk-golden-beige)]/10 transition-colors font-tamil"
            >
              {qs.label}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <p className="text-lg font-black text-[var(--nk-deep-charcoal)] mb-6">
          {filteredSchemes.length} Schemes Found
        </p>

        {/* Scheme Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="processing-ring w-12 h-12 border-4"></div>
          </div>
        ) : filteredSchemes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--nk-text-muted)] text-lg mb-2">No schemes found for this filter.</p>
            <button onClick={() => { setActiveCategory('ALL'); setSearchQuery(''); }} className="text-sm font-bold text-[var(--nk-golden-beige)]">Reset Filters</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-reveal">
            {filteredSchemes.map((scheme) => (
              <div
                key={scheme.scheme_id || scheme.id}
                onClick={() => setSelectedScheme(scheme)}
                className="glass-card p-6 cursor-pointer group hover:shadow-xl hover:border-[var(--nk-golden-beige)]/40 border border-transparent transition-all duration-300 relative overflow-hidden"
              >
                {/* Category Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--nk-deep-charcoal)] text-[var(--nk-sand)]">
                    {BENEFICIARY_GROUPS.find(b => b.id === scheme.category)?.icon} {BENEFICIARY_GROUPS.find(b => b.id === scheme.category)?.label || scheme.category}
                  </span>
                </div>

                {/* Scheme Name (Tamil first) */}
                <h3 className="text-lg font-bold text-[var(--nk-golden-beige)] leading-snug mb-1 group-hover:text-[var(--nk-earth-brown)] transition-colors">
                  {scheme.name}
                </h3>
                <p className="text-sm font-bold text-[var(--nk-deep-charcoal)] mb-4"></p>
                
                {/* Description */}
                <p className="text-xs text-[var(--nk-text-muted)] leading-relaxed mb-4 line-clamp-3">
                  {scheme.description}
                </p>

                {/* Benefits */}
                <div className="p-3 rounded-lg bg-[var(--nk-success)]/5 border-l-3 border-[var(--nk-success)] mb-4">
                  <p className="text-xs font-bold text-[var(--nk-success)]">💰 {scheme.benefits}</p>
                </div>

                {/* View Details Link */}
                <div className="flex items-center gap-1 text-sm font-bold text-[var(--nk-golden-beige)] group-hover:gap-2 transition-all">
                  View Details <ArrowRight className="w-4 h-4" />
                </div>

                {/* Decorative Corner */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--nk-golden-beige)]/5 rounded-bl-[60px] transition-all group-hover:bg-[var(--nk-golden-beige)]/10"></div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ─── Footer ──────────────────────────────────── */}
      <footer className="bg-[var(--nk-deep-charcoal)] text-[var(--nk-sand)] py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm opacity-70">Our voice — Scheme Navigator</p>
          <p className="text-xs opacity-50 mt-1">Data sourced from official Tamil Nadu government portals. This is a preliminary matching tool.</p>
        </div>
      </footer>
    </div>
  );
}
