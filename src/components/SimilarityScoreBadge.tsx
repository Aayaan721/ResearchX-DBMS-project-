interface SimilarityScoreBadgeProps {
  score: number; // 0.0 to 1.0
  showBar?: boolean;
}

export default function SimilarityScoreBadge({ score, showBar = true }: SimilarityScoreBadgeProps) {
  const percentage = Math.round(score * 100);

  let badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
  let barColor = 'bg-cyan-500';
  let label = 'Moderate';

  if (score >= 0.65) {
    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    barColor = 'bg-emerald-500';
    label = 'Strong';
  } else if (score >= 0.40) {
    badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    barColor = 'bg-blue-500';
    label = 'Related';
  } else {
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    barColor = 'bg-amber-500';
    label = 'Low';
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${badgeColor}`}>
        <span className="font-mono">{percentage}%</span>
        <span className="text-[10px] opacity-80 uppercase tracking-wider">({label})</span>
      </div>
      {showBar && (
        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(Math.max(percentage, 5), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
