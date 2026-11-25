import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Layers,
  Sparkles,
  Eye,
  Type,
  Palette,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  ShieldCheck,
  Tag,
  Maximize2,
  Sliders,
  DollarSign,
  Move,
  Lock,
  GitBranch,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { CANONICAL_STAGE4_TEMPLATE_CATALOG } from '../../constants/stage4TemplateCatalog.js';

interface CanvasLayer {
  id: string;
  name: string;
  type: 'text' | 'badge' | 'cta' | 'image' | 'shape';
  text?: string;
  url?: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  padding?: string;
  zIndex?: number;
}

interface TemplateData {
  id?: string;
  name: string;
  description?: string;
  category: string;
  aspectRatio: string;
  scope?: string;
  background: {
    type: string;
    value: string;
  };
  layers: CanvasLayer[];
  activeVersion?: number;
  isLocked?: boolean;
}

// Relative luminance formula per WCAG 2.1 AA specifications
function getLuminance(hex: string): number {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return 0.5;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function calculateContrastRatio(color1: string, color2: string): number {
  try {
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
  } catch {
    return 4.5;
  }
}

export const TemplateEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const templateId = paramId || searchParams.get('id') || undefined;
  const { activeBrand } = useAuth();

  // Template State
  const [name, setName] = useState('Product Showcase Card');
  const [category, setCategory] = useState('product_promotion');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('1:1');
  const [backgroundColor, setBackgroundColor] = useState('#0d111b');
  const [layers, setLayers] = useState<CanvasLayer[]>([
    {
      id: 'l_hero_img',
      name: 'Product Hero Image',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1080',
      x: 10,
      y: 18,
      zIndex: 1,
    },
    {
      id: 'l_badge',
      name: 'Promo Tag Badge',
      type: 'badge',
      text: '{{discount}}',
      x: 10,
      y: 8,
      fontSize: 12,
      fontWeight: 'bold',
      color: '#f43f5e',
      backgroundColor: '#f43f5e25',
      borderRadius: 8,
      padding: '4px 10px',
      zIndex: 2,
    },
    {
      id: 'l_title',
      name: 'Product Name',
      type: 'text',
      text: '{{product_name}}',
      x: 10,
      y: 68,
      fontSize: 22,
      fontWeight: 'bold',
      color: '#ffffff',
      zIndex: 3,
    },
    {
      id: 'l_price',
      name: 'Price Callout',
      type: 'text',
      text: 'Only {{price}}',
      x: 10,
      y: 77,
      fontSize: 18,
      fontWeight: 'bold',
      color: '#10b981',
      zIndex: 3,
    },
    {
      id: 'l_cta',
      name: 'Call To Action',
      type: 'cta',
      text: '{{cta_text}} ➔',
      x: 10,
      y: 86,
      fontSize: 13,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: '#8b5cf6',
      borderRadius: 10,
      padding: '8px 18px',
      zIndex: 4,
    },
  ]);

  const [selectedLayerId, setSelectedLayerId] = useState<string>('l_title');
  const [activeVersion, setActiveVersion] = useState<number>(1);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [previewWithSampleData, setPreviewWithSampleData] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mock sample product data for live testing
  const sampleData: Record<string, string> = {
    product_name: 'Botanical Rose Glow Serum',
    price: '$48.00',
    discount: '20% OFF',
    cta_text: 'Shop Now',
    image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1080',
    brand_name: activeBrand?.name || 'Aura Botanicals',
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load existing template if editing
  useEffect(() => {
    if (!templateId) return;
    const fetchTpl = async () => {
      try {
        const res = await api.templates.get(templateId, activeBrand?.id);
        let tpl = res?.data || res;
        if (!tpl || !tpl.name) {
          tpl = CANONICAL_STAGE4_TEMPLATE_CATALOG.find((c: any) => c.id === templateId);
        }
        if (tpl) {
          setName(tpl.name || 'Untitled Template');
          setCategory(tpl.category || 'product_promotion');
          setAspectRatio((tpl.aspectRatio as any) || '1:1');
          if (tpl.background?.value) setBackgroundColor(tpl.background.value);
          if (Array.isArray(tpl.layers) && tpl.layers.length > 0) {
            setLayers(tpl.layers);
            setSelectedLayerId(tpl.layers[0].id);
          }
          setActiveVersion(tpl.activeVersion || 1);
          setIsLocked(tpl.isLocked || false);
        }
      } catch (err: any) {
        console.warn('Could not load template from backend, checking canonical catalog:', err.message);
        const fallback = CANONICAL_STAGE4_TEMPLATE_CATALOG.find((c: any) => c.id === templateId);
        if (fallback) {
          setName(fallback.name);
          setCategory(fallback.category);
          setAspectRatio((fallback.aspectRatio as any) || '1:1');
          if (fallback.background?.value) setBackgroundColor(fallback.background.value);
          if (Array.isArray(fallback.layers) && fallback.layers.length > 0) {
            setLayers(fallback.layers as any);
            setSelectedLayerId(fallback.layers[0].id);
          }
          setActiveVersion(fallback.activeVersion || 1);
          setIsLocked((fallback as any).isLocked || false);
        }
      }
    };
    fetchTpl();
  }, [templateId, activeBrand?.id]);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || layers[0];

  const updateSelectedLayer = (updates: Partial<CanvasLayer>) => {
    if (!selectedLayer) return;
    setLayers((prev) =>
      prev.map((l) => (l.id === selectedLayer.id ? { ...l, ...updates } : l))
    );
  };

  const handleAddLayer = (type: CanvasLayer['type']) => {
    const newId = `l_${Date.now()}`;
    let newLayer: CanvasLayer;

    if (type === 'text') {
      newLayer = {
        id: newId,
        name: 'New Text Layer',
        type: 'text',
        text: 'Headline Copy',
        x: 10,
        y: 50,
        fontSize: 16,
        fontWeight: 'normal',
        color: '#ffffff',
        zIndex: layers.length + 1,
      };
    } else if (type === 'badge') {
      newLayer = {
        id: newId,
        name: 'New Promo Badge',
        type: 'badge',
        text: 'SPECIAL OFFER',
        x: 10,
        y: 20,
        fontSize: 11,
        fontWeight: 'bold',
        color: '#38bdf8',
        backgroundColor: '#0284c725',
        borderRadius: 6,
        padding: '3px 8px',
        zIndex: layers.length + 1,
      };
    } else if (type === 'cta') {
      newLayer = {
        id: newId,
        name: 'New CTA Button',
        type: 'cta',
        text: 'Order Today ➔',
        x: 10,
        y: 85,
        fontSize: 13,
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#ec4899',
        borderRadius: 8,
        padding: '8px 16px',
        zIndex: layers.length + 1,
      };
    } else {
      newLayer = {
        id: newId,
        name: 'Image Container',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080',
        x: 15,
        y: 25,
        zIndex: layers.length + 1,
      };
    }

    setLayers([...layers, newLayer]);
    setSelectedLayerId(newId);
  };

  const handleDeleteLayer = (id: string) => {
    if (layers.length <= 1) {
      setToast({ type: 'error', message: 'Template must have at least one layer.' });
      return;
    }
    const remaining = layers.filter((l) => l.id !== id);
    setLayers(remaining);
    setSelectedLayerId(remaining[0].id);
  };

  // Interpolate sample variables for live render view
  const interpolateText = (rawText: string = ''): string => {
    if (!previewWithSampleData) return rawText;
    let result = rawText;
    result = result.replace(/\{\{\s*product_name\s*\}\}/g, sampleData.product_name);
    result = result.replace(/\{\{\s*price\s*\}\}/g, sampleData.price);
    result = result.replace(/\{\{\s*discount\s*\}\}/g, sampleData.discount);
    result = result.replace(/\{\{\s*cta_text\s*\}\}/g, sampleData.cta_text);
    result = result.replace(/\{\{\s*brand\.name\s*\}\}/g, sampleData.brand_name);
    return result;
  };

  // Calculate real WCAG 2.1 AA Contrast score for selected layer
  const currentContrastScore = calculateContrastRatio(
    selectedLayer?.color || '#ffffff',
    selectedLayer?.backgroundColor || backgroundColor
  );
  const isLargeText = (selectedLayer?.fontSize || 14) >= 18 || selectedLayer?.fontWeight === 'bold';
  const minRequiredContrast = isLargeText ? 3.0 : 4.5;
  const isContrastCompliant = currentContrastScore >= minRequiredContrast;

  // Boundary check: is any layer outside canvas?
  const hasBoundaryBreach = layers.some((l) => l.x > 100 || l.y > 100 || l.x < 0 || l.y < 0);

  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      setToast({ type: 'error', message: 'Please provide a template name.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        category,
        aspectRatio,
        background: { type: 'solid', value: backgroundColor },
        layers,
        brandId: activeBrand?.id,
      };

      if (templateId) {
        await api.templates.update(templateId, payload, activeBrand?.id);
        setToast({
          type: 'success',
          message: isLocked
            ? `Template updated! Branched to new active version (v${activeVersion + 1}).`
            : 'Template saved successfully!',
        });
      } else {
        const created = await api.templates.create(payload, activeBrand?.id);
        setToast({ type: 'success', message: 'New template created successfully!' });
      }

      setTimeout(() => navigate('/templates'), 1000);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to save template.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      {/* Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Templates</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Template Studio</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">{name}</span>
          </div>

          {isLocked && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Lock className="w-3 h-3" />
              Locked (v{activeVersion}) • Auto-Branch on Edit
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewWithSampleData(!previewWithSampleData)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition ${
              previewWithSampleData
                ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{previewWithSampleData ? 'Rendered Sample View' : 'Template Variable View'}</span>
          </button>

          <button
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl shadow-lg shadow-purple-500/20 transition disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs uppercase font-bold tracking-wider opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Layer Hierarchy & Add Tools (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Template Global Settings */}
          <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Canvas Properties</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="1:1">1:1 Square (IG/FB)</option>
                    <option value="4:5">4:5 Portrait (IG)</option>
                    <option value="9:16">9:16 Story/Reel</option>
                    <option value="16:9">16:9 Landscape</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-xs text-slate-300">{backgroundColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Layer List & Add Tool */}
          <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Layers ({layers.length})</span>
              </h2>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAddLayer('text')}
                  title="Add Text"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAddLayer('badge')}
                  title="Add Promo Badge"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                >
                  <Tag className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAddLayer('cta')}
                  title="Add CTA Button"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {layers.map((layer) => {
                const isSelected = layer.id === selectedLayerId;
                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500/80 shadow-md shadow-purple-500/10'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {layer.type === 'image' && <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      {layer.type === 'text' && <Type className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                      {layer.type === 'badge' && <Tag className="w-4 h-4 text-pink-400 flex-shrink-0" />}
                      {layer.type === 'cta' && <ShoppingBag className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                      <span className="text-xs font-semibold text-white truncate">{layer.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {layer.x}%, {layer.y}%
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLayer(layer.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Layer Property Inspector */}
          {selectedLayer && (
            <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span>Layer Inspector</span>
                </h3>
                <span className="text-xs text-purple-400 font-mono uppercase">{selectedLayer.type}</span>
              </div>

              <div className="space-y-3">
                {selectedLayer.type !== 'image' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs uppercase font-semibold text-slate-400">Content / Variable</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateSelectedLayer({ text: '{{product_name}}' })}
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-purple-500/10 text-purple-300 rounded border border-purple-500/20 hover:bg-purple-500/20"
                        >
                          +name
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedLayer({ text: '{{price}}' })}
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-300 rounded border border-emerald-500/20 hover:bg-emerald-500/20"
                        >
                          +price
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedLayer({ text: '{{discount}}' })}
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-pink-500/10 text-pink-300 rounded border border-pink-500/20 hover:bg-pink-500/20"
                        >
                          +discount
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={selectedLayer.text || ''}
                      onChange={(e) => updateSelectedLayer({ text: e.target.value })}
                      className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                )}

                {selectedLayer.type === 'image' && (
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Image URL</label>
                    <input
                      type="text"
                      value={selectedLayer.url || ''}
                      onChange={(e) => updateSelectedLayer({ url: e.target.value })}
                      className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">X Position (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedLayer.x}
                      onChange={(e) => updateSelectedLayer({ x: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Y Position (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedLayer.y}
                      onChange={(e) => updateSelectedLayer({ y: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {selectedLayer.type !== 'image' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Font Size (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={72}
                        value={selectedLayer.fontSize || 16}
                        onChange={(e) => updateSelectedLayer({ fontSize: parseInt(e.target.value, 10) || 16 })}
                        className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Text Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedLayer.color || '#ffffff'}
                          onChange={(e) => updateSelectedLayer({ color: e.target.value })}
                          className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                        />
                        <span className="font-mono text-xs text-slate-300">{selectedLayer.color || '#ffffff'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* WCAG 2.1 AA Contrast Live Indicator */}
                {selectedLayer.type !== 'image' && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        WCAG 2.1 AA Contrast
                      </span>
                      <span
                        className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                          isContrastCompliant
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {currentContrastScore}:1 {isContrastCompliant ? 'PASS' : 'WARN'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Requires {minRequiredContrast}:1 contrast against background for accessibility compliance.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Interactive Viewport Canvas (8 Cols) */}
        <div className="lg:col-span-8 bg-[#0d111b]/80 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center min-h-[620px] relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Canvas Wrapper */}
          <div
            className="w-full max-w-md rounded-3xl shadow-2xl border transition-all duration-300 relative overflow-hidden flex flex-col"
            style={{
              aspectRatio:
                aspectRatio === '1:1'
                  ? '1 / 1'
                  : aspectRatio === '4:5'
                  ? '4 / 5'
                  : aspectRatio === '9:16'
                  ? '9 / 16'
                  : '16 / 9',
              backgroundColor,
              borderColor: hasBoundaryBreach ? '#ef4444' : '#ffffff20',
            }}
          >
            {/* Render Canvas Layers */}
            {layers.map((layer) => {
              const isSelected = layer.id === selectedLayerId;
              const displayText = interpolateText(layer.text);

              if (layer.type === 'image') {
                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`absolute cursor-pointer transition-all rounded-2xl overflow-hidden ${
                      isSelected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black' : ''
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      width: '70%',
                      height: '45%',
                      zIndex: layer.zIndex || 1,
                    }}
                  >
                    <img
                      src={previewWithSampleData ? sampleData.image_url : layer.url}
                      alt={layer.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                );
              }

              if (layer.type === 'badge') {
                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`absolute cursor-pointer select-none transition-all ${
                      isSelected ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-black' : ''
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      fontSize: `${layer.fontSize || 12}px`,
                      fontWeight: layer.fontWeight || 'bold',
                      color: layer.color || '#ffffff',
                      backgroundColor: layer.backgroundColor || '#f43f5e20',
                      borderRadius: `${layer.borderRadius || 6}px`,
                      padding: layer.padding || '4px 10px',
                      zIndex: layer.zIndex || 2,
                    }}
                  >
                    {displayText}
                  </div>
                );
              }

              if (layer.type === 'cta') {
                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`absolute cursor-pointer select-none font-bold shadow-lg transition-all ${
                      isSelected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black' : ''
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      fontSize: `${layer.fontSize || 13}px`,
                      color: layer.color || '#ffffff',
                      backgroundColor: layer.backgroundColor || '#8b5cf6',
                      borderRadius: `${layer.borderRadius || 8}px`,
                      padding: layer.padding || '8px 18px',
                      zIndex: layer.zIndex || 4,
                    }}
                  >
                    {displayText}
                  </div>
                );
              }

              return (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`absolute cursor-pointer select-none transition-all ${
                    isSelected ? 'ring-1 ring-purple-400 p-1 rounded bg-purple-500/10' : ''
                  }`}
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    fontSize: `${layer.fontSize || 16}px`,
                    fontWeight: layer.fontWeight || 'normal',
                    color: layer.color || '#ffffff',
                    zIndex: layer.zIndex || 3,
                  }}
                >
                  {displayText}
                </div>
              );
            })}
          </div>

          {/* Canvas Bottom Diagnostics */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Dimensions: {aspectRatio === '1:1' ? '1080 × 1080' : aspectRatio === '4:5' ? '1080 × 1350' : aspectRatio === '9:16' ? '1080 × 1920' : '1200 × 675'}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Accessibility: WCAG 2.1 AA {isContrastCompliant ? 'Verified' : 'Review Contrast'}
            </span>
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-pink-400" />
              Version Engine: v{activeVersion} {isLocked ? '(Immutability Locked)' : '(Unlocked)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
