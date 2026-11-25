import React from 'react';

export interface HealthBadgeProps {
  status: 'healthy' | 'degraded' | 'expired';
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ status }) => {
  const colorMap = {
    healthy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    degraded: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    expired: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border uppercase font-medium ${colorMap[status] || colorMap.healthy}`}>
      {status}
    </span>
  );
};
