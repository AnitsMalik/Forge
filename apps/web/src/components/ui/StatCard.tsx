import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    label?: string;
    positive?: boolean;
    neutral?: boolean;
  };
  progress?: {
    percent: number;
    color?: string;
    label?: string;
  };
  description?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-indigo-500',
  iconBg = 'bg-indigo-500/10 border-indigo-500/20',
  trend,
  progress,
  description,
  className = '',
}) => {
  return (
    <div className={`p-4 sm:p-5 rounded-xl bg-surface border border-subtle shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between text-secondary text-xs font-semibold gap-2">
        <span className="truncate">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${iconBg} ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="text-2xl font-bold text-primary mt-2 tracking-tight">
        {value}
      </div>

      {trend && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
              trend.neutral
                ? 'text-slate-600 dark:text-slate-300 bg-slate-500/10 border-slate-500/20'
                : trend.positive !== false
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
            }`}
          >
            {trend.value}
          </span>
          {trend.label && (
            <span className="text-[11px] text-muted whitespace-nowrap">{trend.label}</span>
          )}
        </div>
      )}

      {progress && (
        <div className="mt-2 flex items-center gap-2 min-w-0">
          <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden border border-subtle">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progress.color || 'bg-indigo-500'}`}
              style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
            />
          </div>
          {progress.label && (
            <span className="text-[11px] font-semibold text-secondary whitespace-nowrap shrink-0">
              {progress.label}
            </span>
          )}
        </div>
      )}

      {description && !trend && !progress && (
        <p className="text-[11px] text-muted mt-2 truncate">{description}</p>
      )}
    </div>
  );
};
