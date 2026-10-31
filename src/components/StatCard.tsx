import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan';
}

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'blue',
}: StatCardProps) {
  const colorMap = {
    blue: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/20',
    emerald: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/20',
    purple: 'from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/20',
    cyan: 'from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 relative overflow-hidden group hover:border-slate-600 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight group-hover:scale-105 transition-transform origin-left">
            {value}
          </h3>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br border ${colorMap[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-colors pointer-events-none" />
    </div>
  );
}
