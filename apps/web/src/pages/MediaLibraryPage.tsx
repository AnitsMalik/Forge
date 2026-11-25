import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Image as ImageIcon,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  X,
  RefreshCw,
  Video as VideoIcon,
  Play,
  PenTool,
  FolderOpen,
  Tag,
  Star,
  Search,
  Send,
  Upload,
  LayoutGrid,
  List,
  Eye,
  HardDrive,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { CanvaStudioModal } from '../components/CanvaStudioModal.js';
import { ReelMotionStudioModal } from '../components/ReelMotionStudioModal.js';
import { ConfirmDialogModal } from '../components/superadmin/ConfirmDialogModal.js';
import './MediaLibraryPage.css';

const DEFAULT_FOLDERS = ['General', 'Product Launches', 'Promotions', 'Campaigns', 'Evergreen'];

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

interface MediaLibraryPageProps {
  onNavigate?: (tab: string, context?: any) => void;
}

export const MediaLibraryPage: React.FC<MediaLibraryPageProps> = ({ onNavigate }) => {
  const { activeBrand, brands, setActiveBrand } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'video'>('all');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCanvaStudioOpen, setIsCanvaStudioOpen] = useState(false);
  const [canvaPreloadData, setCanvaPreloadData] = useState<any | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // View Mode & Selection State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [storageSummary, setStorageSummary] = useState<any | null>(null);
  const [previewingAsset, setPreviewingAsset] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Bulk Action Modals State
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [bulkMoveFolder, setBulkMoveFolder] = useState('General');
  const [bulkCustomFolder, setBulkCustomFolder] = useState('');
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Organize / Edit Asset Modal State (Rename, Folder, Tags, Copy to Brand)
  const [organizingAsset, setOrganizingAsset] = useState<any | null>(null);
  const [organizeForm, setOrganizeForm] = useState({
    title: '',
    folder: 'General',
    customFolder: '',
    tagsInput: '',
    favorite: false,
    targetBrandId: '',
  });
  const [savingOrganize, setSavingOrganize] = useState(false);

  // Video Reel Studio State
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideoTemplate, setSelectedVideoTemplate] = useState('product_spotlight_reel');
  const [videoTitle, setVideoTitle] = useState('Discover the All-New Vitamin C Brightening Serum');
  const [videoSubtext, setVideoSubtext] = useState('Clinically proven radiance in 14 days. Tap link in bio.');
  const [videoDuration, setVideoDuration] = useState(6);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);

  // Studio Modal State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('quote_card_modern');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [templateFields, setTemplateFields] = useState({
    badge: 'EXCLUSIVE INSIGHT',
    headline: 'Scale Your Content Velocity with AI',
    subtext: 'Maintain brand consistency across Instagram, X, and LinkedIn with automated workflows.',
    quote: 'Consistency isn’t about being loud every day; it is about delivering unmistakable value repeatedly.',
    author: 'Sarah Connor',
    metric: '+340%',
    metricLabel: 'Social Engagement Rate',
    primaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    backgroundColor: '#0b0f19',
    brandName: activeBrand?.name || 'Luminary Glow',
    brandHandle: `@${activeBrand?.slug || 'luminaryglow'}`,
  });

  const [previewSvg, setPreviewSvg] = useState<string>('');
  const [rendering, setRendering] = useState(false);
  const [savingGraphic, setSavingGraphic] = useState(false);
  const [playingVideoAsset, setPlayingVideoAsset] = useState<any | null>(null);

  // Upload / Save Brand Image Modal State (supports local file upload + external URL + folder + tags)
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadForm, setUploadForm] = useState({
    fileName: '',
    title: '',
    publicUrl: '',
    mediaType: 'image',
    mimeType: 'image/jpeg',
    fileSizeBytes: 245000,
    folder: 'General',
    customFolder: '',
    tagsInput: '',
  });

  const showToastMsg = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3200);
  };

  // Lock background page scroll whenever any popup/modal is open
  const isAnyModalOpen =
    isStudioOpen ||
    isUploadOpen ||
    isVideoModalOpen ||
    isCanvaStudioOpen ||
    !!playingVideoAsset ||
    !!assetToDelete ||
    !!organizingAsset ||
    !!previewingAsset ||
    isBulkMoveModalOpen ||
    isBulkTagModalOpen ||
    isBulkDeleteModalOpen;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  const loadMedia = async () => {
    if (!activeBrand) return;
    try {
      setLoading(true);
      const filterType = activeFilter === 'all' ? undefined : activeFilter;
      const [mediaData, summaryData] = await Promise.all([
        api.media.list(activeBrand.id, filterType),
        api.media.getStorageSummary(activeBrand.id).catch(() => null),
      ]);
      setAssets(mediaData || []);
      if (summaryData) {
        setStorageSummary(summaryData);
      }
    } catch (err) {
      console.error('Failed to load media assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveFolder('all');
    setSearchQuery('');
    loadMedia();
  }, [activeBrand?.id, activeFilter]);

  // Compute dynamic folders for the active brand
  const brandFolders = React.useMemo(() => {
    const counts: Record<string, number> = {};
    DEFAULT_FOLDERS.forEach((f) => {
      counts[f] = 0;
    });
    assets.forEach((a) => {
      const f = a.folder || a.metadata?.folder || 'General';
      counts[f] = (counts[f] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [assets]);

  const favoriteCount = React.useMemo(
    () => assets.filter((a) => a.favorite || a.metadata?.favorite).length,
    [assets]
  );

  const filteredAssets = React.useMemo(() => {
    return assets.filter((a) => {
      const folder = a.folder || a.metadata?.folder || 'General';
      const isFav = Boolean(a.favorite || a.metadata?.favorite);
      const tags: string[] = Array.isArray(a.tags)
        ? a.tags
        : Array.isArray(a.metadata?.tags)
          ? a.metadata.tags
          : [];
      const title = a.title || a.metadata?.title || a.fileName || '';

      if (activeFolder === 'favorites' && !isFav) return false;
      if (activeFolder !== 'all' && activeFolder !== 'favorites' && folder.toLowerCase() !== activeFolder.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${title} ${a.fileName || ''} ${folder} ${tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, activeFolder, searchQuery]);

  // Update SVG preview whenever template parameters change
  const updatePreview = async () => {
    if (!activeBrand) return;
    try {
      setRendering(true);
      const result = await api.templates.render(activeBrand.id, {
        templateId: selectedTemplate,
        aspectRatio: selectedAspectRatio,
        ...templateFields,
        saveToMediaLibrary: false,
      });
      setPreviewSvg(result.svg);
    } catch (err) {
      console.error('Failed to update SVG preview:', err);
    } finally {
      setRendering(false);
    }
  };

  useEffect(() => {
    if (isStudioOpen && activeBrand) {
      updatePreview();
    }
  }, [isStudioOpen, selectedTemplate, selectedAspectRatio, templateFields, activeBrand]);

  const handleSaveGraphic = async () => {
    if (!activeBrand) return;
    try {
      setSavingGraphic(true);
      await api.templates.render(activeBrand.id, {
        templateId: selectedTemplate,
        aspectRatio: selectedAspectRatio,
        ...templateFields,
        saveToMediaLibrary: true,
      });
      await loadMedia();
      setIsStudioOpen(false);
      showToastMsg(`Saved graphic to ${activeBrand.name} library!`);
    } catch (err) {
      console.error('Failed to save rendered graphic:', err);
    } finally {
      setSavingGraphic(false);
    }
  };

  const handleLocalFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadForm((prev) => ({
        ...prev,
        fileName: file.name,
        title: prev.title || cleanTitle,
        publicUrl: base64Url,
        mediaType: file.type.startsWith('video/') ? 'video' : 'image',
        mimeType: file.type || 'image/jpeg',
        fileSizeBytes: file.size || 245000,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateExternalAsset = async (e: React.FormEvent, openInStudio: boolean = false) => {
    e.preventDefault();
    if (!activeBrand || !uploadForm.publicUrl) return;
    const finalFileName = uploadForm.fileName || uploadForm.title || `brand-image-${Date.now()}.jpg`;
    const finalTitle = uploadForm.title.trim() || finalFileName;
    const finalFolder =
      uploadForm.folder === '__custom__'
        ? uploadForm.customFolder.trim() || 'General'
        : uploadForm.folder || 'General';
    const parsedTags = uploadForm.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      setUploadingAsset(true);
      const created = await api.media.create(activeBrand.id, {
        fileName: finalFileName,
        title: finalTitle,
        folder: finalFolder,
        tags: parsedTags,
        publicUrl: uploadForm.publicUrl,
        thumbnailUrl: uploadForm.publicUrl,
        mediaType: uploadForm.mediaType,
        mimeType: uploadForm.mimeType,
        fileSizeBytes: uploadForm.fileSizeBytes || 245000,
        metadata: {
          title: finalTitle,
          folder: finalFolder,
          tags: parsedTags,
          source: uploadMode === 'file' ? 'local_upload' : 'external_upload',
        },
      });
      await loadMedia();
      setIsUploadOpen(false);
      setUploadForm({
        fileName: '',
        title: '',
        publicUrl: '',
        mediaType: 'image',
        mimeType: 'image/jpeg',
        fileSizeBytes: 245000,
        folder: 'General',
        customFolder: '',
        tagsInput: '',
      });
      showToastMsg(`Saved "${finalTitle}" to ${activeBrand.name} (${finalFolder})!`);

      if (openInStudio && onNavigate) {
        onNavigate('studio', {
          asset: created || {
            fileName: finalFileName,
            title: finalTitle,
            publicUrl: uploadForm.publicUrl,
            mediaType: uploadForm.mediaType,
          },
        });
      }
    } catch (err) {
      console.error('Failed to save brand asset:', err);
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleToggleFavorite = async (asset: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeBrand) return;
    const currentFav = Boolean(asset.favorite || asset.metadata?.favorite);
    const nextFav = !currentFav;
    try {
      const updated = await api.media.update(activeBrand.id, asset.id, { favorite: nextFav });
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? updated : a)));
      showToastMsg(nextFav ? 'Added to brand favorites ★' : 'Removed from favorites');
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleOpenOrganizeModal = (asset: any) => {
    const folder = asset.folder || asset.metadata?.folder || 'General';
    const tags: string[] = Array.isArray(asset.tags)
      ? asset.tags
      : Array.isArray(asset.metadata?.tags)
        ? asset.metadata.tags
        : [];
    const isKnownFolder = DEFAULT_FOLDERS.includes(folder) || brandFolders.some((bf) => bf.name === folder);
    setOrganizingAsset(asset);
    setOrganizeForm({
      title: asset.title || asset.metadata?.title || asset.fileName || '',
      folder: isKnownFolder ? folder : '__custom__',
      customFolder: isKnownFolder ? '' : folder,
      tagsInput: tags.join(', '),
      favorite: Boolean(asset.favorite || asset.metadata?.favorite),
      targetBrandId: '',
    });
  };

  const handleSaveOrganize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand || !organizingAsset) return;
    const resolvedFolder =
      organizeForm.folder === '__custom__'
        ? organizeForm.customFolder.trim() || 'General'
        : organizeForm.folder || 'General';
    const resolvedTags = organizeForm.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      setSavingOrganize(true);
      const updated = await api.media.update(activeBrand.id, organizingAsset.id, {
        title: organizeForm.title.trim() || organizingAsset.fileName,
        folder: resolvedFolder,
        tags: resolvedTags,
        favorite: organizeForm.favorite,
      });
      setAssets((prev) => prev.map((a) => (a.id === organizingAsset.id ? updated : a)));
      setOrganizingAsset(null);
      showToastMsg(`Updated "${updated.title}" in ${resolvedFolder}`);
    } catch (err) {
      console.error('Failed to update media organization:', err);
    } finally {
      setSavingOrganize(false);
    }
  };

  const handleDuplicateOrCopyAsset = async (asset: any, targetBrandId?: string) => {
    if (!activeBrand) return;
    try {
      const destBrandId = targetBrandId || activeBrand.id;
      const duplicated = await api.media.duplicate(activeBrand.id, asset.id, {
        targetBrandId: destBrandId,
      });
      if (destBrandId === activeBrand.id) {
        setAssets((prev) => [duplicated, ...prev]);
        showToastMsg(`Duplicated "${duplicated.title}" in ${activeBrand.name}`);
      } else {
        const targetBrandObj = brands.find((b) => b.id === destBrandId);
        showToastMsg(`Copied image to ${targetBrandObj?.name || 'selected brand'} library!`);
      }
      setOrganizingAsset(null);
    } catch (err) {
      console.error('Failed to duplicate asset:', err);
    }
  };

  const handleReuseInPost = async (asset: any) => {
    if (!activeBrand) return;
    try {
      await api.media.update(activeBrand.id, asset.id, { incrementUsage: true });
    } catch {
      // ignore usage counter failure
    }
    if (onNavigate) {
      onNavigate('studio', { asset });
    }
  };

  const handleEditInCanva = (asset: any) => {
    const meta = asset.metadata || {};
    let parsedLayers: any[] | undefined = undefined;
    const rawLayers = meta.editableLayers || meta.layers;
    if (rawLayers) {
      try {
        parsedLayers = typeof rawLayers === 'string' ? JSON.parse(rawLayers) : rawLayers;
      } catch {}
    }
    const savedBg = meta.editableBackground || meta.background;
    if (Array.isArray(parsedLayers) && parsedLayers.length > 0) {
      setCanvaPreloadData({
        aspectRatio: meta.aspectRatio || '1:1',
        background: savedBg || {
          type: 'gradient',
          value: 'linear-gradient(135deg, #312e81 0%, #4338ca 45%, #7c3aed 100%)',
          overlayOpacity: 0.2,
        },
        layers: parsedLayers,
      });
    } else {
      const imgUrl = asset.publicUrl || asset.thumbnailUrl;
      setCanvaPreloadData({
        aspectRatio: meta.aspectRatio || '1:1',
        background: {
          type: 'solid',
          value: '#0f172a',
          overlayOpacity: 0,
        },
        layers: imgUrl
          ? [
              {
                id: `layer-imported-${Date.now()}`,
                type: 'image',
                name: asset.title || meta.title || 'Imported Graphic',
                imageUrl: imgUrl,
                x: 50,
                y: 50,
                width: 92,
                height: 92,
                rotation: 0,
                opacity: 1,
                visible: true,
                borderRadius: 8,
                cropAspect: 'free',
              },
            ]
          : undefined,
      });
    }
    setIsCanvaStudioOpen(true);
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!activeBrand) return;
    setAssetToDelete(assetId);
  };

  const executeDeleteAsset = async () => {
    if (!activeBrand || !assetToDelete) return;
    const targetId = assetToDelete;
    setAssetToDelete(null);
    try {
      await api.media.delete(activeBrand.id, targetId);
      setAssets((prev) => prev.filter((a) => a.id !== targetId));
      showToastMsg('Removed asset from brand library.');
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelectAsset = (assetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map((a) => a.id));
    }
  };

  const handleBulkMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand || selectedAssetIds.length === 0) return;
    const finalFolder = bulkMoveFolder === '__custom__' ? bulkCustomFolder.trim() || 'General' : bulkMoveFolder;
    try {
      setIsProcessingBulk(true);
      await api.media.bulkUpdate(activeBrand.id, { assetIds: selectedAssetIds, folder: finalFolder });
      showToastMsg(`Moved ${selectedAssetIds.length} assets to ${finalFolder}`);
      setSelectedAssetIds([]);
      setIsBulkMoveModalOpen(false);
      await loadMedia();
    } catch (err) {
      console.error('Failed to bulk move assets:', err);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand || selectedAssetIds.length === 0) return;
    const tags = bulkTagInput.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length === 0) return;
    try {
      setIsProcessingBulk(true);
      await api.media.bulkUpdate(activeBrand.id, { assetIds: selectedAssetIds, addTags: tags });
      showToastMsg(`Added tags to ${selectedAssetIds.length} assets`);
      setSelectedAssetIds([]);
      setIsBulkTagModalOpen(false);
      setBulkTagInput('');
      await loadMedia();
    } catch (err) {
      console.error('Failed to bulk tag assets:', err);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkDeleteSubmit = async () => {
    if (!activeBrand || selectedAssetIds.length === 0) return;
    try {
      setIsProcessingBulk(true);
      await api.media.bulkDelete(activeBrand.id, selectedAssetIds);
      showToastMsg(`Deleted ${selectedAssetIds.length} assets from library`);
      setSelectedAssetIds([]);
      setIsBulkDeleteModalOpen(false);
      await loadMedia();
    } catch (err) {
      console.error('Failed to bulk delete assets:', err);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!activeBrand) return;

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    showToastMsg(`Uploading ${files.length} dropped file(s)...`);

    const assetsToUpload: any[] = [];
    for (const file of files) {
      const base64Url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      assetsToUpload.push({
        fileName: file.name,
        title: cleanTitle,
        publicUrl: base64Url,
        thumbnailUrl: base64Url,
        mediaType: file.type.startsWith('video/') ? 'video' : 'image',
        mimeType: file.type || 'image/jpeg',
        fileSizeBytes: file.size || 245000,
        folder: activeFolder !== 'all' && activeFolder !== 'favorites' ? activeFolder : 'General',
        tags: ['uploaded', 'drag-drop'],
      });
    }

    try {
      if (assetsToUpload.length === 1) {
        await api.media.create(activeBrand.id, assetsToUpload[0]);
      } else {
        await api.media.bulkUpload(activeBrand.id, assetsToUpload);
      }
      showToastMsg(`Successfully uploaded ${assetsToUpload.length} asset(s)!`);
      await loadMedia();
    } catch (err) {
      console.error('Failed to upload dropped files:', err);
      showToastMsg('Failed to upload dropped files');
    }
  };

  return (
    <div className="ml-container animate-fade-in">
      {statusToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9998,
            padding: '10px 18px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.95)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.84rem',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={16} />
          <span>{statusToast}</span>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 1. COMPACT PAGE HEADER                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="ml-header">
        <div className="ml-header-left">
          <div className="ml-brand-badge">
            {(activeBrand?.name || 'B').slice(0, 2).toUpperCase()}
          </div>

          <div className="ml-header-title">
            <h1>
              <span>Media Library</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 750,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: 'var(--accent-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={11} />
                {activeBrand?.name || 'Active Brand'}
              </span>
            </h1>

            <div className="ml-header-subtitle">
              {brands && brands.length > 1 && (
                <select
                  className="form-select"
                  value={activeBrand?.id || ''}
                  onChange={(e) => {
                    const found = brands.find((b) => b.id === e.target.value);
                    if (found) setActiveBrand(found);
                  }}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.74rem',
                    height: '24px',
                    width: 'auto',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                  title="Switch brand media library"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      Brand: {b.name}
                    </option>
                  ))}
                </select>
              )}

              <span>•</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 600 }}>
                {filteredAssets.length} of {assets.length} assets
              </span>
            </div>
          </div>
        </div>

        <div className="ml-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsVideoModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <VideoIcon size={14} color="var(--accent-secondary)" />
            <span>9:16 Reel Studio</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setCanvaPreloadData(null);
              setIsCanvaStudioOpen(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <PenTool size={14} color="#ec4899" />
            <span>Design Studio</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsUploadOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 750,
              background: 'var(--gradient-brand)',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
            }}
          >
            <Upload size={14} />
            <span>Upload Media</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* STORAGE USAGE & QUOTA WIDGET                                      */}
      {/* ----------------------------------------------------------------- */}
      {storageSummary && (
        <div className="ml-storage-banner">
          <div className="ml-storage-left">
            <div className="ml-storage-icon">
              <HardDrive size={20} />
            </div>
            <div className="ml-storage-info">
              <div className="ml-storage-header-row">
                <span>Storage Quota ({storageSummary.planName || 'Agency Pro'})</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatBytes(storageSummary.usedBytes)} of {formatBytes(storageSummary.limitBytes)} ({storageSummary.percentUsed}%)
                </span>
              </div>
              <div className="ml-storage-progress-bg">
                <div
                  className="ml-storage-progress-bar"
                  style={{ width: `${Math.min(100, Math.max(2, storageSummary.percentUsed))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="ml-storage-stats">
            <div className="ml-storage-stat-item">
              <ImageIcon size={14} color="var(--accent-primary)" />
              <span>{storageSummary.imagesCount} images</span>
            </div>
            <span style={{ opacity: 0.4 }}>•</span>
            <div className="ml-storage-stat-item">
              <VideoIcon size={14} color="#ec4899" />
              <span>{storageSummary.videosCount} reels/videos</span>
            </div>
            <span style={{ opacity: 0.4 }}>•</span>
            <div className="ml-storage-stat-item">
              <FolderOpen size={14} color="#10b981" />
              <span>{brandFolders.length} folders</span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. FILTER & SEARCH TOOLBAR                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="ml-toolbar">
        <div className="ml-toolbar-left">
          {/* Media type pills */}
          <div className="ml-filter-tabs">
            {(['all', 'image', 'video'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`ml-filter-tab ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === 'all' ? 'All Media' : filter === 'image' ? 'Images' : 'Videos'}
              </button>
            ))}
          </div>

          <span style={{ color: 'var(--border-medium)', margin: '0 2px' }}>|</span>

          {/* Folder pills */}
          <div className="ml-folder-pills">
            <button
              type="button"
              className={`ml-folder-pill ${activeFolder === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFolder('all')}
            >
              All Folders ({assets.length})
            </button>

            <button
              type="button"
              className={`ml-folder-pill ${activeFolder === 'favorites' ? 'active star' : ''}`}
              onClick={() => setActiveFolder('favorites')}
            >
              <Star size={11} fill={activeFolder === 'favorites' ? '#fbbf24' : 'none'} color="#fbbf24" />
              <span>Starred ({favoriteCount})</span>
            </button>

            {brandFolders.map((f) => (
              <button
                key={f.name}
                type="button"
                className={`ml-folder-pill ${activeFolder === f.name ? 'active' : ''}`}
                onClick={() => setActiveFolder(f.name)}
              >
                <span>{f.name}</span>
                <span style={{ opacity: 0.75 }}>({f.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ml-toolbar-right">
          <div className="ml-search-wrap">
            <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="ml-search-input"
              placeholder="Search assets or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <div className="ml-view-toggle">
            <button
              type="button"
              className={`ml-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`ml-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. MEDIA ASSETS GRID                                              */}
      {/* ----------------------------------------------------------------- */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={26} className="spin" style={{ margin: '0 auto 12px', color: 'var(--accent-primary)' }} />
          <p style={{ fontSize: '0.86rem', fontWeight: 600 }}>Loading {activeBrand?.name} media library...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-medium)',
            borderRadius: '14px',
            margin: '20px 0',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.12)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <ImageIcon size={24} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
            No media found in {activeFolder === 'all' ? 'library' : `"${activeFolder}"`}
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 18px', fontSize: '0.84rem' }}>
            Upload brand graphics, organize photos into campaigns, or design visual posters with AI.
          </p>
          <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsUploadOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={14} />
              <span>Upload Media</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setCanvaPreloadData(null);
                setIsCanvaStudioOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} color="var(--accent-primary)" />
              <span>AI Design Studio</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={isDragging ? 'ml-drop-zone-active' : undefined}
          style={{ minHeight: '300px' }}
        >
          {viewMode === 'grid' ? (
            <div className="ml-grid">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAssetIds.includes(asset.id);
                const meta = asset.metadata || {};
                const folderName = asset.folder || meta.folder || 'General';
                const tagsList: string[] = Array.isArray(asset.tags)
                  ? asset.tags
                  : Array.isArray(meta.tags)
                    ? meta.tags
                    : [];
                const isFav = Boolean(asset.favorite || meta.favorite);
                const displayTitle = asset.title || meta.title || asset.fileName;
                const usageCount = Number(asset.usageCount ?? meta.usageCount ?? 0);

                return (
                  <div
                    key={asset.id}
                    className="ml-card"
                    style={{
                      borderColor: isSelected ? 'var(--accent-primary)' : undefined,
                      boxShadow: isSelected ? '0 0 0 2px rgba(139, 92, 246, 0.4)' : undefined,
                    }}
                  >
                    {/* Visual Thumbnail */}
                    <div className="ml-thumb-stage">
                      {asset.mediaType === 'video' ? (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={() => setPlayingVideoAsset(asset)}
                        >
                          <img
                            src={asset.thumbnailUrl || asset.publicUrl}
                            alt={displayTitle}
                            className="ml-thumb-img"
                            style={{ opacity: 0.9 }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'rgba(236, 72, 153, 0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              boxShadow: '0 0 20px rgba(236, 72, 153, 0.6)',
                            }}
                          >
                            <Play size={16} fill="#ffffff" style={{ marginLeft: '2px' }} />
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                          onClick={() => setPreviewingAsset(asset)}
                          title="Click to preview asset"
                        >
                          <img
                            src={asset.thumbnailUrl || asset.publicUrl}
                            alt={displayTitle}
                            className="ml-thumb-img"
                          />
                        </div>
                      )}

                      {/* Top-left Select Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleSelectAsset(asset.id, e)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: isSelected ? 'var(--accent-primary)' : 'rgba(15, 23, 42, 0.8)',
                          backdropFilter: 'blur(4px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#ffffff',
                          zIndex: 2,
                          transition: 'all 0.15s ease',
                        }}
                        title={isSelected ? 'Deselect' : 'Select asset'}
                      >
                        {isSelected ? (
                          <Check size={14} />
                        ) : (
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              border: '1.5px solid rgba(255,255,255,0.7)',
                              borderRadius: '2px',
                            }}
                          />
                        )}
                      </button>

                      {/* Top-left Badges */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '38px',
                          display: 'flex',
                          gap: '4px',
                          flexWrap: 'wrap',
                          zIndex: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 750,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            backdropFilter: 'blur(4px)',
                            color: '#ffffff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                          }}
                        >
                          {meta.aspectRatio || '1:1'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            backdropFilter: 'blur(4px)',
                            color: '#e2e8f0',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                          }}
                        >
                          📁 {folderName}
                        </span>
                      </div>

                      {/* Top-right Star Favorite */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(asset, e)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'rgba(15, 23, 42, 0.8)',
                          backdropFilter: 'blur(4px)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: isFav ? '#fbbf24' : '#94a3b8',
                          transition: 'all 0.15s ease',
                          zIndex: 2,
                        }}
                        title={isFav ? 'Starred in brand library' : 'Star asset'}
                      >
                        <Star size={12} fill={isFav ? '#fbbf24' : 'none'} />
                      </button>
                    </div>

                    {/* Card Meta & Details */}
                    <div className="ml-card-meta">
                      <div
                        className="ml-card-title"
                        title={displayTitle}
                        style={{ cursor: 'pointer' }}
                        onClick={() => (asset.mediaType === 'video' ? setPlayingVideoAsset(asset) : setPreviewingAsset(asset))}
                      >
                        {displayTitle}
                      </div>

                      <div className="ml-card-info-row">
                        <span>{formatBytes(asset.fileSizeBytes)}</span>
                        {usageCount > 0 ? (
                          <span style={{ color: '#10b981', fontWeight: 700 }}>Reused {usageCount}×</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Ready</span>
                        )}
                      </div>

                      {tagsList.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {tagsList.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              style={{
                                fontSize: '0.62rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: 'var(--accent-primary)',
                                fontWeight: 600,
                              }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div className="ml-card-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleReuseInPost(asset)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                          title="Use in Content Studio post composer"
                        >
                          <Send size={12} />
                          <span>Use in Post</span>
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => (asset.mediaType === 'video' ? setPlayingVideoAsset(asset) : setPreviewingAsset(asset))}
                            style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}
                            title="Preview asset details"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenOrganizeModal(asset)}
                            style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}
                            title="Organize: Folder & Tags"
                          >
                            <FolderOpen size={13} />
                          </button>

                          {asset.mediaType === 'image' && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleEditInCanva(asset)}
                              style={{ padding: '4px 6px', color: '#ec4899' }}
                              title="Edit in Design Studio"
                            >
                              <PenTool size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleCopyUrl(asset.id, asset.publicUrl)}
                            style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}
                            title="Copy Image URL"
                          >
                            {copiedId === asset.id ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-rose)',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              opacity: 0.8,
                            }}
                            title="Delete asset"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="ml-list-container">
              <table className="ml-list-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredAssets.length > 0 && selectedAssetIds.length === filteredAssets.length}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer' }}
                        title="Select All"
                      />
                    </th>
                    <th>Asset</th>
                    <th>Folder</th>
                    <th>Type / Aspect</th>
                    <th>Size</th>
                    <th>Reused</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedAssetIds.includes(asset.id);
                    const meta = asset.metadata || {};
                    const folderName = asset.folder || meta.folder || 'General';
                    const isFav = Boolean(asset.favorite || meta.favorite);
                    const displayTitle = asset.title || meta.title || asset.fileName;
                    const usageCount = Number(asset.usageCount ?? meta.usageCount ?? 0);

                    return (
                      <tr key={asset.id} style={{ background: isSelected ? 'rgba(139, 92, 246, 0.08)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectAsset(asset.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <div
                            className="ml-list-asset-cell"
                            onClick={() => (asset.mediaType === 'video' ? setPlayingVideoAsset(asset) : setPreviewingAsset(asset))}
                          >
                            <img
                              src={asset.thumbnailUrl || asset.publicUrl}
                              alt={displayTitle}
                              className="ml-list-thumb"
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{displayTitle}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{asset.fileName}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            📁 {folderName}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>
                            {asset.mediaType === 'video' ? '🎬 9:16 Reel' : `🖼️ ${meta.aspectRatio || '1:1'}`}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {formatBytes(asset.fileSizeBytes)}
                        </td>
                        <td>
                          {usageCount > 0 ? (
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>{usageCount}×</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleToggleFavorite(asset)}
                              style={{ padding: '4px', color: isFav ? '#fbbf24' : 'var(--text-secondary)' }}
                              title={isFav ? 'Starred' : 'Star'}
                            >
                              <Star size={13} fill={isFav ? '#fbbf24' : 'none'} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => (asset.mediaType === 'video' ? setPlayingVideoAsset(asset) : setPreviewingAsset(asset))}
                              style={{ padding: '4px', color: 'var(--text-secondary)' }}
                              title="Preview details"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleReuseInPost(asset)}
                              style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700 }}
                              title="Use in Post"
                            >
                              <Send size={11} style={{ marginRight: '4px' }} /> Post
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenOrganizeModal(asset)}
                              style={{ padding: '4px', color: 'var(--text-secondary)' }}
                              title="Organize"
                            >
                              <FolderOpen size={13} />
                            </button>
                            {asset.mediaType === 'image' && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleEditInCanva(asset)}
                                style={{ padding: '4px', color: '#ec4899' }}
                                title="Edit in Design Studio"
                              >
                                <PenTool size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(asset.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent-rose)',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Brand Graphic Studio Modal (Compact, Zero Scroll) */}
      {/* ========================================================================= */}
      {isStudioOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsStudioOpen(false)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '780px',
              padding: 0,
            }}
          >
            {/* Compact Header */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-surface-elevated)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Brand Graphic Studio</span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsStudioOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Compact Two-Column Body (No Scroll) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px 18px' }}>
              {/* Left Column: Form Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Template Selection */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Template
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                    {[
                      { id: 'quote_card_modern', label: 'Quote Card' },
                      { id: 'stat_highlight', label: 'KPI Highlight' },
                      { id: 'announcement_banner', label: 'Announcement' },
                      { id: 'tip_carousel_cover', label: 'Tips & Insights' },
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tpl.id)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: selectedTemplate === tpl.id ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-surface)',
                          color: selectedTemplate === tpl.id ? '#ffffff' : 'var(--text-secondary)',
                          border: selectedTemplate === tpl.id ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Selection */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Format Ratio
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                    {['1:1', '4:5', '1.91:1', '9:16'].map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setSelectedAspectRatio(ratio)}
                        style={{
                          padding: '5px 4px',
                          borderRadius: '6px',
                          background: selectedAspectRatio === ratio ? 'rgba(236, 72, 153, 0.2)' : 'var(--bg-surface)',
                          color: selectedAspectRatio === ratio ? '#ffffff' : 'var(--text-secondary)',
                          border: selectedAspectRatio === ratio ? '1px solid var(--accent-secondary)' : '1px solid var(--border-subtle)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Content Inputs */}
                {selectedTemplate === 'quote_card_modern' && (
                  <>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Quote</div>
                      <textarea
                        className="form-input"
                        rows={2}
                        style={{ padding: '7px 10px', fontSize: '0.8rem' }}
                        value={templateFields.quote}
                        onChange={(e) => setTemplateFields({ ...templateFields, quote: e.target.value })}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Author</div>
                      <input
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                        value={templateFields.author}
                        onChange={(e) => setTemplateFields({ ...templateFields, author: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {selectedTemplate === 'stat_highlight' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Metric</div>
                        <input
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                          placeholder="+340%"
                          value={templateFields.metric}
                          onChange={(e) => setTemplateFields({ ...templateFields, metric: e.target.value })}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Label</div>
                        <input
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                          value={templateFields.metricLabel}
                          onChange={(e) => setTemplateFields({ ...templateFields, metricLabel: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Context</div>
                      <input
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                        value={templateFields.subtext}
                        onChange={(e) => setTemplateFields({ ...templateFields, subtext: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {(selectedTemplate === 'announcement_banner' || selectedTemplate === 'tip_carousel_cover') && (
                  <>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Headline</div>
                      <input
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                        value={templateFields.headline}
                        onChange={(e) => setTemplateFields({ ...templateFields, headline: e.target.value })}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Subtext</div>
                      <textarea
                        className="form-input"
                        rows={2}
                        style={{ padding: '7px 10px', fontSize: '0.8rem' }}
                        value={templateFields.subtext}
                        onChange={(e) => setTemplateFields({ ...templateFields, subtext: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* Colors Customization */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Primary</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={templateFields.primaryColor}
                        onChange={(e) => setTemplateFields({ ...templateFields, primaryColor: e.target.value })}
                        style={{ border: 'none', width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer' }}
                      />
                      <input
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', height: '28px' }}
                        value={templateFields.primaryColor}
                        onChange={(e) => setTemplateFields({ ...templateFields, primaryColor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Accent</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={templateFields.accentColor}
                        onChange={(e) => setTemplateFields({ ...templateFields, accentColor: e.target.value })}
                        style={{ border: 'none', width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer' }}
                      />
                      <input
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', height: '28px' }}
                        value={templateFields.accentColor}
                        onChange={(e) => setTemplateFields({ ...templateFields, accentColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Compact Live SVG Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    height: '290px',
                    background: 'var(--bg-canvas, #070a12)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {rendering && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                      }}
                    >
                      <RefreshCw size={20} className="spin" color="var(--accent-primary)" />
                    </div>
                  )}

                  {previewSvg ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: previewSvg }}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Rendering preview...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Footer */}
            <div
              style={{
                padding: '10px 18px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                background: 'var(--bg-surface-elevated)',
              }}
            >
              <button className="btn btn-secondary btn-sm" onClick={() => setIsStudioOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveGraphic} disabled={savingGraphic}>
                {savingGraphic ? 'Saving...' : 'Save to Library'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* Upload / Save Brand Image Modal (Compact, Zero Scroll) */}
      {/* ========================================================================= */}
      {isUploadOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsUploadOpen(false)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '16px 18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Upload size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Save Image to {activeBrand?.name}
                </span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsUploadOpen(false)}
                title="Close"
              >
                <X size={17} />
              </button>
            </div>

            {/* Source Mode Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
              <button
                type="button"
                className={`btn btn-sm ${uploadMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setUploadMode('file')}
                style={{ fontSize: '0.75rem', padding: '5px 8px' }}
              >
                Upload from Computer
              </button>
              <button
                type="button"
                className={`btn btn-sm ${uploadMode === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setUploadMode('url')}
                style={{ fontSize: '0.75rem', padding: '5px 8px' }}
              >
                External Image URL
              </button>
            </div>

            <form onSubmit={handleCreateExternalAsset} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {uploadMode === 'file' ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={handleLocalFileChosen}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px dashed rgba(139, 92, 246, 0.45)',
                      background: 'rgba(139, 92, 246, 0.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {uploadForm.fileName ? `✓ ${uploadForm.fileName}` : 'Click to choose an image file...'}
                    </div>
                    <span className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                      Browse
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Image URL</div>
                  <input
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    placeholder="https://images.unsplash.com/..."
                    required
                    value={uploadForm.publicUrl}
                    onChange={(e) => setUploadForm({ ...uploadForm, publicUrl: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Title</div>
                  <input
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    placeholder="Spring Promo Poster"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value, fileName: uploadForm.fileName || `${e.target.value}.jpg` })}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Brand Folder</div>
                  <select
                    className="form-select"
                    style={{ padding: '5px 8px', fontSize: '0.8rem', height: '32px' }}
                    value={uploadForm.folder}
                    onChange={(e) => setUploadForm({ ...uploadForm, folder: e.target.value })}
                  >
                    {brandFolders.map((bf) => (
                      <option key={bf.name} value={bf.name}>{bf.name}</option>
                    ))}
                    <option value="__custom__">+ New Folder...</option>
                  </select>
                </div>
              </div>

              {uploadForm.folder === '__custom__' && (
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>New Folder Name</div>
                  <input
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    placeholder="e.g. Q4 Holiday Ads"
                    required
                    value={uploadForm.customFolder}
                    onChange={(e) => setUploadForm({ ...uploadForm, customFolder: e.target.value })}
                  />
                </div>
              )}

              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Tags (comma-separated)</div>
                <input
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                  placeholder="launch, facebook, product"
                  value={uploadForm.tagsInput}
                  onChange={(e) => setUploadForm({ ...uploadForm, tagsInput: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-secondary btn-sm" disabled={uploadingAsset || !uploadForm.publicUrl}>
                  {uploadingAsset ? 'Saving...' : `Save to Library`}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={uploadingAsset || !uploadForm.publicUrl}
                  onClick={(e) => handleCreateExternalAsset(e, true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 750,
                  }}
                  title="Save media and immediately open in Content Studio to add text and publish"
                >
                  <Send size={12} />
                  <span>Save &amp; Create Post</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* Organize Brand Image Modal: Folder, Tags, Rename & Copy (Compact, Zero Scroll) */}
      {/* ========================================================================= */}
      {organizingAsset && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setOrganizingAsset(null)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              padding: '16px 18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <FolderOpen size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Organize Brand Image ({activeBrand?.name})
                </span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setOrganizingAsset(null)}
                title="Close"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveOrganize} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Image Title</div>
                <input
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                  value={organizeForm.title}
                  onChange={(e) => setOrganizeForm({ ...organizeForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Folder in {activeBrand?.name}</div>
                  <select
                    className="form-select"
                    style={{ padding: '5px 8px', fontSize: '0.8rem', height: '32px' }}
                    value={organizeForm.folder}
                    onChange={(e) => setOrganizeForm({ ...organizeForm, folder: e.target.value })}
                  >
                    {brandFolders.map((bf) => (
                      <option key={bf.name} value={bf.name}>{bf.name}</option>
                    ))}
                    <option value="__custom__">+ New Folder...</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setOrganizeForm((prev) => ({ ...prev, favorite: !prev.favorite }))}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: organizeForm.favorite ? '#fbbf24' : 'var(--text-secondary)',
                  }}
                >
                  <Star size={13} fill={organizeForm.favorite ? '#fbbf24' : 'none'} color="#fbbf24" />
                  <span>{organizeForm.favorite ? 'Starred' : 'Star'}</span>
                </button>
              </div>

              {organizeForm.folder === '__custom__' && (
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>New Folder Name</div>
                  <input
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                    placeholder="e.g. Summer Launch"
                    value={organizeForm.customFolder}
                    onChange={(e) => setOrganizeForm({ ...organizeForm, customFolder: e.target.value })}
                    required
                  />
                </div>
              )}

              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Tags (comma-separated)</div>
                <input
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                  placeholder="product, promo, evergreen"
                  value={organizeForm.tagsInput}
                  onChange={(e) => setOrganizeForm({ ...organizeForm, tagsInput: e.target.value })}
                />
              </div>

              {/* Quick Duplicate / Copy to Another Brand */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDuplicateOrCopyAsset(organizingAsset)}
                  style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Copy size={12} />
                  <span>Duplicate</span>
                </button>

                {brands && brands.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <select
                      className="form-select"
                      style={{ padding: '3px 6px', fontSize: '0.72rem', height: '26px', width: 'auto' }}
                      value={organizeForm.targetBrandId}
                      onChange={(e) => setOrganizeForm({ ...organizeForm, targetBrandId: e.target.value })}
                    >
                      <option value="">Copy to brand...</option>
                      {brands
                        .filter((b) => b.id !== activeBrand?.id)
                        .map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                    {organizeForm.targetBrandId && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                        onClick={() => handleDuplicateOrCopyAsset(organizingAsset, organizeForm.targetBrandId)}
                      >
                        Copy
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOrganizingAsset(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingOrganize}>
                  {savingOrganize ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 9:16 Video & Reel Motion Studio Modal */}
      <ReelMotionStudioModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        initialText={videoTitle ? `${videoTitle}. ${videoSubtext}` : undefined}
        onSaveToLibrary={async () => {
          await loadMedia();
        }}
      />

      {/* Canva-like Visual Design Studio Modal */}
      <CanvaStudioModal
        isOpen={isCanvaStudioOpen}
        onClose={() => setIsCanvaStudioOpen(false)}
        initialLayers={canvaPreloadData?.layers}
        initialBackground={canvaPreloadData?.background}
        initialAspectRatio={canvaPreloadData?.aspectRatio}
        onSaveToLibrary={async () => {
          await loadMedia();
        }}
      />

      {/* Compact Video Playback Modal (Zero Scroll) */}
      {playingVideoAsset && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setPlayingVideoAsset(null)}
        >
          <div
            className="modal-dialog"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '16px 18px',
              display: 'grid',
              gridTemplateColumns: '200px 1fr',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Compact 9:16 Video Player */}
            <div
              style={{
                width: '200px',
                height: '356px',
                borderRadius: '14px',
                background: '#000000',
                overflow: 'hidden',
                border: '2px solid var(--border-medium)',
              }}
            >
              <video
                src={playingVideoAsset.publicUrl}
                controls
                autoPlay
                loop
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Concise Video Details & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <span className="badge badge-pink" style={{ fontSize: '0.62rem', marginBottom: '6px' }}>9:16 Reel</span>
                    <h4 style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {playingVideoAsset.fileName}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setPlayingVideoAsset(null)}
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Essential Metadata Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Format</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>1080 × 1920</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Duration</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {playingVideoAsset.metadata?.durationSec || 8}s
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Size</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {((playingVideoAsset.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={playingVideoAsset.publicUrl}
                  download={playingVideoAsset.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <Download size={13} /> Download MP4
                </a>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopyUrl(playingVideoAsset.id, playingVideoAsset.publicUrl)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  {copiedId === playingVideoAsset.id ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                  <span>{copiedId === playingVideoAsset.id ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Single Delete Confirmation Modal */}
      <ConfirmDialogModal
        isOpen={!!assetToDelete}
        title="Delete Media Asset"
        description="Permanently delete this media asset from your brand library?"
        confirmText="Delete"
        variant="danger"
        onConfirm={executeDeleteAsset}
        onCancel={() => setAssetToDelete(null)}
      />

      {/* Floating Bulk Actions Bar */}
      {selectedAssetIds.length > 0 && (
        <div className="ml-bulk-bar">
          <div className="ml-bulk-count">
            <CheckSquare size={16} color="var(--accent-primary)" />
            <span>
              {selectedAssetIds.length} asset{selectedAssetIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="ml-bulk-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsBulkMoveModalOpen(true)}
              style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FolderOpen size={13} />
              <span>Move to Folder</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsBulkTagModalOpen(true)}
              style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Tag size={13} />
              <span>Add Tags</span>
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent-rose)', color: '#ffffff' }}
            >
              <Trash2 size={13} />
              <span>Delete ({selectedAssetIds.length})</span>
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedAssetIds([])}
              style={{ fontSize: '0.78rem', padding: '4px 8px', color: '#cbd5e1' }}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Move Modal */}
      {isBulkMoveModalOpen && createPortal(
        <div className="modal-backdrop" onClick={() => setIsBulkMoveModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '380px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.9rem' }}>
                <FolderOpen size={16} color="var(--accent-primary)" />
                <span>Move {selectedAssetIds.length} Assets</span>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsBulkMoveModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBulkMoveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Folder</label>
                <select
                  className="form-select"
                  value={bulkMoveFolder}
                  onChange={(e) => setBulkMoveFolder(e.target.value)}
                  style={{ width: '100%', height: '34px', fontSize: '0.82rem' }}
                >
                  {brandFolders.map((bf) => (
                    <option key={bf.name} value={bf.name}>{bf.name}</option>
                  ))}
                  <option value="__custom__">+ Create New Folder...</option>
                </select>
              </div>

              {bulkMoveFolder === '__custom__' && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>New Folder Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Autumn Spotlight"
                    value={bulkCustomFolder}
                    onChange={(e) => setBulkCustomFolder(e.target.value)}
                    required
                    style={{ width: '100%', height: '34px', fontSize: '0.82rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsBulkMoveModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isProcessingBulk}>
                  {isProcessingBulk ? 'Moving...' : 'Move Assets'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Tag Modal */}
      {isBulkTagModalOpen && createPortal(
        <div className="modal-backdrop" onClick={() => setIsBulkTagModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '380px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.9rem' }}>
                <Tag size={16} color="var(--accent-primary)" />
                <span>Add Tags to {selectedAssetIds.length} Assets</span>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsBulkTagModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBulkTagSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tags (comma-separated)</label>
                <input
                  className="form-input"
                  placeholder="e.g. promo, summer2026, hero"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  required
                  style={{ width: '100%', height: '34px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsBulkTagModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isProcessingBulk}>
                  {isProcessingBulk ? 'Applying...' : 'Apply Tags'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Delete Confirm Modal */}
      <ConfirmDialogModal
        isOpen={isBulkDeleteModalOpen}
        title={`Delete ${selectedAssetIds.length} Assets`}
        description={`Are you sure you want to delete ${selectedAssetIds.length} selected asset(s) from your brand library? This action cannot be undone.`}
        confirmText={isProcessingBulk ? 'Deleting...' : 'Delete Selected'}
        variant="danger"
        onConfirm={handleBulkDeleteSubmit}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />

      {/* Full Asset Preview Modal */}
      {previewingAsset && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setPreviewingAsset(null)}
        >
          <div
            className="modal-dialog"
            style={{
              width: '100%',
              maxWidth: '820px',
              padding: '18px 22px',
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(260px, 1fr)',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Visual stage */}
            <div
              style={{
                borderRadius: '12px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-medium)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '340px',
                maxHeight: '440px',
              }}
            >
              <img
                src={previewingAsset.publicUrl || previewingAsset.thumbnailUrl}
                alt={previewingAsset.title || previewingAsset.fileName}
                style={{ maxWidth: '100%', maxHeight: '440px', objectFit: 'contain' }}
              />
            </div>

            {/* Sidebar Details */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.66rem' }}>
                        {previewingAsset.mediaType?.toUpperCase() || 'IMAGE'}
                      </span>
                      {previewingAsset.metadata?.isDuplicate && (
                        <span className="badge badge-pink" style={{ fontSize: '0.66rem' }}>
                          Duplicate Detected
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>
                      {previewingAsset.title || previewingAsset.metadata?.title || previewingAsset.fileName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setPreviewingAsset(null)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Folder</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>📁 {previewingAsset.folder || previewingAsset.metadata?.folder || 'General'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Aspect Ratio</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{previewingAsset.metadata?.aspectRatio || '1:1'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>File Size</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{formatBytes(previewingAsset.fileSizeBytes)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>MIME Type</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{previewingAsset.mimeType || 'image/jpeg'}</div>
                  </div>
                </div>

                {previewingAsset.metadata?.checksumSha256 && (
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>SHA-256 Checksum</div>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--accent-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {previewingAsset.metadata.checksumSha256}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const a = previewingAsset;
                      setPreviewingAsset(null);
                      handleReuseInPost(a);
                    }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 750 }}
                  >
                    <Send size={14} />
                    <span>Use in Post</span>
                  </button>

                  {previewingAsset.mediaType === 'image' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const a = previewingAsset;
                        setPreviewingAsset(null);
                        handleEditInCanva(a);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <PenTool size={14} color="#ec4899" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={previewingAsset.publicUrl}
                    download={previewingAsset.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    <Download size={13} /> Download
                  </a>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopyUrl(previewingAsset.id, previewingAsset.publicUrl)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    {copiedId === previewingAsset.id ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                    <span>{copiedId === previewingAsset.id ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
