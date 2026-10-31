'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Sparkles, 
  PlusCircle, 
  ArrowRight, 
  BookOpen, 
  Compass, 
  Layers,
  Database,
  ChevronDown,
  ChevronUp,
  Activity,
  Award
} from 'lucide-react';
import ProjectCard, { ProjectData } from '@/components/ProjectCard';

interface PlatformStats {
  total_projects: number;
  total_papers: number;
  total_embeddings: number;
  approved_projects: number;
  pending_projects: number;
}

interface DomainItem {
  domain_id: number;
  domain_name: string;
  description: string;
  project_count: number;
}

interface AuditItem {
  log_id: number;
  table_name: string;
  action: string;
  record_id: number;
  changed_at: string;
  new_values?: { status?: string };
}

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [recentProjects, setRecentProjects] = useState<ProjectData[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search input & mode in hero
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'literature' | 'similarity'>('literature');
  const [techDrawerOpen, setTechDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, projectsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/projects'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
          setDomains(statsData.domains || []);
          setRecentAudit(statsData.recentAudit || []);
        }

        if (projectsRes.ok) {
          const projData = await projectsRes.json();
          setRecentProjects((projData.projects || []).slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchMode === 'literature') {
      router.push(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/similarity?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handlePresetTag = (tag: string) => {
    setSearchQuery(tag);
    router.push(`/discover?q=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="space-y-16 pb-12">
      {/* 1. Hero Section: Research-first Discovery & Search */}
      <section className="relative pt-6 sm:pt-10 pb-8 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Intelligent Research & Capstone Discovery Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-tight">
          Explore Research Ideas & <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-300">
            Verify Originality
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Search over 250 million global research works, explore verified university student projects, and evaluate semantic similarity before you begin your next milestone.
        </p>

        {/* Integrated Research Search Box */}
        <form onSubmit={handleHeroSearch} className="max-w-2xl mx-auto pt-2">
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 shadow-2xl shadow-cyan-950/40 focus-within:border-cyan-500/60 transition-all">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 flex items-center">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchMode === 'literature'
                      ? 'Search global papers by title, topic, or DOI...'
                      : 'Enter a project idea to test semantic similarity...'
                  }
                  className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
                />
              </div>

              {/* Mode Selector and Action Button */}
              <div className="flex items-center justify-between sm:justify-end gap-2 px-1">
                <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setSearchMode('literature')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      searchMode === 'literature'
                        ? 'bg-cyan-600 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Literature
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode('similarity')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      searchMode === 'similarity'
                        ? 'bg-cyan-600 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Similarity
                  </button>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all shadow-md shadow-cyan-600/30 flex items-center gap-1.5"
                >
                  <span>Search</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick topic pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-slate-400">
            <span className="text-slate-500">Popular:</span>
            {[
              'Vector Databases',
              'Quantum Simulation',
              'Federated Learning',
              'Distributed Systems',
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handlePresetTag(tag)}
                className="px-2.5 py-1 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:border-cyan-500/40 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </form>

        {/* Primary Call-to-Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4 text-cyan-400" />
            <span>Submit a Research Project</span>
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-medium text-sm border border-slate-800 transition-colors"
          >
            <span>Browse All Projects</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* 2. Platform Value Pillars (Clean, readable, uncluttered) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <Compass className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Global Literature Discovery</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Query over 250 million open academic publications directly from OpenAlex with real-time abstract reconstruction and DOI verification.
          </p>
          <Link href="/discover" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 pt-1">
            Explore Literature <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Semantic Similarity Search</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Convert proposed thesis ideas into 384-dimensional dense vectors to uncover conceptually related student projects and papers.
          </p>
          <Link href="/similarity" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 pt-1">
            Test Idea Similarity <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Faculty Review Workflow</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Faculty mentors review project proposals with atomic stored procedure execution and automatic trigger audit trails.
          </p>
          <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 pt-1">
            View Project Reviews <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* 3. Recent Projects Directory Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Recent Research Projects</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Latest student capstones and investigative proposals
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>View all projects ({stats?.total_projects || 0})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400">
            No projects in the database yet. Be the first to submit a proposal!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {recentProjects.map((p) => (
              <ProjectCard key={p.project_id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Research Domains Classification */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Explore by Research Field</h2>
          </div>
          <span className="text-xs text-slate-400">Classified Relational Taxonomy</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {domains.map((d) => (
            <Link
              key={d.domain_id}
              href={`/projects?domainId=${d.domain_id}`}
              className="p-4 rounded-xl bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/80 transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {d.domain_name}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{d.description}</p>
              </div>
              <span className="ml-3 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                {d.project_count} {d.project_count === 1 ? 'project' : 'projects'}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Platform Activity & Stats Overview */}
      <section className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-white block">
              {loading ? '...' : stats?.total_projects || 0}
            </span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1 block">
              Student Projects
            </span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-white block">
              {loading ? '...' : stats?.total_papers || 0}
            </span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1 block">
              Saved Papers
            </span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-white block">
              {loading ? '...' : stats?.total_embeddings || 0}
            </span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1 block">
              Indexed Vectors
            </span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400 block">
              {loading ? '...' : stats?.approved_projects || 0}
            </span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1 block">
              Faculty Approved
            </span>
          </div>
        </div>
      </section>

      {/* 6. Technical & DBMS Architecture Inspection (Collapsible drawer for evaluators) */}
      <section className="border border-slate-800/80 rounded-2xl bg-slate-950/40 overflow-hidden">
        <button
          type="button"
          onClick={() => setTechDrawerOpen(!techDrawerOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-900/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">System Architecture & Relational Proof</h3>
              <p className="text-xs text-slate-400">PostgreSQL 16.4 + pgvector 0.8.6, stored procedures, triggers, and audit trail</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{techDrawerOpen ? 'Collapse' : 'Inspect'}</span>
            {techDrawerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {techDrawerOpen && (
          <div className="p-6 pt-2 border-t border-slate-800 space-y-4 animate-in fade-in-50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-slate-300 block mb-1">Vector Index</span>
                <span className="font-mono text-cyan-400 block">HNSW (m=16, ef=64)</span>
                <span className="text-slate-400 mt-1 block">Indexed on 384-dimensional MiniLM embeddings</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-slate-300 block mb-1">Stored Procedure</span>
                <span className="font-mono text-cyan-400 block">sp_review_and_approve_project</span>
                <span className="text-slate-400 mt-1 block">Role-guarded faculty approval and critique workflow</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-slate-300 block mb-1">Audit Trigger</span>
                <span className="font-mono text-cyan-400 block">trg_audit_project_changes</span>
                <span className="text-slate-400 mt-1 block">Captures INSERT, UPDATE, and DELETE actions</span>
              </div>
            </div>

            {/* Live Trigger Audit Trail */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  Live PostgreSQL Trigger Audit Entries
                </span>
                <span className="text-[11px] font-mono text-emerald-400">audit_log</span>
              </div>

              {recentAudit.length === 0 ? (
                <p className="text-xs text-slate-500">No audit events recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-800/80 max-h-48 overflow-y-auto">
                  {recentAudit.slice(0, 5).map((a) => (
                    <div key={a.log_id} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          a.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          a.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {a.action}
                        </span>
                        <span className="text-slate-300">
                          Table: <span className="font-mono text-white">{a.table_name}</span> #{a.record_id}
                        </span>
                        {a.new_values?.status && (
                          <span className="text-slate-400 hidden sm:inline">
                            Status: <span className="text-cyan-300">{a.new_values.status}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(a.changed_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
