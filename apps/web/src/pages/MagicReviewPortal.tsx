import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Image as ImageIcon,
  Tag,
  Check,
  Send,
  Eye,
  Calendar,
  Layers,
  FileText,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api.js';

interface MagicReviewPortalProps {
  token: string;
  onExit: () => void;
}

export const MagicReviewPortal: React.FC<MagicReviewPortalProps> = ({ token, onExit }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('External Client');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const presets = [
    'Looks great! Approved for launch.',
    'Please swap the promo discount code to GLOW25.',
    'Update call to action link to point to spring collection.',
    'Adjust caption tone to sound more energetic and youth-focused.',
    'Hashtag set looks off - please remove irrelevant hashtags.',
  ];

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await api.approvals.getMagicPreview(token);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired review link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, [token]);

  const handleAction = async (action: 'approved' | 'changes_requested') => {
    setIsSubmitting(true);
    try {
      const finalComment = selectedPreset && !comment ? selectedPreset : comment;
      const res = await api.approvals.actOnMagicLink(token, action, finalComment, reviewerName);
      setActionSuccess(res.message);
      setComment('');
      setSelectedPreset(null);
      await loadPreview();
    } catch (err: any) {
      setError('Error submitting action: ' + (err.message || 'Failed to submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseMedia = (item: any): string[] => {
    if (!item) return [];
    if (Array.isArray(item)) return item;
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        if (item.startsWith('http') || item.startsWith('/')) return [item];
      }
    }
    return [];
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f19', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ fontSize: '0.95rem' }}>Loading secure Magic Review Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#0b0f19', color: '#f8fafc' }}>
        <div className="glass-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '36px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <AlertCircle size={48} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Review Link Inactive</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px' }}>
            {error || 'This magic review token has expired or is invalid.'}
          </p>
          <button
            className="btn btn-secondary"
            onClick={onExit}
            style={{ padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', background: '#334155', color: '#fff', border: 'none' }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const postMediaUrls = parseMedia(data.post?.media_urls);
  const brandLogo = data.brand?.logoUrls?.primary || data.brand?.logoUrls?.light || (typeof data.brand?.logoUrls === 'string' ? data.brand.logoUrls : null);

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', paddingBottom: '80px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Client Bar */}
      <div style={{ background: '#111827', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onExit}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#94a3b8', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} />
            <span>Agency View</span>
          </button>

          {brandLogo && (
            <img src={brandLogo} alt={data.brand?.name} style={{ height: '28px', maxWidth: '120px', objectFit: 'contain' }} />
          )}

          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{data.brand?.name || 'Client Review'}</span>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', fontWeight: 600 }}>
                Zero-Login Portal
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Encrypted Single-Use Link • Reviewer: {reviewerName}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background:
                data.approvalStatus === 'approved'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : data.approvalStatus === 'changes_requested'
                    ? 'rgba(244, 63, 94, 0.2)'
                    : 'rgba(245, 158, 11, 0.2)',
              color:
                data.approvalStatus === 'approved'
                  ? '#34d399'
                  : data.approvalStatus === 'changes_requested'
                    ? '#fb7185'
                    : '#fbbf24',
              border: `1px solid ${data.approvalStatus === 'approved'
                  ? 'rgba(16, 185, 129, 0.4)'
                  : data.approvalStatus === 'changes_requested'
                    ? 'rgba(244, 63, 94, 0.4)'
                    : 'rgba(245, 158, 11, 0.4)'
                }`,
            }}
          >
            {data.approvalStatus === 'approved' ? '✓ Approved' : data.approvalStatus === 'changes_requested' ? 'Changes Requested' : '● Pending Client Review'}
          </span>
        </div>
      </div>

      {/* Main Review Container */}
      <div style={{ maxWidth: '1000px', margin: '32px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {actionSuccess && (
          <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
            <CheckCircle2 size={24} />
            <div>
              <strong>Action Saved Successfully!</strong>
              <div style={{ fontSize: '0.82rem', color: '#a7f3d0' }}>{actionSuccess}</div>
            </div>
          </div>
        )}

        {/* Post Overview Banner */}
        <div style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '3px 10px', borderRadius: '6px', marginBottom: '10px' }}>
                <Sparkles size={13} /> Creative Post Submission
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '4px 0 0 0', color: '#ffffff' }}>{data.post.title || 'Multi-Channel Post'}</h2>
            </div>
            {data.post.scheduled_for && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.82rem', background: 'rgba(255, 255, 255, 0.04)', padding: '6px 12px', borderRadius: '8px' }}>
                <Clock size={14} className="text-amber-400" />
                <span>Scheduled for: {new Date(data.post.scheduled_for).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {data.post.base_content}
          </div>

          {postMediaUrls.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={14} /> Attached Media Assets ({postMediaUrls.length})
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {postMediaUrls.map((url, i) => (
                  <div key={i} style={{ width: '140px', height: '140px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#000' }}>
                    <img src={url} alt={`Asset ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Platform Variants Cards */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Layers size={18} className="text-indigo-400" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Platform-Specific Copy Variations</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '18px' }}>
            {data.variants && data.variants.length > 0 ? (
              data.variants.map((variant: any) => {
                const variantMedia = parseMedia(variant.media_urls);
                const platformLabel = variant.platform === 'x_twitter' ? 'X / Twitter' : variant.platform;
                return (
                  <div
                    key={variant.id}
                    style={{
                      background: 'rgba(17, 24, 39, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', textTransform: 'capitalize', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                          {platformLabel}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {(variant.content || '').length} chars
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.88rem',
                          color: '#cbd5e1',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.55,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          paddingRight: '6px',
                        }}
                      >
                        {variant.content || data.post.base_content}
                      </div>

                      {variantMedia.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {variantMedia.map((mUrl, mIdx) => (
                            <img key={mIdx} src={mUrl} alt="Variant media" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ background: 'rgba(17, 24, 39, 0.5)', padding: '24px', borderRadius: '12px', border: '1px dashed rgba(255, 255, 255, 0.1)', color: '#94a3b8', textAlign: 'center', gridColumn: '1 / -1' }}>
                Single omnichannel post copy is queued across all connected destinations.
              </div>
            )}
          </div>
        </div>

        {/* Client Action Box */}
        <div style={{ background: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <UserCheck size={20} className="text-indigo-400" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Client Decision & Feedback</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
            Approve this post to authorize automated multi-channel publishing according to schedule, or request specific copy / visual revisions.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Reviewer Name / Title</label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="E.g., Jessica (Marketing VP)"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Revision Notes / Feedback</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  setSelectedPreset(null);
                }}
                placeholder="E.g., Approved! Or please adjust coupon code to GLOW25..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          {/* Quick presets */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Or select quick feedback preset:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {presets.map((p, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(p);
                    setComment(p);
                  }}
                  style={{
                    fontSize: '0.75rem',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: comment === p ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: comment === p ? '#a5b4fc' : '#94a3b8',
                    border: `1px solid ${comment === p ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end', alignItems: 'center' }}>
            {data.approvalStatus !== 'pending' && (
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', marginRight: 'auto' }}>
                This approval request is already resolved ({data.approvalStatus}).
              </span>
            )}

            <button
              onClick={() => handleAction('changes_requested')}
              disabled={isSubmitting || data.approvalStatus !== 'pending'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#e11d48',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: data.approvalStatus === 'pending' && !isSubmitting ? 'pointer' : 'not-allowed',
                opacity: data.approvalStatus !== 'pending' || isSubmitting ? 0.5 : 1,
              }}
            >
              <AlertCircle size={16} />
              <span>Request Changes</span>
            </button>

            <button
              onClick={() => handleAction('approved')}
              disabled={isSubmitting || data.approvalStatus !== 'pending'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '8px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: data.approvalStatus === 'pending' && !isSubmitting ? 'pointer' : 'not-allowed',
                opacity: data.approvalStatus !== 'pending' || isSubmitting ? 0.5 : 1,
              }}
            >
              <CheckCircle2 size={16} />
              <span>Approve for Publishing</span>
            </button>
          </div>
        </div>

        {/* Comment Thread History */}
        {data.comments && data.comments.length > 0 && (
          <div style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <MessageSquare size={18} className="text-indigo-400" />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Review Comments & Audit Log</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.comments.map((c: any) => (
                <div
                  key={c.id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    background: c.is_external_client ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${c.is_external_client ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.06)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#f8fafc' }}>{c.author_name}</strong>
                      {c.is_external_client && (
                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', fontWeight: 600 }}>
                          Client
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>{c.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
