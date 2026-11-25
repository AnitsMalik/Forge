import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Layers,
  CheckCircle2,
  Share2,
  Globe,
  Save,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  provider: string;
  selected: boolean;
}

export const SelectResources: React.FC = () => {
  const navigate = useNavigate();
  const { activeBrand } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resources, setResources] = useState<ResourceItem[]>([]);

  useEffect(() => {
    const loadResources = async () => {
      try {
        setLoading(true);
        const [connsRes, metaPagesRes] = await Promise.allSettled([
          api.connections.list(activeBrand?.id),
          api.connections.getDiscoveredMetaPages().catch(() => null),
        ]);

        const items: ResourceItem[] = [];

        if (connsRes.status === 'fulfilled' && Array.isArray(connsRes.value)) {
          connsRes.value.forEach((c: any) => {
            items.push({
              id: c.id,
              name: c.account_name || `${c.provider} Channel`,
              type: `${c.provider.toUpperCase()} Channel`,
              provider: c.provider.toUpperCase(),
              selected: c.status !== 'DISCONNECTED',
            });
          });
        }

        if (metaPagesRes.status === 'fulfilled' && metaPagesRes.value?.data?.pages) {
          metaPagesRes.value.data.pages.forEach((p: any) => {
            const pageId = p.id || p.page_id;
            if (!items.some((i) => i.id === pageId)) {
              items.push({
                id: pageId,
                name: p.name || `Facebook Page (${pageId})`,
                type: 'Facebook Page',
                provider: 'FACEBOOK',
                selected: p.connections && p.connections.length > 0,
              });
            }
            if (p.instagramAccount) {
              const igId = p.instagramAccount.id;
              if (!items.some((i) => i.id === igId)) {
                items.push({
                  id: igId,
                  name: p.instagramAccount.username ? `@${p.instagramAccount.username}` : `Instagram (${igId})`,
                  type: 'Instagram Professional',
                  provider: 'INSTAGRAM',
                  selected: p.instagramAccount.isConnected || false,
                });
              }
            }
          });
        }

        setResources(items);
      } catch (err) {
        console.error('Failed to load resources:', err);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [activeBrand?.id]);

  const toggleSelect = (id: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      navigate('/connections');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/connections')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Connect Hub</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Connect Hub</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">Select Resources</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl shadow-md transition disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? 'Saving...' : 'Save Selection'}</span>
        </button>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
          <Layers className="w-3.5 h-3.5" />
          <span>Resource Routing Gateway</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Manage Connected Publishing Resources
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Choose which pages, business profiles, and cloud folders are active for this brand workspace.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
          <p className="text-sm">Loading connected resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-[#0d111b]/80 border border-white/10 rounded-2xl">
          <Layers className="w-8 h-8 mx-auto mb-2 text-purple-400/60" />
          <p className="text-sm font-semibold text-white">No Connected Resources Found</p>
          <p className="text-xs text-slate-400 mt-1">Connect a channel in Connect Hub to route resources.</p>
        </div>
      ) : (
        <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="divide-y divide-white/5">
          {resources.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0 cursor-pointer hover:bg-white/[0.02] px-3 rounded-xl transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono">
                    {item.provider}
                  </span>
                  <span className="text-xs text-slate-400">• {item.type}</span>
                </div>
                <p className="text-sm font-semibold text-white">{item.name}</p>
              </div>

              <div
                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                  item.selected
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'border-white/20 text-transparent'
                }`}
              >
                <Check className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
};

export default SelectResources;
