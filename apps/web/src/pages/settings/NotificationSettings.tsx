import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Save,
  CheckCircle2,
  Mail,
  Share2,
  MessageSquare
} from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  const navigate = useNavigate();

  const [emailOnPublish, setEmailOnPublish] = useState(true);
  const [emailOnApproval, setEmailOnApproval] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigate('/');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Settings</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">Notifications</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl shadow-md transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saved ? 'Saved!' : 'Save Notifications'}</span>
        </button>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
          <Bell className="w-3.5 h-3.5" />
          <span>Alert Channels & Subscriptions</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Notification Preferences
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Control when you and your agency team receive alerts regarding client approvals, published posts, and performance spikes.
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        {/* Email Alerts */}
        <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-400" />
            <span>Email Delivery Preferences</span>
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#131926]/70 border border-white/5 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-white">Client Approval Sign-Offs & Feedback</p>
                <p className="text-xs text-slate-400">Instant notification when a client signs off or leaves review comments.</p>
              </div>
              <input
                type="checkbox"
                checked={emailOnApproval}
                onChange={(e) => setEmailOnApproval(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#131926]/70 border border-white/5 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-white">Publish Confirmation & Live Link</p>
                <p className="text-xs text-slate-400">Delivered when a scheduled post is successfully published to Meta or LinkedIn.</p>
              </div>
              <input
                type="checkbox"
                checked={emailOnPublish}
                onChange={(e) => setEmailOnPublish(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#131926]/70 border border-white/5 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-white">Weekly Executive AI Performance Digest</p>
                <p className="text-xs text-slate-400">Monday morning summary of multi-channel reach, top posts, and growth velocity.</p>
              </div>
              <input
                type="checkbox"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Slack Webhook */}
        <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>Slack / Discord Webhook URL</span>
          </h2>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Incoming Webhook URL
            </label>
            <input
              type="url"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/T00/B00/XXXXX"
              className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default NotificationSettings;
