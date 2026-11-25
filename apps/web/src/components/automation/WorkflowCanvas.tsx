import React from 'react';

export const WorkflowCanvas: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="workflow-canvas p-6 border rounded-xl bg-gray-50/50 min-h-[300px] flex flex-col gap-4">
      {children || <p className="text-gray-400 text-center my-auto">Drag or add steps to assemble automation workflow.</p>}
    </div>
  );
};
