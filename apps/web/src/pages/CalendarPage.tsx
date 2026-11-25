import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Copy,
  ExternalLink,
  Trash2,
  Edit3,
  Image as ImageIcon,
  Film,
  Sparkles,
  Filter,
  Search,
  Grid,
  List,
  CalendarDays,
  CalendarRange,
  RefreshCw,
  X,
  Eye,
  ArrowUpRight,
  Rocket,
  Globe,
  RotateCcw,
  Check,
  Zap,
  Sliders,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { ConfirmDialogModal } from '../components/superadmin/ConfirmDialogModal.js';
import {
  fromBrandLocal,
  toBrandLocal,
  getTimezoneDetails,
  formatInBrandTimezone,
} from '@socialforge/shared';
import './CalendarPage.css';

interface CalendarPageProps {
  onNavigate?: (tab: string, context?: any) => void;
  onOpenMagicPortal?: (token: string) => void;
  initialContext?: any;
}

/**
 * Crisp SVG Platform Brand Icon Helper
 */
const PlatformIcon: React.FC<{ platform: string; size?: number }> = ({ platform, size = 12 }) => {
  const p = (platform || '').toLowerCase();
  if (p.includes('instagram')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#E1306C', flexShrink: 0 }}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    );
  }
  if (p.includes('x') || p.includes('twitter')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ffffff', flexShrink: 0 }}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
  }
  if (p.includes('linkedin')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#0A66C2', flexShrink: 0 }}>
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    );
  }
  if (p.includes('facebook')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#1877F2', flexShrink: 0 }}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }
  if (p.includes('tiktok')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#FE2C55', flexShrink: 0 }}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01v8.83c0 1.94-.52 3.89-1.62 5.48-1.28 1.83-3.32 3.09-5.54 3.47-1.43.25-2.91.13-4.32-.35-2.61-.91-4.71-3.03-5.59-5.61-.9-2.62-.48-5.62 1.11-7.85 1.55-2.18 4.09-3.55 6.77-3.64v4.06c-1.41.05-2.79.74-3.59 1.91-.79 1.15-.96 2.67-.44 3.98.5 1.28 1.65 2.27 3.01 2.59 1.19.28 2.47.07 3.48-.61 1.07-.72 1.73-1.96 1.74-3.25V.02z"/>
      </svg>
    );
  }
  if (p.includes('youtube')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#FF0000', flexShrink: 0 }}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    );
  }
  return <Globe size={size} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
};

