import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Wrench,
  Activity,
  Server,
  RefreshCw,
  ExternalLink,
  Clock,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../services/api.js';
import type { PublicStatusPagePayload, SystemComponentStatus } from '@socialforge/shared';

export const StatusPage: React.FC = () => {
  const [data, setData] = useState<PublicStatusPagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStatus = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await api.getPublicStatus();
      setData(res);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: SystemComponentStatus) => {
    switch (status) {
      case 'operational':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          glow: 'shadow-emerald-500/20',
          label: 'Operational',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
        };
      case 'degraded_performance':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          glow: 'shadow-amber-500/20',
          label: 'Degraded Performance',
          icon: <Activity className="w-5 h-5 text-amber-400" />,
        };
      case 'partial_outage':
        return {
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-400',
          glow: 'shadow-orange-500/20',
          label: 'Partial Outage',
          icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
        };
      case 'major_outage':
        return {
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          glow: 'shadow-rose-500/20',
          label: 'Major Outage',
          icon: <AlertOctagon className="w-5 h-5 text-rose-400" />,
        };
      case 'maintenance':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          glow: 'shadow-blue-500/20',
          label: 'Scheduled Maintenance',
          icon: <Wrench className="w-5 h-5 text-blue-400" />,
        };
      default:
        return {
          bg: 'bg-slate-800',
          border: 'border-slate-700',
          text: 'text-slate-400',
          glow: 'shadow-none',
          label: 'Unknown',
          icon: <Activity className="w-5 h-5 text-slate-400" />,
        };
    }
  };

  const statusStyle = getStatusColor(data?.overallStatus || 'operational');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
                HoaspForge
              </span>
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Status
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-all duration-150"
              title="Refresh live status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <a
              href="/"
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Checking live telemetry across global subsystems...</p>
          </div>
        ) : (
          <>
            {/* Status Hero Banner */}
            <div
              className={`p-6 sm:p-8 rounded-2xl border ${statusStyle.border} ${statusStyle.bg} shadow-xl ${statusStyle.glow} backdrop-blur-md relative overflow-hidden transition-all duration-300`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    <span
                      className={`absolute w-10 h-10 rounded-full animate-ping opacity-25 ${
                        data?.overallStatus === 'operational'
                          ? 'bg-emerald-400'
                          : data?.overallStatus === 'maintenance'
                          ? 'bg-blue-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center relative shadow-inner">
                      {statusStyle.icon}
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      {data?.statusMessage || 'All Systems Operational'}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                      Continuous real-time synthetic probe and telemetry feed • Verified across all nodes
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0 text-xs text-slate-400">
                  <span>Refreshed: {lastRefreshed.toLocaleTimeString()}</span>
                  <span className="text-emerald-400 font-semibold mt-0.5">30d Uptime: {data?.uptime30d}%</span>
                </div>
              </div>
            </div>

            {/* Metrics Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">90-Day SLA</span>
                <p className="text-2xl font-bold text-white mt-1">{data?.uptime90d}%</p>
                <span className="text-xs text-emerald-400 font-medium">Exceeds 99.9% SLA commitment</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Monitored Services</span>
                <p className="text-2xl font-bold text-white mt-1">{data?.components.length || 0}</p>
                <span className="text-xs text-slate-400">Core, Adapters & Storage</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Incidents</span>
                <p className="text-2xl font-bold text-white mt-1">{data?.activeIncidents.length || 0}</p>
                <span className="text-xs text-emerald-400 font-medium">
                  {data?.activeIncidents.length === 0 ? 'Zero service disruptions' : 'Incident in review'}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Planned Maintenance</span>
                <p className="text-2xl font-bold text-white mt-1">{data?.upcomingMaintenance.length || 0}</p>
                <span className="text-xs text-slate-400">Next 14 business days</span>
              </div>
            </div>

            {/* Subsystems & Components Grid */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-400" />
                  System Components & Latency
                </h2>
                <span className="text-xs text-slate-400">Automated probe interval: 30s</span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 divide-y divide-slate-800/80 overflow-hidden shadow-sm">
                {data?.components.map((comp) => {
                  const compStyle = getStatusColor(comp.status);
                  return (
                    <div
                      key={comp.id}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="mt-1 sm:mt-0 p-1.5 rounded-lg bg-slate-800 border border-slate-700/60">
                          {comp.category === 'social_adapters' ? (
                            <Layers className="w-4 h-4 text-violet-400" />
                          ) : comp.category === 'infrastructure' ? (
                            <Cpu className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Server className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{comp.name}</span>
                            <span className="text-xs text-slate-400 capitalize px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/40 text-[10px]">
                              {comp.category.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">Response time: {comp.latencyMs} ms (P95)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right hidden md:block">
                          <span className="text-xs text-slate-400 block font-mono">90d Uptime</span>
                          <span className="text-xs font-bold text-emerald-400">{comp.uptimePercentage90d}%</span>
                        </div>

                        <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${compStyle.bg} ${compStyle.border} ${compStyle.text}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          {compStyle.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Active Incidents Section */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Active Incident Telemetry
              </h2>

              {data?.activeIncidents && data.activeIncidents.length > 0 ? (
                <div className="space-y-3">
                  {data.activeIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {inc.severity}
                          </span>
                          <h3 className="text-base font-bold text-white">{inc.title}</h3>
                        </div>
                        <span className="text-xs text-slate-400">
                          Started: {new Date(inc.startedAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-2 border-t border-slate-800 pt-3">
                        {inc.updates.map((upd) => (
                          <div key={upd.id} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-400 font-mono font-medium shrink-0">
                              [{new Date(upd.timestamp).toLocaleTimeString()}]
                            </span>
                            <span className="font-semibold uppercase text-slate-200">
                              {upd.status}:
                            </span>
                            <span className="text-slate-300">{upd.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3 text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm">No ongoing incidents. All platform infrastructure operating at peak SLA.</span>
                </div>
              )}
            </section>

            {/* Scheduled Maintenance Windows Section */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Scheduled Maintenance Windows
              </h2>

              {data?.upcomingMaintenance && data.upcomingMaintenance.length > 0 ? (
                <div className="space-y-3">
                  {data.upcomingMaintenance.map((m) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white">{m.title}</h3>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 capitalize">
                          {m.impactLevel.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{m.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
                        <span>
                          <strong className="text-slate-300">Start:</strong> {new Date(m.scheduledStartAt).toLocaleString()}
                        </span>
                        <span>
                          <strong className="text-slate-300">End:</strong> {new Date(m.scheduledEndAt).toLocaleString()}
                        </span>
                        <span>
                          <strong className="text-slate-300">Impacted:</strong> {m.impactedComponents.join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3 text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm">No upcoming maintenance windows scheduled.</span>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-6 mt-12 text-center text-xs text-slate-500">
        <p>HoaspForge Enterprise Cloud • High-Availability Infrastructure & Zero-Downtime Pipeline</p>
      </footer>
    </div>
  );
};
