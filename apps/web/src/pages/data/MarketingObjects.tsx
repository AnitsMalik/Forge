import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  FileSpreadsheet,
  FolderSync,
  UploadCloud,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Tag,
  DollarSign,
  Layers,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Clock,
  Sparkles,
  FileText,
  Calendar,
  Briefcase,
  MapPin,
  Star,
  Megaphone,
  ShoppingBag,
  Building,
  Check,
  X,
  History,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  PageHeader,
  StatCard,
  Drawer,
  StatusBadge,
  EmptyState,
} from '../../components/ui/index.js';

interface MarketingObjectItem {
  id: string;
  source: string;
  objectType: string;
  title: string;
  sourceRecordId?: string;
  sourceVersion?: string;
  status: 'valid' | 'invalid';
  properties: Record<string, any>;
  normalizedData: Record<string, any>;
  validationErrors?: Array<{ field: string; message: string; value?: any }>;
  provenance?: {
    source: string;
    sourceRecordId: string;
    sourceVersion: string;
    ingestedAt: string;
    fileName?: string;
    sheetName?: string;
  };
  retryCount: number;
  createdAt: string;
}

const OBJECT_TYPES = [
  'All',
  'Product',
  'Offer',
  'Event',
  'Service',
  'Article',
  'Property',
  'Job',
  'Location',
  'Customer Review',
  'Announcement',
  'Campaign',
];

const SOURCES = ['All', 'google_sheets', 'google_drive', 'csv', 'excel', 'manual'];

