import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  History,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface ApprovalHistoryItem {
  id: string;
  title: string;
  entityType: string;
  reviewer: string;
  status: 'Approved' | 'Changes Requested';
  signedOffAt: string;
  notes: string;
}

export const ApprovalHistory: React.FC = () => {
  const navigate = useNavigate();

  const history: ApprovalHistoryItem[] = [
    {
      id: 'req-8290',
      title: 'Autumn Radiance Sprint — Carousel Post #2',
      entityType: 'Post (LinkedIn & Instagram)',
      reviewer: 'Acme Client Marketing VP',
      status: 'Approved',
      signedOffAt: 'Oct 07, 2026 at 03:20 PM',
      notes: 'Approved without changes. Ready to publish.',
    },
    {
      id: 'req-8289',
      title: 'Autumn Radiance Sprint — Reel #1 (Opening Hook)',
      entityType: '9:16 Video Reel',
      reviewer: 'Acme Client Marketing VP',
      status: 'Approved',
      signedOffAt: 'Oct 06, 2026 at 11:45 AM',
      notes: 'Good pacing, CTA link approved.',
    },
    {
      id: 'req-8285',
      title: 'Q3 Product Announcement Banner',
      entityType: 'Canva Visual Asset',
      reviewer: 'Internal Lead Creative',
      status: 'Approved',
      signedOffAt: 'Sep 28, 2026 at 05:10 PM',
      notes: 'Color balance and logo margins verified.',
    },
  ];

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
            <span>Back to Dashboard</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Approvals</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">Audit History</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Compliance & Audit Trail</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Client Approval History
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Complete log of client reviews, sign-off timestamps, and feedback history.
        </p>
      </div>

      {/* History List Card */}
      <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="divide-y divide-white/5">
          {history.map((item) => (
            <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {item.status}
                  </span>
                  <span className="text-xs font-mono text-purple-400 font-semibold">{item.id}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">{item.signedOffAt}</span>
                </div>

                <p className="text-sm font-bold text-white hover:text-purple-300 transition cursor-pointer" onClick={() => navigate(`/approvals/${item.id}`)}>
                  {item.title}
                </p>

                <p className="text-xs text-slate-400">
                  Reviewed by <strong className="text-slate-300">{item.reviewer}</strong> • <em>"{item.notes}"</em>
                </p>
              </div>

              <button
                onClick={() => navigate(`/approvals/${item.id}`)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition self-start md:self-auto"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApprovalHistory;
