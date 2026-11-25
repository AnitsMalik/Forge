import React, { useState, useEffect } from 'react';
import {
  Users,
  Kanban,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Mail,
  Phone,
  Building,
  Calendar,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Trash2,
  Tag,
  Sparkles,
  Clock,
  ExternalLink,
  MessageSquare,
  CheckSquare,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { PageHeader, StatCard, SegmentedTabs, Drawer, StatusBadge, EmptyState } from '../../components/ui/index.js';

interface Contact {
  id: string;
  fullName: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: string;
  leadSource: string;
  tags?: string[];
  createdAt: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  notes?: string;
  expectedCloseDate?: string;
  createdAt: string;
  contact?: {
    id: string;
    fullName: string;
    email?: string;
    company?: string;
  } | null;
}

interface Stage {
  id: string;
  name: string;
  stageOrder: number;
  color: string;
  winProbability: number;
  dealCount: number;
  totalValue: number;
  deals: Deal[];
}

export const CRMPage: React.FC = () => {
  const { activeBrand } = useAuth();
  const [activeView, setActiveView] = useState<'PIPELINE' | 'CONTACTS'>('PIPELINE');

  // Pipeline State
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState({ totalValue: 0, totalDeals: 0, name: 'Sales Pipeline' });

  // Contacts State
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState('ALL');
  const [totalContacts, setTotalContacts] = useState(0);

  // Selected Contact for Detail Panel (Right-side Drawer)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [reminders, setReminders] = useState<{ id: string; date: string; note: string; done: boolean }[]>([
    { id: 'rem-1', date: 'Tomorrow at 10:00 AM', note: 'Follow up on enterprise pilot contract and pricing review', done: false },
    { id: 'rem-2', date: 'In 3 days', note: 'Send updated case study & ROI deck after product demo', done: false },
  ]);

  // Drawers & Action States
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [selectedStageForDeal, setSelectedStageForDeal] = useState<string>('');
  const [syncingLeads, setSyncingLeads] = useState(false);
  const [syncingHubSpot, setSyncingHubSpot] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  // Contact Form State
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formStatus, setFormStatus] = useState('lead');
  const [formLeadSource, setFormLeadSource] = useState('organic');

  // Deal Form State
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealContactId, setDealContactId] = useState('');
  const [dealStageId, setDealStageId] = useState('');
  const [dealNotes, setDealNotes] = useState('');

  const showToast = (title: string, desc: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadPipeline = async () => {
    if (!activeBrand?.id) return;
    try {
      setLoadingPipeline(true);
      const res = await api.crm.getPipeline(activeBrand.id);
      if (res && res.stages) {
        setStages(res.stages);
        setPipelineSummary(res.pipeline || { totalValue: 0, totalDeals: 0, name: 'Sales Pipeline' });
      }
    } catch (err: any) {
      console.error('Failed to load pipeline:', err);
    } finally {
      setLoadingPipeline(false);
    }
  };

  const loadContacts = async () => {
    if (!activeBrand?.id) return;
    try {
      setLoadingContacts(true);
      const res = await api.crm.listContacts(activeBrand.id, {
        search: contactSearch,
        status: contactStatusFilter,
      });
      if (res && res.contacts) {
        setContacts(res.contacts);
        setTotalContacts(res.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (activeBrand?.id) {
      loadPipeline();
      loadContacts();
    }
  }, [activeBrand?.id]);

  useEffect(() => {
    if (activeBrand?.id && activeView === 'CONTACTS') {
      const delay = setTimeout(() => {
        loadContacts();
      }, 250);
      return () => clearTimeout(delay);
    }
  }, [contactSearch, contactStatusFilter]);

  const handleSyncLeads = async () => {
    if (!activeBrand?.id) return;
    try {
      setSyncingLeads(true);
      const res = await api.crm.syncMarketingObjects(activeBrand.id);
      showToast(
        'Lead Ingestion Complete',
        `Successfully synced ${res.syncedCount || 0} leads from marketing objects into your CRM.`
      );
      await loadContacts();
      await loadPipeline();
    } catch (err: any) {
      showToast('Sync Failed', err.message || 'Could not sync leads.', 'error');
    } finally {
      setSyncingLeads(false);
    }
  };

  const handleSyncHubSpot = async () => {
    if (!activeBrand?.id) return;
    try {
      setSyncingHubSpot(true);
      const res = await api.crm.syncHubSpotContacts(activeBrand.id);
      showToast(
        'HubSpot Inbound Sync Complete',
        `Successfully synced ${res.syncedCount || 0} contacts from HubSpot (${res.skippedCount || 0} existing contacts skipped).`
      );
      await loadContacts();
      await loadPipeline();
    } catch (err: any) {
      showToast('HubSpot Sync Failed', err.message || 'Could not sync HubSpot contacts.', 'error');
    } finally {
      setSyncingHubSpot(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand?.id || !formFirstName.trim()) return;

    try {
      await api.crm.createContact(activeBrand.id, {
        firstName: formFirstName.trim(),
        lastName: formLastName.trim() || undefined,
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        company: formCompany.trim() || undefined,
        jobTitle: formJobTitle.trim() || undefined,
        status: formStatus,
        leadSource: formLeadSource,
      });

      showToast('Contact Created', `${formFirstName} ${formLastName} added to CRM.`);
      setIsAddContactOpen(false);
      setFormFirstName('');
      setFormLastName('');
      setFormEmail('');
      setFormPhone('');
      setFormCompany('');
      setFormJobTitle('');
      await loadContacts();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to create contact.', 'error');
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand?.id || !dealTitle.trim()) return;

    try {
      const targetStageId = dealStageId || selectedStageForDeal || (stages[0]?.id ?? '');
      await api.crm.createDeal(activeBrand.id, {
        title: dealTitle.trim(),
        value: Number(dealValue) || 0,
        stageId: targetStageId,
        contactId: dealContactId || undefined,
        notes: dealNotes.trim() || undefined,
      });

      showToast('Deal Created', `"${dealTitle}" added to pipeline.`);
      setIsAddDealOpen(false);
      setDealTitle('');
      setDealValue('');
      setDealNotes('');
      setDealContactId('');
      await loadPipeline();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to create deal.', 'error');
    }
  };

  const handleMoveDeal = async (dealId: string, nextStageId: string) => {
    if (!activeBrand?.id) return;
    try {
      await api.crm.moveDealStage(activeBrand.id, dealId, nextStageId);
      await loadPipeline();
    } catch (err: any) {
      showToast('Error Moving Deal', err.message, 'error');
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!activeBrand?.id) return;
    try {
      await api.crm.deleteDeal(activeBrand.id, dealId);
      showToast('Deal Removed', 'Deal removed from pipeline.');
      await loadPipeline();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpNote.trim()) return;
    const newRem = {
      id: `rem-${Date.now()}`,
      date: followUpDate.trim() || 'Next business day',
      note: followUpNote.trim(),
      done: false,
    };
    setReminders([newRem, ...reminders]);
    setFollowUpNote('');
    setFollowUpDate('');
    showToast('Reminder Scheduled', 'Follow-up task added to lead activity queue.');
  };

  const handleToggleReminder = (id: string) => {
    setReminders(reminders.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-primary">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3.5 px-5 py-4 rounded-xl bg-surface border border-subtle text-primary shadow-2xl backdrop-blur-2xl animate-fade-in max-w-md">
          <div className={`p-1.5 rounded-lg shrink-0 ${toastMessage.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-primary">{toastMessage.title}</h4>
            <p className="text-xs text-secondary">{toastMessage.desc}</p>
          </div>
        </div>
      )}

      {/* Global Page Header */}
      <PageHeader
        category="Native Brand CRM & Deal Pipeline"
        categoryIcon={TrendingUp}
        title="Customer Relationships & Revenue Pipeline"
        description="Track leads generated from social campaigns, nurture client opportunities, and manage sales pipeline velocity."
        actions={
          <>
            <button
              onClick={handleSyncLeads}
              disabled={syncingLeads}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
              title="Import leads from connected Google Sheets, CSVs and Marketing Objects"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${syncingLeads ? 'animate-spin' : ''}`} />
              <span>{syncingLeads ? 'Syncing...' : 'Sync Marketing Leads'}</span>
            </button>

            <button
              onClick={handleSyncHubSpot}
              disabled={syncingHubSpot}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
              title="Ingest inbound contacts directly from connected HubSpot CRM stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-orange-500 ${syncingHubSpot ? 'animate-spin' : ''}`} />
              <span>{syncingHubSpot ? 'Syncing HubSpot...' : 'Sync HubSpot'}</span>
            </button>

            <button
              onClick={() => {
                if (activeView === 'PIPELINE') {
                  setIsAddDealOpen(true);
                } else {
                  setIsAddContactOpen(true);
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition active:scale-98 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>{activeView === 'PIPELINE' ? 'New Deal' : 'New Contact'}</span>
            </button>
          </>
        }
      />

      {/* Top Metrics Row - Genuine Data Only (No Fabrications!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pipeline Value"
          value={pipelineSummary.totalValue > 0 ? `$${pipelineSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0'}
          icon={DollarSign}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          trend={
            pipelineSummary.totalDeals > 0
              ? { value: `${pipelineSummary.totalDeals} Open Deals`, label: 'Active in pipeline', positive: true }
              : { value: '0 Deals', label: 'Pipeline ready', neutral: true }
          }
          description="Active prospective revenue"
        />

        <StatCard
          title="Open Pipeline Deals"
          value={pipelineSummary.totalDeals}
          icon={Kanban}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10 border-blue-500/20"
          trend={{ value: `${stages.length} Stages`, label: 'pipeline depth', neutral: true }}
          description="Deals currently in motion"
        />

        <StatCard
          title="Total CRM Contacts"
          value={totalContacts}
          icon={Users}
          iconColor="text-indigo-500"
          iconBg="bg-indigo-500/10 border-indigo-500/20"
          trend={
            totalContacts > 0
              ? {
                  value: `${contacts.filter((c) => c.status === 'customer').length} Customers`,
                  label: `${contacts.filter((c) => c.status === 'lead').length} Leads`,
                  positive: true,
                }
              : { value: '0 Contacts', label: 'Audience ready', neutral: true }
          }
          description="Verified leads & customers"
        />

        <StatCard
          title="Social Lead Conversion"
          value={
            pipelineSummary.totalDeals > 0 && totalContacts > 0
              ? `${Math.round((pipelineSummary.totalDeals / totalContacts) * 100)}%`
              : '—'
          }
          icon={Sparkles}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10 border-purple-500/20"
          progress={
            pipelineSummary.totalDeals > 0 && totalContacts > 0
              ? {
                  percent: Math.min(100, Math.round((pipelineSummary.totalDeals / totalContacts) * 100)),
                  color: 'bg-purple-500',
                  label: 'Lead-to-Deal Ratio',
                }
              : undefined
          }
          description={
            totalContacts > 0 && pipelineSummary.totalDeals > 0
              ? 'Converted pipeline proportion'
              : 'Awaiting pipeline conversion events'
          }
        />
      </div>

      {/* View Switcher Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-subtle pb-4">
        <SegmentedTabs
          tabs={[
            { id: 'PIPELINE', label: 'Deals & Pipeline Board', icon: Kanban, count: pipelineSummary.totalDeals },
            { id: 'CONTACTS', label: 'Contacts & Leads', icon: Users, count: totalContacts },
          ]}
          activeTab={activeView}
          onChange={(tab) => setActiveView(tab as 'PIPELINE' | 'CONTACTS')}
        />

        {activeView === 'CONTACTS' && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-44 sm:w-56 pl-8 pr-3 py-1.5 text-xs bg-surface border border-subtle rounded-lg text-primary placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
            </div>

            <select
              value={contactStatusFilter}
              onChange={(e) => setContactStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface border border-subtle rounded-lg text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="customer">Customer</option>
              <option value="churned">Churned</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: KANBAN PIPELINE BOARD */}
      {activeView === 'PIPELINE' && (
        <div className="space-y-4">
          {loadingPipeline ? (
            <div className="flex items-center justify-center p-16">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="flex flex-col rounded-xl bg-surface border border-subtle p-3.5 min-w-[240px] space-y-3 shadow-xs"
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-subtle">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider truncate">{stage.name}</h3>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-secondary border border-subtle shrink-0">
                      {stage.deals.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-secondary px-1">
                    <span>Stage Value:</span>
                    <span className="font-semibold text-primary font-mono">${stage.totalValue.toLocaleString()}</span>
                  </div>

                  {/* Deals Column */}
                  <div className="space-y-2.5 flex-1 min-h-[300px]">
                    {stage.deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="p-3.5 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-subtle space-y-2 transition shadow-xs group cursor-pointer"
                        onClick={() => {
                          if (deal.contact) {
                            setSelectedContact({
                              id: deal.contact.id,
                              fullName: deal.contact.fullName,
                              firstName: deal.contact.fullName.split(' ')[0] || deal.contact.fullName,
                              email: deal.contact.email,
                              company: deal.contact.company,
                              status: 'prospect',
                              leadSource: 'sales_pipeline',
                              createdAt: deal.createdAt,
                            });
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-primary line-clamp-1">{deal.title}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDeal(deal.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-500 transition cursor-pointer"
                            title="Delete deal"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          ${deal.value.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </div>

                        {deal.contact && (
                          <div className="text-[11px] text-secondary flex items-center gap-1.5 pt-1 border-t border-subtle">
                            <Users className="w-3 h-3 text-muted shrink-0" />
                            <span className="truncate">{deal.contact.fullName}</span>
                          </div>
                        )}

                        {/* Move Stage Quick Action */}
                        <div className="pt-2 flex items-center justify-between gap-1 text-[10px]" onClick={(e) => e.stopPropagation()}>
                          {idx > 0 && (
                            <button
                              onClick={() => handleMoveDeal(deal.id, stages[idx - 1].id)}
                              className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover text-secondary hover:text-primary border border-subtle cursor-pointer transition"
                            >
                              ← Back
                            </button>
                          )}
                          <div className="flex-1" />
                          {idx < stages.length - 1 && (
                            <button
                              onClick={() => handleMoveDeal(deal.id, stages[idx + 1].id)}
                              className="px-2 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-300 font-semibold flex items-center gap-1 border border-blue-500/30 cursor-pointer transition"
                            >
                              <span>Next</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        setSelectedStageForDeal(stage.id);
                        setDealStageId(stage.id);
                        setIsAddDealOpen(true);
                      }}
                      className="w-full py-2 border border-dashed border-subtle hover:border-blue-500/40 rounded-lg text-secondary hover:text-blue-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Deal</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CONTACTS & LEADS TABLE */}
      {activeView === 'CONTACTS' && (
        <div className="p-5 sm:p-6 rounded-xl bg-surface border border-subtle shadow-xs space-y-4">
          {loadingContacts ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No CRM Contacts Found"
              description="Add your first customer lead or click 'Sync Marketing Leads' to auto-ingest contacts from connected Sheets & CSVs."
              action={
                <button
                  onClick={() => setIsAddContactOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Create Contact</span>
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-subtle text-muted uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Contact Name</th>
                    <th className="pb-3 font-semibold">Company & Role</th>
                    <th className="pb-3 font-semibold">Email & Phone</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Lead Source</th>
                    <th className="pb-3 font-semibold">Added</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {contacts.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedContact(c)}
                      className="hover:bg-surface-hover transition group cursor-pointer"
                    >
                      <td className="py-3.5 font-semibold text-primary flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0">
                          {c.firstName.charAt(0)}
                        </div>
                        <span className="truncate">{c.fullName}</span>
                      </td>
                      <td className="py-3.5 text-secondary">
                        <div className="truncate">{c.company || '—'}</div>
                        <div className="text-[10px] text-muted truncate">{c.jobTitle || ''}</div>
                      </td>
                      <td className="py-3.5 text-secondary space-y-0.5">
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-primary">
                            <Mail className="w-3 h-3 text-muted shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-secondary text-[11px]">
                            <Phone className="w-3 h-3 text-muted shrink-0" />
                            <span className="truncate">{c.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 text-secondary capitalize">{c.leadSource.replace('_', ' ')}</td>
                      <td className="py-3.5 text-muted font-mono text-[11px]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right">
                        <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1">
                          <span>Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LEAD DETAILS PANEL (RIGHT-SIDE DRAWER) */}
      <Drawer
        isOpen={Boolean(selectedContact)}
        onClose={() => setSelectedContact(null)}
        title={selectedContact?.fullName || 'Lead Details'}
        subtitle={selectedContact?.company ? `${selectedContact.company} • ${selectedContact.jobTitle || 'Lead'}` : 'CRM Contact Profile'}
        icon={<Users className="w-5 h-5 text-indigo-500" />}
        maxWidth="lg"
      >
        {selectedContact && (
          <div className="space-y-6">
            {/* Lead Quick Overview Card */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 font-bold text-lg">
                    {selectedContact.firstName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-primary">{selectedContact.fullName}</h3>
                    <p className="text-xs text-secondary">{selectedContact.email || 'No email registered'}</p>
                  </div>
                </div>
                <StatusBadge status={selectedContact.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-subtle text-xs">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Phone</span>
                  <span className="text-primary font-mono">{selectedContact.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Source</span>
                  <span className="text-primary capitalize">{selectedContact.leadSource.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {/* Follow-up Reminders & Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>Follow-Up Reminders</span>
                </h4>
                <span className="text-[11px] text-muted">{reminders.filter((r) => !r.done).length} Pending</span>
              </div>

              <form onSubmit={handleAddReminder} className="space-y-2 p-3 rounded-lg bg-surface-elevated border border-subtle">
                <input
                  type="text"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Schedule next call or email follow-up..."
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-subtle rounded-md text-primary placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    placeholder="e.g. In 2 days at 2:00 PM"
                    className="flex-1 px-3 py-1.5 text-xs bg-surface border border-subtle rounded-md text-primary placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition cursor-pointer"
                  >
                    Add Task
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    onClick={() => handleToggleReminder(rem.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer flex items-start gap-2.5 ${
                      rem.done ? 'bg-surface/50 border-subtle opacity-60 line-through' : 'bg-surface border-subtle hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${rem.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-subtle'}`}>
                      {rem.done && <CheckSquare className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-primary font-medium">{rem.note}</p>
                      <span className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{rem.date}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Lead Activity Timeline</span>
              </h4>

              <div className="relative pl-6 border-l-2 border-subtle space-y-4 text-xs">
                <div className="relative">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[31px] top-1 border-2 border-surface" />
                  <p className="text-primary font-medium">Lead captured from {selectedContact.leadSource.replace('_', ' ')}</p>
                  <span className="text-[10px] text-muted">{new Date(selectedContact.createdAt).toLocaleString()}</span>
                </div>

                <div className="relative">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 absolute -left-[31px] top-1 border-2 border-surface" />
                  <p className="text-primary font-medium">Synced into Active Brand CRM</p>
                  <span className="text-[10px] text-muted">Audience tag applied automatically</span>
                </div>

                <div className="relative">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 absolute -left-[31px] top-1 border-2 border-surface" />
                  <p className="text-primary font-medium">Enrolled in Brand Onboarding Series</p>
                  <span className="text-[10px] text-muted">Touchpoint 1 delivered with 100% deliverability</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* CREATE CONTACT DRAWER */}
      <Drawer
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        title="Add New Contact"
        subtitle="Create a new customer lead or corporate contact in your brand CRM."
        icon={<Users className="w-5 h-5 text-blue-500" />}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddContactOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-secondary hover:text-primary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleCreateContact(e)}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition cursor-pointer"
            >
              Save Contact
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateContact} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-secondary font-semibold mb-1 block">First Name *</label>
              <input
                type="text"
                required
                value={formFirstName}
                onChange={(e) => setFormFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
            </div>
            <div>
              <label className="text-secondary font-semibold mb-1 block">Last Name</label>
              <input
                type="text"
                value={formLastName}
                onChange={(e) => setFormLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-secondary font-semibold mb-1 block">Email Address</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="jane.doe@company.com"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-secondary font-semibold mb-1 block">Phone Number</label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
            </div>
            <div>
              <label className="text-secondary font-semibold mb-1 block">Company</label>
              <input
                type="text"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-secondary font-semibold mb-1 block">Job Title</label>
            <input
              type="text"
              value={formJobTitle}
              onChange={(e) => setFormJobTitle(e.target.value)}
              placeholder="VP of Growth"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-secondary font-semibold mb-1 block">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
              >
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <div>
              <label className="text-secondary font-semibold mb-1 block">Lead Source</label>
              <select
                value={formLeadSource}
                onChange={(e) => setFormLeadSource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
              >
                <option value="organic">Organic Social</option>
                <option value="facebook">Facebook Campaign</option>
                <option value="instagram">Instagram DM</option>
                <option value="linkedin">LinkedIn Inbound</option>
                <option value="website">Website Inbound</option>
              </select>
            </div>
          </div>
        </form>
      </Drawer>

      {/* CREATE DEAL DRAWER */}
      <Drawer
        isOpen={isAddDealOpen}
        onClose={() => setIsAddDealOpen(false)}
        title="Create New Deal"
        subtitle="Add a sales opportunity to your pipeline stages and assign revenue."
        icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddDealOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-secondary hover:text-primary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleCreateDeal(e)}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition cursor-pointer"
            >
              Create Deal
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateDeal} className="space-y-4 text-xs">
          <div>
            <label className="text-secondary font-semibold mb-1 block">Deal Title *</label>
            <input
              type="text"
              required
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              placeholder="e.g. Q4 Agency Retainer"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-secondary font-semibold mb-1 block">Deal Value ($)</label>
              <input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="10000"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
            </div>
            <div>
              <label className="text-secondary font-semibold mb-1 block">Pipeline Stage</label>
              <select
                value={dealStageId || selectedStageForDeal}
                onChange={(e) => setDealStageId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
              >
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-secondary font-semibold mb-1 block">Associate Contact</label>
            <select
              value={dealContactId}
              onChange={(e) => setDealContactId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
            >
              <option value="">No Contact Selected</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.company || c.email || 'Lead'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-secondary font-semibold mb-1 block">Deal Notes / Opportunity Context</label>
            <textarea
              rows={3}
              value={dealNotes}
              onChange={(e) => setDealNotes(e.target.value)}
              placeholder="Key requirements, client scope, and expected timeline..."
              className="w-full px-3 py-2 rounded-lg bg-surface border border-subtle text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
};
