import React from 'react';
import { HealthBadge } from './HealthBadge.js';

export interface ConnectionCardProps {
  name: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'expired';
  onConfigure?: () => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({ name, provider, status, onConfigure }) => {
  return (
    <div className="card p-4 flex justify-between items-center">
      <div>
        <h4 className="font-semibold">{name}</h4>
        <span className="text-sm text-gray-500 capitalize">{provider}</span>
      </div>
      <div className="flex items-center gap-3">
        <HealthBadge status={status} />
        {onConfigure && (
          <button className="btn btn-secondary text-sm" onClick={onConfigure}>
            Configure
          </button>
        )}
      </div>
    </div>
  );
};
