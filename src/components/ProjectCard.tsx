'use client';

import Link from 'next/link';
import { User, CheckCircle2, Clock, XCircle, Sparkles, ArrowRight, Trash2 } from 'lucide-react';

export interface ProjectData {
  project_id: number;
  title: string;
  problem_statement: string;
  description?: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  student_name: string;
  student_email?: string;
  domains?: Array<{ domain_id: number; domain_name: string }>;
  is_embedded?: boolean;
  created_at: string;
}

interface ProjectCardProps {
  project: ProjectData;
  onDelete?: (id: number) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const statusBadge = {
    Approved: {
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: CheckCircle2,
    },
    Pending: {
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: Clock,
    },
    Rejected: {
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: XCircle,
    },
  }[project.status] || {
    color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    icon: Clock,
  };

  const StatusIcon = statusBadge.icon;

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between border border-slate-700/60 relative">
      <div>
        {/* Header row: Status + Vector Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.color}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {project.status}
            </span>
            {project.is_embedded && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sparkles className="h-3 w-3" />
                384-d Vector
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">ID #{project.project_id}</span>
        </div>

        {/* Title */}
        <Link href={`/projects/${project.project_id}`} className="group/title block">
          <h4 className="text-lg font-bold text-white group-hover/title:text-cyan-400 transition-colors line-clamp-2">
            {project.title}
          </h4>
        </Link>

        {/* Problem Statement snippet */}
        <p className="text-sm text-slate-400 mt-2 line-clamp-3 leading-relaxed">
          {project.problem_statement}
        </p>

        {/* Domains */}
        {project.domains && project.domains.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {project.domains.map((d) => (
              <span
                key={d.domain_id}
                className="px-2 py-0.5 text-[11px] rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
              >
                {d.domain_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Student & Actions */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs text-slate-300 font-medium">{project.student_name}</span>
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={() => onDelete(project.project_id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete Project"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <Link
            href={`/projects/${project.project_id}`}
            className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
