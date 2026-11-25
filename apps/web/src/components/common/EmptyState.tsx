import React from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <div className="text-center py-12 px-4 border border-dashed rounded-xl">
      <h4 className="font-semibold text-gray-800">{title}</h4>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-4">{description}</p>
      {action}
    </div>
  );
};
