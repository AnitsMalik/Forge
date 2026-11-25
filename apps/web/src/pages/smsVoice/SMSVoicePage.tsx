import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  PhoneCall,
  MessageSquare,
  Send,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Phone,
  ShieldCheck,
  Zap,
  Users,
  AlertCircle,
  FileText,
  Volume2,
  Mic,
  Headphones,
  Bot,
  Play,
  CornerDownLeft,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader, StatCard, SegmentedTabs, Drawer, StatusBadge, EmptyState } from '../../components/ui/index.js';

interface SmsSender {
  id: string;
  phone_number: string;
  brand_name: string;
  provider: string;
  sender_type: string;
  a2p_registration_status: string;
}

interface SmsCampaign {
  id: string;
  name: string;
  body: string;
  senderPhone: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  optOutCount: number;
  sentAt?: string;
  createdAt: string;
}

interface VoiceAgent {
  id: string;
  name: string;
  voice_persona: string;
  system_prompt: string;
  language: string;
  forwarding_phone: string;
  is_active: boolean;
}

interface VoiceCall {
  id: string;
  direction: string;
  callerNumber: string;
  calleeNumber: string;
  durationSeconds: number;
  status: string;
  outcome: string;
  transcript: string;
  aiSummary: string;
  recordingUrl: string;
  callSid: string;
  createdAt: string;
}