export const MarketingObjects: React.FC = () => {
  const { activeBrand } = useAuth();
  const [objects, setObjects] = useState<MarketingObjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // CSV Ingestion Drawer State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [selectedUploadType, setSelectedUploadType] = useState('Product');
  const [uploadFileName, setUploadFileName] = useState('catalog_import.csv');
  const [isValidating, setIsValidating] = useState(false);
  const [validationPreview, setValidationPreview] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Audit Logs Drawer State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Syncing State
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  // Synthesis Drawer State
  const [selectedItemForSynthesis, setSelectedItemForSynthesis] = useState<MarketingObjectItem | null>(null);
  const [synthesisPlatforms, setSynthesisPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [synthesisRequireApproval, setSynthesisRequireApproval] = useState(false);
  const [synthesisCustomPrompt, setSynthesisCustomPrompt] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizedResult, setSynthesizedResult] = useState<any>(null);

  const handleOpenSynthesis = (item: MarketingObjectItem) => {
    setSelectedItemForSynthesis(item);
    setSynthesizedResult(null);
    setSynthesisCustomPrompt('');
  };

  const handleTogglePlatform = (plat: string) => {
    setSynthesisPlatforms((prev) =>
      prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
    );
  };

  const handleExecuteSynthesis = async () => {
    if (!selectedItemForSynthesis || !activeBrand?.id) return;
    setIsSynthesizing(true);
    try {
      const res = await api.data.synthesizePost(selectedItemForSynthesis.id, {
        platforms: synthesisPlatforms,
        requireApproval: synthesisRequireApproval,
        customPrompt: synthesisCustomPrompt.trim() || undefined,
      });
      setSynthesizedResult(res?.data);
    } catch (err: any) {
      setError(`Synthesis failed: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const fetchObjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.data.listObjects({
        brandId: activeBrand?.id,
        objectType: typeFilter !== 'All' ? typeFilter : undefined,
        source: sourceFilter !== 'All' ? sourceFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setObjects(res?.data || []);
    } catch (err: any) {
      console.error('Failed to load marketing objects:', err);
      setError(err.message || 'Unable to retrieve marketing objects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, [activeBrand?.id, typeFilter, sourceFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchObjects();
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await api.data.retryObject(id);
      await fetchObjects();
    } catch (err: any) {
      setError(`Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const handleValidateCsv = async () => {
    if (!csvContent.trim()) return;
    setIsValidating(true);
    try {
      const res = await api.data.validateCsv({
        csvText: csvContent,
        objectType: selectedUploadType,
      });
      setValidationPreview(res?.data);
    } catch (err: any) {
      setError(`Validation error: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvContent.trim() || !activeBrand?.id) return;
    setIsImporting(true);
    try {
      await api.data.ingestCsv({
        brandId: activeBrand.id,
        csvText: csvContent,
        fileName: uploadFileName,
        objectType: selectedUploadType,
      });
      setIsUploadModalOpen(false);
      setCsvContent('');
      setValidationPreview(null);
      await fetchObjects();
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSyncSheets = async () => {
    if (!activeBrand?.id) return;
    setIsSyncingSheets(true);
    try {
      await api.data.ingestSheets({
        brandId: activeBrand.id,
        objectType: 'Product',
      });
      await fetchObjects();
    } catch (err: any) {
      setError(`Sheets sync failed: ${err.message}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleSyncDrive = async () => {
    if (!activeBrand?.id) return;
    setIsSyncingDrive(true);
    try {
      await api.data.ingestDrive({
        brandId: activeBrand.id,
        objectType: 'Product',
      });
      await fetchObjects();
    } catch (err: any) {
      setError(`Drive sync failed: ${err.message}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleOpenAuditModal = async () => {
    setIsAuditModalOpen(true);
    setLoadingAudit(true);
    try {
      const res = await api.data.listAuditLogs({ brandId: activeBrand?.id });
      setAuditLogs(res?.data || []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Product':
        return ShoppingBag;
      case 'Offer':
        return Tag;
      case 'Event':
        return Calendar;
      case 'Article':
        return FileText;
      case 'Service':
        return Briefcase;
      case 'Property':
        return Building;
      case 'Location':
        return MapPin;
      case 'Customer Review':
        return Star;
      case 'Announcement':
        return Megaphone;
      default:
        return Database;
    }
  };

  // Metrics computation (Zero Fabricated Data!)
  const validObjectsCount = useMemo(() => objects.filter((o) => o.status === 'valid').length, [objects]);
  const invalidObjectsCount = useMemo(() => objects.filter((o) => o.status === 'invalid').length, [objects]);
  const uniqueSourcesCount = useMemo(() => new Set(objects.map((o) => o.source)).size, [objects]);
  const healthRate = objects.length > 0 ? Math.round((validObjectsCount / objects.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-primary">
      {/* Page Header */}
      <PageHeader
        category="Data Ingestion & Normalization"
        categoryIcon={Database}
        badge="Stage 3 Pipeline Active"
        badgeVariant="indigo"
        title="Business Data & Marketing Objects"
        description="Connect external product catalogs, sheet feeds, and asset drives once. HoaspForge continuously normalizes raw rows into actionable, brand-governed marketing objects."
        actions={
          <>
            <button
              onClick={handleSyncSheets}
              disabled={isSyncingSheets}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
              title="Synchronize linked Google Sheets catalogs"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-500 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheets ? 'Syncing...' : 'Sync Sheets'}</span>
            </button>

            <button
              onClick={handleSyncDrive}
              disabled={isSyncingDrive}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
              title="Synchronize Google Drive media assets"
            >
              <FolderSync className={`w-3.5 h-3.5 text-sky-500 ${isSyncingDrive ? 'animate-spin' : ''}`} />
              <span>{isSyncingDrive ? 'Syncing...' : 'Sync Drive'}</span>
            </button>

            <button
              onClick={handleOpenAuditModal}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 text-indigo-500" />
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition active:scale-98 cursor-pointer whitespace-nowrap"
            >
              <UploadCloud className="w-3.5 h-3.5 text-white" />
              <span>Upload CSV / Excel</span>
            </button>
          </>
        }
      />

      {/* KPI Ribbon - Executive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ingested Objects"
          value={objects.length}
          icon={Database}
          iconColor="text-indigo-500"
          iconBg="bg-indigo-500/10 border-indigo-500/20"
          trend={{ value: `${validObjectsCount} Valid`, label: 'Live records', positive: true }}
          description="Total normalized marketing entities"
        />

        <StatCard
          title="Quality & Compliance"
          value={objects.length > 0 ? `${healthRate}%` : '—'}
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          progress={
            objects.length > 0
              ? { percent: healthRate, color: 'bg-emerald-500', label: 'Schema Passing' }
              : undefined
          }
          description={objects.length > 0 ? 'Compliant schema normalization' : 'Awaiting data ingestion'}
        />

        <StatCard
          title="Active Data Sources"
          value={uniqueSourcesCount}
          icon={FolderSync}
          iconColor="text-sky-500"
          iconBg="bg-sky-500/10 border-sky-500/20"
          trend={{ value: `${uniqueSourcesCount} Connected`, label: 'Sheets, CSV, Drive', neutral: true }}
          description="Integrated enterprise pipelines"
        />

        <StatCard
          title="Actionable for Synthesis"
          value={validObjectsCount}
          icon={Sparkles}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10 border-amber-500/20"
          trend={{ value: 'Multi-Channel', label: 'Ready for post generation', positive: true }}
          description="Eligible for AI marketing synthesis"
        />
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-surface p-3.5 sm:p-4 rounded-xl border border-subtle shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, SKU, or record ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-elevated border border-subtle rounded-lg pl-8 pr-4 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 transition shadow-xs"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Object Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-medium whitespace-nowrap">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-surface-elevated border border-subtle text-primary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
            >
              {OBJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-medium whitespace-nowrap">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-surface-elevated border border-subtle text-primary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-secondary font-medium whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-elevated border border-subtle text-primary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="valid">Valid Records</option>
              <option value="invalid">Validation Failed</option>
            </select>
          </div>

          <button
            onClick={fetchObjects}
            disabled={loading}
            className="p-1.5 text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-secondary space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-medium">Normalizing marketing objects...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      ) : objects.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No Marketing Objects Ingested"
          description="Upload a product CSV catalog or synchronize data rows from Google Sheets to populate your brand's unified marketing repository."
          action={
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-white" />
              <span>Upload First CSV</span>
            </button>
          }
        />
      ) : (
        <div className="bg-surface rounded-xl border border-subtle overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated border-b border-subtle text-secondary font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Marketing Object</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Source & Provenance</th>
                  <th className="py-3 px-4">Key Normalized Values</th>
                  <th className="py-3 px-4">Status & Quality</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle text-primary">
                {objects.map((item) => {
                  const Icon = getTypeIcon(item.objectType);
                  return (
                    <tr key={item.id} className="hover:bg-surface-hover transition group">
                      {/* Title & Preview */}
                      <td className="py-3.5 px-4 font-medium text-primary max-w-xs">
                        <div className="flex items-center gap-3">
                          {item.normalizedData?.image ? (
                            <img
                              src={item.normalizedData.image}
                              alt={item.title}
                              className="w-10 h-10 rounded-lg object-cover bg-black/40 border border-subtle shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-subtle flex items-center justify-center text-secondary shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="truncate text-primary font-semibold group-hover:text-indigo-500 transition">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-muted font-mono mt-0.5">
                              ID: {item.sourceRecordId || item.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Object Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-surface-elevated border border-subtle text-secondary">
                          <Icon className="w-3 h-3 text-indigo-500" />
                          <span>{item.objectType}</span>
                        </span>
                      </td>

                      {/* Source & Provenance */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 uppercase">
                            {item.source.replace('_', ' ')}
                          </span>
                          <p className="text-[10px] text-muted truncate max-w-[140px]">
                            {item.provenance?.fileName || item.provenance?.sheetName || 'Ingested record'}
                          </p>
                        </div>
                      </td>

                      {/* Key Normalized Values */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-0.5 text-[11px]">
                          {item.normalizedData?.price && (
                            <div className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                              {item.normalizedData.price}
                              {item.normalizedData.discount && (
                                <span className="text-[10px] text-amber-500 ml-1">
                                  ({item.normalizedData.discount})
                                </span>
                              )}
                            </div>
                          )}
                          {item.normalizedData?.url && (
                            <a
                              href={item.normalizedData.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-500 hover:underline flex items-center gap-1 text-[10px] truncate"
                            >
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{item.normalizedData.url}</span>
                            </a>
                          )}
                          {!item.normalizedData?.price && !item.normalizedData?.url && (
                            <span className="text-muted text-[10px] italic">Properties normalized</span>
                          )}
                        </div>
                      </td>

                      {/* Status & Quality */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.status === 'valid' ? (
                          <StatusBadge status="ACTIVE" label="Schema Valid" size="sm" />
                        ) : (
                          <div className="space-y-1">
                            <StatusBadge status="FAILED" label="Validation Error" size="sm" />
                            {item.validationErrors && item.validationErrors.length > 0 && (
                              <p className="text-[10px] text-rose-500 truncate max-w-[150px]" title={item.validationErrors[0]?.message}>
                                {item.validationErrors[0]?.field}: {item.validationErrors[0]?.message}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {item.status === 'valid' ? (
                            <button
                              onClick={() => handleOpenSynthesis(item)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition cursor-pointer"
                              title="Synthesize into multi-channel social post"
                            >
                              <Sparkles className="w-3 h-3 text-indigo-500" />
                              <span>Synthesize</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRetry(item.id)}
                              disabled={retryingId === item.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition cursor-pointer"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER 1: UPLOAD CSV / EXCEL
          ========================================================================= */}
      <Drawer
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload & Ingest CSV / Excel"
        subtitle="Parse, validate, and import business data rows directly into normalized marketing objects."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={handleValidateCsv}
              disabled={isValidating || !csvContent.trim()}
              className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isValidating ? 'Validating...' : 'Validate Format'}
            </button>

            <button
              type="button"
              onClick={handleImportCsv}
              disabled={isImporting || !csvContent.trim()}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Rows...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Import to Catalog</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Target Marketing Type</label>
              <select
                value={selectedUploadType}
                onChange={(e) => setSelectedUploadType(e.target.value)}
                className="w-full bg-surface-elevated border border-subtle text-primary text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
              >
                {OBJECT_TYPES.filter((t) => t !== 'All').map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">File Identifier</label>
              <input
                type="text"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
                placeholder="e.g. catalog_q4.csv"
                className="w-full bg-surface-elevated border border-subtle text-primary text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono shadow-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-secondary">CSV Content (Headers Required)</label>
              <button
                type="button"
                onClick={() =>
                  setCsvContent(
                    `Name,Price,Discount,SKU,Image,URL,Availability\nAura Wireless Earbuds,$129.99,20% OFF,AUR-EAR-01,https://assets.hoaspforge.app/templates/render_default.png,https://store.brand.com/earbuds,in_stock\nPro Noise-Cancelling Headphones,$249.99,15% OFF,AUR-NC-02,https://assets.hoaspforge.app/templates/render_default.png,https://store.brand.com/headphones,in_stock`
                  )
                }
                className="text-[11px] text-indigo-500 hover:text-indigo-600 font-semibold cursor-pointer"
              >
                Insert Sample CSV
              </button>
            </div>
            <textarea
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Product Name, Price, SKU, Image URL, Availability..."
              className="w-full bg-surface-elevated border border-subtle text-primary text-xs font-mono rounded-lg p-3 focus:outline-none focus:border-indigo-500 resize-none shadow-xs"
            />
          </div>

          {validationPreview && (
            <div className="p-4 bg-surface-elevated border border-subtle rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">Validation Summary</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    validationPreview.isValid
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                  }`}
                >
                  {validationPreview.isValid ? 'ALL ROWS COMPLIANT' : `${validationPreview.errorCount} ERRORS FOUND`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-surface p-2.5 rounded-lg border border-subtle">
                  <p className="text-secondary text-[10px]">Total Rows</p>
                  <p className="text-base font-bold text-primary">{validationPreview.totalRows}</p>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <p className="text-emerald-600 dark:text-emerald-400 text-[10px]">Valid Rows</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{validationPreview.validCount}</p>
                </div>
                <div className="bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  <p className="text-rose-500 text-[10px]">Error Rows</p>
                  <p className="text-base font-bold text-rose-500">{validationPreview.errorCount}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* =========================================================================
          DRAWER 2: AUDIT TRAIL
          ========================================================================= */}
      <Drawer
        open={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Ingestion Audit Trail"
        subtitle="Cryptographically verified historical log of all source imports, validation errors, and sync jobs."
        size="lg"
      >
        <div className="space-y-4">
          {loadingAudit ? (
            <div className="py-12 text-center text-secondary">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
              <p className="text-xs">Loading audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-muted text-xs">No audit logs recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-surface-elevated border border-subtle flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary uppercase tracking-wider text-[11px] font-mono">
                        {log.source.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface border border-subtle text-secondary">
                        Action: {log.action}
                      </span>
                    </div>
                    <p className="text-secondary text-[11px]">
                      Batch ID: <span className="font-mono text-primary">{log.batchId}</span>
                    </p>
                    <p className="text-muted text-[10px]">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="font-mono text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{log.successCount}</span> /{' '}
                      <span className="text-secondary">{log.totalRecords}</span> imported
                    </p>
                    {log.errorCount > 0 && (
                      <p className="text-rose-500 text-[10px] font-bold">{log.errorCount} validation errors</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>

      {/* =========================================================================
          DRAWER 3: POST SYNTHESIS
          ========================================================================= */}
      <Drawer
        open={!!selectedItemForSynthesis}
        onClose={() => setSelectedItemForSynthesis(null)}
        title="Synthesize Multi-Channel Post"
        subtitle="Transform normalized business data into brand-governed, multi-platform copy and visual assets."
        size="lg"
        footer={
          !synthesizedResult ? (
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setSelectedItemForSynthesis(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSynthesis}
                disabled={isSynthesizing || synthesisPlatforms.length === 0}
                className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {isSynthesizing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Post...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>Generate Branded Post</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setSelectedItemForSynthesis(null);
                  setSynthesizedResult(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition cursor-pointer"
              >
                Done
              </button>
              <a
                href={`/composer?postId=${synthesizedResult.postId}`}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition"
              >
                <span>Open in Post Composer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )
        }
      >
        {selectedItemForSynthesis && (
          <div className="space-y-5">
            {/* Selected item card */}
            <div className="p-3.5 rounded-xl bg-surface-elevated border border-subtle flex items-center gap-3">
              {selectedItemForSynthesis.normalizedData?.image ? (
                <img
                  src={selectedItemForSynthesis.normalizedData.image}
                  alt={selectedItemForSynthesis.title}
                  className="w-12 h-12 rounded-lg object-cover border border-subtle bg-black/40 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-subtle text-indigo-500">
                    {selectedItemForSynthesis.objectType}
                  </span>
                  <span className="text-[11px] text-secondary">
                    Source: <span className="text-primary font-medium">{selectedItemForSynthesis.source}</span>
                  </span>
                </div>
                <h4 className="text-xs font-bold text-primary truncate mt-0.5">{selectedItemForSynthesis.title}</h4>
                {selectedItemForSynthesis.normalizedData?.price && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    Price: {selectedItemForSynthesis.normalizedData.price}
                    {selectedItemForSynthesis.normalizedData.discount && ` (${selectedItemForSynthesis.normalizedData.discount} OFF)`}
                  </p>
                )}
              </div>
            </div>

            {!synthesizedResult ? (
              <div className="space-y-4">
                {/* Platform Toggles */}
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-2">Target Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {['facebook', 'instagram', 'linkedin', 'twitter'].map((plat) => {
                      const isSelected = synthesisPlatforms.includes(plat);
                      return (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => handleTogglePlatform(plat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-surface-elevated border-subtle text-secondary hover:text-primary'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                          <span>{plat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Approval Gate Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated border border-subtle">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-primary">Require Client Sign-Off Gate</p>
                    <p className="text-[11px] text-secondary">
                      Generate a secure 72-hour magic sign-off link for external stakeholder review before publication.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={synthesisRequireApproval}
                    onChange={(e) => setSynthesisRequireApproval(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Custom Creative Direction */}
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1.5">
                    Creative Direction / Campaign Angle (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={synthesisCustomPrompt}
                    onChange={(e) => setSynthesisCustomPrompt(e.target.value)}
                    placeholder="e.g. Focus on weekend bundle savings, emphasize organic materials, friendly upbeat tone..."
                    className="w-full bg-surface-elevated border border-subtle rounded-lg p-3 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 resize-none shadow-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Social Post Successfully Created!</h5>
                    <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                      Draft post {synthesizedResult.postId.slice(0, 8)} generated with {synthesizedResult.variants?.length || 0} platform variants and full lineage.
                    </p>
                  </div>
                </div>

                {synthesizedResult.approvalLink && (
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Client Review Magic Link:</p>
                    <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-300 truncate select-all">
                      {synthesizedResult.approvalLink}
                    </p>
                  </div>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {synthesizedResult.variants?.map((v: any) => (
                    <div key={v.id} className="p-3 rounded-lg bg-surface-elevated border border-subtle space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{v.platform}</span>
                        <span className="text-[10px] text-muted font-mono">Aspect: {v.aspectRatio}</span>
                      </div>
                      <p className="text-[11px] text-secondary whitespace-pre-wrap">{v.caption}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
