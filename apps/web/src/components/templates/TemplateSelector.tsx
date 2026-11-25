import React from 'react';

export const TemplateSelector: React.FC<{ templates: any[]; onSelect: (t: any) => void }> = ({ templates, onSelect }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {templates.map((t, idx) => (
        <div key={idx} className="p-2 border rounded cursor-pointer" onClick={() => onSelect(t)}>
          {t.name}
        </div>
      ))}
    </div>
  );
};
