import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Edit3,
  Check,
  X,
  Sparkles,
  DollarSign,
  Users,
  ShieldCheck,
  Zap,
  Clock,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Copy,
  Sliders,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { SuperadminPlanDetail } from '@socialforge/shared';

export const PlanManagementSection: React.FC = () => {
  const [plans, setPlans] = useState<SuperadminPlanDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<SuperadminPlanDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for modal
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: number;
    annualPrice: number;
    billingInterval: 'month' | 'year';
    isActive: boolean;
    maxBrands: number;
    maxUsers: number;
    maxSocialAccounts: number;
    maxPostsPerMonth: number;
    maxAiContent: number;
    maxAiImages: number;
    maxAiVideos: number;
    maxActiveCampaigns: number;
    maxScheduledPosts: number;
    storageGb: number;
    aiTokensMonthly: number;
    videoRenderMinutes: number;
    maxActiveAutomations: number;
    analyticsRetentionDays: number;
    autonomyLevel: string;
    trialDays: number;
    trialRequiresCard: boolean;
    upgradeRule: 'immediate_prorated' | 'immediate_full';
    downgradeRule: 'period_end' | 'immediate';
    dataRetentionPolicy: 'zero_data_loss_archive' | '90_day_retention';
    promoActive: boolean;
    promoCode: string;
    promoDiscountPercent: number;
    promoBannerText: string;
    addonsEligible: boolean;
    addonWorkspacePrice: number;
    addonSeatsPrice: number;
    addonAiCreditsPrice: number;
    addonStoragePrice: number;
    features: Record<string, boolean>;
  }>({
    name: '',
    description: '',
    price: 0,
    annualPrice: 0,
    billingInterval: 'month',
    isActive: true,
    maxBrands: 1,
    maxUsers: 1,
    maxSocialAccounts: 1,
    maxPostsPerMonth: 100,
    maxAiContent: 100,
    maxAiImages: 25,
    maxAiVideos: 5,
    maxActiveCampaigns: 5,
    maxScheduledPosts: 50,
    storageGb: 5,
    aiTokensMonthly: 100000,
    videoRenderMinutes: 5,
    maxActiveAutomations: 3,
    analyticsRetentionDays: 30,
    autonomyLevel: 'L2',
    trialDays: 14,
    trialRequiresCard: true,
    upgradeRule: 'immediate_prorated',
    downgradeRule: 'period_end',
    dataRetentionPolicy: 'zero_data_loss_archive',
    promoActive: true,
    promoCode: 'ANNUAL20',
    promoDiscountPercent: 20,
    promoBannerText: 'Save 20% with Annual Billing — 2 Months Free',
    addonsEligible: true,
    addonWorkspacePrice: 29,
    addonSeatsPrice: 19,
    addonAiCreditsPrice: 19,
    addonStoragePrice: 15,
    features: {},
  });

  const [showLegacyTiers, setShowLegacyTiers] = useState(false);

  const { commercialPlans, legacyPlans } = useMemo(() => {
    const commercialRank: Record<string, number> = {
      free: 1,
      starter: 2,
      professional: 3,
      growth: 3,
      business: 4,
      agency: 4,
      agency_pro: 4,
      scale: 5,
      enterprise: 6,
    };

    const commercial: SuperadminPlanDetail[] = [];
    const legacy: SuperadminPlanDetail[] = [];

    for (const plan of plans) {
      if (commercialRank[plan.id]) {
        commercial.push(plan);
      } else {
        legacy.push(plan);
      }
    }

    commercial.sort((a, b) => (commercialRank[a.id] || 99) - (commercialRank[b.id] || 99));
    return { commercialPlans: commercial, legacyPlans: legacy };
  }, [plans]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<any>('/admin/billing/plans');
      if (res && res.success !== undefined) {
        setPlans(res.data || res);
      } else {
        setPlans(res);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openEditModal = (plan: SuperadminPlanDetail) => {
    setEditingPlan(plan);
    const feat = (plan.features || {}) as Record<string, any>;
    const annualMo = plan.annualPriceCents
      ? Math.round(plan.annualPriceCents / 12 / 100)
      : plan.price
        ? Math.round(Number(plan.price) * 0.8)
        : 0;
    const gb = Math.round(Number(plan.storageBytesLimit || 0) / (1024 * 1024 * 1024));
    const mins = Math.round(Number(plan.videoRenderSecondsMonthly || 0) / 60);

    const booleanFeatures: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(feat)) {
      if (typeof v === 'boolean') {
        booleanFeatures[k] = v;
      }
    }

    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      price: Number(plan.price) || 0,
      annualPrice: annualMo,
      billingInterval: (plan.billingInterval as 'month' | 'year') || 'month',
      isActive: plan.isActive !== undefined ? plan.isActive : true,
      maxBrands: Number(plan.maxBrands) || 1,
      maxUsers: Number(plan.maxUsers) || 1,
      maxSocialAccounts: Number(plan.maxSocialAccounts) || 1,
      maxPostsPerMonth: Number(plan.maxPostsPerMonth) || 100,
      maxAiContent: Number((plan as any).maxAiContent ?? 100),
      maxAiImages: Number((plan as any).maxAiImages ?? 25),
      maxAiVideos: Number((plan as any).maxAiVideos ?? 5),
      maxActiveCampaigns: Number((plan as any).maxActiveCampaigns ?? 5),
      maxScheduledPosts: Number((plan as any).maxScheduledPosts ?? 50),
      storageGb: gb > 0 ? gb : 5,
      aiTokensMonthly: Number(plan.aiTokensMonthly) || 100000,
      videoRenderMinutes: mins > 0 ? mins : 5,
      maxActiveAutomations: typeof feat.max_active_automations === 'number' ? feat.max_active_automations : 3,
      analyticsRetentionDays: typeof feat.analytics_retention_days === 'number' ? feat.analytics_retention_days : 30,
      autonomyLevel: typeof feat.max_autonomy_level === 'string' ? feat.max_autonomy_level : 'L2',
      trialDays: typeof feat.trial_days === 'number' ? feat.trial_days : 14,
      trialRequiresCard: feat.trial_requires_card !== undefined ? Boolean(feat.trial_requires_card) : true,
      upgradeRule: feat.upgrade_rule === 'immediate_full' ? 'immediate_full' : 'immediate_prorated',
      downgradeRule: feat.downgrade_rule === 'immediate' ? 'immediate' : 'period_end',
      dataRetentionPolicy: feat.data_retention_policy === '90_day_retention' ? '90_day_retention' : 'zero_data_loss_archive',
      promoActive: feat.promotional_offer?.active !== undefined ? Boolean(feat.promotional_offer.active) : true,
      promoCode: feat.promotional_offer?.code || 'ANNUAL20',
      promoDiscountPercent: typeof feat.promotional_offer?.discountPercent === 'number' ? feat.promotional_offer.discountPercent : 20,
      promoBannerText: feat.promotional_offer?.bannerText || 'Save 20% with Annual Billing — 2 Months Free',
      addonsEligible: feat.addons_config?.eligible !== undefined ? Boolean(feat.addons_config.eligible) : true,
      addonWorkspacePrice: typeof feat.addons_config?.workspacePackPrice === 'number' ? feat.addons_config.workspacePackPrice : 29,
      addonSeatsPrice: typeof feat.addons_config?.seatsPackPrice === 'number' ? feat.addons_config.seatsPackPrice : 19,
      addonAiCreditsPrice: typeof feat.addons_config?.aiCreditsPackPrice === 'number' ? feat.addons_config.aiCreditsPackPrice : 19,
      addonStoragePrice: typeof feat.addons_config?.storagePackPrice === 'number' ? feat.addons_config.storagePackPrice : 15,
      features: booleanFeatures,
    });
    setSuccessMsg(null);
  };

  const applyTierPreset = (preset: 'free' | 'starter' | 'professional' | 'business' | 'enterprise' | 'growth' | 'agency' | 'scale') => {
    if (preset === 'free') {
      setFormData((prev) => ({
        ...prev,
        price: 0,
        annualPrice: 0,
        maxBrands: 1,
        maxUsers: 1,
        maxSocialAccounts: 2,
        maxPostsPerMonth: 20,
        maxAiContent: 25,
        maxAiImages: 5,
        maxAiVideos: 1,
        maxActiveCampaigns: 1,
        maxScheduledPosts: 10,
        storageGb: 1,
        aiTokensMonthly: 25000,
        videoRenderMinutes: 1,
        maxActiveAutomations: 1,
        analyticsRetentionDays: 7,
        autonomyLevel: 'L1',
        features: {
          ...prev.features,
          ai_brain: true,
          ffmpeg_video: true,
          client_approvals: false,
          agency_workspaces: false,
          advanced_analytics: false,
          whatsapp_enabled: false,
        },
      }));
    } else if (preset === 'starter') {
      setFormData((prev) => ({
        ...prev,
        price: 29,
        annualPrice: 24,
        maxBrands: 1,
        maxUsers: 3,
        maxSocialAccounts: 5,
        maxPostsPerMonth: 150,
        maxAiContent: 250,
        maxAiImages: 50,
        maxAiVideos: 10,
        maxActiveCampaigns: 5,
        maxScheduledPosts: 100,
        storageGb: 10,
        aiTokensMonthly: 100000,
        videoRenderMinutes: 10,
        maxActiveAutomations: 5,
        analyticsRetentionDays: 30,
        autonomyLevel: 'L2',
        features: {
          ...prev.features,
          ai_brain: true,
          ffmpeg_video: true,
          client_approvals: false,
          agency_workspaces: false,
          advanced_analytics: false,
          whatsapp_enabled: false,
        },
      }));
    } else if (preset === 'professional' || preset === 'growth') {
      setFormData((prev) => ({
        ...prev,
        price: 79,
        annualPrice: 65,
        maxBrands: 5,
        maxUsers: 10,
        maxSocialAccounts: 15,
        maxPostsPerMonth: 600,
        maxAiContent: 1000,
        maxAiImages: 250,
        maxAiVideos: 30,
        maxActiveCampaigns: 20,
        maxScheduledPosts: 500,
        storageGb: 50,
        aiTokensMonthly: 500000,
        videoRenderMinutes: 30,
        maxActiveAutomations: 20,
        analyticsRetentionDays: 90,
        autonomyLevel: 'L3',
        features: {
          ...prev.features,
          ai_brain: true,
          ffmpeg_video: true,
          client_approvals: true,
          agency_workspaces: false,
          advanced_analytics: true,
          whatsapp_enabled: true,
          recommended: true,
        },
      }));
    } else if (preset === 'business' || preset === 'agency') {
      setFormData((prev) => ({
        ...prev,
        price: 199,
        annualPrice: 165,
        maxBrands: 25,
        maxUsers: 25,
        maxSocialAccounts: 50,
        maxPostsPerMonth: 2500,
        maxAiContent: 5000,
        maxAiImages: 1000,
        maxAiVideos: 100,
        maxActiveCampaigns: 100,
        maxScheduledPosts: 2500,
        storageGb: 200,
        aiTokensMonthly: 2500000,
        videoRenderMinutes: 100,
        maxActiveAutomations: 100,
        analyticsRetentionDays: 365,
        autonomyLevel: 'L4',
        features: {
          ...prev.features,
          ai_brain: true,
          ffmpeg_video: true,
          client_approvals: true,
          agency_workspaces: true,
          advanced_analytics: true,
          whatsapp_enabled: true,
          custom_branding: true,
          multi_brand_brain: true,
          priority_queues: true,
          api_access: true,
        },
      }));
    } else if (preset === 'enterprise' || preset === 'scale') {
      setFormData((prev) => ({
        ...prev,
        price: 499,
        annualPrice: 415,
        maxBrands: 999999,
        maxUsers: 999999,
        maxSocialAccounts: 999999,
        maxPostsPerMonth: 999999,
        maxAiContent: 999999,
        maxAiImages: 999999,
        maxAiVideos: 999999,
        maxActiveCampaigns: 999999,
        maxScheduledPosts: 999999,
        storageGb: 1000,
        aiTokensMonthly: 999999999,
        videoRenderMinutes: 999999,
        maxActiveAutomations: 999999,
        analyticsRetentionDays: 3650,
        autonomyLevel: 'L5',
        features: {
          ...prev.features,
          ai_brain: true,
          ffmpeg_video: true,
          client_approvals: true,
          agency_workspaces: true,
          advanced_analytics: true,
          whatsapp_enabled: true,
          custom_branding: true,
          multi_brand_brain: true,
          priority_queues: true,
          api_access: true,
          scim_provisioning: true,
          enterprise_governance: true,
          dedicated_account_manager: true,
        },
      }));
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      setSaving(true);
      setError(null);

      const isCustomEnterprise = editingPlan.id === 'enterprise';
      const monthlyPrice = Number(formData.price);
      const annualMoPrice = Number(formData.annualPrice);

      const payload = {
        name: formData.name,
        description: formData.description,
        price: monthlyPrice,
        monthlyPriceCents: Math.round(monthlyPrice * 100),
        annualPriceCents: isCustomEnterprise
          ? null
          : annualMoPrice > 0
            ? Math.round(annualMoPrice * 12 * 100)
            : Math.round(monthlyPrice * 12 * 0.8 * 100),
        billingInterval: formData.billingInterval,
        isActive: formData.isActive,
        maxBrands: Number(formData.maxBrands),
        maxUsers: Number(formData.maxUsers),
        maxSocialAccounts: Number(formData.maxSocialAccounts),
        maxPostsPerMonth: Number(formData.maxPostsPerMonth),
        maxAiContent: Number(formData.maxAiContent),
        maxAiImages: Number(formData.maxAiImages),
        maxAiVideos: Number(formData.maxAiVideos),
        maxActiveCampaigns: Number(formData.maxActiveCampaigns),
        maxScheduledPosts: Number(formData.maxScheduledPosts),
        storageBytesLimit: Number(formData.storageGb) * 1024 * 1024 * 1024,
        aiTokensMonthly: Number(formData.aiTokensMonthly),
        videoRenderSecondsMonthly: Number(formData.videoRenderMinutes) * 60,
        features: {
          ...formData.features,
          max_autonomy_level: formData.autonomyLevel,
          max_active_automations: Number(formData.maxActiveAutomations),
          analytics_retention_days: Number(formData.analyticsRetentionDays),
          trial_days: Number(formData.trialDays),
          trial_requires_card: Boolean(formData.trialRequiresCard),
          upgrade_rule: formData.upgradeRule,
          downgrade_rule: formData.downgradeRule,
          data_retention_policy: formData.dataRetentionPolicy,
          promotional_offer: {
            active: Boolean(formData.promoActive),
            code: String(formData.promoCode || '').trim(),
            discountPercent: Number(formData.promoDiscountPercent),
            bannerText: String(formData.promoBannerText || '').trim(),
          },
          addons_config: {
            eligible: Boolean(formData.addonsEligible),
            workspacePackPrice: Number(formData.addonWorkspacePrice),
            seatsPackPrice: Number(formData.addonSeatsPrice),
            aiCreditsPackPrice: Number(formData.addonAiCreditsPrice),
            storagePackPrice: Number(formData.addonStoragePrice),
          },
        },
      };

      await api.put(`/admin/billing/plans/${editingPlan.id}`, payload);
      setSuccessMsg(`Plan '${formData.name}' (${editingPlan.id}) updated successfully.`);
      setEditingPlan(null);
      await loadPlans();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update plan.');
    } finally {
      setSaving(false);
    }
  };

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1000 ? `${(gb / 1024).toFixed(1)} TB` : `${gb.toFixed(0)} GB`;
  };

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Subscription Plans &amp; Packaging Architecture
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Configure commercial quotas, feature entitlements, and pricing across standard platform tiers.
          </p>
        </div>
        <button
          onClick={loadPlans}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: 'var(--bg-glass-card, #1e293b)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium, #374151)',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          <span>Reload Plans</span>
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
          <span>Loading subscription plans...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: '#a78bfa' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Primary Commercial Packaging ({commercialPlans.length} Plans)
                </h4>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Commercial pricing and quota limits enforced by PlanGuard middleware
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {commercialPlans.map((plan) => {
            const isEnterprise = plan.id === 'enterprise';
            const isScale = plan.id === 'scale';
            const isAgency = plan.id === 'agency';
            const isGrowth = plan.id === 'growth';
            const isStarter = plan.id === 'starter';

            return (
              <div
                key={plan.id}
                style={{
                  background: 'var(--bg-glass-card, #111827)',
                  border: isEnterprise
                    ? '1px solid rgba(245, 158, 11, 0.35)'
                    : isScale
                      ? '1px solid rgba(59, 130, 246, 0.35)'
                      : isAgency
                        ? '1px solid rgba(168, 85, 247, 0.35)'
                        : '1px solid var(--border-medium, #1f2937)',
                  borderRadius: '14px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: isEnterprise ? '#f59e0b' : isScale ? '#60a5fa' : isAgency ? '#c084fc' : '#34d399',
                        }}
                      >
                        Tier Key: {plan.id}
                      </span>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                        {plan.name}
                      </h3>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {plan.subscriberCount} Active Org{plan.subscriberCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {isEnterprise ? (
                      'Custom'
                    ) : (
                      <>
                        ${plan.price}
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                          /mo
                        </span>
                      </>
                    )}
                  </div>
                  {!isEnterprise && (
                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, marginBottom: '14px' }}>
                      {plan.annualPriceCents ? `$${Math.round(plan.annualPriceCents / 12 / 100)}/mo billed annually` : 'Standard billing'}
                    </div>
                  )}

                  {/* Resource Capacities */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Brand Workspaces:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{plan.maxBrands >= 9999 ? 'Unlimited' : plan.maxBrands}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Team Seats:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{plan.maxUsers >= 9999 ? 'Unlimited' : plan.maxUsers}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Social Accounts:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{plan.maxSocialAccounts >= 9999 ? 'Unlimited' : plan.maxSocialAccounts}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Monthly Posts:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{plan.maxPostsPerMonth >= 9999 ? 'Unlimited' : plan.maxPostsPerMonth.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>AI Content / mo:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{((plan as any).maxAiContent ?? 100) >= 9999 ? 'Unlimited' : ((plan as any).maxAiContent ?? 100).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>AI Images / mo:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{((plan as any).maxAiImages ?? 25) >= 9999 ? 'Unlimited' : ((plan as any).maxAiImages ?? 25).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>AI Videos / mo:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{((plan as any).maxAiVideos ?? 5) >= 9999 ? 'Unlimited' : ((plan as any).maxAiVideos ?? 5).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Active Campaigns:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{((plan as any).maxActiveCampaigns ?? 5) >= 9999 ? 'Unlimited' : ((plan as any).maxActiveCampaigns ?? 5).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Scheduled Posts:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{((plan as any).maxScheduledPosts ?? 50) >= 9999 ? 'Unlimited' : ((plan as any).maxScheduledPosts ?? 50).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Cloud Storage:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatStorage(plan.storageBytesLimit)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Active Automations:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {plan.features?.max_active_automations !== undefined
                          ? (Number(plan.features.max_active_automations) >= 9999 ? 'Unlimited' : plan.features.max_active_automations)
                          : 'N/A'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>AI Tokens / Month:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {plan.aiTokensMonthly >= 100000000
                          ? 'Unlimited'
                          : `${(plan.aiTokensMonthly / 1000).toLocaleString()}k`}
                      </strong>
                    </div>
                  </div>

                  {/* Feature Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {plan.features?.client_approvals && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        Client Approvals
                      </span>
                    )}
                    {plan.features?.whatsapp_enabled && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                        WhatsApp API
                      </span>
                    )}
                    {plan.features?.agency_workspaces && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        Agency Portfolios
                      </span>
                    )}
                    {plan.features?.api_access && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        REST API
                      </span>
                    )}
                    {plan.features?.scim_provisioning && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        SCIM 2.0
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', borderRadius: '4px' }}>
                      Autonomy: {plan.features?.max_autonomy_level || 'L2'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openEditModal(plan)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '9px 0',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium, #374151)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Edit3 size={14} />
                  <span>Configure Plan &amp; Limits</span>
                </button>
              </div>
            );
          })}
            </div>
          </div>

          {/* Legacy / Evaluation Tiers */}
          {legacyPlans.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-subtle, #1f2937)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                    Evaluation &amp; Legacy Tiers ({legacyPlans.length})
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                    Grandfathered accounts, internal trial sandboxes, and developer test tiers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLegacyTiers(!showLegacyTiers)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {showLegacyTiers ? 'Hide Legacy Tiers' : `Show Legacy Tiers (${legacyPlans.length})`}
                </button>
              </div>

              {showLegacyTiers && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {legacyPlans.map((plan) => (
                    <div
                      key={plan.id}
                      style={{
                        background: 'var(--bg-glass-card, #111827)',
                        border: '1px solid var(--border-medium, #1f2937)',
                        borderRadius: '14px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                        position: 'relative',
                        opacity: 0.85,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                              Tier Key: {plan.id}
                            </span>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                              {plan.name}
                            </h3>
                          </div>
                          <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}>
                            {plan.subscriberCount} Active
                          </span>
                        </div>

                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                          ${plan.price}
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/{plan.billingInterval}</span>
                        </div>

                        {/* Quotas */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Brands:</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{plan.maxBrands}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Seats:</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{plan.maxUsers}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Accounts:</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{plan.maxSocialAccounts}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Posts / mo:</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{plan.maxPostsPerMonth}</strong>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditModal(plan)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          width: '100%',
                          padding: '8px 0',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-medium, #374151)',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Configure Plan &amp; Limits</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '16px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' }}>
                  SuperAdmin Plan Editor
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: '2px 0 0 0' }}>
                  Edit {editingPlan.name} ({editingPlan.id})
                </h3>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Tier Presets */}
            <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quick Specification Presets
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(formData, null, 2));
                    setSuccessMsg('Plan configuration JSON copied to clipboard.');
                    setTimeout(() => setSuccessMsg(null), 3000);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: '#a78bfa',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Copy size={13} />
                  <span>Copy Config JSON</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'free', label: 'Free ($0/mo • 1 Brand)', color: '#94a3b8' },
                  { id: 'starter', label: 'Starter ($29/mo • 1 Brand)', color: '#38bdf8' },
                  { id: 'professional', label: 'Professional ($79/mo • 5 Brands)', color: '#34d399' },
                  { id: 'business', label: 'Business ($199/mo • 25 Brands)', color: '#a78bfa' },
                  { id: 'enterprise', label: 'Enterprise ($499/mo • Unlimited)', color: '#f59e0b' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyTierPreset(p.id as any)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '5px 10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: p.color,
                      border: `1px solid ${p.color}40`,
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Apply {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Plan Identity & Status */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1. Plan Identity &amp; Catalog Status
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Plan Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Catalog Status
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', color: formData.isActive ? '#10b981' : '#94a3b8' }}>
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      <span>{formData.isActive ? 'Active Tier' : 'Archived'}</span>
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Description / Marketing Tagline
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. For solo creators and emerging brands scaling organic presence"
                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* 2. Pricing & Intervals */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  2. Commercial Pricing &amp; Intervals
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Monthly Price ($/mo)
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      required
                      min={0}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
                        Annual Rate ($/mo)
                      </label>
                      {formData.price > 0 && formData.annualPrice > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                          Save {Math.round(((formData.price - formData.annualPrice) / formData.price) * 100)}% (${(formData.price - formData.annualPrice) * 12}/yr)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={formData.annualPrice}
                      onChange={(e) => setFormData({ ...formData, annualPrice: Number(e.target.value) })}
                      min={0}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Default Billing Interval
                    </label>
                    <select
                      value={formData.billingInterval}
                      onChange={(e) => setFormData({ ...formData, billingInterval: e.target.value as 'month' | 'year' })}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    >
                      <option value="month">Monthly Interval</option>
                      <option value="year">Annual Interval</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Multi-Tenant Tenancy Quotas */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  3. Multi-Tenant Resource Allocations
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Max Brand Workspaces
                    </label>
                    <input
                      type="number"
                      value={formData.maxBrands}
                      onChange={(e) => setFormData({ ...formData, maxBrands: Number(e.target.value) })}
                      required
                      min={1}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Max Team Seats
                    </label>
                    <input
                      type="number"
                      value={formData.maxUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) })}
                      required
                      min={1}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Max Social Accounts
                    </label>
                    <input
                      type="number"
                      value={formData.maxSocialAccounts}
                      onChange={(e) => setFormData({ ...formData, maxSocialAccounts: Number(e.target.value) })}
                      required
                      min={1}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Monthly Posts Quota
                    </label>
                    <input
                      type="number"
                      value={formData.maxPostsPerMonth}
                      onChange={(e) => setFormData({ ...formData, maxPostsPerMonth: Number(e.target.value) })}
                      required
                      min={1}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* 3B. AI Generations, Campaigns & Scheduled Posts Quotas */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  3B. AI Generations, Campaigns &amp; Scheduled Posts Quotas
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      AI Content Gens / mo
                    </label>
                    <input
                      type="number"
                      value={formData.maxAiContent}
                      onChange={(e) => setFormData({ ...formData, maxAiContent: Number(e.target.value) })}
                      required
                      min={0}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      AI Image Gens / mo
                    </label>
                    <input
                      type="number"
                      value={formData.maxAiImages}
                      onChange={(e) => setFormData({ ...formData, maxAiImages: Number(e.target.value) })}
                      required
                      min={0}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      AI Video Gens / mo
                    </label>
                    <input
                      type="number"
                      value={formData.maxAiVideos}
                      onChange={(e) => setFormData({ ...formData, maxAiVideos: Number(e.target.value) })}
                      required
                      min={0}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Active Campaigns Limit
                    </label>
                    <input
                      type="number"
                      value={formData.maxActiveCampaigns}
                      onChange={(e) => setFormData({ ...formData, maxActiveCampaigns: Number(e.target.value) })}
                      required
                      min={1}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Max Scheduled Posts Queue
                    </label>
                    <input
                      type="number"
                      value={formData.maxScheduledPosts}
                      onChange={(e) => setFormData({ ...formData, maxScheduledPosts: Number(e.target.value) })}
                      required
                      min={1}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Compute, Storage & Automation Capacities */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  4. Compute, Cloud Storage &amp; Automations
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Cloud Storage Allowance (GB)
                    </label>
                    <input
                      type="number"
                      value={formData.storageGb}
                      onChange={(e) => setFormData({ ...formData, storageGb: Number(e.target.value) })}
                      required
                      min={1}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                      {formData.storageGb >= 1000 ? `${(formData.storageGb / 1024).toFixed(1)} TB` : `${formData.storageGb} GB`} = {(formData.storageGb * 1024 * 1024 * 1024).toLocaleString()} bytes
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Video Render Minutes / mo
                    </label>
                    <input
                      type="number"
                      value={formData.videoRenderMinutes}
                      onChange={(e) => setFormData({ ...formData, videoRenderMinutes: Number(e.target.value) })}
                      required
                      min={1}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                      {formData.videoRenderMinutes * 60} seconds / month
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      AI Token Allowance / mo
                    </label>
                    <input
                      type="number"
                      value={formData.aiTokensMonthly}
                      onChange={(e) => setFormData({ ...formData, aiTokensMonthly: Number(e.target.value) })}
                      required
                      min={1000}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      {[
                        { label: '100K', val: 100000 },
                        { label: '500K', val: 500000 },
                        { label: '2.5M', val: 2500000 },
                        { label: '10M', val: 10000000 },
                        { label: 'Max', val: 999999999 },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, aiTokensMonthly: p.val })}
                          style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            background: formData.aiTokensMonthly === p.val ? '#8b5cf6' : '#334155',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Max Active Automations
                    </label>
                    <input
                      type="number"
                      value={formData.maxActiveAutomations}
                      onChange={(e) => setFormData({ ...formData, maxActiveAutomations: Number(e.target.value) })}
                      required
                      min={1}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                      Concurrent cron triggers &amp; background webhooks
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Analytics Retention (Days)
                    </label>
                    <input
                      type="number"
                      value={formData.analyticsRetentionDays}
                      onChange={(e) => setFormData({ ...formData, analyticsRetentionDays: Number(e.target.value) })}
                      required
                      min={7}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      AI Autonomy Ceiling
                    </label>
                    <select
                      value={formData.autonomyLevel}
                      onChange={(e) => setFormData({ ...formData, autonomyLevel: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    >
                      <option value="L1">Level 1 - Drafts Only (Manual Post Review)</option>
                      <option value="L2">Level 2 - Supervised (Human Approval Required)</option>
                      <option value="L3">Level 3 - Semi-Autonomous (Approval for High-Risk)</option>
                      <option value="L4">Level 4 - High Autonomy (Auto-Response &amp; Schedule)</option>
                      <option value="L5">Level 5 - Full Swarm (Cross-Brand Multi-Agent)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Feature Flags */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    5. Commercial Feature Gates
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {Object.values(formData.features).filter(Boolean).length} of 11 Active
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    {
                      category: 'Omnichannel & Publishing',
                      color: '#38bdf8',
                      items: [
                        { key: 'whatsapp_enabled', label: 'WhatsApp Marketing API', desc: 'Direct Meta Cloud API messaging' },
                        { key: 'ads_management', label: 'Paid Ads Management', desc: 'Cross-platform ad sync & tracking' },
                        { key: 'client_approvals', label: 'Client Approval Magic Links', desc: 'Passwordless public client review links' },
                      ],
                    },
                    {
                      category: 'Agency & Multi-Brand',
                      color: '#a855f7',
                      items: [
                        { key: 'agency_workspaces', label: 'Multi-Client Portfolios', desc: 'Separate client workspaces' },
                        { key: 'multi_brand_brain', label: 'Cross-Brand Brain Graph', desc: 'Shared brand memory & tone assets' },
                        { key: 'custom_branding', label: 'Custom White-Label Kit', desc: 'Custom logos, domain & portal theming' },
                      ],
                    },
                    {
                      category: 'Enterprise & Security',
                      color: '#34d399',
                      items: [
                        { key: 'api_access', label: 'Developer REST & Webhooks', desc: 'Full API token & webhook dispatch' },
                        { key: 'scim_provisioning', label: 'SCIM 2.0 Directory Sync', desc: 'Okta/Azure AD team provisioning' },
                        { key: 'enterprise_governance', label: 'Enterprise Governance & RBAC', desc: 'Granular permission matrix' },
                      ],
                    },
                    {
                      category: 'Performance & Support',
                      color: '#fbbf24',
                      items: [
                        { key: 'priority_queues', label: 'High-Priority Worker Queues', desc: 'Sub-second AI & publishing jobs' },
                        { key: 'dedicated_account_manager', label: 'Dedicated Account Manager', desc: 'Dedicated Slack/Teams channel & SLA' },
                      ],
                    },
                  ].map((group) => (
                    <div
                      key={group.category}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: group.color }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: group.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {group.category}
                        </span>
                      </div>
                      {group.items.map((feat) => {
                        const isChecked = Boolean(formData.features[feat.key]);
                        return (
                          <label
                            key={feat.key}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '6px 8px',
                              background: isChecked ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              border: isChecked ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  features: {
                                    ...formData.features,
                                    [feat.key]: e.target.checked,
                                  },
                                });
                              }}
                              style={{ marginTop: '2px' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isChecked ? '#fff' : '#cbd5e1' }}>
                                {feat.label}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                {feat.desc}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Trial Periods, Add-Ons, Promotional Offers & Upgrade/Downgrade Rules */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  6. Trial Periods, Add-Ons, Promotional Offers &amp; Lifecycle Rules
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Trial Period (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={formData.trialDays}
                      onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Upgrade Rule
                    </label>
                    <select
                      value={formData.upgradeRule}
                      onChange={(e) => setFormData({ ...formData, upgradeRule: e.target.value as 'immediate_prorated' | 'immediate_full' })}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    >
                      <option value="immediate_prorated">Immediate + Prorated Credit</option>
                      <option value="immediate_full">Immediate Full Cycle Reset</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Downgrade Rule
                    </label>
                    <select
                      value={formData.downgradeRule}
                      onChange={(e) => setFormData({ ...formData, downgradeRule: e.target.value as 'period_end' | 'immediate' })}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    >
                      <option value="period_end">Effective at Billing Period End</option>
                      <option value="immediate">Immediate Downgrade</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Promotional Code
                    </label>
                    <input
                      type="text"
                      value={formData.promoCode}
                      onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                      placeholder="ANNUAL20"
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Promo Discount (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={formData.promoDiscountPercent}
                      onChange={(e) => setFormData({ ...formData, promoDiscountPercent: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Promotional Offer Banner Text
                    </label>
                    <input
                      type="text"
                      value={formData.promoBannerText}
                      onChange={(e) => setFormData({ ...formData, promoBannerText: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      +5 Workspaces ($/mo)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.addonWorkspacePrice}
                      onChange={(e) => setFormData({ ...formData, addonWorkspacePrice: Number(e.target.value) })}
                      style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      +10 Team Seats ($/mo)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.addonSeatsPrice}
                      onChange={(e) => setFormData({ ...formData, addonSeatsPrice: Number(e.target.value) })}
                      style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      +100k AI Credits ($/mo)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.addonAiCreditsPrice}
                      onChange={(e) => setFormData({ ...formData, addonAiCreditsPrice: Number(e.target.value) })}
                      style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      +100 GB Storage ($/mo)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.addonStoragePrice}
                      onChange={(e) => setFormData({ ...formData, addonStoragePrice: Number(e.target.value) })}
                      style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 24px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: '#8b5cf6',
                    color: '#ffffff',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{saving ? 'Saving...' : 'Save Plan Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

