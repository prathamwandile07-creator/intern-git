interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

const colors = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-700',
};

const sizes = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  max = 100,
  color = 'blue',
  size = 'md',
  showLabel,
  label,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-600">{label || 'Progress'}</span>
          <span className="text-xs font-semibold text-slate-900">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={`w-full ${sizes[size]} rounded-full bg-slate-100 overflow-hidden`}>
        <div
          className={`${colors[color]} ${sizes[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
