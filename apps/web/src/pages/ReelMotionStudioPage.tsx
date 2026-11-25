import React from 'react';
import { ReelMotionStudioModal } from '../components/ReelMotionStudioModal.js';

interface ReelMotionStudioPageProps {
  onNavigate?: (tab: string, state?: any) => void;
  initialText?: string;
  campaignId?: string;
  campaignName?: string;
  postId?: string;
}

export const ReelMotionStudioPage: React.FC<ReelMotionStudioPageProps> = ({
  onNavigate,
  initialText,
  campaignId,
  campaignName,
  postId,
}) => {
  return (
    <div className="canva-embedded-container" style={{ width: '100%', height: '100%', overflow: 'hidden', margin: 0, padding: 0 }}>
      <ReelMotionStudioModal
        isOpen={true}
        isEmbedded={true}
        initialText={initialText}
        campaignId={campaignId}
        campaignName={campaignName}
        postId={postId}
        onClose={() => {
          if (campaignId) {
            onNavigate?.('campaigns');
          } else {
            onNavigate?.('studio');
          }
        }}
        onCreatePost={() => onNavigate?.('studio')}
        onUseInPost={(asset) => {
          if (campaignId) {
            onNavigate?.('campaigns', { attachedVideoAsset: asset, postId });
          } else {
            onNavigate?.('studio', { attachedVideoAsset: asset });
          }
        }}
        onSaveToLibrary={(asset) => {
          if (campaignId) {
            onNavigate?.('campaigns', { attachedVideoAsset: asset, postId });
          }
        }}
      />
    </div>
  );
};