export const SMSVoicePage: React.FC<{ brandId?: string }> = ({ brandId: propBrandId }) => {
  const { activeBrand } = useAuth();
  const brandId = propBrandId || activeBrand?.id || '';

  const [activeTab, setActiveTab] = useState<'sms' | 'voice' | 'messages'>('sms');
  const [loading, setLoading] = useState<boolean>(true);

  // Data
  const [sender, setSender] = useState<SmsSender | null>(null);
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [agent, setAgent] = useState<VoiceAgent | null>(null);
  const [voiceCalls, setVoiceCalls] = useState<VoiceCall[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Drawers
  const [showSmsModal, setShowSmsModal] = useState<boolean>(false);
  const [smsCampaignName, setSmsCampaignName] = useState<string>('');
  const [smsBody, setSmsBody] = useState<string>('Hello {{firstName}}! Exclusive HoaspForge flash drop is live. Use code FLASH30 for 30% off. Reply STOP to cancel.');
  const [creatingSms, setCreatingSms] = useState<boolean>(false);

  const [showVoiceCallModal, setShowVoiceCallModal] = useState<boolean>(false);
  const [callPhone, setCallPhone] = useState<string>('+15552345678');
  const [callObjective, setCallObjective] = useState<string>('Executive Demo Scheduling');
  const [triggeringCall, setTriggeringCall] = useState<boolean>(false);

  const [showInboundSmsModal, setShowInboundSmsModal] = useState<boolean>(false);
  const [inboundFrom, setInboundFrom] = useState<string>('+15552345678');
  const [inboundBody, setInboundBody] = useState<string>('STOP');
  const [simulatingInbound, setSimulatingInbound] = useState<boolean>(false);

  // Selected Call for Transcript View
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);

  const [messageNotice, setMessageNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessageNotice({ text, type });
    setTimeout(() => setMessageNotice(null), 4000);
  };

  const loadData = async () => {
    if (!brandId) return;
    try {
      setLoading(true);
      const [sendRes, campRes, agentRes, callsRes, msgRes] = await Promise.all([
        api.smsVoice.getSender(brandId),
        api.smsVoice.listCampaigns(brandId),
        api.smsVoice.getVoiceAgent(brandId),
        api.smsVoice.listVoiceCalls(brandId),
        api.smsVoice.listMessages(brandId),
      ]);

      if (sendRes?.sender) setSender(sendRes.sender);
      if (campRes?.campaigns) setCampaigns(campRes.campaigns);
      if (agentRes?.agent) setAgent(agentRes.agent);
      if (callsRes?.calls) setVoiceCalls(callsRes.calls);
      if (msgRes?.messages) setMessages(msgRes.messages);
    } catch (err: any) {
      showToast(err.message || 'Failed to load SMS & Voice data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [brandId]);

  // Segment calculation for composer
  const smsLength = smsBody.length;
  const segments = smsLength <= 160 ? 1 : Math.ceil(smsLength / 153);
  const hasOptOut = /stop|cancel|unsubscribe|quit/i.test(smsBody);

  const handleCreateAndDispatchSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCampaignName.trim() || !smsBody.trim()) return;

    try {
      setCreatingSms(true);
      const created = await api.smsVoice.createCampaign(brandId, {
        name: smsCampaignName.trim(),
        body: smsBody.trim(),
      });

      const campaignId = created?.campaign?.id;
      if (campaignId) {
        const dispatchRes = await api.smsVoice.dispatchCampaign(brandId, campaignId);
        showToast(
          `SMS Campaign dispatched to ${dispatchRes?.result?.dispatched || 0} CRM contact(s)!`,
          'success'
        );
      }

      setShowSmsModal(false);
      setSmsCampaignName('');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch SMS campaign', 'error');
    } finally {
      setCreatingSms(false);
    }
  };

  const handleTriggerVoiceCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callPhone.trim()) return;

    try {
      setTriggeringCall(true);
      const res = await api.smsVoice.triggerVoiceCall(brandId, {
        to: callPhone.trim(),
        objective: callObjective,
      });

      showToast(`AI Outbound Call completed! Outcome: ${res?.call?.outcome}`, 'success');
      setShowVoiceCallModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Voice call trigger failed', 'error');
    } finally {
      setTriggeringCall(false);
    }
  };

  const handleSimulateInboundSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboundFrom.trim() || !inboundBody.trim()) return;

    try {
      setSimulatingInbound(true);
      const res = await api.smsVoice.simulateInbound(brandId, {
        from: inboundFrom.trim(),
        body: inboundBody.trim(),
      });

      if (res?.result?.isOptOut) {
        showToast('Inbound STOP keyword processed! Contact opted out in CRM.', 'success');
      } else {
        showToast('Inbound SMS recorded & logged to CRM activities.', 'success');
      }

      setShowInboundSmsModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Inbound SMS simulation failed', 'error');
    } finally {
      setSimulatingInbound(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-primary">
      {/* Toast Alert */}
      {messageNotice && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl flex items-center justify-between shadow-2xl border transition-all max-w-md ${
            messageNotice.type === 'success'
              ? 'bg-surface border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
              : 'bg-surface border-rose-500/40 text-rose-600 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {messageNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span className="text-xs font-semibold">{messageNotice.text}</span>
          </div>
          <button onClick={() => setMessageNotice(null)} className="text-sm opacity-60 hover:opacity-100 cursor-pointer ml-3">
            &times;
          </button>
        </div>
      )}

      {/* Global Page Header */}
      <PageHeader
        category="Omnichannel Direct Telephony"
        categoryIcon={PhoneCall}
        badge="A2P 10DLC Approved"
        badgeVariant="indigo"
        title="SMS Broadcasts & AI Voice Concierge"
        description="Compliant high-throughput SMS broadcasts, carrier opt-out management, and autonomous AI voice agents for inbound/outbound customer qualification."
        actions={
          <>
            <button
              onClick={() => setShowInboundSmsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-subtle bg-surface-elevated hover:bg-surface-hover text-xs font-medium text-secondary hover:text-primary transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Simulate Carrier Inbound</span>
            </button>
            <button
              onClick={() => setShowVoiceCallModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-subtle bg-surface-elevated hover:bg-surface-hover text-xs font-medium text-secondary hover:text-primary transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              <PhoneCall className="w-3.5 h-3.5 text-purple-500" />
              <span>Dispatch AI Call</span>
            </button>
            <button
              onClick={() => setShowSmsModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>New SMS Broadcast</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-lg border border-subtle bg-surface-elevated hover:bg-surface-hover text-secondary hover:text-primary transition shadow-xs cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </>
        }
      />

      {/* 10DLC Sender Status Card */}
      {sender && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-subtle p-4 rounded-xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-primary">{sender.brand_name}</span>
                <StatusBadge status="ACTIVE" label={`A2P ${sender.a2p_registration_status}`} size="xs" />
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
                <Phone className="w-3 h-3 text-muted" />
                <span className="font-mono text-primary">{sender.phone_number}</span>
                <span>•</span>
                <span className="uppercase text-[10px] font-mono font-semibold text-muted">{sender.provider} Carrier Gateway</span>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-muted self-start sm:self-auto">
            Sender Type: {sender.sender_type}
          </span>
        </div>
      )}

      {/* KPI Stats Row - Genuine Data (No Fabrications!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="SMS Broadcasts"
          value={campaigns.length}
          icon={Send}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10 border-blue-500/20"
          trend={{ value: '10DLC', label: 'carrier registered', positive: true }}
          description="A2P high-throughput campaigns"
        />

        <StatCard
          title="Delivered Messages"
          value={campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0) + messages.filter((m) => m.status === 'DELIVERED').length}
          icon={Zap}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          trend={
            campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0) + messages.filter((m) => m.status === 'DELIVERED').length > 0
              ? { value: 'Verified', label: 'handset deliverability', positive: true }
              : { value: '0 Dispatched', label: 'Gateway ready', neutral: true }
          }
          description="Carrier handset receipts"
        />

        <StatCard
          title="AI Voice Calls"
          value={voiceCalls.length}
          icon={Mic}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10 border-purple-500/20"
          trend={{ value: 'Autonomous', label: 'Nova AI agent', neutral: true }}
          description="Outbound qualification calls"
        />

        <StatCard
          title="Demo Appointments Booked"
          value={voiceCalls.filter((c) => c.outcome === 'APPOINTMENT_BOOKED').length}
          icon={Headphones}
          iconColor="text-cyan-500"
          iconBg="bg-cyan-500/10 border-cyan-500/20"
          trend={
            voiceCalls.filter((c) => c.outcome === 'APPOINTMENT_BOOKED').length > 0
              ? {
                  value: `${voiceCalls.filter((c) => c.outcome === 'APPOINTMENT_BOOKED').length} Booked`,
                  label: 'converted to pipeline',
                  positive: true,
                }
              : { value: '0 Bookings', label: 'Direct CRM sync', neutral: true }
          }
          description="Direct CRM calendar bookings"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-subtle pb-4">
        <SegmentedTabs
          tabs={[
            { id: 'sms', label: 'SMS Broadcasts', icon: MessageSquare, count: campaigns.length },
            { id: 'voice', label: 'AI Voice Concierge & Calls', icon: Mic, count: voiceCalls.length, countVariant: 'emerald' },
            { id: 'messages', label: 'Direct Carrier Logs', icon: FileText, count: messages.length },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        />
      </div>

      {/* TAB 1: SMS BROADCASTS */}
      {activeTab === 'sms' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No SMS Broadcasts Yet"
              description="Dispatch your first 10DLC compliant SMS broadcast to engage leads with instant delivery and high open rates."
              action={
                <button
                  onClick={() => setShowSmsModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Launch First SMS Broadcast</span>
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-surface border border-subtle hover:border-blue-500/40 rounded-xl p-5 transition shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-primary text-sm truncate">{camp.name}</h4>
                        <span className="text-[11px] text-muted font-mono">{camp.senderPhone}</span>
                      </div>
                      <StatusBadge status={camp.status} size="xs" />
                    </div>

                    <div className="p-3 bg-surface-elevated rounded-lg border border-subtle text-xs">
                      <p className="text-secondary line-clamp-2 leading-relaxed">&ldquo;{camp.body}&rdquo;</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-surface-elevated p-3 rounded-lg border border-subtle text-center">
                      <div>
                        <p className="text-[10px] text-muted uppercase font-semibold">Audience</p>
                        <p className="text-sm font-bold text-primary font-mono mt-0.5">{camp.recipientCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase font-semibold">Delivered</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{camp.deliveredCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase font-semibold">Opt-Outs</p>
                        <p className="text-sm font-bold text-rose-500 font-mono mt-0.5">{camp.optOutCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-subtle flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3" />
                      {new Date(camp.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-blue-500 font-medium text-[11px]">A2P 10DLC</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI VOICE CALLS */}
      {activeTab === 'voice' && (
        <div className="space-y-4">
          {/* Active Voice Agent Hero Card */}
          {agent && (
            <div className="bg-surface border border-subtle rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-primary">{agent.name}</h3>
                    <StatusBadge status="ACTIVE" label="Autonomous Voice Concierge" size="xs" />
                  </div>
                  <p className="text-xs text-secondary leading-normal max-w-xl">
                    {agent.system_prompt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted pt-1">
                    <span>Persona: <strong className="text-primary">{agent.voice_persona}</strong></span>
                    <span>•</span>
                    <span>Forwarding: <strong className="font-mono text-primary">{agent.forwarding_phone}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowVoiceCallModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-xs transition cursor-pointer self-start md:self-auto shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Dispatch AI Call</span>
              </button>
            </div>
          )}

          {/* Call Logs Table */}
          <div className="border border-subtle rounded-xl overflow-hidden bg-surface shadow-xs">
            <div className="p-4 border-b border-subtle bg-surface-elevated flex items-center justify-between">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Autonomous AI Voice Call History
              </h3>
              <span className="text-xs text-muted font-mono">{voiceCalls.length} Calls Logged</span>
            </div>

            <div className="divide-y divide-subtle overflow-x-auto">
              {voiceCalls.length === 0 ? (
                <div className="p-12 text-center text-muted text-xs">
                  No AI voice calls recorded yet. Click "Dispatch AI Call" above to run an autonomous voice qualification call.
                </div>
              ) : (
                voiceCalls.map((call) => (
                  <div key={call.id} className="p-4 hover:bg-surface-hover transition flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-primary font-mono">{call.calleeNumber}</span>
                          <StatusBadge status={call.outcome === 'APPOINTMENT_BOOKED' ? 'COMPLETED' : 'ACTIVE'} label={call.outcome} size="xs" />
                        </div>
                        <p className="text-xs text-secondary truncate max-w-xl">{call.aiSummary}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right text-xs">
                        <span className="text-primary font-medium">{call.durationSeconds}s duration</span>
                        <p className="text-[10px] text-muted">
                          {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-xs font-semibold text-primary border border-subtle transition cursor-pointer"
                      >
                        Transcript
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MESSAGE LOG */}
      {activeTab === 'messages' && (
        <div className="border border-subtle rounded-xl overflow-hidden bg-surface shadow-xs">
          <div className="p-4 border-b border-subtle bg-surface-elevated flex items-center justify-between">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Direct SMS Carrier Logs</h3>
            <span className="text-xs text-muted font-mono">{messages.length} Messages Recorded</span>
          </div>

          <div className="divide-y divide-subtle overflow-x-auto">
            {messages.length === 0 ? (
              <div className="p-12 text-center text-muted text-xs">
                No SMS messages logged yet.
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-surface-hover transition flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        msg.direction === 'OUTBOUND'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {msg.direction}
                    </span>
                    <span className="font-mono text-xs text-primary shrink-0">{msg.toNumber}</span>
                    <p className="text-xs text-secondary truncate max-w-lg">&ldquo;{msg.body}&rdquo;</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <StatusBadge status={msg.status} size="xs" />
                    <span className="text-muted text-[10px] font-mono">{msg.sid}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* DRAWER: New SMS Broadcast Campaign */}
      <Drawer
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        title="New SMS Broadcast Campaign"
        subtitle="Dispatch high-throughput 10DLC compliant SMS blasts to your CRM contacts."
        icon={<Send className="w-5 h-5 text-blue-500" />}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowSmsModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-secondary hover:text-primary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleCreateAndDispatchSms(e)}
              disabled={creatingSms}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50 transition cursor-pointer shadow-sm"
            >
              {creatingSms ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Broadcast Now</span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateAndDispatchSms} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-secondary mb-1">Campaign Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. VIP Fall Promo Blast"
              value={smsCampaignName}
              onChange={(e) => setSmsCampaignName(e.target.value)}
              className="w-full bg-surface border border-subtle rounded-lg px-3.5 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 shadow-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-secondary">Message Content *</label>
              <span className="text-[11px] text-muted font-mono">
                {smsLength} chars • {segments} segment{segments > 1 ? 's' : ''}
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
              placeholder="Type message with {{firstName}} merge tags..."
              className="w-full bg-surface border border-subtle rounded-lg px-3.5 py-2 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
            />
            {!hasOptOut && (
              <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3" />
                <span>Include opt-out language like &ldquo;Reply STOP to cancel&rdquo; for 10DLC compliance.</span>
              </p>
            )}
          </div>

          <div className="p-3.5 bg-surface-elevated rounded-lg border border-subtle text-[11px] text-secondary space-y-1">
            <p className="font-semibold text-primary">Sender ID:</p>
            <p>{sender?.brand_name || 'HoaspForge'} ({sender?.phone_number || '+15551234567'}) • A2P 10DLC Registered</p>
          </div>
        </form>
      </Drawer>

      {/* DRAWER: Dispatch AI Voice Call */}
      <Drawer
        isOpen={showVoiceCallModal}
        onClose={() => setShowVoiceCallModal(false)}
        title="Dispatch AI Voice Call"
        subtitle="Initiate an autonomous outbound AI call with lead qualification and calendar booking."
        icon={<PhoneCall className="w-5 h-5 text-purple-500" />}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowVoiceCallModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-secondary hover:text-primary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleTriggerVoiceCall(e)}
              disabled={triggeringCall}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50 transition cursor-pointer shadow-sm"
            >
              {triggeringCall ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Start Voice Call</span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleTriggerVoiceCall} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-secondary mb-1">Target Phone Number *</label>
            <input
              type="text"
              required
              placeholder="+15552345678"
              value={callPhone}
              onChange={(e) => setCallPhone(e.target.value)}
              className="w-full bg-surface border border-subtle rounded-lg px-3.5 py-2 text-xs text-primary focus:outline-none focus:border-indigo-500 font-mono shadow-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-secondary mb-1">Call Objective</label>
            <select
              value={callObjective}
              onChange={(e) => setCallObjective(e.target.value)}
              className="w-full bg-surface border border-subtle rounded-lg px-3.5 py-2 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs cursor-pointer"
            >
              <option value="Executive Demo Scheduling">Executive Demo Scheduling</option>
              <option value="Lead Qualification & Ingestion">Lead Qualification & Ingestion</option>
              <option value="VIP Client Follow-up">VIP Client Follow-up</option>
            </select>
          </div>

          <div className="p-3.5 bg-surface-elevated rounded-lg border border-subtle text-[11px] text-secondary space-y-1">
            <p className="font-semibold text-primary">Autonomous Flow:</p>
            <p>AI agent Nova initiates the call, qualifies lead interest, books demo meetings, and auto-creates deals in your CRM pipeline.</p>
          </div>
        </form>
      </Drawer>

      {/* DRAWER: Simulate Inbound SMS Webhook */}
      <Drawer
        isOpen={showInboundSmsModal}
        onClose={() => setShowInboundSmsModal(false)}
        title="Simulate Carrier Inbound SMS"
        subtitle="Simulate an inbound mobile carrier webhook to test keyword responses and opt-outs."
        icon={<Sparkles className="w-5 h-5 text-purple-500" />}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowInboundSmsModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-secondary hover:text-primary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSimulateInboundSms(e)}
              disabled={simulatingInbound}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50 transition cursor-pointer shadow-sm"
            >
              {simulatingInbound ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Receiving...</span>
                </>
              ) : (
                <>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>Trigger Webhook</span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleSimulateInboundSms} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-secondary mb-1">From Phone Number</label>
            <input
              type="text"
              required
              placeholder="+15552345678"
              value={inboundFrom}
              onChange={(e) => setInboundFrom(e.target.value)}
              className="w-full bg-surface border border-subtle rounded-lg px-3.5 py-2 text-xs text-primary focus:outline-none focus:border-indigo-500 font-mono shadow-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-secondary mb-1">SMS Body (Try STOP to test opt-out)</label>
            <input
              type="text"
              required
              value={inboundBody}
              onChange={(e) => setInboundBody(e.target.value)}
              className="w-full bg-surface border border-subtle rounded-lg px-3.5 py-2 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
            />
          </div>
        </form>
      </Drawer>

      {/* DRAWER: View Call Transcript & Summary */}
      <Drawer
        isOpen={Boolean(selectedCall)}
        onClose={() => setSelectedCall(null)}
        title="AI Voice Call Transcript"
        subtitle={selectedCall ? `${selectedCall.calleeNumber} • ${selectedCall.durationSeconds}s duration` : ''}
        icon={<Mic className="w-5 h-5 text-purple-500" />}
        maxWidth="lg"
      >
        {selectedCall && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-surface-elevated rounded-xl border border-subtle">
              <div>
                <span className="text-[10px] text-muted uppercase font-semibold block">Callee</span>
                <span className="font-mono text-primary font-bold">{selectedCall.calleeNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-semibold block">Duration</span>
                <span className="text-primary font-bold">{selectedCall.durationSeconds}s</span>
              </div>
              <StatusBadge status="COMPLETED" label={selectedCall.outcome} />
            </div>

            <div>
              <h4 className="text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">AI Executive Summary</h4>
              <p className="text-xs text-secondary bg-surface-elevated p-3.5 rounded-xl border border-subtle leading-relaxed">
                {selectedCall.aiSummary}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Full Call Transcript</h4>
              <div className="p-3.5 bg-surface-elevated rounded-xl border border-subtle text-xs text-primary font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {selectedCall.transcript}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default SMSVoicePage;
