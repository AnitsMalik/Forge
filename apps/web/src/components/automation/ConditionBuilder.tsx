import React from 'react';

export const ConditionBuilder: React.FC = () => {
  return (
    <div className="p-4 border rounded bg-card">
      <h4 className="font-medium mb-2">Only if... (Condition)</h4>
      <input className="input" placeholder="e.g. payload.category == 'announcement'" />
    </div>
  );
};
