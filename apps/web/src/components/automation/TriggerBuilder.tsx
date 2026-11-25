import React from 'react';

export const TriggerBuilder: React.FC = () => {
  return (
    <div className="p-4 border rounded bg-card">
      <h4 className="font-medium mb-2">When this happens... (Trigger)</h4>
      <select className="input">
        <option value="schedule">Recurring Schedule (Cron)</option>
        <option value="webhook">External Webhook</option>
        <option value="sheet">Google Sheet Row Added</option>
      </select>
    </div>
  );
};
