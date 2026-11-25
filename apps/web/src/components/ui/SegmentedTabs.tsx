import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number | string;
  countVariant?: 'indigo' | 'emerald' | 'amber' | 'slate';
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: SegmentedTabsProps<T>) {
  return (
    <div
      className={`flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-subtle overflow-x-auto scrollbar-none max-w-full ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        const getBadgeStyle = () => {
          if (!isActive) {
            return 'bg-surface text-muted border border-subtle';
          }
          switch (tab.countVariant) {
            case 'emerald':
              return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
            case 'amber':
              return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
            case 'slate':
              return 'bg-slate-500/15 text-slate-600 dark:text-slate-400';
            case 'indigo':
            default:
              return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400';
          }
        };

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-secondary hover:text-primary hover:bg-surface-hover border border-transparent'
            }`}
          >
            {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-muted'}`} />}
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white/20 text-white border border-white/20'
                    : getBadgeStyle()
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