export const CalendarPage: React.FC<CalendarPageProps> = ({
  onNavigate,
  onOpenMagicPortal,
  initialContext,
}) => {
  const { activeBrand } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Active brand timezone metadata
  const brandTz = activeBrand?.timezone || 'Asia/Kolkata';
  const tzDetails = useMemo(() => getTimezoneDetails(brandTz), [brandTz]);

  // Contextual Help Popovers
  const [showTzHelp, setShowTzHelp] = useState(false);
  const tzPopoverRef = useRef<HTMLDivElement>(null);

  // Calendar Date State (defaults to current date)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // View Mode: 'month' | 'week' | 'day' | 'list'
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');

  // Filters & Search
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'media' | 'video' | 'text'>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showExpandedFilters, setShowExpandedFilters] = useState(false);

  // Selected Post for Detail Modal
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedVariantTab, setSelectedVariantTab] = useState<string>('instagram');
  const [rescheduleInput, setRescheduleInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Day Popover Modal for "+N more" posts
  const [dayPopoverData, setDayPopoverData] = useState<{ dateStr: string; posts: any[] } | null>(null);

  // Accessible Confirmation Modal
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

  // Quick Schedule Modal
  const [quickScheduleModal, setQuickScheduleModal] = useState<{ open: boolean; dateStr: string }>({
    open: false,
    dateStr: '',
  });
  const [quickTitle, setQuickTitle] = useState('');
  const [quickContent, setQuickContent] = useState('');
  const [quickTime, setQuickTime] = useState('14:00');
  const [quickPlatforms, setQuickPlatforms] = useState<string[]>(['instagram', 'x_twitter', 'linkedin']);
  const [quickModalError, setQuickModalError] = useState<string | null>(null);

  // Magic Link modal inside post detail
  const [generatedMagicLink, setGeneratedMagicLink] = useState<{ url: string; token: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Drag and Drop State
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);

  // 1-Click Campaign Batch Scheduling Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchCampaignId, setBatchCampaignId] = useState<string>('');
  const [batchStartDate, setBatchStartDate] = useState<string>('2026-09-24');
  const [batchCadence, setBatchCadence] = useState<'daily' | 'alternate_days' | 'weekdays' | 'twice_daily'>('daily');
  const [batchDailyTime, setBatchDailyTime] = useState<string>('09:00');
  const [batchItems, setBatchItems] = useState<
    Array<{ postId: string; title: string; dateStr: string; timeStr: string; stage?: string }>
  >([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Close timezone popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tzPopoverRef.current && !tzPopoverRef.current.contains(e.target as Node)) {
        setShowTzHelp(false);
      }
    };
    if (showTzHelp) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTzHelp]);

  // Modal Scroll Lock
  useEffect(() => {
    const isAnyModalOpen = Boolean(batchModalOpen || selectedPost || quickScheduleModal.open || dayPopoverData);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [batchModalOpen, selectedPost, quickScheduleModal.open, dayPopoverData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const loadPosts = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const [postsData, campaignsData] = await Promise.all([
        api.posts.list(activeBrand.id),
        api.campaigns.list(activeBrand.id).catch(() => []),
      ]);
      setPosts(postsData || []);
      setCampaigns(campaignsData || []);
    } catch (err) {
      console.error('Failed to load posts or campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [activeBrand]);

  // Handle external navigation context
  useEffect(() => {
    if (initialContext) {
      if (initialContext.campaignId) {
        setCampaignFilter(initialContext.campaignId);
      }
      if (initialContext.startDate) {
        setCurrentDate(new Date(initialContext.startDate));
      }
      if (initialContext.viewMode) {
        setViewMode(initialContext.viewMode);
      }
      if (initialContext.openBatchSchedule) {
        setBatchCampaignId(initialContext.campaignId || '');
        setBatchModalOpen(true);
      }
    }
  }, [initialContext]);

  // Date Navigation Handlers according to viewMode
  const handlePrevDate = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate((prev) => new Date(prev.getTime() - 7 * 86400000));
    } else if (viewMode === 'day') {
      setCurrentDate((prev) => new Date(prev.getTime() - 86400000));
    }
  };

  const handleNextDate = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate((prev) => new Date(prev.getTime() + 7 * 86400000));
    } else if (viewMode === 'day') {
      setCurrentDate((prev) => new Date(prev.getTime() + 86400000));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // Campaign filter
      if (campaignFilter !== 'all') {
        if (campaignFilter === 'none') {
          if (p.campaign_id) return false;
        } else if (p.campaign_id !== campaignFilter) {
          return false;
        }
      }
      // Platform filter
      if (platformFilter !== 'all') {
        const hasPlatform = p.variants?.some((v: any) => v.platform === platformFilter);
        if (!hasPlatform) return false;
      }
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'failed') {
          const isFailed = p.status === 'failed' || p.status === 'partially_failed' || p.status === 'PARTIAL_SUCCESS';
          if (!isFailed) return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }
      // Content Type Filter
      if (contentTypeFilter !== 'all') {
        const hasMedia = p.variants?.some((v: any) => v.media_asset_ids && v.media_asset_ids.length > 0);
        const isVideo = p.title?.toLowerCase().includes('reel') || p.title?.toLowerCase().includes('video');
        if (contentTypeFilter === 'video' && !isVideo) return false;
        if (contentTypeFilter === 'media' && !hasMedia && !isVideo) return false;
        if (contentTypeFilter === 'text' && (hasMedia || isVideo)) return false;
      }
      // Date Range Filter
      if (filterStartDate) {
        const targetDate = p.scheduled_for || p.published_at || p.created_at;
        if (targetDate) {
          const local = toBrandLocal(targetDate, brandTz);
          if (local.dateStr < filterStartDate) return false;
        }
      }
      if (filterEndDate) {
        const targetDate = p.scheduled_for || p.published_at || p.created_at;
        if (targetDate) {
          const local = toBrandLocal(targetDate, brandTz);
          if (local.dateStr > filterEndDate) return false;
        }
      }
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = p.title?.toLowerCase().includes(query);
        const matchContent = p.base_content?.toLowerCase().includes(query);
        if (!matchTitle && !matchContent) return false;
      }
      return true;
    });
  }, [posts, campaignFilter, platformFilter, statusFilter, contentTypeFilter, filterStartDate, filterEndDate, searchQuery, brandTz]);

  // Dynamic Status Counts
  const statusCounts = useMemo(() => {
    return {
      all: posts.length,
      draft: posts.filter((p) => p.status === 'draft').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
      in_review: posts.filter((p) => p.status === 'in_review').length,
      published: posts.filter((p) => p.status === 'published').length,
      failed: posts.filter((p) => p.status === 'failed' || p.status === 'partially_failed' || p.status === 'PARTIAL_SUCCESS').length,
    };
  }, [posts]);

  // Active Extended Filters Count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (platformFilter !== 'all') count++;
    if (contentTypeFilter !== 'all') count++;
    if (filterStartDate || filterEndDate) count++;
    return count;
  }, [platformFilter, contentTypeFilter, filterStartDate, filterEndDate]);

  // Calendar Math for Month View
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Current today string in brand timezone
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const local = toBrandLocal(now.toISOString(), brandTz);
    return local.dateStr;
  }, [brandTz]);

  const calendarDays = useMemo(() => {
    const daysInCurMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      posts: any[];
    }> = [];

    // Preceding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        day: dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        posts: [],
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayPosts = filteredPosts.filter((p) => {
        const targetDate = p.scheduled_for || p.published_at || p.created_at;
        if (!targetDate) return false;
        const local = toBrandLocal(targetDate, brandTz);
        return local.dateStr === dateStr;
      });

      cells.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayDateStr,
        posts: dayPosts,
      });
    }

    // Trailing days from next month to fill grid (35 or 42 cells)
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - cells.length;
    for (let n = 1; n <= remainingSlots; n++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      cells.push({
        day: n,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        posts: [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, filteredPosts, brandTz, todayDateStr]);

  // Week View Days (7 days centered around currentDate)
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      const dayPosts = filteredPosts.filter((p) => {
        const targetDate = p.scheduled_for || p.published_at || p.created_at;
        if (!targetDate) return false;
        const local = toBrandLocal(targetDate, brandTz);
        return local.dateStr === dateStr;
      });

      return {
        date: d,
        dayName: daysOfWeek[d.getDay()],
        dayNum: d.getDate(),
        dateStr,
        isToday: dateStr === todayDateStr,
        posts: dayPosts,
      };
    });
  }, [currentDate, filteredPosts, brandTz, todayDateStr]);

  // Hourly slots for Day View (24 hours: 00:00 to 23:00)
  const dayHourlySlots = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dayStr = `${y}-${m}-${day}`;

    return Array.from({ length: 24 }, (_, hour) => {
      const hourStr = String(hour).padStart(2, '0');
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const displayTime = `${hour12}:00 ${ampm}`;

      const slotPosts = filteredPosts.filter((p) => {
        const targetDate = p.scheduled_for || p.published_at || p.created_at;
        if (!targetDate) return false;
        const local = toBrandLocal(targetDate, brandTz);
        if (local.dateStr !== dayStr) return false;
        const postHour = parseInt(local.timeStr.split(':')[0], 10);
        return postHour === hour;
      });

      return {
        hour,
        hourStr,
        displayTime,
        dateStr: dayStr,
        slotKey: `${dayStr}_${hourStr}`,
        posts: slotPosts,
      };
    });
  }, [currentDate, filteredPosts, brandTz]);

  // Drag and Drop Rescheduling Handler with Timezone Normalization
  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData('text/plain', postId);
    setDraggingPostId(postId);
  };

  const handleDragOver = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    setDragOverDateStr(slotKey);
  };

  const handleDragLeave = () => {
    setDragOverDateStr(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDateStr: string, targetHourStr?: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('text/plain') || draggingPostId;
    setDragOverDateStr(null);
    setDraggingPostId(null);

    if (!postId || !activeBrand) return;

    const timeStr = targetHourStr ? `${targetHourStr.padStart(2, '0')}:00` : '14:00';
    let newScheduledUtc: string;

    try {
      newScheduledUtc = fromBrandLocal(targetDateStr, timeStr, brandTz).toISOString();
    } catch {
      newScheduledUtc = `${targetDateStr}T${timeStr}:00.000Z`;
    }

    // Optimistic local state update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'scheduled', scheduled_for: newScheduledUtc } : p))
    );

    try {
      await api.posts.schedule(activeBrand.id, postId, newScheduledUtc);
      showToast(`🗓️ Post rescheduled to ${targetDateStr} at ${timeStr} (${tzDetails.abbreviation})!`);
    } catch (err: any) {
      console.error('Failed to reschedule post:', err);
      showToast(`❌ Failed to reschedule: ${err.message}`);
      loadPosts(); // rollback
    }
  };

  // Open Post Details Modal
  const handleOpenPost = (post: any) => {
    setSelectedPost(post);
    if (post.variants && post.variants.length > 0) {
      setSelectedVariantTab(post.variants[0].platform);
    }
    if (post.scheduled_for) {
      const local = toBrandLocal(post.scheduled_for, brandTz);
      setRescheduleInput(`${local.dateStr}T${local.timeStr}`);
    } else {
      setRescheduleInput('2026-09-25T14:00');
    }
    setGeneratedMagicLink(null);
  };

  // Immediate Publish Action with Idempotency
  const handlePublishNow = async (postId: string) => {
    if (!activeBrand) return;
    setActionLoading(true);
    try {
      const res = await api.posts.publishNow(activeBrand.id, postId);
      if (res.idempotent) {
        showToast('ℹ️ Post is already published live across channels.');
      } else {
        showToast('🚀 Post successfully published live across all selected channels!');
      }
      setSelectedPost((prev: any) =>
        prev ? { ...prev, status: 'published', published_at: new Date().toISOString() } : null
      );
      loadPosts();
    } catch (err: any) {
      showToast('❌ Failed to publish post: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Retry Failed Post
  const handleRetryPost = async (postId: string) => {
    if (!activeBrand) return;
    setActionLoading(true);
    try {
      await api.posts.retry(activeBrand.id, postId);
      showToast('🔄 Post retried successfully! All channels updated.');
      loadPosts();
      if (selectedPost?.id === postId) {
        const refreshed = await api.posts.get(activeBrand.id, postId);
        setSelectedPost(refreshed);
      }
    } catch (err: any) {
      showToast(`❌ Retry failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Reschedule from Modal with Timezone Engine
  const handleUpdateSchedule = async () => {
    if (!selectedPost || !activeBrand || !rescheduleInput) return;
    setActionLoading(true);
    try {
      const [dStr, tStr] = rescheduleInput.split('T');
      const targetUtc = fromBrandLocal(dStr, tStr, brandTz).toISOString();
      await api.posts.schedule(activeBrand.id, selectedPost.id, targetUtc);
      showToast(`🗓️ Post schedule updated in ${brandTz}!`);
      setSelectedPost((prev: any) => (prev ? { ...prev, status: 'scheduled', scheduled_for: targetUtc } : null));
      loadPosts();
    } catch (err: any) {
      showToast('❌ Failed to update schedule: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Generate Magic Review Link
  const handleGenerateMagicLink = async () => {
    if (!selectedPost || !activeBrand) return;
    setActionLoading(true);
    try {
      const res = await api.posts.submitApproval(activeBrand.id, selectedPost.id);
      setGeneratedMagicLink({
        url: res.magicLinkUrl,
        token: res.approvalRequest.magic_token,
      });
      showToast('✨ Magic Review Link generated for client!');
      loadPosts();
    } catch (err: any) {
      showToast('❌ Failed to generate magic review link: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    if (!activeBrand) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Social Post',
      description: 'Are you sure you want to delete this scheduled post? Any queued publication jobs and associated draft revisions will be cancelled.',
      confirmText: 'Delete Post',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(true);
        try {
          await api.posts.delete(activeBrand.id, postId);
          showToast('🗑️ Post deleted successfully.');
          setSelectedPost(null);
          loadPosts();
        } catch (err: any) {
          showToast('❌ Failed to delete post: ' + err.message);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Quick Day Schedule Submit
  const handleQuickScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickModalError(null);
    if (!activeBrand) {
      setQuickModalError('No active brand selected');
      return;
    }
    if (!quickTitle.trim()) {
      setQuickModalError('Please enter a campaign or post title');
      return;
    }
    if (!quickContent.trim()) {
      setQuickModalError('Please enter post content');
      return;
    }
    if (quickPlatforms.length === 0) {
      setQuickModalError('Please select at least one target channel');
      return;
    }

    setActionLoading(true);
    try {
      let scheduledUtc: string;
      try {
        scheduledUtc = fromBrandLocal(quickScheduleModal.dateStr, quickTime, brandTz).toISOString();
      } catch {
        scheduledUtc = `${quickScheduleModal.dateStr}T${quickTime || '14:00'}:00.000Z`;
      }

      // 1. Create post
      const createRes = await api.posts.create(activeBrand.id, {
        title: quickTitle.trim(),
        baseContent: quickContent.trim(),
        variants: quickPlatforms.map((plat) => ({
          platform: plat,
          content: quickContent.trim(),
          mediaAssetIds: [],
        })),
      });

      // api.request unwraps response.data, so ID is directly on createRes or createRes.data
      const newPostId = (createRes as any)?.id || (createRes as any)?.data?.id;
      if (!newPostId) {
        throw new Error('Post created but could not retrieve post ID from server response');
      }

      // 2. Schedule post
      await api.posts.schedule(activeBrand.id, newPostId, scheduledUtc);

      showToast(`🎉 Post scheduled for ${quickScheduleModal.dateStr} at ${quickTime} (${tzDetails.abbreviation})!`);
      setQuickScheduleModal({ open: false, dateStr: '' });
      setQuickTitle('');
      setQuickContent('');
      setQuickModalError(null);
      loadPosts();
    } catch (err: any) {
      console.error('Failed to quick schedule post:', err);
      const errMsg = err.message || 'Unknown error occurred while scheduling post';
      setQuickModalError(errMsg);
      showToast('❌ Failed to schedule: ' + errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Campaign Batch Scheduler Handlers
  const handleOpenBatchScheduleModal = (targetCampaignId?: string) => {
    const initialCampId = targetCampaignId || (campaigns.length > 0 ? campaigns[0].id : '');
    setBatchCampaignId(initialCampId);
    setBatchStartDate(new Date().toISOString().split('T')[0]);
    setBatchCadence('daily');
    setBatchDailyTime('09:00');

    // Populate initial items for this campaign
    updateBatchPreviewItems(initialCampId, '2026-09-24', 'daily', '09:00');
    setBatchModalOpen(true);
  };

  const updateBatchPreviewItems = (
    campId: string,
    startD: string,
    cad: 'daily' | 'alternate_days' | 'weekdays' | 'twice_daily',
    dailyT: string
  ) => {
    const campPosts = posts.filter((p) => p.campaign_id === campId);
    const sorted = [...campPosts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const items = sorted.map((p, idx) => {
      let d = new Date(startD);
      let time = dailyT;

      if (cad === 'twice_daily') {
        const dayIdx = Math.floor(idx / 2);
        d.setDate(d.getDate() + dayIdx);
        time = idx % 2 === 1 ? '15:00' : dailyT;
      } else if (cad === 'alternate_days') {
        d.setDate(d.getDate() + idx * 2);
      } else if (cad === 'weekdays') {
        let added = 0;
        while (added < idx) {
          d.setDate(d.getDate() + 1);
          if (d.getDay() !== 0 && d.getDay() !== 6) added++;
        }
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      } else {
        d.setDate(d.getDate() + idx);
      }

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      return {
        postId: p.id,
        title: p.title,
        dateStr,
        timeStr: time,
      };
    });

    setBatchItems(items);
  };

  const handleBatchCampaignChange = (newCampId: string) => {
    setBatchCampaignId(newCampId);
    updateBatchPreviewItems(newCampId, batchStartDate, batchCadence, batchDailyTime);
  };

  const handleBatchCadenceChange = (newCadence: 'daily' | 'alternate_days' | 'weekdays' | 'twice_daily') => {
    setBatchCadence(newCadence);
    updateBatchPreviewItems(batchCampaignId, batchStartDate, newCadence, batchDailyTime);
  };

  const handleBatchStartDateChange = (newStartD: string) => {
    setBatchStartDate(newStartD);
    updateBatchPreviewItems(batchCampaignId, newStartD, batchCadence, batchDailyTime);
  };

  const handleBatchDailyTimeChange = (newTime: string) => {
    setBatchDailyTime(newTime);
    updateBatchPreviewItems(batchCampaignId, batchStartDate, batchCadence, newTime);
  };

  const handleManualItemScheduleChange = (idx: number, field: 'dateStr' | 'timeStr', val: string) => {
    setBatchItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleApplyBatchSchedule = async () => {
    if (!activeBrand || !batchCampaignId) return;
    setBatchLoading(true);
    try {
      const scheduleItems = batchItems.map((item) => ({
        postId: item.postId,
        scheduledFor: fromBrandLocal(item.dateStr, item.timeStr, brandTz).toISOString(),
      }));

      await api.campaigns.schedule(activeBrand.id, batchCampaignId, {
        startDate: batchStartDate,
        dailyTime: batchDailyTime,
        cadence: batchCadence,
        scheduleItems,
      });

      showToast(`🎉 1-Click Schedule Applied: ${batchItems.length} posts scheduled in ${brandTz}!`);
      setBatchModalOpen(false);
      setCampaignFilter(batchCampaignId);
      loadPosts();
    } catch (err: any) {
      showToast(`❌ Batch schedule failed: ${err.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchPublishCampaignNow = (campaignIdToPublish: string) => {
    if (!activeBrand || !campaignIdToPublish) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Batch Publish Campaign',
      description: 'Publish all unpublished posts in this campaign live across all networks now? Active social platform rate limits will apply.',
      confirmText: 'Publish Campaign Now',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setBatchLoading(true);
        try {
          const res = await api.campaigns.publishBatch(activeBrand.id, campaignIdToPublish);
          showToast(
            `🚀 Batch publish complete: ${res.publishedCount} published, ${res.skippedCount} skipped (idempotent), ${res.failedCount} failed.`
          );
          loadPosts();
          setBatchModalOpen(false);
        } catch (err: any) {
          showToast(`❌ Batch publish failed: ${err.message}`);
        } finally {
          setBatchLoading(false);
        }
      },
    });
  };

  return (
    <div className="calendar-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(236, 72, 153, 0.95))',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <Sparkles size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. COMPACT HEADER */}
      <div className="calendar-header-compact">
        <div className="calendar-header-title-group">
          <h2 className="calendar-page-title">
            <CalendarIcon size={20} color="var(--accent-primary)" />
            <span>Content Calendar</span>
          </h2>
          <p className="calendar-page-subtitle">
            Plan, schedule, and organize your social media content across all channels.
          </p>
        </div>

        <div className="calendar-header-actions">
          {/* Timezone Contextual Help Pill */}
          <div style={{ position: 'relative' }} ref={tzPopoverRef}>
            <button
              type="button"
              className="calendar-tz-pill calendar-tz-badge"
              onClick={() => setShowTzHelp((prev) => !prev)}
              title="Timezone & Scheduling Info"
            >
              <Globe size={13} color="var(--accent-primary)" />
              <span>{tzDetails.abbreviation} ({tzDetails.offsetString})</span>
              <Info size={11} style={{ opacity: 0.7 }} />
            </button>

            {showTzHelp && (
              <div className="calendar-tz-popover animate-scale-up">
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={13} color="var(--accent-primary)" />
                  <span>Timezone: {tzDetails.timeZone}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Offsets: {tzDetails.offsetString} · {tzDetails.isDST ? 'Daylight Saving Time Active' : 'Standard Time'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', marginTop: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  💡 <strong>Tip:</strong> Drag and drop any post card to reschedule. All timestamps are safely normalized in UTC with zero offset drift.
                </div>
              </div>
            )}
          </div>

          {/* Secondary Action: 1-Click Campaign Batch */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenBatchScheduleModal()}
            style={{ gap: '6px', fontSize: '0.78rem' }}
          >
            <Zap size={13} color="#ec4899" />
            <span>Campaign Batch</span>
          </button>

          {/* Primary Action: New Post */}
          {onNavigate && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('studio')}
              style={{ gap: '6px', fontSize: '0.78rem' }}
            >
              <Plus size={14} />
              <span>New Post</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. COMPACT NAVIGATION & VIEW TOOLBAR */}
      <div className="calendar-nav-toolbar">
        {/* Left: Navigation Group */}
        <div className="calendar-nav-group">
          <button
            type="button"
            className="btn btn-secondary btn-sm calendar-nav-today-btn"
            onClick={handleToday}
          >
            Today
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 6px' }}
            onClick={handlePrevDate}
            title="Previous Period"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="calendar-period-label">
            {viewMode === 'month' && `${monthNames[currentMonth]} ${currentYear}`}
            {viewMode === 'week' && `Week of ${weekDays[0]?.dayName} ${weekDays[0]?.dayNum}`}
            {viewMode === 'day' &&
              currentDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            {viewMode === 'list' && 'Publishing Queue'}
          </span>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 6px' }}
            onClick={handleNextDate}
            title="Next Period"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Right: View Mode Segmented Switcher */}
        <div className="calendar-view-switcher">
          <button
            type="button"
            className={`calendar-view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            <Grid size={13} />
            <span>Month</span>
          </button>
          <button
            type="button"
            className={`calendar-view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            <CalendarDays size={13} />
            <span>Week</span>
          </button>
          <button
            type="button"
            className={`calendar-view-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            <Clock size={13} />
            <span>Day</span>
          </button>
          <button
            type="button"
            className={`calendar-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={13} />
            <span>Queue</span>
          </button>
        </div>
      </div>

      {/* 3. COMPACT STATUS TABS */}
      <div className="calendar-status-tabs-container">
        {[
          { id: 'all', label: 'All', count: statusCounts.all, color: '#94a3b8' },
          { id: 'draft', label: 'Drafts', count: statusCounts.draft, color: '#a78bfa' },
          { id: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled, color: '#60a5fa' },
          { id: 'in_review', label: 'In Review', count: statusCounts.in_review, color: '#f59e0b' },
          { id: 'published', label: 'Published', count: statusCounts.published, color: '#10b981' },
          { id: 'failed', label: 'Failed', count: statusCounts.failed, color: '#ef4444' },
        ].map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`calendar-status-tab ${isSelected ? 'active' : ''}`}
            >
              <span className="calendar-status-dot" style={{ background: tab.color }} />
              <span>{tab.label}</span>
              <span className="calendar-status-count">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* 4. SIMPLIFIED FILTER TOOLBAR */}
      <div>
        <div className="calendar-filter-toolbar">
          <div className="calendar-filter-left">
            {/* Campaign Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Rocket size={13} color="var(--accent-primary)" />
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto', height: '30px' }}
              >
                <option value="all">🚀 All Campaigns &amp; Posts</option>
                <option value="none">Standalone Posts Only</option>
                {campaigns.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    Campaign: {camp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowExpandedFilters((prev) => !prev)}
              className={`calendar-filter-btn ${showExpandedFilters || activeFiltersCount > 0 ? 'active' : ''}`}
            >
              <Sliders size={12} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#ffffff',
                    fontSize: '0.66rem',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontWeight: 700,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                size={11}
                style={{
                  transform: showExpandedFilters ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setPlatformFilter('all');
                  setContentTypeFilter('all');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                style={{ fontSize: '0.72rem', padding: '2px 6px', color: 'var(--text-muted)' }}
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="calendar-search-wrap">
            <Search
              size={13}
              style={{ position: 'absolute', left: '9px', top: '9px', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search scheduled posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '28px', paddingRight: searchQuery ? '26px' : '10px', fontSize: '0.78rem', height: '30px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Expandable Filter Drawer (Platform, Content Type, Date Range) */}
        {showExpandedFilters && (
          <div className="calendar-expanded-filters">
            {/* Platform Filter */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Platform Channel
              </label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '4px 8px', fontSize: '0.76rem', height: '30px' }}
              >
                <option value="all">All Platforms</option>
                <option value="instagram">📸 Instagram</option>
                <option value="x_twitter">🐦 X (Twitter)</option>
                <option value="linkedin">💼 LinkedIn</option>
                <option value="tiktok">🎵 TikTok</option>
                <option value="facebook">👥 Facebook</option>
                <option value="youtube">▶️ YouTube</option>
              </select>
            </div>

            {/* Content Type Filter */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Content Format
              </label>
              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value as any)}
                className="form-input"
                style={{ width: '100%', padding: '4px 8px', fontSize: '0.76rem', height: '30px' }}
              >
                <option value="all">All Formats</option>
                <option value="media">🖼️ Posts with Media</option>
                <option value="video">🎬 Videos / Reels</option>
                <option value="text">✍️ Text Only</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '4px 8px', fontSize: '0.76rem', height: '30px' }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                End Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '4px 8px', fontSize: '0.76rem', height: '30px' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. CONTEXTUAL EMPTY STATE BANNER (When 0 posts exist in view) */}
      {filteredPosts.length === 0 && !loading && (
        <div className="calendar-contextual-empty-state">
          <div className="calendar-contextual-empty-text">
            <CalendarIcon size={18} color="var(--accent-primary)" />
            <span>Your calendar is ready. Start planning your social media content.</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (onNavigate) {
                onNavigate('studio');
              } else {
                setQuickScheduleModal({ open: true, dateStr: todayDateStr });
              }
            }}
            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
          >
            <Plus size={13} />
            <span>Create First Post</span>
          </button>
        </div>
      )}

      {/* VIEW MODE 1: MONTH GRID VIEW */}
      {viewMode === 'month' && (
        <div className="calendar-month-card">
          <div style={{ minWidth: '700px' }}>
            {/* Day Names Header */}
            <div className="calendar-days-header-row">
              {daysOfWeek.map((d) => (
                <div key={d} className="calendar-day-name-cell">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid Matrix */}
            <div className="calendar-month-matrix">
              {calendarDays.map((cell, idx) => {
                const isDragTarget = dragOverDateStr === cell.dateStr;
                const maxVisiblePosts = 2;
                const visiblePosts = cell.posts.slice(0, maxVisiblePosts);
                const hiddenPostsCount = cell.posts.length - maxVisiblePosts;

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => handleDragOver(e, cell.dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, cell.dateStr)}
                    onClick={() => setQuickScheduleModal({ open: true, dateStr: cell.dateStr })}
                    className={`calendar-day-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${cell.isToday ? 'is-today' : ''} ${isDragTarget ? 'is-drag-target' : ''}`}
                    title={`Click to schedule a post on ${cell.dateStr}`}
                  >
                    {/* Cell Header: Day Number + Quick Add */}
                    <div className="calendar-cell-top">
                      <span className={`calendar-cell-day-num ${cell.isToday ? 'today' : ''}`}>
                        {cell.day}
                      </span>

                      <button
                        type="button"
                        className="calendar-cell-add-btn"
                        title={`Schedule post on ${cell.dateStr}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickScheduleModal({ open: true, dateStr: cell.dateStr });
                        }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Scheduled Posts in Cell */}
                    <div className="calendar-cell-posts-container">
                      {visiblePosts.map((post) => {
                        const local = toBrandLocal(
                          post.scheduled_for || post.published_at || post.created_at,
                          brandTz
                        );
                        const formattedTime = local.timeStr
                          ? new Date(`2000-01-01T${local.timeStr}`).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : '2:00 PM';

                        const primaryPlatform = post.variants?.[0]?.platform || 'instagram';

                        return (
                          <div
                            key={post.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, post.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPost(post);
                            }}
                            className={`calendar-post-pill-compact status-${post.status}`}
                            title={`${post.title} (${formattedTime} - ${post.status})`}
                          >
                            <PlatformIcon platform={primaryPlatform} size={11} />
                            <span className="calendar-post-pill-time">{formattedTime}</span>
                            <span className="calendar-post-pill-title">{post.title}</span>
                          </div>
                        );
                      })}

                      {hiddenPostsCount > 0 && (
                        <button
                          type="button"
                          className="calendar-more-posts-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDayPopoverData({ dateStr: cell.dateStr, posts: cell.posts });
                          }}
                        >
                          +{hiddenPostsCount} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="calendar-month-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', minWidth: '700px' }}>
            {weekDays.map((col, idx) => (
              <div
                key={idx}
                onDragOver={(e) => handleDragOver(e, col.dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.dateStr)}
                style={{
                  minHeight: '360px',
                  background:
                    dragOverDateStr === col.dateStr ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: col.isToday ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Day Header */}
                <div
                  style={{
                    paddingBottom: '6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: col.isToday ? 'var(--accent-primary)' : 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {col.dayName}
                    </div>
                    <div
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: col.isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}
                    >
                      {col.dayNum}
                    </div>
                  </div>

                  <button
                    className="btn btn-ghost btn-sm"
                    title={`Schedule post on ${col.dateStr}`}
                    onClick={() => setQuickScheduleModal({ open: true, dateStr: col.dateStr })}
                    style={{ padding: '3px' }}
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Posts in Column */}
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}
                  onClick={() => {
                    if (col.posts.length === 0) {
                      setQuickScheduleModal({ open: true, dateStr: col.dateStr });
                    }
                  }}
                >
                  {col.posts.map((post) => {
                      const local = toBrandLocal(post.scheduled_for || post.created_at, brandTz);
                      const isFailed = post.status === 'failed' || post.status === 'partially_failed' || post.status === 'PARTIAL_SUCCESS';
                      const primaryPlat = post.variants?.[0]?.platform || 'instagram';

                      return (
                        <div
                          key={post.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, post.id)}
                          onClick={() => handleOpenPost(post)}
                          className={`calendar-post-pill-compact status-${post.status}`}
                          style={{
                            padding: '6px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            gap: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <PlatformIcon platform={primaryPlat} size={11} />
                              <span className="calendar-post-pill-time" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                                {local.timeStr
                                  ? new Date(`2000-01-01T${local.timeStr}`).toLocaleTimeString([], {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })
                                  : '2:00 PM'}
                              </span>
                            </div>
                            <span className={`badge badge-${post.status}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                              {post.status}
                            </span>
                          </div>

                          <strong className="calendar-post-pill-title" style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {post.title}
                          </strong>

                          {post.campaign_id && (() => {
                            const camp = campaigns.find((c) => c.id === post.campaign_id);
                            return (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.64rem',
                                  color: 'var(--accent-primary, #8b5cf6)',
                                  background: 'rgba(139, 92, 246, 0.12)',
                                  border: '1px solid rgba(139, 92, 246, 0.3)',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  fontWeight: 600,
                                  width: 'fit-content',
                                }}
                              >
                                <Rocket size={9} color="var(--accent-primary)" />
                                <span>{camp?.name || 'Campaign'}</span>
                              </div>
                            );
                          })()}

                          {isFailed && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.66rem', padding: '2px 6px', alignSelf: 'flex-start', color: '#ef4444' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryPost(post.id);
                              }}
                            >
                              <RotateCcw size={10} />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: DAY VIEW (HOURLY TIMELINE WITH DRAG-AND-DROP) */}
      {viewMode === 'day' && (
        <div className="calendar-month-card" style={{ padding: '16px' }}>
          {/* Day View Subheader */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="calendar-day-active-header">
                <span className="calendar-day-active-title">
                  {currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="calendar-day-active-count">
                  ({dayHourlySlots.reduce((acc, slot) => acc + slot.posts.length, 0)} posts scheduled)
                </span>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setQuickScheduleModal({ open: true, dateStr: currentDate.toISOString().slice(0, 10) })}
              style={{ fontSize: '0.78rem' }}
            >
              <Plus size={13} />
              <span>Schedule Post on This Day</span>
            </button>
          </div>

          {/* 24-Hour Timeline Grid */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '680px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {dayHourlySlots.map((slot) => {
              const isTarget = dragOverDateStr === slot.slotKey;

              return (
                <div
                  key={slot.hour}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDateStr(slot.slotKey);
                  }}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, slot.dateStr, slot.hourStr)}
                  style={{
                    minHeight: slot.posts.length > 0 ? '64px' : '44px',
                    background: isTarget
                      ? 'rgba(139, 92, 246, 0.2)'
                      : slot.posts.length > 0
                      ? 'rgba(255, 255, 255, 0.03)'
                      : 'rgba(255, 255, 255, 0.01)',
                    border: isTarget
                      ? '2px dashed var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Time Column in Brand Timezone */}
                  <div style={{ width: '85px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: slot.posts.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {slot.displayTime}
                    </span>
                    <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                      {tzDetails.abbreviation}
                    </span>
                  </div>

                  {/* Posts Container in this Hour */}
                  <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {slot.posts.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No posts scheduled
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px', opacity: 0.6 }}
                          onClick={() => {
                            setQuickTime(`${slot.hourStr}:00`);
                            setQuickScheduleModal({ open: true, dateStr: slot.dateStr });
                          }}
                        >
                          <Plus size={11} />
                          <span>Add Post</span>
                        </button>
                      </div>
                    ) : (
                      slot.posts.map((post) => {
                        const isPublished = post.status === 'published';
                        const isFailed = post.status === 'failed' || post.status === 'partially_failed' || post.status === 'PARTIAL_SUCCESS';
                        const isPublishing = post.status === 'publishing';
                        const camp = campaigns.find((c) => c.id === post.campaign_id);
                        const primaryPlat = post.variants?.[0]?.platform || 'instagram';

                        return (
                          <div
                            key={post.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, post.id)}
                            onClick={() => handleOpenPost(post)}
                            className={`calendar-post-pill-compact status-${post.status}`}
                            style={{
                              padding: '6px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              flex: 1,
                              minWidth: '260px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <PlatformIcon platform={primaryPlat} size={13} />
                              <span className={`badge badge-${post.status}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                {post.status}
                              </span>
                              <div>
                                <strong className="calendar-post-pill-title" style={{ fontSize: '0.8rem', display: 'block' }}>
                                  {post.title}
                                </strong>
                                {camp && (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary, #8b5cf6)', fontWeight: 600 }}>
                                    🚀 {camp.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {isFailed && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: '#ef4444', fontSize: '0.68rem', padding: '2px 6px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRetryPost(post.id);
                                  }}
                                  title="Retry publishing"
                                >
                                  <RotateCcw size={11} />
                                  <span>Retry</span>
                                </button>
                              )}
                              {!isPublished && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePublishNow(post.id);
                                  }}
                                  title="Publish Now"
                                >
                                  <Send size={11} />
                                  <span>Publish</span>
                                </button>
                              )}
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '2px 4px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPost(post);
                                }}
                              >
                                <Eye size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 4: QUEUE / LIST VIEW */}
      {viewMode === 'list' && (
        <div className="calendar-month-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.94rem' }}>
              <List size={16} color="var(--accent-primary)" />
              <span>Chronological Publishing Queue ({filteredPosts.length} posts)</span>
            </h4>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading publishing queue...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No scheduled posts match current filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredPosts.map((post) => {
                const targetDate = post.scheduled_for || post.published_at || post.created_at;
                const local = toBrandLocal(targetDate, brandTz);
                const isFailed = post.status === 'failed' || post.status === 'partially_failed' || post.status === 'PARTIAL_SUCCESS';
                const primaryPlat = post.variants?.[0]?.platform || 'instagram';

                return (
                  <div
                    key={post.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: isFailed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isFailed ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '260px', flex: 1 }}>
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '4px 10px',
                          background: 'rgba(139, 92, 246, 0.12)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(139, 92, 246, 0.25)',
                          minWidth: '80px',
                        }}
                      >
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {local.dateStr || 'TBD'}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {local.timeStr} ({tzDetails.abbreviation})
                        </div>
                      </div>

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '2px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <PlatformIcon platform={primaryPlat} size={13} />
                          <span className={`badge badge-${post.status}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                            {post.status}
                          </span>
                          {post.campaign_id && (() => {
                            const camp = campaigns.find((c) => c.id === post.campaign_id);
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.68rem',
                                  color: 'var(--accent-primary, #8b5cf6)',
                                  background: 'rgba(139, 92, 246, 0.12)',
                                  border: '1px solid rgba(139, 92, 246, 0.3)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-full)',
                                  fontWeight: 600,
                                }}
                              >
                                <Rocket size={10} color="var(--accent-primary)" />
                                <span>{camp?.name || 'Campaign'}</span>
                              </span>
                            );
                          })()}
                          <strong className="calendar-post-pill-title" style={{ fontSize: '0.86rem' }}>{post.title}</strong>
                        </div>
                        <p
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            margin: 0,
                            maxHeight: '20px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {post.base_content}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isFailed && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: '0.72rem', padding: '3px 8px' }}
                          onClick={() => handleRetryPost(post.id)}
                          title="Retry failed platforms"
                        >
                          <RotateCcw size={11} />
                          <span>Retry</span>
                        </button>
                      )}

                      {post.status !== 'published' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handlePublishNow(post.id)}
                          title="Publish immediately"
                          style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                        >
                          <Send size={11} />
                          <span>Publish Now</span>
                        </button>
                      )}

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenPost(post)}
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>

                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444', padding: '4px' }}
                        onClick={() => handleDeletePost(post.id)}
                        title="Delete Post"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DAY POPOVER MODAL FOR "+N MORE" POSTS */}
      {dayPopoverData && createPortal(
        <div className="modal-backdrop" onClick={() => setDayPopoverData(null)}>
          <div
            className="modal-dialog animate-scale-up calendar-day-popover-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={16} color="var(--accent-primary)" />
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                  Scheduled for {dayPopoverData.dateStr}
                </h4>
                <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  {dayPopoverData.posts.length} posts
                </span>
              </div>
              <button className="modal-close" onClick={() => setDayPopoverData(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
              {dayPopoverData.posts.map((post) => {
                const local = toBrandLocal(post.scheduled_for || post.published_at || post.created_at, brandTz);
                const formattedTime = local.timeStr
                  ? new Date(`2000-01-01T${local.timeStr}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : '2:00 PM';
                const primaryPlat = post.variants?.[0]?.platform || 'instagram';

                return (
                  <div
                    key={post.id}
                    onClick={() => {
                      setDayPopoverData(null);
                      handleOpenPost(post);
                    }}
                    className={`calendar-post-pill-compact status-${post.status}`}
                    style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  >
                    <PlatformIcon platform={primaryPlat} size={13} />
                    <span className="calendar-post-pill-time" style={{ fontWeight: 700 }}>{formattedTime}</span>
                    <span className="calendar-post-pill-title">{post.title}</span>
                    <span className={`badge badge-${post.status}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                      {post.status}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setCurrentDate(new Date(dayPopoverData.dateStr + 'T12:00:00'));
                  setViewMode('day');
                  setDayPopoverData(null);
                }}
                style={{ fontSize: '0.75rem', gap: '4px' }}
              >
                <span>Open Day Timeline</span>
                <ArrowUpRight size={12} />
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const d = dayPopoverData.dateStr;
                  setDayPopoverData(null);
                  setQuickScheduleModal({ open: true, dateStr: d });
                }}
                style={{ fontSize: '0.75rem', gap: '4px' }}
              >
                <Plus size={12} />
                <span>Add Post</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 1-CLICK CAMPAIGN BATCH SCHEDULER MODAL */}
      {batchModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setBatchModalOpen(false)}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                  <Zap size={18} color="#ec4899" />
                  <span>1-Click Campaign Batch Scheduler</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Schedule an entire multi-post campaign arc at once. Timezone: <strong>{tzDetails.timeZone}</strong> ({tzDetails.abbreviation}, {tzDetails.offsetString}).
                </p>
              </div>

              <button className="modal-close" onClick={() => setBatchModalOpen(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            {/* Selection Controls Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {/* Campaign Dropdown */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Target Campaign
                </label>
                <select
                  value={batchCampaignId}
                  onChange={(e) => handleBatchCampaignChange(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                >
                  {campaigns.map((camp) => (
                    <option key={camp.id} value={camp.id}>
                      {camp.name} ({camp.postCount || posts.filter((p) => p.campaign_id === camp.id).length} posts)
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Campaign Start Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={batchStartDate}
                  onChange={(e) => handleBatchStartDateChange(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                />
              </div>

              {/* Posting Cadence */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Posting Cadence
                </label>
                <select
                  value={batchCadence}
                  onChange={(e) =>
                    handleBatchCadenceChange(
                      e.target.value as 'daily' | 'alternate_days' | 'weekdays' | 'twice_daily'
                    )
                  }
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                >
                  <option value="daily">📅 Daily (1 post/day)</option>
                  <option value="alternate_days">⚡ Alternate Days (Every 2 days)</option>
                  <option value="weekdays">💼 Weekdays Only (Mon - Fri)</option>
                  <option value="twice_daily">🔥 Twice Daily (Morning & Afternoon)</option>
                </select>
              </div>

              {/* Daily Optimal Time */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Daily Slot ({tzDetails.abbreviation})
                </label>
                <select
                  value={batchDailyTime}
                  onChange={(e) => handleBatchDailyTimeChange(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                >
                  <option value="09:00">09:00 AM (Morning Peak)</option>
                  <option value="12:30">12:30 PM (Lunch Break)</option>
                  <option value="15:00">03:00 PM (Afternoon Focus)</option>
                  <option value="18:00">06:00 PM (Evening Commute)</option>
                  <option value="20:00">08:00 PM (Prime Time)</option>
                </select>
              </div>
            </div>

            {/* Editable Schedule Preview Table */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Interactive Pre-Publish Adjustments ({batchItems.length} posts):
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  💡 Modify any individual date or time before confirming
                </span>
              </div>

              {batchItems.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No posts found for this campaign. Generate posts first from the Campaigns tab.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '240px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px' }}>#</th>
                        <th style={{ padding: '6px 10px' }}>Post Title</th>
                        <th style={{ padding: '6px 10px' }}>Scheduled Date ({tzDetails.timeZone})</th>
                        <th style={{ padding: '6px 10px' }}>Time ({tzDetails.abbreviation})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchItems.map((item, idx) => (
                        <tr
                          key={item.postId}
                          style={{
                            borderTop: '1px solid var(--border-subtle)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                          }}
                        >
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--accent-primary, #8b5cf6)' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 10px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </td>
                          <td style={{ padding: '4px 10px' }}>
                            <input
                              type="date"
                              className="form-input"
                              value={item.dateStr}
                              onChange={(e) => handleManualItemScheduleChange(idx, 'dateStr', e.target.value)}
                              style={{ padding: '3px 6px', fontSize: '0.76rem', width: '130px' }}
                            />
                          </td>
                          <td style={{ padding: '4px 10px' }}>
                            <input
                              type="time"
                              className="form-input"
                              value={item.timeStr}
                              onChange={(e) => handleManualItemScheduleChange(idx, 'timeStr', e.target.value)}
                              style={{ padding: '3px 6px', fontSize: '0.76rem', width: '100px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setBatchModalOpen(false)}
                disabled={batchLoading}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleBatchPublishCampaignNow(batchCampaignId)}
                  disabled={batchLoading || batchItems.length === 0}
                  style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                >
                  <Send size={13} />
                  <span>Publish Campaign Now</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleApplyBatchSchedule}
                  disabled={batchLoading || batchItems.length === 0}
                >
                  <Check size={13} />
                  <span>{batchLoading ? 'Applying Schedule...' : 'Apply 1-Click Schedule'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* RICH POST DETAIL & ACTION MODAL */}
      {selectedPost && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span className={`badge badge-${selectedPost.status}`}>{selectedPost.status}</span>
                  {selectedPost.campaign_id && (() => {
                    const camp = campaigns.find((c) => c.id === selectedPost.campaign_id);
                    return (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.72rem',
                          color: 'var(--accent-primary, #8b5cf6)',
                          background: 'rgba(139, 92, 246, 0.15)',
                          border: '1px solid rgba(139, 92, 246, 0.35)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontWeight: 700,
                        }}
                      >
                        <Rocket size={11} color="var(--accent-primary)" />
                        <span>Campaign: {camp?.name || 'Multi-Post Arc'}</span>
                      </span>
                    );
                  })()}
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{selectedPost.title}</h3>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Scheduled for:{' '}
                  {selectedPost.scheduled_for
                    ? formatInBrandTimezone(selectedPost.scheduled_for, brandTz, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZoneName: 'short',
                      })
                    : 'Not scheduled'}
                </p>
              </div>

              <button className="modal-close" onClick={() => setSelectedPost(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            {/* Campaign Navigation Banner if part of campaign */}
            {selectedPost.campaign_id && (() => {
              const camp = campaigns.find((c) => c.id === selectedPost.campaign_id);
              return (
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Rocket size={14} color="var(--accent-primary)" />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Part of AI Campaign: {camp?.name || 'Multi-Post Arc'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Goal: <span style={{ textTransform: 'capitalize' }}>{camp?.goal?.replace(/_/g, ' ') || 'Strategic Arc'}</span>
                      </div>
                    </div>
                  </div>

                  {onNavigate && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedPost(null);
                        onNavigate('campaigns', { campaignId: selectedPost.campaign_id });
                      }}
                      style={{ fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span>View Full Campaign Arc</span>
                      <ArrowUpRight size={12} />
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Platform Variants Preview Tabs */}
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Channel Copies &amp; Variants
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '6px',
                  marginBottom: '10px',
                }}
              >
                {selectedPost.variants?.map((v: any) => (
                  <button
                    key={v.id || v.platform}
                    onClick={() => setSelectedVariantTab(v.platform)}
                    className={`btn btn-sm ${selectedVariantTab === v.platform ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.76rem', textTransform: 'capitalize', padding: '4px 10px', gap: '5px' }}
                  >
                    <PlatformIcon platform={v.platform} size={12} />
                    <span>{v.platform === 'twitter' || v.platform === 'x_twitter' ? 'X' : v.platform}</span>
                  </button>
                ))}
              </div>

              {/* Active Variant Preview */}
              {selectedPost.variants
                ?.filter((v: any) => v.platform === selectedVariantTab)
                .map((v: any) => (
                  <div
                    key={v.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.45', margin: 0 }}>
                      {v.content}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>{v.content?.length || 0} characters</span>
                      {v.remote_post_url && (
                        <a
                          href={v.remote_post_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Live Post URL</span>
                          <ArrowUpRight size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Reschedule Date & Time Control with Timezone Engine */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                🗓️ Reschedule Publication Time ({tzDetails.timeZone})
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={rescheduleInput}
                  onChange={(e) => setRescheduleInput(e.target.value)}
                  style={{ flex: 1, minWidth: '200px', fontSize: '0.78rem', height: '32px' }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleUpdateSchedule}
                  disabled={actionLoading}
                  style={{ fontSize: '0.76rem', height: '32px' }}
                >
                  <Clock size={13} />
                  <span>Update Schedule</span>
                </button>
              </div>
            </div>

            {/* Client Magic Review Link Generator */}
            {generatedMagicLink ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.08))',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--accent-emerald)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Client Magic Review Link Ready</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    value={generatedMagicLink.url}
                    style={{ flex: 1, fontSize: '0.76rem', fontFamily: 'var(--font-mono)', height: '30px' }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedMagicLink.url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    style={{ fontSize: '0.74rem', height: '30px' }}
                  >
                    <Copy size={12} />
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                  {onOpenMagicPortal && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onOpenMagicPortal(generatedMagicLink.token)}
                      style={{ fontSize: '0.74rem', height: '30px' }}
                    >
                      <ExternalLink size={12} />
                      <span>Test View</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleGenerateMagicLink}
                disabled={actionLoading}
                style={{ alignSelf: 'flex-start', fontSize: '0.76rem' }}
              >
                <Send size={13} />
                <span>Generate Client Magic Review Link</span>
              </button>
            )}

            {/* Bottom Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: '#ef4444', fontSize: '0.76rem' }}
                onClick={() => handleDeletePost(selectedPost.id)}
                disabled={actionLoading}
              >
                <Trash2 size={13} />
                <span>Delete Post</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {onNavigate && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const postToOpen = selectedPost;
                      setSelectedPost(null);
                      onNavigate('studio', { post: postToOpen });
                    }}
                    style={{ fontSize: '0.76rem' }}
                  >
                    <Edit3 size={13} />
                    <span>Open in Studio</span>
                  </button>
                )}

                {selectedPost.status === 'published' && onNavigate && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedPost(null);
                      onNavigate('analytics');
                    }}
                    style={{ fontSize: '0.76rem' }}
                  >
                    <span>View Analytics</span>
                    <ArrowUpRight size={12} />
                  </button>
                )}

                {(selectedPost.status === 'failed' || selectedPost.status === 'partially_failed' || selectedPost.status === 'PARTIAL_SUCCESS') && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', fontSize: '0.76rem' }}
                    onClick={() => handleRetryPost(selectedPost.id)}
                    disabled={actionLoading}
                  >
                    <RotateCcw size={13} />
                    <span>Retry Publishing</span>
                  </button>
                )}

                {selectedPost.status !== 'published' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handlePublishNow(selectedPost.id)}
                    disabled={actionLoading}
                    style={{ fontSize: '0.76rem' }}
                  >
                    <Send size={13} />
                    <span>Publish Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* QUICK SCHEDULE MODAL */}
      {quickScheduleModal.open && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setQuickScheduleModal({ open: false, dateStr: '' })}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Schedule Post</h3>
                <p style={{ margin: '3px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Target date: <strong>{quickScheduleModal.dateStr}</strong> ({tzDetails.timeZone})
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setQuickScheduleModal({ open: false, dateStr: '' })}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Campaign / Post Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autumn Glow Drop Promo"
                  className="form-input"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  style={{ fontSize: '0.8rem', height: '32px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Post Copy
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write your social post content here..."
                  className="form-input"
                  value={quickContent}
                  onChange={(e) => setQuickContent(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Publish Time ({tzDetails.abbreviation})
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={quickTime}
                    onChange={(e) => setQuickTime(e.target.value)}
                    style={{ fontSize: '0.8rem', height: '32px' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Target Channels
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['instagram', 'x_twitter', 'linkedin', 'tiktok', 'facebook'].map((plat) => {
                      const isSelected = quickPlatforms.includes(plat);
                      return (
                        <button
                          key={plat}
                          type="button"
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: '0.7rem', textTransform: 'capitalize', padding: '3px 7px', gap: '4px' }}
                          onClick={() => {
                            if (isSelected) {
                              setQuickPlatforms(quickPlatforms.filter((p) => p !== plat));
                            } else {
                              setQuickPlatforms([...quickPlatforms, plat]);
                            }
                          }}
                        >
                          <PlatformIcon platform={plat} size={11} />
                          <span>{plat === 'x_twitter' || plat === 'twitter' ? 'X' : plat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {quickModalError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{quickModalError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setQuickScheduleModal({ open: false, dateStr: '' })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                  <CalendarIcon size={13} />
                  <span>{actionLoading ? 'Scheduling...' : 'Schedule on Date'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
