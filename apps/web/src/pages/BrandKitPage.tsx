import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Palette,
  Check,
  Save,
  Plus,
  X,
  ShieldAlert,
  Sparkles,
  Globe,
  RefreshCw,
  FileText,
  Layers,
  Smile,
  Hash,
  Users,
  Target,
  DollarSign,
  Package,
  Briefcase,
  Feather,
  Copy,
  ExternalLink,
  Eye,
  AlertCircle,
  HelpCircle,
  Cpu,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import type {
  BrandBrain,
  BrandBrainProduct,
  BrandBrainServiceOffering,
  BrandBrainContentPillar,
  WebsiteExtractionResult,
} from '@socialforge/shared';

type ActiveTab = 'profile_offerings' | 'audience_strategy' | 'voice_style' | 'visual_identity' | 'ai_prompt_preview';

export const BrandKitPage: React.FC = () => {
  const { activeBrand } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile_offerings');

  // Unified Brand Brain State
  const [brain, setBrain] = useState<BrandBrain | null>(null);

  // Quick temporary inputs for adding items
  const [newUsp, setNewUsp] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');
  const [newBrandValue, setNewBrandValue] = useState('');
  const [newDescriptor, setNewDescriptor] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newCta, setNewCta] = useState('');
  const [newSignatureEmoji, setNewSignatureEmoji] = useState('');
  const [newDefaultHashtag, setNewDefaultHashtag] = useState('');
  const [newBannedHashtag, setNewBannedHashtag] = useState('');
  const [newTopicToAvoid, setNewTopicToAvoid] = useState('');
  const [newDemographic, setNewDemographic] = useState('');

  // Product modal / inline form state
  const [productForm, setProductForm] = useState<BrandBrainProduct>({
    name: '',
    description: '',
    price: '',
    category: '',
  });
  const [showProductForm, setShowProductForm] = useState(false);

  // Service modal / inline form state
  const [serviceForm, setServiceForm] = useState<BrandBrainServiceOffering>({
    name: '',
    description: '',
    deliverables: [],
  });
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceDeliverableInput, setServiceDeliverableInput] = useState('');

  // Content Pillar inline form state
  const [pillarForm, setPillarForm] = useState<BrandBrainContentPillar>({
    title: '',
    description: '',
    weightPercentage: 25,
    sampleTopics: [],
  });
  const [showPillarForm, setShowPillarForm] = useState(false);
  const [sampleTopicInput, setSampleTopicInput] = useState('');

  // Website Scraper Modal & Confirmation States
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<WebsiteExtractionResult | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [livePromptContext, setLivePromptContext] = useState<string>('');

  useEffect(() => {
    if (isExtractModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExtractModalOpen]);

  // Load Brand Brain on mount or brand switch
  useEffect(() => {
    if (!activeBrand) return;

    const loadBrandBrain = async () => {
      setLoading(true);
      try {
        const brainData = await api.brands.getBrain(activeBrand.id);
        setBrain(brainData);
        if (brainData.businessProfile?.websiteUrl && !scrapeUrl) {
          setScrapeUrl(brainData.businessProfile.websiteUrl);
        }
      } catch (err) {
        console.error('Failed to load Brand Brain:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBrandBrain();
  }, [activeBrand]);

  // Load Live AI Prompt Context when preview tab is selected
  useEffect(() => {
    if (!activeBrand || activeTab !== 'ai_prompt_preview') return;
    const fetchContext = async () => {
      try {
        const res = await api.brands.getAiContext(activeBrand.id);
        setLivePromptContext(res.systemPrompt);
      } catch (err) {
        console.error('Failed to fetch AI context:', err);
      }
    };
    fetchContext();
  }, [activeBrand, activeTab, brain]);

  // Save Brand Brain to Database
  const handleSave = async () => {
    if (!activeBrand || !brain) return;
    setSaving(true);
    try {
      const updated = await api.brands.updateBrain(activeBrand.id, brain);
      setBrain(updated);
      setSaveMessage('✨ Centralized Brand Brain saved & synchronized across all AI generation pipelines!');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveMessage('❌ Error updating Brand Brain: ' + err.message);
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Trigger Website Extraction API
  const handleExtractWebsite = async () => {
    if (!activeBrand || !scrapeUrl.trim()) return;
    setIsExtracting(true);
    setExtractError(null);
    try {
      const result = await api.brands.extractWebsite(activeBrand.id, scrapeUrl.trim());
      setExtractedData(result);
    } catch (err: any) {
      setExtractError(err.message || 'Failed to extract website information');
    } finally {
      setIsExtracting(false);
    }
  };

  // Apply Extracted Website Information to Brand Brain (after user confirmation)
  const handleConfirmAndApplyExtraction = () => {
    if (!extractedData || !brain) return;

    const updated: BrandBrain = {
      ...brain,
      businessProfile: {
        ...brain.businessProfile,
        description: extractedData.businessDescription || brain.businessProfile.description,
        websiteUrl: extractedData.sourceUrl || brain.businessProfile.websiteUrl,
      },
      products:
        extractedData.products.length > 0
          ? [
              ...brain.products,
              ...extractedData.products.map((p) => ({
                id: crypto.randomUUID(),
                name: p.name,
                description: p.description,
                price: p.price,
                category: p.category || 'General',
              })),
            ]
          : brain.products,
      services:
        extractedData.services.length > 0
          ? [
              ...brain.services,
              ...extractedData.services.map((s) => ({
                id: crypto.randomUUID(),
                name: s.name,
                description: s.description,
                deliverables: [],
              })),
            ]
          : brain.services,
      usps: Array.from(new Set([...brain.usps, ...extractedData.usps])),
      targetAudience: {
        ...brain.targetAudience,
        primary: extractedData.audience || brain.targetAudience.primary,
      },
      brandValues: Array.from(new Set([...brain.brandValues, ...(extractedData.brandValues || [])])),
      tone: {
        ...brain.tone,
        formality: (extractedData.toneSuggestions?.formality as any) || brain.tone.formality,
        descriptors: Array.from(
          new Set([...brain.tone.descriptors, ...(extractedData.toneSuggestions?.descriptors || [])])
        ),
      },
      contentPillars:
        extractedData.contentPillarsSuggestions && extractedData.contentPillarsSuggestions.length > 0
          ? [
              ...brain.contentPillars,
              ...extractedData.contentPillarsSuggestions
                .filter((cp) => !brain.contentPillars.some((p) => p.title === cp))
                .map((title) => ({
                  id: crypto.randomUUID(),
                  title,
                  description: `Core recurring theme for ${extractedData.rawMeta.title}`,
                  weightPercentage: 25,
                  sampleTopics: [],
                })),
            ]
          : brain.contentPillars,
    };

    setBrain(updated);
    setIsExtractModalOpen(false);
    setExtractedData(null);
    setSaveMessage('✨ Website facts successfully extracted & applied to Brand Brain! Click "Save Brand Brain" to commit.');
  };

  // Add Product to Brain
  const handleAddProduct = () => {
    if (!brain || !productForm.name.trim()) return;
    const newProduct: BrandBrainProduct = {
      id: crypto.randomUUID(),
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: productForm.price?.trim() || undefined,
      category: productForm.category?.trim() || undefined,
    };
    setBrain({ ...brain, products: [...brain.products, newProduct] });
    setProductForm({ name: '', description: '', price: '', category: '' });
    setShowProductForm(false);
  };

  // Add Service to Brain
  const handleAddService = () => {
    if (!brain || !serviceForm.name.trim()) return;
    const newService: BrandBrainServiceOffering = {
      id: crypto.randomUUID(),
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim(),
      deliverables: serviceForm.deliverables || [],
    };
    setBrain({ ...brain, services: [...brain.services, newService] });
    setServiceForm({ name: '', description: '', deliverables: [] });
    setShowServiceForm(false);
  };

  // Add Content Pillar to Brain
  const handleAddPillar = () => {
    if (!brain || !pillarForm.title.trim()) return;
    const newPillar: BrandBrainContentPillar = {
      id: crypto.randomUUID(),
      title: pillarForm.title.trim(),
      description: pillarForm.description.trim(),
      weightPercentage: pillarForm.weightPercentage || 25,
      sampleTopics: pillarForm.sampleTopics || [],
    };
    setBrain({ ...brain, contentPillars: [...brain.contentPillars, newPillar] });
    setPillarForm({ title: '', description: '', weightPercentage: 25, sampleTopics: [] });
    setShowPillarForm(false);
  };

  if (loading || !brain) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <RefreshCw size={32} className="spin" color="var(--accent-primary)" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Loading Centralized Brand Brain...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      {/* Top Header & Global Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>Centralized Brand Brain</h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#a78bfa',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                letterSpacing: '0.05em',
              }}
            >
              16 Dimensions Active
            </span>
          </div>
          <p style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            The persistent intelligence hub for <strong>{activeBrand?.name}</strong>. Powers every AI generation with zero duplication.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Website Import Button */}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setExtractError(null);
              setExtractedData(null);
              setIsExtractModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Globe size={16} color="var(--accent-primary)" />
            <span>Import from Website</span>
          </button>

          {/* Save to MySQL */}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            <span>{saving ? 'Saving...' : 'Save Brand Brain'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Check size={18} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{saveMessage}</span>
        </div>
      )}

      {/* 5-Category Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-medium)',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => setActiveTab('profile_offerings')}
          className={`tab-btn ${activeTab === 'profile_offerings' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: activeTab === 'profile_offerings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'profile_offerings' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Briefcase size={16} />
          <span>1. Profile, Products & USPs</span>
        </button>

        <button
          onClick={() => setActiveTab('audience_strategy')}
          className={`tab-btn ${activeTab === 'audience_strategy' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: activeTab === 'audience_strategy' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'audience_strategy' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Target size={16} />
          <span>2. Audience, Values & Pillars</span>
        </button>

        <button
          onClick={() => setActiveTab('voice_style')}
          className={`tab-btn ${activeTab === 'voice_style' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: activeTab === 'voice_style' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'voice_style' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Feather size={16} />
          <span>3. Voice, Tone & Guidelines</span>
        </button>

        <button
          onClick={() => setActiveTab('visual_identity')}
          className={`tab-btn ${activeTab === 'visual_identity' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: activeTab === 'visual_identity' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'visual_identity' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Palette size={16} />
          <span>4. Visual Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_prompt_preview')}
          className={`tab-btn ${activeTab === 'ai_prompt_preview' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: activeTab === 'ai_prompt_preview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'ai_prompt_preview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Cpu size={16} />
          <span>5. Live AI System Prompt Inspector</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BUSINESS PROFILE, PRODUCTS, SERVICES, AND USPs */}
      {/* ========================================================================= */}
      {activeTab === 'profile_offerings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Business Profile Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Briefcase size={20} color="var(--accent-primary)" />
              <h4>Business Profile & Overview</h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Brand / Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={brain.businessProfile.name}
                  onChange={(e) =>
                    setBrain({
                      ...brain,
                      businessProfile: { ...brain.businessProfile, name: e.target.value },
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Industry / Vertical</label>
                <input
                  type="text"
                  className="form-input"
                  value={brain.businessProfile.industry}
                  onChange={(e) =>
                    setBrain({
                      ...brain,
                      businessProfile: { ...brain.businessProfile, industry: e.target.value },
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Public Website URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://yourbrand.com"
                  value={brain.businessProfile.websiteUrl || ''}
                  onChange={(e) =>
                    setBrain({
                      ...brain,
                      businessProfile: { ...brain.businessProfile, websiteUrl: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Tagline / Value Statement</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Science-backed botanical formulas for radiant skin"
                value={brain.businessProfile.tagline || ''}
                onChange={(e) =>
                  setBrain({
                    ...brain,
                    businessProfile: { ...brain.businessProfile, tagline: e.target.value },
                  })
                }
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Business Description & Overview (Used by AI for context)</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={brain.businessProfile.description}
                onChange={(e) =>
                  setBrain({
                    ...brain,
                    businessProfile: { ...brain.businessProfile, description: e.target.value },
                  })
                }
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Core Mission Statement</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Why the business exists and the impact it delivers"
                value={brain.businessProfile.mission || ''}
                onChange={(e) =>
                  setBrain({
                    ...brain,
                    businessProfile: { ...brain.businessProfile, mission: e.target.value },
                  })
                }
              />
            </div>
          </div>

          {/* Products & Services Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
            {/* Products Card */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Package size={18} color="var(--accent-secondary)" />
                  <h4>Products ({brain.products.length})</h4>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowProductForm(!showProductForm)}>
                  <Plus size={14} />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Add Product Inline Form */}
              {showProductForm && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-medium)',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Product Name (e.g. Vitamin C Serum)"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Price (e.g. $48.00)"
                      value={productForm.price || ''}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    />
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Category (e.g. Serums)"
                    value={productForm.category || ''}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  />
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Key benefits and ingredients"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowProductForm(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleAddProduct}>
                      Save Product
                    </button>
                  </div>
                </div>
              )}

              {/* Products List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {brain.products.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{p.name}</span>
                        {p.price && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              fontWeight: 600,
                            }}
                          >
                            {p.price}
                          </span>
                        )}
                        {p.category && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {p.category}</span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {p.description}
                      </p>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => setBrain({ ...brain, products: brain.products.filter((_, i) => i !== idx) })}
                      title="Remove product"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {brain.products.length === 0 && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No products added yet. Click &quot;Add Product&quot; or extract from your public website.
                  </p>
                )}
              </div>
            </div>

            {/* Services Card */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Briefcase size={18} color="var(--accent-primary)" />
                  <h4>Services & Capabilities ({brain.services.length})</h4>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowServiceForm(!showServiceForm)}>
                  <Plus size={14} />
                  <span>Add Service</span>
                </button>
              </div>

              {/* Add Service Inline Form */}
              {showServiceForm && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-medium)',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Service Name (e.g. Skin Diagnosis Consultation)"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  />
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Brief description of the service and value"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowServiceForm(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleAddService}>
                      Save Service
                    </button>
                  </div>
                </div>
              )}

              {/* Services List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {brain.services.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s.name}</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {s.description}
                      </p>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => setBrain({ ...brain, services: brain.services.filter((_, i) => i !== idx) })}
                      title="Remove service"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {brain.services.length === 0 && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No services added yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* USPs (Unique Selling Propositions) Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Target size={20} color="var(--accent-amber)" />
              <h4>Unique Selling Propositions (USPs & Differentiators)</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Distinct advantages highlighted in AI post highlights, video hooks, and advertising graphics.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {brain.usps.map((usp, index) => (
                <span
                  key={index}
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  {usp}
                  <X
                    size={13}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setBrain({ ...brain, usps: brain.usps.filter((_, i) => i !== index) })}
                  />
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', maxWidth: '600px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Add USP (e.g. 100% Dermatologist Tested & Hypoallergenic)"
                value={newUsp}
                onChange={(e) => setNewUsp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newUsp.trim()) {
                    setBrain({ ...brain, usps: [...brain.usps, newUsp.trim()] });
                    setNewUsp('');
                  }
                }}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (newUsp.trim()) {
                    setBrain({ ...brain, usps: [...brain.usps, newUsp.trim()] });
                    setNewUsp('');
                  }
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUDIENCE, PAIN POINTS, VALUES & CONTENT PILLARS */}
      {/* ========================================================================= */}
      {activeTab === 'audience_strategy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Target Audience Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Users size={20} color="var(--accent-primary)" />
              <h4>Target Audience & Customer Profile</h4>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Audience Summary</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={brain.targetAudience.primary}
                onChange={(e) =>
                  setBrain({
                    ...brain,
                    targetAudience: { ...brain.targetAudience, primary: e.target.value },
                  })
                }
              />
            </div>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Demographic Segments</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {brain.targetAudience.demographics.map((demo, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#93c5fd',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    {demo}
                    <X
                      size={12}
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        setBrain({
                          ...brain,
                          targetAudience: {
                            ...brain.targetAudience,
                            demographics: brain.targetAudience.demographics.filter((_, i) => i !== idx),
                          },
                        })
                      }
                    />
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', maxWidth: '500px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add demographic (e.g. Women 25-45, Urban Professionals)"
                  value={newDemographic}
                  onChange={(e) => setNewDemographic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDemographic.trim()) {
                      setBrain({
                        ...brain,
                        targetAudience: {
                          ...brain.targetAudience,
                          demographics: [...brain.targetAudience.demographics, newDemographic.trim()],
                        },
                      });
                      setNewDemographic('');
                    }
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (newDemographic.trim()) {
                      setBrain({
                        ...brain,
                        targetAudience: {
                          ...brain.targetAudience,
                          demographics: [...brain.targetAudience.demographics, newDemographic.trim()],
                        },
                      });
                      setNewDemographic('');
                    }
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Pain Points & Brand Values Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* Customer Pain Points */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <AlertCircle size={18} color="var(--accent-rose)" />
                <h4>Customer Pain Points Solved</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                The core frustrations your audience experiences that your posts address with solutions.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {brain.painPoints.map((pp, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      fontSize: '0.84rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{pp}</span>
                    <X
                      size={14}
                      style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                      onClick={() => setBrain({ ...brain, painPoints: brain.painPoints.filter((_, i) => i !== idx) })}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add customer pain point"
                  value={newPainPoint}
                  onChange={(e) => setNewPainPoint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPainPoint.trim()) {
                      setBrain({ ...brain, painPoints: [...brain.painPoints, newPainPoint.trim()] });
                      setNewPainPoint('');
                    }
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (newPainPoint.trim()) {
                      setBrain({ ...brain, painPoints: [...brain.painPoints, newPainPoint.trim()] });
                      setNewPainPoint('');
                    }
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Brand Values */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Sparkles size={18} color="var(--accent-secondary)" />
                <h4>Core Brand Values & Principles</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Guiding ethical and cultural standards woven into brand storytelling.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                {brain.brandValues.map((bv, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#c4b5fd',
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    {bv}
                    <X
                      size={12}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setBrain({ ...brain, brandValues: brain.brandValues.filter((_, i) => i !== idx) })}
                    />
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add brand value (e.g. Clinical Integrity)"
                  value={newBrandValue}
                  onChange={(e) => setNewBrandValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBrandValue.trim()) {
                      setBrain({ ...brain, brandValues: [...brain.brandValues, newBrandValue.trim()] });
                      setNewBrandValue('');
                    }
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (newBrandValue.trim()) {
                      setBrain({ ...brain, brandValues: [...brain.brandValues, newBrandValue.trim()] });
                      setNewBrandValue('');
                    }
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Content Pillars Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={20} color="var(--accent-primary)" />
                <h4>Content Pillars & Thematic Angles ({brain.contentPillars.length})</h4>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPillarForm(!showPillarForm)}>
                <Plus size={14} />
                <span>Add Content Pillar</span>
              </button>
            </div>

            {/* Add Pillar Form */}
            {showPillarForm && (
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-medium)',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pillar Title (e.g. Science of Radiance)"
                    value={pillarForm.title}
                    onChange={(e) => setPillarForm({ ...pillarForm, title: e.target.value })}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Weight %"
                    min={0}
                    max={100}
                    value={pillarForm.weightPercentage || 25}
                    onChange={(e) => setPillarForm({ ...pillarForm, weightPercentage: Number(e.target.value) })}
                  />
                </div>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Objective & theme of this content pillar"
                  value={pillarForm.description}
                  onChange={(e) => setPillarForm({ ...pillarForm, description: e.target.value })}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowPillarForm(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddPillar}>
                    Save Pillar
                  </button>
                </div>
              </div>
            )}

            {/* Pillars Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              {brain.contentPillars.map((pillar, idx) => (
                <div
                  key={pillar.id || idx}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{pillar.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {pillar.weightPercentage && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#818cf8',
                              fontWeight: 600,
                            }}
                          >
                            {pillar.weightPercentage}%
                          </span>
                        )}
                        <button
                          className="btn-icon"
                          onClick={() =>
                            setBrain({
                              ...brain,
                              contentPillars: brain.contentPillars.filter((_, i) => i !== idx),
                            })
                          }
                          title="Remove pillar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {pillar.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VOICE, TONE, WRITING STYLE & GUIDELINES */}
      {/* ========================================================================= */}
      {activeTab === 'voice_style' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tone & Formality Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Smile size={18} color="var(--accent-secondary)" />
                <h4>Tone of Voice & Formality</h4>
              </div>

              <div className="form-group">
                <label className="form-label">Formality Cadence</label>
                <select
                  className="form-select"
                  value={brain.tone.formality}
                  onChange={(e) =>
                    setBrain({
                      ...brain,
                      tone: { ...brain.tone, formality: e.target.value as any },
                    })
                  }
                >
                  <option value="casual">Casual & Conversational</option>
                  <option value="approachable">Approachable & Friendly</option>
                  <option value="professional">Professional & Confident</option>
                  <option value="authoritative">Authoritative & Clinical</option>
                  <option value="playful">Playful & Irreverent</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Tone Descriptors</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {brain.tone.descriptors.map((d, index) => (
                    <span
                      key={index}
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#c4b5fd',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                      }}
                    >
                      {d}
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          setBrain({
                            ...brain,
                            tone: {
                              ...brain.tone,
                              descriptors: brain.tone.descriptors.filter((_, i) => i !== index),
                            },
                          })
                        }
                      />
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add descriptor (e.g. radiant, empowering)"
                    value={newDescriptor}
                    onChange={(e) => setNewDescriptor(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDescriptor.trim()) {
                        setBrain({
                          ...brain,
                          tone: { ...brain.tone, descriptors: [...brain.tone.descriptors, newDescriptor.trim()] },
                        });
                        setNewDescriptor('');
                      }
                    }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (newDescriptor.trim()) {
                        setBrain({
                          ...brain,
                          tone: { ...brain.tone, descriptors: [...brain.tone.descriptors, newDescriptor.trim()] },
                        });
                        setNewDescriptor('');
                      }
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Writing Style Card */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Feather size={18} color="var(--accent-primary)" />
                <h4>Writing Style & Mechanics</h4>
              </div>

              <div className="form-group">
                <label className="form-label">Point of View</label>
                <select
                  className="form-select"
                  value={brain.writingStyle.pointOfView || 'first_person_plural'}
                  onChange={(e) =>
                    setBrain({
                      ...brain,
                      writingStyle: { ...brain.writingStyle, pointOfView: e.target.value as any },
                    })
                  }
                >
                  <option value="first_person_plural">First-Person Plural (We, Our team, At HoaspForge)</option>
                  <option value="first_person_singular">First-Person Singular (I, My journey)</option>
                  <option value="second_person">Second-Person Direct (You, Your skin)</option>
                  <option value="third_person">Third-Person Neutral (The brand, Skincare enthusiasts)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Writing Guidelines (Injected into System Prompts)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={brain.writingStyle.guidelines}
                  onChange={(e) =>
                    setBrain({
                      ...brain,
                      writingStyle: { ...brain.writingStyle, guidelines: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Languages, CTA Preferences & Emoji Preferences */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* CTA Preferences */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Target size={18} color="var(--accent-primary)" />
                <h4>Call-to-Action (CTA) Preferences</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {brain.ctaPreferences.map((cta, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>&quot;{cta}&quot;</span>
                    <X
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        setBrain({
                          ...brain,
                          ctaPreferences: brain.ctaPreferences.filter((_, i) => i !== idx),
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add preferred CTA (e.g. Tap link in bio to shop)"
                  value={newCta}
                  onChange={(e) => setNewCta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCta.trim()) {
                      setBrain({ ...brain, ctaPreferences: [...brain.ctaPreferences, newCta.trim()] });
                      setNewCta('');
                    }
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (newCta.trim()) {
                      setBrain({ ...brain, ctaPreferences: [...brain.ctaPreferences, newCta.trim()] });
                      setNewCta('');
                    }
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Emoji Preferences */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Smile size={18} color="var(--accent-amber)" />
                <h4>Emoji Usage Policy</h4>
              </div>

              <div className="form-group">
                <label className="form-label">Emoji Density</label>
                <select
                  className="form-select"
                  value={brain.emojiPreferences.usage}
                  onChange={(e) =>
                    setBrain({
                      ...brain,
                      emojiPreferences: { ...brain.emojiPreferences, usage: e.target.value as any },
                    })
                  }
                >
                  <option value="none">None (Strict no-emoji policy)</option>
                  <option value="minimal">Minimal (1-2 subtle accents)</option>
                  <option value="moderate">Moderate (Standard social friendly)</option>
                  <option value="heavy">Heavy (High expressive engagement)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '14px' }}>
                <label className="form-label">Signature Brand Emojis</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {brain.emojiPreferences.signatureEmojis.map((em, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-medium)',
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {em}
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          setBrain({
                            ...brain,
                            emojiPreferences: {
                              ...brain.emojiPreferences,
                              signatureEmojis: brain.emojiPreferences.signatureEmojis.filter((_, i) => i !== idx),
                            },
                          })
                        }
                      />
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add emoji (e.g. ✨ or 🌿)"
                    value={newSignatureEmoji}
                    onChange={(e) => setNewSignatureEmoji(e.target.value)}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (newSignatureEmoji.trim()) {
                        setBrain({
                          ...brain,
                          emojiPreferences: {
                            ...brain.emojiPreferences,
                            signatureEmojis: [...brain.emojiPreferences.signatureEmojis, newSignatureEmoji.trim()],
                          },
                        });
                        setNewSignatureEmoji('');
                      }
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Globe size={18} color="var(--accent-secondary)" />
                <h4>Target Communication Languages</h4>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {brain.languages.map((lang, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    {lang}
                    <X
                      size={12}
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        setBrain({
                          ...brain,
                          languages: brain.languages.filter((_, i) => i !== idx),
                        })
                      }
                    />
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add language (e.g. Spanish, German)"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newLanguage.trim()) {
                      setBrain({ ...brain, languages: [...brain.languages, newLanguage.trim()] });
                      setNewLanguage('');
                    }
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (newLanguage.trim()) {
                      setBrain({ ...brain, languages: [...brain.languages, newLanguage.trim()] });
                      setNewLanguage('');
                    }
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Topics to Avoid & Hashtags Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* Topics to Avoid (Taboo words & Competitors) */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <ShieldAlert size={18} color="var(--accent-rose)" />
                <h4>Topics & Taboo Words to Avoid (Negative Constraints)</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                AI is strictly barred from using these words, competitor brands, or unverified claims.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                {brain.topicsToAvoid.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(244, 63, 94, 0.15)',
                      color: '#fda4af',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                    }}
                  >
                    {t}
                    <X
                      size={12}
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        setBrain({
                          ...brain,
                          topicsToAvoid: brain.topicsToAvoid.filter((_, i) => i !== idx),
                        })
                      }
                    />
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add taboo word or competitor to avoid"
                  value={newTopicToAvoid}
                  onChange={(e) => setNewTopicToAvoid(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTopicToAvoid.trim()) {
                      setBrain({
                        ...brain,
                        topicsToAvoid: [...brain.topicsToAvoid, newTopicToAvoid.trim()],
                      });
                      setNewTopicToAvoid('');
                    }
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (newTopicToAvoid.trim()) {
                      setBrain({
                        ...brain,
                        topicsToAvoid: [...brain.topicsToAvoid, newTopicToAvoid.trim()],
                      });
                      setNewTopicToAvoid('');
                    }
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Hashtag Preferences */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Hash size={18} color="var(--accent-primary)" />
                <h4>Hashtag Preferences & Rules</h4>
              </div>

              <div className="form-group">
                <label className="form-label">Primary Branded Hashtag</label>
                <input
                  type="text"
                  className="form-input"
                  value={brain.hashtagPreferences.brandTag}
                  onChange={(e) =>
                    setBrain({
                      ...brain,
                      hashtagPreferences: { ...brain.hashtagPreferences, brandTag: e.target.value },
                    })
                  }
                />
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">Default Associated Hashtags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {brain.hashtagPreferences.defaultTags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {tag}
                      <X
                        size={10}
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          setBrain({
                            ...brain,
                            hashtagPreferences: {
                              ...brain.hashtagPreferences,
                              defaultTags: brain.hashtagPreferences.defaultTags.filter((_, i) => i !== idx),
                            },
                          })
                        }
                      />
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add default hashtag (e.g. #CleanBeauty)"
                    value={newDefaultHashtag}
                    onChange={(e) => setNewDefaultHashtag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDefaultHashtag.trim()) {
                        const formatted = newDefaultHashtag.startsWith('#')
                          ? newDefaultHashtag.trim()
                          : `#${newDefaultHashtag.trim()}`;
                        setBrain({
                          ...brain,
                          hashtagPreferences: {
                            ...brain.hashtagPreferences,
                            defaultTags: [...brain.hashtagPreferences.defaultTags, formatted],
                          },
                        });
                        setNewDefaultHashtag('');
                      }
                    }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (newDefaultHashtag.trim()) {
                        const formatted = newDefaultHashtag.startsWith('#')
                          ? newDefaultHashtag.trim()
                          : `#${newDefaultHashtag.trim()}`;
                        setBrain({
                          ...brain,
                          hashtagPreferences: {
                            ...brain.hashtagPreferences,
                            defaultTags: [...brain.hashtagPreferences.defaultTags, formatted],
                          },
                        });
                        setNewDefaultHashtag('');
                      }
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VISUAL IDENTITY */}
      {/* ========================================================================= */}
      {activeTab === 'visual_identity' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Color Palette Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Palette size={20} color="var(--accent-primary)" />
              <h4>Brand Color Palette</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(brain.visualIdentity.colors).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {key} Color
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {value}
                    </span>
                    <input
                      type="color"
                      value={value}
                      onChange={(e) =>
                        setBrain({
                          ...brain,
                          visualIdentity: {
                            ...brain.visualIdentity,
                            colors: {
                              ...brain.visualIdentity.colors,
                              [key]: e.target.value,
                            },
                          },
                        })
                      }
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-medium)',
                        cursor: 'pointer',
                        background: 'none',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography & Fonts Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <FileText size={20} color="var(--accent-secondary)" />
              <h4>Typography & Fonts</h4>
            </div>

            <div className="form-group">
              <label className="form-label">Heading Font Family</label>
              <input
                type="text"
                className="form-input"
                value={brain.visualIdentity.fonts.heading}
                onChange={(e) =>
                  setBrain({
                    ...brain,
                    visualIdentity: {
                      ...brain.visualIdentity,
                      fonts: { ...brain.visualIdentity.fonts, heading: e.target.value },
                    },
                  })
                }
              />
              <p
                style={{
                  fontFamily: brain.visualIdentity.fonts.heading,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginTop: '8px',
                  color: 'var(--text-primary)',
                }}
              >
                The quick brown fox jumps over the lazy dog
              </p>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Body Font Family</label>
              <input
                type="text"
                className="form-input"
                value={brain.visualIdentity.fonts.body}
                onChange={(e) =>
                  setBrain({
                    ...brain,
                    visualIdentity: {
                      ...brain.visualIdentity,
                      fonts: { ...brain.visualIdentity.fonts, body: e.target.value },
                    },
                  })
                }
              />
              <p
                style={{
                  fontFamily: brain.visualIdentity.fonts.body,
                  fontSize: '0.9rem',
                  marginTop: '8px',
                  color: 'var(--text-secondary)',
                }}
              >
                Clear typography ensures effortless readability across all mobile and web social feeds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LIVE AI SYSTEM PROMPT CONTEXT INSPECTOR */}
      {/* ========================================================================= */}
      {activeTab === 'ai_prompt_preview' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={20} color="var(--accent-primary)" />
              <h4>Live Centralized AI System Prompt Context</h4>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(livePromptContext);
                setCopiedPrompt(true);
                setTimeout(() => setCopiedPrompt(false), 2500);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copiedPrompt ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copiedPrompt ? 'Copied Context!' : 'Copy System Prompt'}</span>
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            This exact structured prompt context is dynamically injected by <code>BrandBrainService</code> into every AI operation across Content Studio, Canva Studio, Reel Studio, and background publishing jobs.
          </p>

          <pre
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-medium)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--text-primary)',
              maxHeight: '480px',
              overflowY: 'auto',
            }}
          >
            {livePromptContext || 'Loading centralized prompt context...'}
          </pre>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WEBSITE IMPORT & REVIEW CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isExtractModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsExtractModalOpen(false)}
        >
          <div
            className="modal-dialog animate-scale-up brand-scraper-modal"
            style={{
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={22} color="var(--accent-primary)" />
                <h3 style={{ margin: 0 }}>Extract Brand Brain from Public Website</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsExtractModalOpen(false)} title="Close">
                <X size={18} />
              </button>
            </div>

            {!extractedData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Enter any public website URL. Our crawler safely inspects the page, extracts products, services, USPs, audience, and public pricing without hallucination.
                </p>

                <div className="form-group">
                  <label className="form-label">Public Website URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://example.com"
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    disabled={isExtracting}
                  />
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    fontSize: '0.8rem',
                    color: '#93c5fd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <ShieldAlert size={16} />
                  <span>
                    SSRF Protected: Private IPs, cloud metadata (169.254.169.254), and local network addresses are strictly barred.
                  </span>
                </div>

                {extractError && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.85rem',
                    }}
                  >
                    {extractError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setIsExtractModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleExtractWebsite}
                    disabled={isExtracting || !scrapeUrl.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {isExtracting ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
                    <span>{isExtracting ? 'Crawling & Extracting Facts...' : 'Extract Public Information'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Review & Confirmation Step before saving */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>
                    <strong>Information Extracted:</strong> Review the extracted publicly available facts below before applying to your Brand Brain. AI did not invent any missing facts.
                  </span>
                </div>

                {/* Business Description */}
                <div>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Business Description
                  </h5>
                  <p
                    style={{
                      margin: 0,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {extractedData.businessDescription}
                  </p>
                </div>

                {/* Products Extracted */}
                <div>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Products Identified ({extractedData.products.length})
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {extractedData.products.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-glass)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.82rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>
                          <strong>{p.name}</strong> — {p.description}
                        </span>
                        {p.price && (
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              fontWeight: 600,
                            }}
                          >
                            {p.price}
                          </span>
                        )}
                      </div>
                    ))}
                    {extractedData.products.length === 0 && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No explicit individual products detected on the landing page.
                      </p>
                    )}
                  </div>
                </div>

                {/* Services Extracted */}
                <div>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Services Identified ({extractedData.services.length})
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {extractedData.services.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-glass)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <strong>{s.name}</strong>: {s.description}
                      </div>
                    ))}
                    {extractedData.services.length === 0 && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No explicit services detected.
                      </p>
                    )}
                  </div>
                </div>

                {/* USPs & Value Propositions */}
                <div>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    USPs & Value Propositions ({extractedData.usps.length})
                  </h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {extractedData.usps.map((usp, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          fontSize: '0.78rem',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        {usp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Explicit Public Pricing if Found */}
                {extractedData.publicPricing.length > 0 && (
                  <div>
                    <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Explicit Public Pricing Detected ({extractedData.publicPricing.length})
                    </h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {extractedData.publicPricing.map((pr, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{pr.planOrProduct}:</span>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>{pr.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setExtractedData(null)}>
                    Back to Crawler
                  </button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => setIsExtractModalOpen(false)}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleConfirmAndApplyExtraction}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Check size={16} />
                      <span>Confirm & Apply to Brand Brain</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
