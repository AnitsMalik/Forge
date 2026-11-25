import React from 'react';

export interface ProviderIconProps {
  provider: string;
  size?: number;
}

export const ProviderIcon: React.FC<ProviderIconProps> = ({ provider, size = 20 }) => {
  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center font-bold text-xs uppercase bg-gray-100 rounded">
      {provider.slice(0, 2)}
    </div>
  );
};
