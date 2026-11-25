import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  category?: string;
  categoryIcon?: LucideIcon;
  badge?: string;
  badgeVariant?: 'success' | 'indigo' | 'purple' | 'amber';
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  category,
  categoryIcon: CategoryIcon,
  badge,
  badgeVariant = 'indigo',
  title,
  description,
  actions,
  className = '',
}) => {
  const getBadgeClass = () => {
    switch (badgeVariant) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
      case 'purple':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400';
      case 'amber':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
      case 'indigo':
      default:
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400';
    }
  };

  return (
    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-subtle pb-5 ${className}`}>
      <div className="min-w-0">
        {(category || badge) && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {category && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold whitespace-nowrap">
                {CategoryIcon && <CategoryIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                <span>{category}</span>
              </div>
            )}
            {badge && (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono font-medium whitespace-nowrap ${getBadgeClass()}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                <span>{badge}</span>
              </div>
            )}
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-secondary text-sm mt-1 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

