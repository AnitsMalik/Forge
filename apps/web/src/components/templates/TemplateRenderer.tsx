import React from 'react';

export const TemplateRenderer: React.FC<{ template: any; variables: Record<string, string> }> = ({ template, variables }) => {
  return (
    <div className="template-preview-box p-4 border rounded bg-white">
      <p className="font-semibold">{template?.name || 'Template'}</p>
    </div>
  );
};
