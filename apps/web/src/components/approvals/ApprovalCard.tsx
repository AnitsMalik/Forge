import React from 'react';
import { ApprovalActions } from './ApprovalActions.js';

export const ApprovalCard: React.FC<{ post: any; onApprove?: () => void; onReject?: () => void }> = ({ post, onApprove, onReject }) => {
  return (
    <div className="card p-4 border rounded">
      <h5 className="font-semibold mb-2">{post?.title || 'Post Draft'}</h5>
      <p className="text-sm text-gray-600 mb-4">{post?.baseContent}</p>
      <ApprovalActions onApprove={onApprove} onReject={onReject} />
    </div>
  );
};
