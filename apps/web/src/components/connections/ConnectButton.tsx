import React from 'react';

export interface ConnectButtonProps {
  provider: string;
  onConnect?: () => void;
  loading?: boolean;
}

export const ConnectButton: React.FC<ConnectButtonProps> = ({ provider, onConnect, loading }) => {
  return (
    <button className="btn btn-primary" onClick={onConnect} disabled={loading}>
      {loading ? 'Connecting...' : `Connect ${provider}`}
    </button>
  );
};
