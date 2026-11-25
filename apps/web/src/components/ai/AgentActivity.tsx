import React from 'react';

export const AgentActivity: React.FC<{ activities: Array<{ id: string; message: string; timestamp: string }> }> = ({ activities }) => {
  return (
    <ul className="space-y-2 text-xs text-gray-500">
      {activities.map((a) => (
        <li key={a.id} className="flex justify-between">
          <span>{a.message}</span>
          <span>{a.timestamp}</span>
        </li>
      ))}
    </ul>
  );
};
