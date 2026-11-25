import React from 'react';

export const ActionBuilder: React.FC = () => {
  return (
    <div className="p-4 border rounded bg-card">
      <h4 className="font-medium mb-2">Do this... (Action)</h4>
      <select className="input">
        <option value="generate_ai">Generate AI Post & Image</option>
        <option value="schedule_post">Schedule Directly</option>
        <option value="send_approval">Request Client Approval</option>
      </select>
    </div>
  );
};
