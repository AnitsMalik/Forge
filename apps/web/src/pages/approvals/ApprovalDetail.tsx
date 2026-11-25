import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Copy,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const ApprovalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeBrand } = useAuth();

  const [status, setStatus] = useState<'pending' | 'approved' | 'changes_requested'>('pending');
  const [comment, setComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState([
    {
      author: 'Sarah Chen (Agency Lead)',
      role: 'Creator',
      timestamp: 'Today at 10:15 AM',
      message: 'Drafted 3 carousel cards covering the Q4 launch offer. Please review hook tone.',
    },
  ]);

  const magicLink = `https://app.hoaspforge.com/review/magic_${id || 'req-8291'}`;

  const copyLink = () => {
    navigator.clipboard.writeText(magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = () => {
    setStatus('approved');
  };

  const handleRequestChanges = () => {
    if (!comment.trim()) return;
    setFeedbackHistory([
      ...feedbackHistory,
      {
        author: 'Client Reviewer',
        role: 'Approver',
        timestamp: 'Just now',
        message: comment,
      },
    ]);
    setComment('');
    setStatus('changes_requested');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Approvals</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Approvals</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">{id || 'REQ-8291'}</span>
          </div>
        </div>

        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-200 transition"
        >
          <Copy className="w-4 h-4 text-purple-400" />
          <span>{copied ? 'Link Copied!' : 'Copy Client Magic Link'}</span>
        </button>
      </div>

      {/* Main Approval Review Card */}
      <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${
                  status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : status === 'changes_requested'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {status.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-500 font-mono">ID: {id || 'REQ-8291'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Autumn Radiance Sprint — Carousel Post #3
            </h1>
            <p className="text-slate-400 text-sm">
              Submitted for brand partner sign-off before automatic scheduling.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={status === 'approved'}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{status === 'approved' ? 'Approved' : 'Approve Post'}</span>
            </button>
          </div>
        </div>

        {/* Post Preview Box */}
        <div className="p-6 rounded-xl bg-[#131926]/70 border border-white/5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/5 pb-3">
            <span className="font-semibold text-slate-300">Target Channels: LinkedIn, Instagram</span>
            <span>Scheduled: Tomorrow at 09:00 AM</span>
          </div>

          <div className="space-y-3">
            <p className="text-base text-white leading-relaxed">
              "Most agencies spend 14 hours a week manually drafting and reformatting social assets.
              Here is how automated omni-channel workflows cut that down to 15 minutes:"
            </p>
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
              💡 <strong>Hook Breakdown:</strong> High-resonance agitation angle with immediate ROI proof-point in the first sentence.
            </div>
          </div>
        </div>

        {/* Feedback & Review Discussion */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>Feedback & Review Thread</span>
          </h2>

          <div className="space-y-3">
            {feedbackHistory.map((fb, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{fb.author} <span className="text-slate-400 font-normal">({fb.role})</span></span>
                  <span className="text-slate-400">{fb.timestamp}</span>
                </div>
                <p className="text-sm text-slate-300">{fb.message}</p>
              </div>
            ))}
          </div>

          {/* Add Feedback Input */}
          <div className="flex gap-3 pt-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave client notes or request specific revisions..."
              className="flex-1 bg-[#131926] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleRequestChanges}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/15 text-amber-300 border border-amber-500/30 rounded-xl transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDetail;
