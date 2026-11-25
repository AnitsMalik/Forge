import React from 'react';

export const ApprovalActions: React.FC<{ onApprove?: () => void; onReject?: () => void }> = ({ onApprove, onReject }) => {
  return (
    <div className="flex gap-2">
      <button className="btn btn-primary text-sm" onClick={onApprove}>Approve</button>
      <button className="btn btn-secondary text-sm" onClick={onReject}>Request Changes</button>
    </div>
  );
};
