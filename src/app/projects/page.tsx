'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, PlusCircle, Filter, FolderGit2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import ProjectCard, { ProjectData } from '@/components/ProjectCard';

function ProjectsContent() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get('domainId') || '';

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [domains, setDomains] = useState<Array<{ domain_id: number; domain_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(initialDomain);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/domains')
      .then((r) => r.json())
      .then((data) => setDomains(data.domains || []))
      .catch((err) => console.error(err));
  }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedDomain) params.set('domainId', selectedDomain);
      if (selectedStatus !== 'All') params.set('status', selectedStatus);

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedDomain, selectedStatus]);

  async function handleDelete(projectId: number) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ message: `Project #${projectId} deleted successfully from database.`, type: 'success' });
        setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
      } else {
        const err = await res.json();
        setNotification({ message: err.error || 'Failed to delete project', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Network error occurred', type: 'error' });
    }

    setTimeout(() => setNotification(null), 4000);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50 text-xs font-medium mb-2">
            <FolderGit2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>Academic Capstone Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Research Projects
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse submitted student proposals, faculty review decisions, and vector indexing status.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all shadow-md shadow-cyan-600/20 active:scale-95 self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Submit Project</span>
        </Link>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2.5 ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Integrated Filter and Search Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project title, student name, or problem keywords..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Domain Dropdown Filter */}
          <div className="w-full md:w-auto">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full md:w-60 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Research Domains</option>
              {domains.map((d) => (
                <option key={d.domain_id} value={d.domain_id}>
                  {d.domain_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Status Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="font-medium mr-1 text-slate-400">Status:</span>
            {[
              { id: 'All', label: 'All Projects' },
              { id: 'Approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-400' },
              { id: 'Pending', label: 'Pending Review', icon: Clock, color: 'text-amber-400' },
              { id: 'Rejected', label: 'Rejected', icon: XCircle, color: 'text-rose-400' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStatus(s.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedStatus === s.id
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {s.icon && <s.icon className={`h-3 w-3 ${s.color}`} />}
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <span className="font-mono text-slate-500">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} found
          </span>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
          <FolderGit2 className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No research projects match your filters</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search query, selecting another domain, or reset the filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((p) => (
            <ProjectCard key={p.project_id} project={p} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading research directory...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
