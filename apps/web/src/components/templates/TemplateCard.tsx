import React from 'react';

export const TemplateCard: React.FC<{ name: string; category: string; onSelect?: () => void }> = ({ name, category, onSelect }) => {
  return (
    <div className="card p-3 border rounded hover:border-primary cursor-pointer" onClick={onSelect}>
      <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center text-xs text-gray-400">Preview</div>
      <h5 className="font-medium text-sm">{name}</h5>
      <span className="text-xs text-gray-500">{category}</span>
    </div>
  );
};
