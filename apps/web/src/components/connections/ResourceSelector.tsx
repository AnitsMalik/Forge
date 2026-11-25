import React from 'react';

export interface ResourceSelectorProps {
  resources: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const ResourceSelector: React.FC<ResourceSelectorProps> = ({ resources, selectedIds, onChange }) => {
  return (
    <div className="space-y-2">
      {resources.map((res) => (
        <label key={res.id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.includes(res.id)}
            onChange={(e) => {
              if (e.target.checked) onChange([...selectedIds, res.id]);
              else onChange(selectedIds.filter((id) => id !== res.id));
            }}
          />
          <span>{res.name}</span>
        </label>
      ))}
    </div>
  );
};
