import React from 'react';
import { CanvaStudioModal } from '../components/CanvaStudioModal.js';

interface CanvaStudioPageProps {
  onNavigate?: (tab: string, state?: any) => void;
  initialText?: string;
}

export const CanvaStudioPage: React.FC<CanvaStudioPageProps> = ({ onNavigate, initialText }) => {
  return (
    <div className="canva-embedded-container" style={{ width: '100%', height: '100%', overflow: 'hidden', margin: 0, padding: 0 }}>
      <CanvaStudioModal
        isOpen={true}
        isEmbedded={true}
        initialText={initialText}
        onClose={() => onNavigate?.('studio')}
        onCreatePost={(asset) => onNavigate?.('studio', { attachedMediaAsset: asset })}
        onUseInPost={(asset) => {
          onNavigate?.('studio', { attachedMediaAsset: asset });
        }}
      />
    </div>
  );
};
