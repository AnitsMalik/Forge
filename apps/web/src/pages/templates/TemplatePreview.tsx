import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Share2 } from 'lucide-react';

export const TemplatePreview: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <button
          onClick={() => navigate('/templates')}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Templates</span>
        </button>

        <button
          onClick={() => navigate('/templates/editor')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-md"
        >
          <Edit3 className="w-4 h-4" />
          <span>Open in Canvas Editor</span>
        </button>
      </div>

      <div className="max-w-xl mx-auto bg-[#0d111b]/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-xl space-y-6 text-center">
        <h1 className="text-2xl font-bold text-white">Template Live Rendering Preview</h1>
        <p className="text-slate-400 text-sm">
          Multi-layer rendering engine preview with active brand tokens and variables.
        </p>

        <div className="aspect-square w-full rounded-2xl bg-gradient-to-br from-purple-900/60 to-slate-900 border border-white/10 p-6 flex flex-col justify-between text-left">
          <span className="text-xs font-mono text-purple-300">Live Preview</span>
          <h2 className="text-2xl font-extrabold text-white">Dynamic AI Content Hook</h2>
          <span className="text-xs text-slate-400">@brand_handle</span>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
