'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FolderGit2, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  PlusCircle, 
  Search, 
  ArrowRight,
  Activity,
  Layers,
  Database
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import ProjectCard, { ProjectData } from '@/components/ProjectCard';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [recentProjects, setRecentProjects] = useState<ProjectData[]>([]);
  const [recentAudit, setRecentAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
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
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="relative rounded-3xl glass-panel p-8 sm:p-10 border border-slate-700/60 overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            PostgreSQL 16 + pgvector (384-dimensional dense vectors)
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Intelligent Research Discovery & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-brand-400">Project Similarity</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            Eliminate duplicate capstone topics and uncover semantically aligned academic literature. ResearchX bridges relational schema integrity with sentence-transformer embeddings and OpenAlex paper search.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              Submit Research Project
            </Link>
            <Link
              href="/similarity"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass-panel hover:bg-slate-800 text-cyan-300 font-semibold text-sm transition-all border border-cyan-500/30 active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Vector Similarity Engine
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass-panel hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all border border-slate-700 active:scale-95"
            >
              <Search className="h-4 w-4 text-slate-400" />
              Search OpenAlex Papers
            </Link>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Student Projects"
          value={loading ? '...' : stats?.total_projects || 0}
          subtext="Locally submitted proposals"
          icon={FolderGit2}
          color="blue"
        />
        <StatCard
          title="Saved Academic Papers"
          value={loading ? '...' : stats?.total_papers || 0}
          subtext="Indexed from OpenAlex"
          icon={BookOpen}
          color="emerald"
        />
        <StatCard
          title="pgvector Embeddings"
          value={loading ? '...' : stats?.total_embeddings || 0}
          subtext="384-d MiniLM vectors stored"
          icon={Sparkles}
          color="cyan"
        />
        <StatCard
          title="Approved Projects"
          value={loading ? '...' : stats?.approved_projects || 0}
          subtext="Faculty reviewed & verified"
          icon={CheckCircle2}
          color="purple"
        />
      </div>

      {/* Domain Classification Badges */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-700/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Research Domains</h2>
          </div>
          <span className="text-xs text-slate-400">Classified Relational Taxonomy</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {domains.map((d) => (
            <Link
              key={d.domain_id}
              href={`/projects?domainId=${d.domain_id}`}
              className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  {d.domain_name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{d.description}</p>
              </div>
              <span className="ml-3 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-900 text-cyan-400 border border-slate-700">
                {d.project_count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Recent Research Projects</h2>
            <p className="text-xs text-slate-400 mt-0.5">Explore active student capstones with real-time vector status</p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View all projects <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="glass-panel h-48 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center text-slate-400">
            No projects found in the database.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {recentProjects.map((p) => (
              <ProjectCard key={p.project_id} project={p} />
            ))}
          </div>
        )}
      </div>

      {/* Live PostgreSQL Database Audit Trail */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-700/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Live PostgreSQL Trigger Audit Trail</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            Trigger: trg_audit_project_changes
          </span>
        </div>

        {recentAudit.length === 0 ? (
          <p className="text-xs text-slate-400">No audit events recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {recentAudit.map((a) => (
              <div key={a.log_id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    a.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    a.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {a.action}
                  </span>
                  <span className="text-slate-300 font-medium">
                    Table: <span className="text-white font-mono">{a.table_name}</span> (Record #{a.record_id})
                  </span>
                  {a.new_values?.status && (
                    <span className="text-slate-400 hidden sm:inline">
                      Status changed to <span className="text-cyan-300 font-semibold">{a.new_values.status}</span>
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
  );
}
