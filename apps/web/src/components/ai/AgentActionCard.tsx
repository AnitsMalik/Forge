import React from 'react';

export const AgentActionCard: React.FC<{ action: { title: string; description: string } }> = ({ action }) => {
  return (
    <div className="card p-3 border rounded bg-violet-500/5 border-violet-500/20">
      <h6 className="font-semibold text-sm text-violet-700">{action.title}</h6>
      <p className="text-xs text-gray-600 mt-1">{action.description}</p>
    </div>
  );
};
