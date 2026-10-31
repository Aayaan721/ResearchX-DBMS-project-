'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, PlusCircle, Filter, FolderGit2 } from 'lucide-react';
import ProjectCard, { ProjectData } from '@/components/ProjectCard';

function ProjectsContent() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get('domainId') || '';

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
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
    if (!confirm(`Are you sure you want to delete Project #${projectId}? This will cascade delete associated records and log the action in the database audit trail.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ message: `Project #${projectId} deleted successfully from PostgreSQL.`, type: 'success' });
        setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
      } else {
        const err = await res.json();
        setNotification({ message: err.error || 'Failed to delete project', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Network error', type: 'error' });
    }

    setTimeout(() => setNotification(null), 4000);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="h-7 w-7 text-cyan-400" />
            Research Projects Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse student proposals, faculty review decisions, and vector indexing status
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Submit New Project
        </Link>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700/60 flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by title, problem statement, or abstract..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
        </div>

        {/* Domain Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full md:w-56"
          >
            <option value="">All Research Domains</option>
            {domains.map((d) => (
              <option key={d.domain_id} value={d.domain_id}>
                {d.domain_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full md:w-36"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel h-52 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center border border-slate-800">
          <FolderGit2 className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No projects match your criteria</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search keywords, clear domain filters, or submit a new project proposal.
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
    <Suspense fallback={<div className="glass-panel p-12 rounded-2xl animate-pulse text-center">Loading Projects Directory...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
