import React from 'react';

export const AutomationStatus: React.FC<{ status: 'active' | 'paused' | 'error' }> = ({ status }) => {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};
