import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TooltipImageItem } from './TooltipParts/tooltipTypes';
import { removeUploadedImageEverywhere } from '../../lib/projectImageSync';

function normalizeStore(store?: string | null): string {
  if (!store) return 'HCM';
  const s = String(store).trim().toUpperCase();
  if (s.includes('HN') || s.includes('HÀ NỘI') || s.includes('HA NOI') || s.includes('HANOI')) return 'HN';
  if (s.includes('HCM') || s.includes('HỒ CHÍ MINH') || s.includes('HO CHI MINH') || s.includes('SAI GON') || s.includes('SG')) return 'HCM';
  return s === 'ALL' ? 'HCM' : s;
}

const legendImagesMemoryCache = new Map<string, Array<{ id: string; url: string; title?: string; createdAt?: string; store?: string }>>();

export function useColorLegendImages(canWrite: boolean = false) {
  const globalStoreFilter = useAppStore(state => state.globalStoreFilter);
  const globalLocationFilter = useAppStore(state => state.globalLocationFilter);

  const activeStore = useMemo(() => normalizeStore(globalStoreFilter), [globalStoreFilter]);
  const targetLoc = useMemo(() => {
    const loc = String(globalLocationFilter || '').trim();
    return loc && loc.toLowerCase() !== 'all' ? loc.toUpperCase() : 'L1';
  }, [globalLocationFilter]);

  const cleanCode = useMemo(() => `COLOR_LEGEND_${targetLoc}`, [targetLoc]);
  const storageKey = useMemo(() => `hcm_unit_images_${activeStore}_${cleanCode}`, [activeStore, cleanCode]);
  const docKey = useMemo(() => `${activeStore}_${cleanCode}`, [activeStore, cleanCode]);

  const [showImagePanel, setShowImagePanel] = useState(false);
  const [showAddLinkInput, setShowAddLinkInput] = useState(false);
  const [newLinkInput, setNewLinkInput] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title?: string; initialScale?: number } | null>(null);
  const [customImages, setCustomImages] = useState<Array<{ id: string; url: string; title?: string; createdAt?: string; store?: string }>>(() => {
    if (legendImagesMemoryCache.has(docKey)) {
      return legendImagesMemoryCache.get(docKey) || [];
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Load from localStorage immediately on store/floor switch (Zero Firestore)
  useEffect(() => {
    if (legendImagesMemoryCache.has(docKey)) {
      setCustomImages(legendImagesMemoryCache.get(docKey)!);
    } else {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const localList = parsed.filter(item => !item.store || normalizeStore(item.store) === activeStore);
            legendImagesMemoryCache.set(docKey, localList);
            setCustomImages(localList);
          } else {
            setCustomImages([]);
          }
        } else {
          setCustomImages([]);
        }
      } catch {
        setCustomImages([]);
      }
    }
  }, [storageKey, activeStore, cleanCode, docKey]);

  const handleAddCustomImage = (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    if (!canWrite) return;
    const targetUrl = (customUrl || newLinkInput).trim();
    if (!targetUrl) return;

    const newEntry = {
      id: `legend_img_${Date.now()}`,
      url: targetUrl,
      title: `Legend ${targetLoc} #${customImages.length + 1}`,
      createdAt: new Date().toISOString(),
      store: activeStore,
    };
    const updated = [newEntry, ...customImages];
    legendImagesMemoryCache.set(docKey, updated);
    setCustomImages(updated);
    setNewLinkInput('');
    setShowAddLinkInput(false);

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taka_unit_images_changed'));
    }
  };

  const handleDeleteCustomImage = (id: string, urlToDelete?: string) => {
    if (!canWrite) return;
    const targetUrl = urlToDelete || customImages.find((item) => item.id === id)?.url;
    const updated = customImages.filter((item) => item.id !== id && (urlToDelete ? item.url !== urlToDelete : true));
    legendImagesMemoryCache.set(docKey, updated);
    setCustomImages(updated);

    try {
      if (updated.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {}

    if (targetUrl) {
      removeUploadedImageEverywhere(targetUrl, undefined, cleanCode).catch((err) => {
        console.warn('[useColorLegendImages] removeUploadedImageEverywhere error:', err);
      });
    }
  };

  const handleCopyLink = (url: string) => {
    try {
      navigator.clipboard?.writeText(url);
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {}
  };

  const allLegendImages: TooltipImageItem[] = useMemo(() => {
    return customImages.map((c) => ({
      id: c.id,
      url: c.url,
      title: c.title || `Legend ${targetLoc}`,
      source: `${activeStore} • ${targetLoc}`,
      isCustom: true,
    }));
  }, [customImages, activeStore, targetLoc]);

  return {
    cleanCode,
    showImagePanel,
    setShowImagePanel,
    showAddLinkInput,
    setShowAddLinkInput,
    newLinkInput,
    setNewLinkInput,
    copiedLink,
    enlargedImage,
    setEnlargedImage,
    allLegendImages,
    handleAddCustomImage,
    handleDeleteCustomImage,
    handleCopyLink,
  };
}
