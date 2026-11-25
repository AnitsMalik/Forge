/**
 * Multi-Tenant Custom Domains & White-Label Agency Portals Tab
 * HoaspForge Platform v4.6.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Copy,
  Check,
  Eye,
  Trash2,
  ExternalLink,
  Paintbrush,
  Activity,
  Server,
  FileCode,
  ArrowRight,
  Sliders,
  CheckCheck,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  CustomDomain,
  CustomDomainTelemetry,
  CustomDomainAccessLog,
  DomainDnsCheckResult,
  CreateCustomDomainDto,
  UpdateWhiteLabelBrandingDto,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomDomainsTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<'domains' | 'branding' | 'logs'>('domains');

  // Overview Telemetry
  const [overview, setOverview] = useState<CustomDomainTelemetry | null>(null);

  // Accessible Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Domains state
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [domainsTotal, setDomainsTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected domain for branding studio or logs
  const [selectedDomain, setSelectedDomain] = useState<CustomDomain | null>(null);

  // Access Logs state
  const [accessLogs, setAccessLogs] = useState<CustomDomainAccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Modals state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [regDomain, setRegDomain] = useState('');
  const [regTenantId, setRegTenantId] = useState('');
  const [regPortalType, setRegPortalType] = useState<'client_review' | 'analytics_portal' | 'full_white_label'>('client_review');
  const [regMethod, setRegMethod] = useState<'cname' | 'txt'>('cname');
  const [registering, setRegistering] = useState(false);

  const [dnsModalOpen, setDnsModalOpen] = useState(false);
  const [dnsDomain, setDnsDomain] = useState<CustomDomain | null>(null);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [dnsResult, setDnsResult] = useState<DomainDnsCheckResult | null>(null);

  const [brandingModalOpen, setBrandingModalOpen] = useState(false);
  const [brandingForm, setBrandingForm] = useState<UpdateWhiteLabelBrandingDto>({});
  const [savingBranding, setSavingBranding] = useState(false);

  const [sslModalOpen, setSslModalOpen] = useState(false);
  const [sslDomain, setSslDomain] = useState<CustomDomain | null>(null);
  const [renewingSsl, setRenewingSsl] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2500);
    showToast('Copied to clipboard');
  };

  const loadOverview = useCallback(async () => {
    try {
      const res = await api.adminOps.getCustomDomainsOverview();
      setOverview(res);
    } catch (err: any) {
      showToast(`Failed to load custom domains overview: ${err.message}`, 'error');
    }
  }, [showToast]);

  const loadDomains = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminOps.listCustomDomains({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setDomains(res.domains);
      setDomainsTotal(res.total);
      if (res.domains.length > 0 && !selectedDomain) {
        setSelectedDomain(res.domains[0]);
      }
    } catch (err: any) {
      showToast(`Failed to load domains: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, selectedDomain, showToast]);

  const loadLogs = useCallback(
    async (domainId: string) => {
      setLogsLoading(true);
      try {
        const res = await api.adminOps.listCustomDomainLogs(domainId, 50);
        setAccessLogs(res);
      } catch (err: any) {
        showToast(`Failed to load access logs: ${err.message}`, 'error');
      } finally {
        setLogsLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadOverview();
    loadDomains();
  }, [loadOverview, loadDomains]);

  useEffect(() => {
    if (selectedDomain && subTab === 'logs') {
      loadLogs(selectedDomain.id);
    }
  }, [selectedDomain, subTab, loadLogs]);

  // Handle Domain Registration
  const handleRegisterDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDomain.trim()) {
      showToast('Domain name is required', 'error');
      return;
    }
    if (!regTenantId.trim()) {
      showToast('Tenant ID is required', 'error');
      return;
    }

    setRegistering(true);
    try {
      const payload: CreateCustomDomainDto = {
        domain: regDomain.trim(),
        tenantId: regTenantId.trim(),
        portalType: regPortalType,
        verificationMethod: regMethod,
      };
      const created = await api.adminOps.createCustomDomain(payload);
      showToast(`Domain "${created.domain}" registered successfully!`, 'success');
      setRegisterModalOpen(false);
      setRegDomain('');
      setRegTenantId('');
      loadOverview();
      loadDomains();
      // Prompt user with DNS instructions
      setDnsDomain(created);
      setDnsResult(null);
      setDnsModalOpen(true);
    } catch (err: any) {
      showToast(`Registration failed: ${err.message}`, 'error');
    } finally {
      setRegistering(false);
    }
  };

  // Handle Verify DNS
  const handleVerifyDns = async (forceSuccess = false) => {
    if (!dnsDomain) return;
    setVerifyingDns(true);
    try {
      const result = await api.adminOps.verifyCustomDomainDns(dnsDomain.id, { forceSuccess });
      setDnsResult(result);
      if (result.status === 'active') {
        showToast(`Domain "${result.domain}" verified and active!`, 'success');
      } else {
        showToast(`DNS check result: ${result.details}`, 'info');
      }
      loadOverview();
      loadDomains();
    } catch (err: any) {
      showToast(`DNS verification error: ${err.message}`, 'error');
    } finally {
      setVerifyingDns(false);
    }
  };

  // Handle Renew SSL
  const handleRenewSsl = async () => {
    if (!sslDomain) return;
    setRenewingSsl(true);
    try {
      const updated = await api.adminOps.renewCustomDomainSsl(sslDomain.id);
      showToast(`SSL certificate issued for "${updated.domain}"!`, 'success');
      setSslDomain(updated);
      loadOverview();
      loadDomains();
    } catch (err: any) {
      showToast(`SSL renewal failed: ${err.message}`, 'error');
    } finally {
      setRenewingSsl(false);
    }
  };

  // Handle Save Branding
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomain) return;
    setSavingBranding(true);
    try {
      const updated = await api.adminOps.updateCustomDomainBranding(selectedDomain.id, brandingForm);
      setSelectedDomain(updated);
      showToast(`Branding updated for "${updated.domain}"!`, 'success');
      setBrandingModalOpen(false);
      loadOverview();
      loadDomains();
    } catch (err: any) {
      showToast(`Failed to update branding: ${err.message}`, 'error');
    } finally {
      setSavingBranding(false);
    }
  };

  // Handle Delete Domain
  const handleDeleteDomain = (domain: CustomDomain) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Custom Domain',
      description: `Are you sure you want to delete custom domain "${domain.domain}"? This will terminate all traffic routing and revoke associated TLS certificates.`,
      confirmText: 'Delete Domain',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteCustomDomain(domain.id);
          showToast(`Domain "${domain.domain}" deleted.`, 'info');
          if (selectedDomain?.id === domain.id) {
            setSelectedDomain(null);
          }
          loadOverview();
          loadDomains();
        } catch (err: any) {
          showToast(`Failed to delete domain: ${err.message}`, 'error');
        }
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active</span>;
      case 'pending_dns':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Pending DNS</span>;
      case 'dns_error':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> DNS Error</span>;
      case 'ssl_error':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Error</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">{status}</span>;
    }
  };

  const getSslBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> SSL Issued</span>;
      case 'pending':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><Lock className="w-3 h-3" /> Pending</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Custom Domains</span>
            <Globe className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{overview?.totalDomains ?? '--'}</span>
            <span className="text-xs font-semibold text-emerald-400">
              {overview?.dnsCheckPassRate ?? 100}% valid
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Routing across {overview?.totalDomains ?? 0} active tenant networks
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Active & SSL Secured</span>
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400 tracking-tight">{overview?.activeDomains ?? '--'}</span>
            <span className="text-xs text-slate-400">/ {overview?.sslIssued ?? '--'} certs</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Automated Let's Encrypt ACME with 90d auto-renewal
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pending DNS Validation</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-400 tracking-tight">{overview?.pendingDns ?? '--'}</span>
            <span className="text-xs text-slate-400">awaiting CNAME</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Target: <code className="text-indigo-300">cname.hoaspforge.com</code>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">White-Label Portals</span>
            <Paintbrush className="w-5 h-5 text-pink-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-pink-400 tracking-tight">{overview?.whiteLabelActive ?? '--'}</span>
            <span className="text-xs text-slate-400">custom branded</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {overview?.totalRequests24h ?? 0} edge hits in last 24h
          </div>
        </div>
      </div>

      {/* Action Header & Sub-Tab Bar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('domains')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              subTab === 'domains'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-4 h-4 inline-block mr-2" />
            Custom Domains & DNS
          </button>
          <button
            onClick={() => setSubTab('branding')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              subTab === 'branding'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Paintbrush className="w-4 h-4 inline-block mr-2" />
            White-Label Branding Studio
          </button>
          <button
            onClick={() => setSubTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              subTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 inline-block mr-2" />
            Traffic & Access Logs
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadOverview();
              loadDomains();
              showToast('Reloaded custom domain telemetry', 'info');
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-semibold rounded-lg shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Register Custom Domain
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Domains List */}
      {subTab === 'domains' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search domain or DNS target..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending_dns">Pending DNS</option>
                <option value="dns_error">DNS Error</option>
                <option value="ssl_error">SSL Error</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Domain Name</th>
                  <th className="py-3 px-4">Portal Type</th>
                  <th className="py-3 px-4">DNS Status</th>
                  <th className="py-3 px-4">SSL Cert</th>
                  <th className="py-3 px-4">White-Label Branding</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                      Loading custom domains...
                    </td>
                  </tr>
                ) : domains.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No custom domains registered matching current filters.
                    </td>
                  </tr>
                ) : (
                  domains.map((dom) => (
                    <tr
                      key={dom.id}
                      onClick={() => setSelectedDomain(dom)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        selectedDomain?.id === dom.id ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-400" />
                        <span>{dom.domain}</span>
                        {dom.enforceHttps && <span title="HTTPS Enforced"><Lock className="w-3 h-3 text-emerald-400 ml-1 inline" /></span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-slate-300 font-medium">
                          {dom.portalType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(dom.status)}
                      </td>
                      <td className="py-3 px-4">
                        {getSslBadge(dom.sslStatus)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: dom.branding.primaryColor }}
                            title={`Primary: ${dom.branding.primaryColor}`}
                          />
                          <span className="text-xs text-slate-300 truncate max-w-[140px]">
                            {dom.branding.agencyName}
                          </span>
                          {dom.branding.hideSocialforgeBranding && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                              White-Label
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setDnsDomain(dom);
                              setDnsResult(null);
                              setDnsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors"
                            title="Verify DNS & View Coordinates"
                          >
                            <Server className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSslDomain(dom);
                              setSslModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition-colors"
                            title="SSL Certificate Provisioner"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDomain(dom);
                              setBrandingForm({ ...dom.branding });
                              setBrandingModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-pink-300 hover:bg-slate-800 rounded transition-colors"
                            title="Edit White-Label Branding"
                          >
                            <Paintbrush className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDomain(dom)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Delete Custom Domain"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {domains.length} of {domainsTotal} registered custom domains</span>
            <span>CNAME Target: <code className="text-indigo-400">cname.hoaspforge.com</code></span>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: White-Label Branding Studio */}
      {subTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-pink-400" />
              White-Label Settings
            </h3>
            <p className="text-xs text-slate-400">
              Customize client review portals, colors, logos, and eliminate HoaspForge branding for enterprise agency clients.
            </p>

            {selectedDomain ? (
              <div className="space-y-4 pt-2">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
                  <span className="text-xs text-slate-400">Selected Domain</span>
                  <div className="font-mono text-white text-sm font-medium mt-1">{selectedDomain.domain}</div>
                  <div className="text-xs text-emerald-400 mt-1">Tenant: {selectedDomain.tenantId}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300">Agency Name</div>
                  <div className="text-sm font-medium text-white">{selectedDomain.branding.agencyName}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-300">Primary Color</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded border border-white/20" style={{ backgroundColor: selectedDomain.branding.primaryColor }} />
                      <span className="text-xs font-mono text-slate-200">{selectedDomain.branding.primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-300">Accent Color</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded border border-white/20" style={{ backgroundColor: selectedDomain.branding.accentColor }} />
                      <span className="text-xs font-mono text-slate-200">{selectedDomain.branding.accentColor}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-300">Branding Badge</span>
                  <div className="text-xs text-slate-400">
                    {selectedDomain.branding.hideSocialforgeBranding ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5" /> 100% White-Labeled (HoaspForge badge hidden)
                      </span>
                    ) : (
                      <span className="text-slate-400">Powered by HoaspForge badge visible</span>
                    )}
                  </div>
                </div>

                {selectedDomain.branding.footerText && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">Footer Text</span>
                    <div className="text-xs text-slate-400 italic">"{selectedDomain.branding.footerText}"</div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setBrandingForm({ ...selectedDomain.branding });
                    setBrandingModalOpen(true);
                  }}
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-lg text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sliders className="w-4 h-4" />
                  Customize Agency Branding
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm">
                Select a domain from the list to preview and customize branding.
              </div>
            )}
          </div>

          {/* Live White-Label Portal Preview */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                Live White-Label Portal Simulator
              </h3>
              {selectedDomain && (
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                  https://{selectedDomain.domain}/review/portal
                </span>
              )}
            </div>

            {selectedDomain ? (
              <div
                className="border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl bg-slate-950 p-6 space-y-6"
                style={{
                  borderTop: `4px solid ${selectedDomain.branding.primaryColor}`,
                }}
              >
                {/* Agency Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-lg"
                      style={{ backgroundColor: selectedDomain.branding.primaryColor }}
                    >
                      {selectedDomain.branding.agencyName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-base">
                        {selectedDomain.branding.agencyName}
                      </div>
                      <div className="text-xs text-slate-400">
                        Client Review & Campaign Approval Portal
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      SSL Active
                    </span>
                  </div>
                </div>

                {/* Sample Mock Review Post */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Pending Campaign Review #LUM-2026-Q4
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      In Review
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed">
                    "Experience unprecedented clarity in your social media pipeline. Powered by high-velocity multimodal generation."
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-4 py-1.5 text-xs font-semibold text-white rounded shadow"
                        style={{ backgroundColor: selectedDomain.branding.primaryColor }}
                      >
                        Approve Post
                      </button>
                      <button
                        className="px-4 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
                      >
                        Request Changes
                      </button>
                    </div>
                    <span className="text-xs text-slate-500">Scheduled for Meta & LinkedIn</span>
                  </div>
                </div>

                {/* Agency Footer */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    {selectedDomain.branding.footerText || `© 2026 ${selectedDomain.branding.agencyName}`}
                  </div>
                  {!selectedDomain.branding.hideSocialforgeBranding && (
                    <div className="text-[11px] text-slate-400">
                      Powered by HoaspForge
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-sm">
                No domain selected.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Traffic & Access Logs */}
      {subTab === 'logs' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Domain Traffic Telemetry
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedDomain ? `Access logs for ${selectedDomain.domain}` : 'Select a domain to inspect access logs'}
                </span>
              </div>
            </div>

            {selectedDomain && (
              <button
                onClick={() => loadLogs(selectedDomain.id)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded border border-slate-700 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Logs
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Host Header</th>
                  <th className="py-3 px-4">Request Path</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                      Loading traffic logs...
                    </td>
                  </tr>
                ) : accessLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No traffic logs recorded for this domain yet.
                    </td>
                  </tr>
                ) : (
                  accessLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 font-mono text-xs">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        {log.hostHeader}
                      </td>
                      <td className="py-3 px-4 text-slate-300 truncate max-w-xs">
                        {log.requestPath}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.statusCode >= 200 && log.statusCode < 300
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {log.responseTimeMs} ms
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {log.clientIp || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Register Custom Domain */}
      {registerModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              Register Custom Domain
            </h3>
            <p className="text-xs text-slate-400">
              Connect your agency's domain (e.g., <code className="text-indigo-300">review.yourbrand.com</code>) to route client review portals and white-labeled experiences.
            </p>

            <form onSubmit={handleRegisterDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fully-Qualified Domain Name (FQDN)
                </label>
                <input
                  type="text"
                  required
                  placeholder="review.agencyname.com"
                  value={regDomain}
                  onChange={(e) => setRegDomain(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Tenant ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. tenant_promo_a_3af0045e or UUID"
                  value={regTenantId}
                  onChange={(e) => setRegTenantId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Portal Type
                  </label>
                  <select
                    value={regPortalType}
                    onChange={(e: any) => setRegPortalType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="client_review">Client Review</option>
                    <option value="analytics_portal">Analytics Portal</option>
                    <option value="full_white_label">Full White-Label</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Verification Method
                  </label>
                  <select
                    value={regMethod}
                    onChange={(e: any) => setRegMethod(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="cname">CNAME Target (Recommended)</option>
                    <option value="txt">TXT Token Record</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow flex items-center gap-2"
                >
                  {registering && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Register Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: DNS Setup Coordinates & Verification */}
      {dnsModalOpen && dnsDomain && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              DNS Configuration Coordinates
            </h3>
            <p className="text-xs text-slate-400">
              Add the following DNS record in your domain registrar (Cloudflare, GoDaddy, Route53, Namecheap):
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Record Type</span>
                <span className="text-indigo-400 font-bold">CNAME</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Host / Name</span>
                <span className="text-white">{dnsDomain.domain.split('.')[0]}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Target Value</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold">{dnsDomain.dnsTarget}</span>
                  <button
                    onClick={() => copyToClipboard(dnsDomain.dnsTarget, 'target')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400"
                  >
                    {copiedKey === 'target' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">TXT Fallback</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 truncate max-w-[200px]">{dnsDomain.verificationToken}</span>
                  <button
                    onClick={() => copyToClipboard(dnsDomain.verificationToken, 'token')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400"
                  >
                    {copiedKey === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {dnsResult && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  dnsResult.status === 'active'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {dnsResult.details}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setDnsModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={verifyingDns}
                  onClick={() => handleVerifyDns(true)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded border border-slate-700"
                  title="Simulate successful DNS resolution for testing"
                >
                  Simulate Verification
                </button>
                <button
                  type="button"
                  disabled={verifyingDns}
                  onClick={() => handleVerifyDns(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow flex items-center gap-2"
                >
                  {verifyingDns && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Check DNS Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: White-Label Branding Form */}
      {brandingModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-pink-400" />
              Configure White-Label Branding
            </h3>

            <form onSubmit={handleSaveBranding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Agency / Brand Display Name
                </label>
                <input
                  type="text"
                  required
                  value={brandingForm.agencyName || ''}
                  onChange={(e) => setBrandingForm({ ...brandingForm, agencyName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Primary Brand Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingForm.primaryColor || '#6366f1'}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={brandingForm.primaryColor || '#6366f1'}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Accent Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingForm.accentColor || '#ec4899'}
                      onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={brandingForm.accentColor || '#ec4899'}
                      onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Logo Light URL (SVG / PNG)
                </label>
                <input
                  type="url"
                  placeholder="https://cdn.youragency.com/logo-light.svg"
                  value={brandingForm.logoLightUrl || ''}
                  onChange={(e) => setBrandingForm({ ...brandingForm, logoLightUrl: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom CSS Overrides
                </label>
                <textarea
                  rows={2}
                  placeholder=".portal-header { font-family: Outfit; }"
                  value={brandingForm.customCss || ''}
                  onChange={(e) => setBrandingForm({ ...brandingForm, customCss: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hideBadge"
                  checked={Boolean(brandingForm.hideSocialforgeBranding)}
                  onChange={(e) => setBrandingForm({ ...brandingForm, hideSocialforgeBranding: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="hideBadge" className="text-xs text-slate-300 cursor-pointer font-medium">
                  Hide "Powered by HoaspForge" Badge (Full White-Label)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setBrandingModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBranding}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow flex items-center gap-2"
                >
                  {savingBranding && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Branding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: SSL Certificate Provisioner */}
      {sslModalOpen && sslDomain && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              SSL Certificate Orchestrator
            </h3>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Target Hostname</span>
                <span className="font-mono text-white font-semibold">{sslDomain.domain}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Current Status</span>
                <span>{getSslBadge(sslDomain.sslStatus)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Certificate Issuer</span>
                <span className="text-slate-200">{sslDomain.sslIssuer || "Let's Encrypt Authority X3"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Expiration</span>
                <span className="text-emerald-400 font-mono">
                  {sslDomain.sslExpiresAt ? new Date(sslDomain.sslExpiresAt).toLocaleDateString() : 'Pending issuance'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Certificates are automatically managed via ACME with HTTP-01 / TLS-ALPN-01 challenges. Auto-renew triggers 30 days prior to expiry.
            </p>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setSslModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                disabled={renewingSsl}
                onClick={handleRenewSsl}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow flex items-center gap-2"
              >
                {renewingSsl && <RefreshCw className="w-4 h-4 animate-spin" />}
                Issue / Renew Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Confirmation Modal */}
      <ConfirmDialogModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
