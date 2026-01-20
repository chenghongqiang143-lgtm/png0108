
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PhotoModal } from './components/PhotoModal';
import { ColorTool } from './components/ColorTool';
import { NoteTool } from './components/NoteTool';
import { Photo, Category, ThemeColor, ColorGroup } from './types';
import { Search, Upload, ImagePlus, Menu, Edit2, Trash2, LayoutGrid, Grid3x3, Square, Folder, ChevronRight, Image as ImageIcon, Check, Loader2, Clock, X, CheckSquare, MousePointer2, Move, Tag, FolderInput, FileImage, HardDrive, Plus, FolderPlus, AlertTriangle, Database, Copy, Download, UploadCloud } from 'lucide-react';
import { saveImageToDB, getImageFromDB, deleteImageFromDB, saveThumbnailToDB, getThumbnailFromDB } from './services/imageDB';

// Initial Dummy Data
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: '旅行', icon: 'plane', slug: 'travel' },
  { id: 'cat-2', name: '家人', icon: 'users', slug: 'family' },
  { id: 'cat-3', name: '工作', icon: 'briefcase', slug: 'work' },
  { id: 'cat-4', name: '美食', icon: 'coffee', slug: 'food' },
  { id: 'cat-5', name: '自然', icon: 'tree', slug: 'nature' },
  { id: 'uncategorized', name: '未分类', icon: 'folder', slug: 'uncategorized' },
];

const INITIAL_PHOTOS: Photo[] = [
  {
    id: 'p1',
    url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    title: '阿尔卑斯山',
    description: '去年冬天的滑雪之旅，风景太美了。',
    tags: ['风景', '雪山', '旅行'],
    categoryId: 'cat-1',
    createdAt: Date.now() - 10000000,
    isFavorite: true
  },
  {
    id: 'p2',
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    title: '咖啡时光',
    description: '周末下午的闲暇时光，一杯拿铁。',
    tags: ['咖啡', '生活'],
    categoryId: 'cat-4',
    createdAt: Date.now() - 5000000
  },
  {
    id: 'p3',
    url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    title: '晨曦',
    description: '清晨的第一缕阳光。',
    tags: ['风景', '自然'],
    categoryId: 'cat-5',
    createdAt: Date.now() - 2000000
  },
  {
    id: 'p4',
    url: 'https://images.unsplash.com/photo-1470252649378-9c2974247fa2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    title: '湖畔',
    description: '静谧的湖面倒影。',
    tags: ['风景', '自然'],
    categoryId: 'cat-5',
    createdAt: Date.now() - 3000000
  },
  {
    id: 'p5',
    url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    title: '精致晚餐',
    description: '周五晚上的大餐。',
    tags: ['美食', '晚餐'],
    categoryId: 'cat-4',
    createdAt: Date.now() - 86400000 * 2 // 2 days ago
  },
  {
    id: 'p6',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    title: '森林小径',
    description: '徒步发现的隐秘路径。',
    tags: ['自然', '徒步'],
    categoryId: 'cat-5',
    createdAt: Date.now() - 86400000 * 5 // 5 days ago
  }
];

const DEFAULT_COLOR_GROUPS: ColorGroup[] = [
  {
    id: 'favorites',
    name: '我的收藏',
    colors: [],
    isCustom: false
  },
  {
    id: 'skin',
    name: '常用肤色',
    colors: [
      { id: 's1', name: '杏仁白', hex: '#FFDFC4' }, { id: 's2', name: '米色', hex: '#F0D5BE' },
      { id: 's3', name: '浅肉色', hex: '#EECEB3' }, { id: 's4', name: '肉粉', hex: '#E1B899' },
      { id: 's5', name: '麦色', hex: '#E5C298' }
    ]
  },
  {
    id: 'manga',
    name: '黑白漫画',
    colors: [
      { id: 'mg1', name: '墨黑', hex: '#0F0F0F' }, { id: 'mg2', name: '线条黑', hex: '#1A1A1A' },
      { id: 'mg3', name: '阴影灰', hex: '#808080' }, { id: 'mg4', name: '网点灰', hex: '#D3D3D3' },
      { id: 'mg5', name: '稿纸白', hex: '#F5F5F5' }, { id: 'mg6', name: '高光白', hex: '#FFFFFF' }
    ]
  },
  {
    id: 'morandi',
    name: '莫兰迪色系',
    colors: [
      { id: 'm1', name: '雾霾蓝', hex: '#93A2BA' }, { id: 'm2', name: '干枯玫瑰', hex: '#C099A0' },
      { id: 'm3', name: '燕麦色', hex: '#D1CBC1' }, { id: 'm4', name: '豆沙绿', hex: '#9EAA96' },
      { id: 'm5', name: '烟灰粉', hex: '#D8B8B0' }, { id: 'm6', name: '静谧灰', hex: '#A8A6A2' }
    ]
  },
  {
    id: 'retro',
    name: '复古电影',
    colors: [
      { id: 'r1', name: '胶片黄', hex: '#E3C176' }, { id: 'r2', name: '复古红', hex: '#8B3A3A' },
      { id: 'r3', name: '午夜蓝', hex: '#191970' }, { id: 'r4', name: '森林绿', hex: '#228B22' },
      { id: 'r5', name: '怀旧褐', hex: '#A0522D' }, { id: 'r6', name: '暖白', hex: '#FDF5E6' }
    ]
  },
  {
    id: 'china',
    name: '中国传统色',
    colors: [
      { id: 'c1', name: '朱砂', hex: '#ff461f' }, { id: 'c2', name: '天青', hex: '#b5cefc' },
      { id: 'c3', name: '竹青', hex: '#789262' }, { id: 'c4', name: '鹅黄', hex: '#fff143' },
      { id: 'c5', name: '黛蓝', hex: '#415065' }, { id: 'c6', name: '胭脂', hex: '#9d2933' }
    ]
  },
  {
    id: 'basic',
    name: '基础色',
    colors: [
      { id: 'b1', name: '红色', hex: '#EF4444' }, { id: 'b2', name: '橙色', hex: '#F97316' },
      { id: 'b3', name: '黄色', hex: '#EAB308' }, { id: 'b4', name: '绿色', hex: '#22C55E' },
      { id: 'b5', name: '蓝色', hex: '#3B82F6' }, { id: 'b6', name: '黑色', hex: '#000000' }
    ]
  }
];

// Helper to Group Photos by Date
const groupPhotosByDate = (photos: Photo[]) => {
  const groups: Record<string, Photo[]> = {};
  
  photos.forEach(photo => {
    const date = new Date(photo.createdAt);
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(photo);
  });

  return Object.entries(groups).sort((a, b) => {
    // Pick the first photo of each group to compare timestamps (descending)
    return b[1][0].createdAt - a[1][0].createdAt;
  });
};

// Thumbnail Generator Helper
const generateThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    // Safety timeout to prevent hanging on corrupted images
    const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(file); // Fallback to original
    }, 3000);

    img.onload = () => {
      clearTimeout(timeout);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const MAX_SIZE = 320; // 320px thumbnail
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
                resolve(blob);
            } else {
                resolve(file); // Fallback if toBlob fails
            }
          }, 'image/jpeg', 0.7);
      } else {
          URL.revokeObjectURL(url);
          resolve(file); // Fallback to original
      }
    };
    img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve(file);
    };
  });
};

const ALL_THEME_COLORS: ThemeColor[] = [
    'zinc', 'blue', 'indigo', 'rose', 'orange', 'emerald', 
    'cyan', 'violet', 'fuchsia', 'lime', 'amber', 'teal', 'sky'
];

// Map theme colors to Hex values for proper rendering
const THEME_COLORS_MAP: Record<ThemeColor, string> = {
    'zinc': '#52525b',
    'blue': '#2563eb',
    'indigo': '#4f46e5',
    'rose': '#e11d48',
    'orange': '#ea580c',
    'emerald': '#059669',
    'cyan': '#0891b2',
    'violet': '#7c3aed',
    'fuchsia': '#c026d3',
    'lime': '#65a30d',
    'amber': '#d97706',
    'teal': '#0d9488',
    'sky': '#0284c7'
};

const App: React.FC = () => {
  // --- States ---
  const [isLoading, setIsLoading] = useState(false); // Changed default to false for instant load
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCount, setProcessingCount] = useState({ current: 0, total: 0 });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  // Photos state - initially empty or from localStorage meta, but we need to hydrate blobs
  const [photos, setPhotos] = useState<Photo[]>(() => {
    const saved = localStorage.getItem('photos');
    return saved ? JSON.parse(saved) : INITIAL_PHOTOS;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Search History
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recent_searches');
    return saved ? JSON.parse(saved) : ['风景', '咖啡', '旅行'];
  });

  // Color Library State (Lifted from ColorTool)
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>(() => {
    const saved = localStorage.getItem('color_groups');
    if (saved) return JSON.parse(saved);
    return DEFAULT_COLOR_GROUPS;
  });

  // Theme
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    return (localStorage.getItem('theme_color') as ThemeColor) || 'zinc';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Tag Categories State: Map<TagName, CategoryName>
  const [tagCategoryMap, setTagCategoryMap] = useState<Record<string, string>>({
    '风景': '自然',
    '雪山': '自然',
    '咖啡': '生活',
    '旅行': '活动',
    '美食': '生活',
    '徒步': '活动'
  });

  // Layout State
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Modal State
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [initialEditMode, setInitialEditMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Upload Menu State
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  
  // Long Press & Context Menu State
  const [contextMenuPhoto, setContextMenuPhoto] = useState<Photo | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  
  // Batch Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch Operation Modals
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [isBatchTagOpen, setIsBatchTagOpen] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState('');
  const [batchSelectedTags, setBatchSelectedTags] = useState<Set<string>>(new Set());
  const [isBatchRenameOpen, setIsBatchRenameOpen] = useState(false);
  const [batchRenameTemplate, setBatchRenameTemplate] = useState('Photo-{n}');

  // Backup Import State
  const [importDataString, setImportDataString] = useState('');


  // Delete Confirmation States
  const [contextMenuDeleteConfirm, setContextMenuDeleteConfirm] = useState(false);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  // Broken Image State
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isToolView = selectedCategory.startsWith('tool-');

  // REQUEST PERSISTENT STORAGE (Android APK Logic simulation)
  useEffect(() => {
    const requestPersistence = async () => {
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
          await navigator.storage.persist();
        }
      }
    };
    requestPersistence();
  }, []);

  // Optimized Loading: Load photos from DB in background, render UI immediately
  useEffect(() => {
    const hydratePhotos = async () => {
      // Don't set isLoading(true) to avoid blocking UI. 
      // Instead, we will progressively update the photos as they load.
      
      // FIX: Only exclude http/https remote URLs. Allow blob: URLs to be re-hydrated from DB because they expire on refresh.
      // Also process photos with empty URLs (failed previous imports)
      const photosToHydrate = photos.filter(p => !p.url.startsWith('http'));
      if (photosToHydrate.length === 0) return;

      const BATCH_SIZE = 6; // Reduced batch size to prevent DB choke on low-end devices
      
      for (let i = 0; i < photosToHydrate.length; i += BATCH_SIZE) {
        const chunk = photosToHydrate.slice(i, i + BATCH_SIZE);
        const updates: Record<string, string> = {};
        
        await Promise.all(chunk.map(async (photo) => {
             try {
                // Try thumb first
                let blob = await getThumbnailFromDB(photo.id);
                // Fallback to full image
                if (!blob) blob = await getImageFromDB(photo.id);
                
                if (blob) {
                    updates[photo.id] = URL.createObjectURL(blob);
                } else {
                    console.warn(`Could not find image or thumbnail for ${photo.id}`);
                }
             } catch (e) {
                console.error("Hydration fail", photo.id, e);
             }
        }));

        if (Object.keys(updates).length > 0) {
            setPhotos(prev => prev.map(p => updates[p.id] ? { ...p, url: updates[p.id] } : p));
        }
        // Small delay to yield to main thread
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };

    hydratePhotos();
    
    // NOTE: We do NOT revoke object URLs on unmount here anymore to prevent 
    // race conditions where valid URLs are revoked during strict mode double-mounts
    // or rapid re-renders, causing images to disappear. 
    // Browsers will clean up when the page is closed/refreshed.
  }, []); // Run once on mount
  
  // Lazy load full quality image when modal opens
  useEffect(() => {
      if (selectedPhoto && selectedPhoto.id) {
          let isMounted = true;
          // Trigger async load of full image
          getImageFromDB(selectedPhoto.id).then(blob => {
              if (isMounted && blob) {
                  const fullUrl = URL.createObjectURL(blob);
                  setSelectedPhoto(prev => {
                      // Only update if url is different (to update from thumb to full)
                      if (prev && prev.id === selectedPhoto.id && prev.url !== fullUrl) {
                           return { ...prev, url: fullUrl };
                      }
                      return prev;
                  });
              }
          });
          return () => { isMounted = false; };
      }
  }, [selectedPhoto?.id]);

  useEffect(() => {
    localStorage.setItem('photos', JSON.stringify(photos));
  }, [photos]);
  
  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  // --- ROBUST HISTORY API HANDLER for Mobile Back Gesture ---
  
  // Helper to open a modal and push history state
  const openModal = (modalKey: string, action: () => void) => {
      window.history.pushState({ modal: modalKey }, '', window.location.href);
      action();
  };

  // Helper to close modal via UI (Cross Button / Backdrop)
  const closeModal = () => {
      window.history.back();
  };

  // Robust history handler to manage multiple layers of state
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      const modalKey = state?.modal;

      // Close items if their expected history state is missing (meaning we went back)
      
      // 1. Photo Modal
      if (selectedPhoto && modalKey !== 'photo') {
        setSelectedPhoto(null);
        return;
      }
      
      // 2. Batch Operations
      if (isBatchMoveOpen && modalKey !== 'batch-move') {
        setIsBatchMoveOpen(false);
        return;
      }
      if (isBatchTagOpen && modalKey !== 'batch-tag') {
        setIsBatchTagOpen(false);
        return;
      }
      if (isBatchRenameOpen && modalKey !== 'batch-rename') {
        setIsBatchRenameOpen(false);
        return;
      }

      // 3. Menus & Settings
      if (isUploadMenuOpen && modalKey !== 'upload') {
        setIsUploadMenuOpen(false);
        return;
      }
      if (isSettingsOpen && modalKey !== 'settings') {
        setIsSettingsOpen(false);
        return;
      }
      
      // 4. Sidebar
      if (isSidebarOpen && modalKey !== 'sidebar') {
        setIsSidebarOpen(false);
        return;
      }
      
      // 5. Selection Mode
      if (isSelectionMode && modalKey !== 'selection') {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        return;
      }

      // 6. Search Focus
      if (isSearchFocused && modalKey !== 'search') {
          setIsSearchFocused(false);
          return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedPhoto, isSettingsOpen, isSidebarOpen, isSelectionMode, isUploadMenuOpen, isBatchMoveOpen, isBatchTagOpen, isBatchRenameOpen, isSearchFocused]);


  useEffect(() => {
    localStorage.setItem('theme_color', themeColor);
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem('recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    localStorage.setItem('color_groups', JSON.stringify(colorGroups));
  }, [colorGroups]);

  // Reset selection on category change
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setBatchDeleteConfirm(false);
  }, [selectedCategory]);

  useEffect(() => {
    setContextMenuDeleteConfirm(false);
  }, [contextMenuPhoto]);

  // Group tags
  const groupedTags = useMemo(() => {
    const groups: Record<string, string[]> = {};
    const allUniqueTags = Array.from(new Set(photos.flatMap(p => p.tags))).sort();

    allUniqueTags.forEach((tag: string) => {
      const cat = tagCategoryMap[tag] || '未分类';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tag);
    });
    return groups;
  }, [photos, tagCategoryMap]);

  const allTags = useMemo(() => {
    return Array.from(new Set(photos.flatMap(p => p.tags))).sort();
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    let result = photos;
    if (selectedCategory !== 'all' && !isToolView) {
      if (selectedCategory.startsWith('tag-')) {
        const tagName = selectedCategory.replace('tag-', '');
        result = result.filter(p => p.tags.includes(tagName));
      } else if (selectedCategory === 'favorites') {
        result = result.filter(p => p.isFavorite);
      } else {
        result = result.filter(p => p.categoryId === selectedCategory);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [photos, selectedCategory, searchQuery, isToolView]);

  const groupedPhotos = useMemo(() => groupPhotosByDate(filteredPhotos), [filteredPhotos]);

  const getNavPhotos = () => filteredPhotos;
  const currentPhotoIndex = selectedPhoto ? getNavPhotos().findIndex(p => p.id === selectedPhoto.id) : -1;
  const hasNext = currentPhotoIndex >= 0 && currentPhotoIndex < getNavPhotos().length - 1;
  const hasPrev = currentPhotoIndex > 0;

  const handleNextPhoto = () => {
      if (hasNext) {
          setSelectedPhoto(getNavPhotos()[currentPhotoIndex + 1]);
      }
  };

  const handlePrevPhoto = () => {
      if (hasPrev) {
          setSelectedPhoto(getNavPhotos()[currentPhotoIndex - 1]);
      }
  };

  const handleSearchSubmit = (term: string) => {
    if (!term.trim()) return;
    setSearchQuery(term);
    setRecentSearches(prev => {
      const newHistory = [term, ...prev.filter(t => t !== term)].slice(0, 5);
      return newHistory;
    });
    // Do not clear focus immediately, so users can still see they are searching
    // But hide the recent search dropdown via condition
  };

  const handleCollectColor = (hex: string) => {
    setColorGroups(prev => {
      const favIndex = prev.findIndex(g => g.id === 'favorites');
      const newColor = { id: crypto.randomUUID(), name: '收藏色 ' + hex.toUpperCase(), hex };
      
      let newGroups = [...prev];
      if (favIndex >= 0) {
        newGroups[favIndex] = {
          ...newGroups[favIndex],
          colors: [newColor, ...newGroups[favIndex].colors]
        };
      } else {
        newGroups = [
          { id: 'favorites', name: '我的收藏', colors: [newColor], isCustom: false },
          ...newGroups
        ];
      }
      return newGroups;
    });
    alert('颜色已收藏到“我的收藏”分组');
  };

  const handleUploadClick = () => {
    openModal('upload', () => setIsUploadMenuOpen(true));
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleSelectFolder = () => {
    folderInputRef.current?.click();
  };
  
  const handleBatchFileProcess = async (files: File[]) => {
      if (files.length === 0) return;
      if (isUploadMenuOpen) closeModal();
      
      setIsProcessing(true);
      setProcessingCount({ current: 0, total: files.length });

      const newPhotosToState: Photo[] = [];
      const BATCH_SIZE = 5;

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
         const chunk = files.slice(i, i + BATCH_SIZE);
         
         await Promise.all(chunk.map(async (file) => {
             try {
                const newPhotoId = crypto.randomUUID();
                
                // Save original
                await saveImageToDB(newPhotoId, file);
                
                // Generate and save thumbnail
                let displayUrl;
                try {
                    const thumbBlob = await generateThumbnail(file);
                    // Ensure thumbBlob is not null/undefined just in case
                    const blobToSave = thumbBlob || file;
                    await saveThumbnailToDB(newPhotoId, blobToSave);
                    displayUrl = URL.createObjectURL(blobToSave);
                } catch (e) {
                    console.warn("Thumbnail failed, using original", e);
                    displayUrl = URL.createObjectURL(file);
                    // Also attempt to save original as thumbnail entry so subsequent loads find it
                    saveThumbnailToDB(newPhotoId, file).catch(err => console.error("Fallback save failed", err));
                }

                const title = file.name.replace(/\.[^/.]+$/, "");

                const newPhoto: Photo = {
                  id: newPhotoId,
                  url: displayUrl, // Use thumbnail URL for grid
                  title: title,
                  description: '',
                  tags: [],
                  categoryId: 'uncategorized',
                  createdAt: Date.now(),
                };
                newPhotosToState.push(newPhoto);
             } catch (err) {
                 console.error("Failed to process file:", file.name, err);
             }
         }));

         setProcessingCount(prev => ({ ...prev, current: Math.min(i + BATCH_SIZE, files.length) }));
         await new Promise(resolve => setTimeout(resolve, 10));
      }

      setPhotos(prev => [...newPhotosToState, ...prev]);
      setIsProcessing(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    await handleBatchFileProcess(Array.from(fileList) as File[]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleUpdatePhoto = (updatedPhoto: Photo) => {
    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    setSelectedPhoto(updatedPhoto);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (selectedCategory === 'favorites') {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isFavorite: false } : p));
    } else {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        await deleteImageFromDB(photoId);
    }
    setContextMenuPhoto(null);
    if (selectedPhoto) closeModal();
  };

  const handleDeleteAllPhotos = async () => {
      if (confirm('警告：此操作将永久删除所有照片！\n相册分类和标签将被保留。\n\n确定要继续吗？')) {
          if (confirm('再次确认：删除所有照片无法恢复。')) {
              setIsLoading(true);
              try {
                  // Delete all images from IndexedDB
                  await Promise.all(photos.map(p => deleteImageFromDB(p.id)));
                  // Clear photos state
                  setPhotos([]);
                  setFailedImages(new Set());
                  closeModal(); // Close Settings
                  alert('所有照片已删除');
              } catch (e) {
                  console.error("Failed to delete all photos", e);
                  alert('删除过程中出现错误');
              } finally {
                  setIsLoading(false);
              }
          }
      }
  };

  const handleBatchDelete = async () => {
    if (batchDeleteConfirm) {
      if (selectedCategory === 'favorites') {
         setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, isFavorite: false } : p));
      } else {
         for (const id of selectedIds) {
             await deleteImageFromDB(id);
         }
         setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
      }
      setSelectedIds(new Set());
      closeModal(); 
      setBatchDeleteConfirm(false);
    } else {
      setBatchDeleteConfirm(true);
    }
  };
  
  // -- Batch Move Logic --
  const handleBatchMove = () => {
    if (selectedIds.size === 0) return;
    openModal('batch-move', () => setIsBatchMoveOpen(true));
  };

  const confirmBatchMove = (targetCategoryId: string) => {
    setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, categoryId: targetCategoryId } : p));
    closeModal();
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    // Don't go back here, modal closing handles history
  };

  // -- Batch Tag Logic --
  const handleBatchTag = () => {
    if (selectedIds.size === 0) return;
    setBatchSelectedTags(new Set());
    setBatchTagInput('');
    openModal('batch-tag', () => setIsBatchTagOpen(true));
  };

  const confirmBatchTag = () => {
    const newTags = batchTagInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    const tagsToAdd = [...Array.from(batchSelectedTags), ...newTags];

    if (tagsToAdd.length === 0) return;

    setPhotos(prev => prev.map(p => {
        if (selectedIds.has(p.id)) {
            const mergedTags = Array.from(new Set([...p.tags, ...tagsToAdd]));
            return { ...p, tags: mergedTags };
        }
        return p;
    }));
    
    closeModal();
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  // -- Batch Rename Logic --
  const handleBatchRename = () => {
      if (selectedIds.size === 0) return;
      setBatchRenameTemplate('Image-{n}');
      openModal('batch-rename', () => setIsBatchRenameOpen(true));
  };

  const confirmBatchRename = () => {
      // Extract selected photos respecting the current view order
      const selectedSet = selectedIds;
      const orderedSelectedPhotos = filteredPhotos.filter(p => selectedSet.has(p.id));
      
      let counter = 1;
      const updates = new Map<string, string>();
      
      orderedSelectedPhotos.forEach(p => {
          const newTitle = batchRenameTemplate.replace('{n}', counter.toString().padStart(2, '0'));
          updates.set(p.id, newTitle);
          counter++;
      });

      setPhotos(prev => prev.map(p => {
          if (updates.has(p.id)) {
              return { ...p, title: updates.get(p.id)! };
          }
          return p;
      }));

      closeModal();
      setSelectedIds(new Set());
      setIsSelectionMode(false);
  };

  // -- Backup & Restore Logic --
  const handleExportData = async () => {
    const data = {
      version: 1,
      timestamp: Date.now(),
      photos: photos.map(p => ({ ...p, url: '' })), // Only metadata, URLs are local blobs
      categories,
      note_categories: JSON.parse(localStorage.getItem('note_categories') || '[]'),
      notes: JSON.parse(localStorage.getItem('inspiration_notes') || '[]'),
      color_groups: colorGroups
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(jsonString);
      alert('元数据已复制到剪贴板！\n注意：此备份仅包含分类、标签、便签等文字信息，不包含图片文件本身。');
    } catch (e) {
      alert('复制失败，请手动复制下方内容');
      setImportDataString(jsonString); // Show in textarea for manual copy
    }
  };

  const handleImportData = () => {
    try {
      if (!importDataString.trim()) return;
      
      const data = JSON.parse(importDataString);
      if (!data.version || !data.photos) throw new Error("Invalid format");
      
      if (confirm('导入将覆盖当前所有分类和便签设置，并合并照片记录。确定要继续吗？')) {
        // Restore categories
        if (data.categories) setCategories(data.categories);
        
        // Restore notes
        if (data.notes) localStorage.setItem('inspiration_notes', JSON.stringify(data.notes));
        if (data.note_categories) localStorage.setItem('note_categories', JSON.stringify(data.note_categories));
        
        // Restore colors
        if (data.color_groups) setColorGroups(data.color_groups);
        
        // Merge photos (preserving existing blob URLs if match)
        // Since imported photos have empty URLs, we only use them for metadata.
        // If ID matches, we keep local blob URL but update metadata.
        // If ID doesn't match (new photo metadata), it will show as broken until image is re-added or handled.
        
        const mergedPhotos = [...photos];
        const currentIds = new Set(photos.map(p => p.id));
        
        data.photos.forEach((p: Photo) => {
            if (currentIds.has(p.id)) {
                // Update metadata of existing
                const index = mergedPhotos.findIndex(mp => mp.id === p.id);
                if (index !== -1) {
                    mergedPhotos[index] = { ...p, url: mergedPhotos[index].url }; 
                }
            } else {
                // Add new (will be broken image, but metadata exists)
                mergedPhotos.push(p);
            }
        });
        
        setPhotos(mergedPhotos);
        alert('数据导入成功！页面将刷新以应用更改。');
        window.location.reload();
      }
    } catch (e) {
      alert('导入失败：数据格式不正确');
      console.error(e);
    }
  };

  const toggleBatchTagSelection = (tag: string) => {
      const newSet = new Set(batchSelectedTags);
      if (newSet.has(tag)) newSet.delete(tag);
      else newSet.add(tag);
      setBatchSelectedTags(newSet);
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredPhotos.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredPhotos.map(p => p.id)));
      }
  };

  const handleCreateCategory = () => {
    const name = prompt("请输入新相册名称：");
    if (name) {
      const newCat: Category = {
        id: crypto.randomUUID(),
        name,
        icon: 'folder',
        slug: name.toLowerCase().replace(/\s+/g, '-')
      };
      setCategories([...categories, newCat]);
    }
  };

  const handleRenameCategory = (id: string, newName: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName, slug: newName.toLowerCase().replace(/\s+/g, '-') } : c));
  };

  const handleDeleteCategory = (id: string) => {
    setPhotos(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: 'uncategorized' } : p));
    setCategories(prev => prev.filter(c => c.id !== id));
    if (selectedCategory === id) setSelectedCategory('all');
  };

  const handleRenameTag = (oldTag: string, newTag: string) => {
    setPhotos(prev => prev.map(p => ({
      ...p,
      tags: p.tags.map(t => t === oldTag ? newTag : t)
    })));
    setTagCategoryMap(prev => {
      const newMap = { ...prev };
      if (newMap[oldTag]) {
        newMap[newTag] = newMap[oldTag];
        delete newMap[oldTag];
      }
      return newMap;
    });
    if (selectedCategory === `tag-${oldTag}`) {
      setSelectedCategory(`tag-${newTag}`);
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
     setPhotos(prev => prev.map(p => ({
      ...p,
      tags: p.tags.filter(t => t !== tagToDelete)
    })));
    setTagCategoryMap(prev => {
      const newMap = { ...prev };
      delete newMap[tagToDelete];
      return newMap;
    });
    if (selectedCategory === `tag-${tagToDelete}`) {
      setSelectedCategory('all');
    }
  };

  const handleCategorizeTag = (tag: string, newCategory: string) => {
    setTagCategoryMap(prev => {
      const newMap = { ...prev };
      if (newCategory.trim() === '') {
        delete newMap[tag];
      } else {
        newMap[tag] = newCategory;
      }
      return newMap;
    });
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    if (isSidebarOpen) {
        closeModal();
    }
  };

  const startPress = (photo: Photo) => {
    isLongPress.current = false;
    
    if (isSelectionMode) return;
    
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (!isSelectionMode) {
          openModal('selection', () => {
              setIsSelectionMode(true);
              setSelectedIds(new Set([photo.id]));
          });
          if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 600);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleGridItemClick = (photo: Photo) => {
    if (isLongPress.current) return;
    
    if (isSelectionMode) {
      const newSet = new Set(selectedIds);
      if (newSet.has(photo.id)) {
        newSet.delete(photo.id);
      } else {
        newSet.add(photo.id);
      }
      setSelectedIds(newSet);
    } else {
      setInitialEditMode(false);
      openModal('photo', () => setSelectedPhoto(photo));
    }
  };

  const handleImageError = (id: string) => {
     setFailedImages(prev => new Set(prev).add(id));
  };

  const getPageTitle = () => {
    if (selectedCategory === 'all') return '所有照片';
    if (selectedCategory === 'favorites') return '我的收藏';
    if (selectedCategory === 'tool-color') return '配色助手';
    if (selectedCategory === 'tool-note') return '灵感便签';
    if (selectedCategory.startsWith('tag-')) return `标签: ${selectedCategory.replace('tag-', '')}`;
    return categories.find(c => c.id === selectedCategory)?.name || '相册';
  };

  const getGridClass = () => {
    switch (gridSize) {
      case 'small': return 'grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2';
      case 'medium': return 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
      case 'large': return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
      default: return 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3';
    }
  };

  const getButtonColor = () => {
    switch (themeColor) {
        case 'zinc': return 'bg-slate-900 text-white hover:bg-slate-800';
        default: return `bg-${themeColor}-600 text-white hover:bg-${themeColor}-700`;
    }
  };

  if (isLoading) {
    // Only kept as fallback, mostly unreachable with new logic
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className={`w-12 h-12 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin`}></div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Gallery...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-slate-900 font-sans">
      
      <Sidebar
        categories={categories}
        groupedTags={groupedTags}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        onCreateCategory={handleCreateCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
        onRenameTag={handleRenameTag}
        onDeleteTag={handleDeleteTag}
        onCategorizeTag={handleCategorizeTag}
        onOpenSettings={() => openModal('settings', () => setIsSettingsOpen(true))}
        totalPhotos={photos.length}
        isOpen={isSidebarOpen}
        onClose={closeModal}
        themeColor={themeColor}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative transition-all duration-300">
        
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 pt-safe">
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
            <div className="flex items-center gap-3 md:hidden">
              <button onClick={() => openModal('sidebar', () => setIsSidebarOpen(true))} className="p-1 -ml-1 text-slate-600">
                <Menu size={24} />
              </button>
            </div>

            <div className="flex-1 px-4 md:px-0 flex justify-center md:justify-start">
               {isSearchFocused || searchQuery ? (
                 <div className="w-full max-w-md relative group">
                    <button 
                        onClick={() => handleSearchSubmit(searchQuery)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors cursor-pointer z-10"
                    >
                        <Search size={18} />
                    </button>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(searchQuery)}
                      onFocus={() => setIsSearchFocused(true)}
                      placeholder="搜索照片、标签、描述..."
                      className="w-full bg-slate-100 border-none rounded-full pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all outline-none"
                      autoFocus={isSearchFocused}
                    />
                     {searchQuery && (
                      <button 
                        onClick={() => {
                            setSearchQuery(''); 
                            setIsSearchFocused(true);
                        }} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={16} />
                      </button>
                    )}
                 </div>
               ) : (
                 <div className="flex items-center gap-2 w-full md:w-auto overflow-hidden">
                    <h2 className="text-lg md:text-2xl font-black text-slate-900 truncate tracking-tight uppercase">
                      {getPageTitle()}
                    </h2>
                    {!isToolView && (
                      <button onClick={() => { openModal('search', () => setIsSearchFocused(true)); }} className="md:hidden ml-auto p-2 text-slate-500">
                        <Search size={20} />
                      </button>
                    )}
                 </div>
               )}
            </div>

            <div className="flex items-center gap-2 md:gap-4 shrink-0">
               {!isToolView && (
                 <>
                   <button 
                     onClick={() => {
                        if (isSelectionMode) {
                            closeModal();
                        } else {
                            openModal('selection', () => setIsSelectionMode(true));
                        }
                     }}
                     className={`p-2 rounded-full transition-all ${isSelectionMode ? getButtonColor() : 'text-slate-500 hover:bg-slate-100'}`}
                     title="批量选择"
                   >
                     <CheckSquare size={20} />
                   </button>
                   
                   <div className="hidden md:block relative">
                       <button onClick={() => { openModal('search', () => setIsSearchFocused(true)); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                         <Search size={20} />
                       </button>
                   </div>
                   
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*"
                      multiple 
                   />
                   <input
                      type="file"
                      ref={folderInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      // @ts-ignore
                      webkitdirectory=""
                      directory=""
                   />

                   <button 
                      onClick={handleUploadClick}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-none shadow-lg hover:shadow-xl transition-all active:translate-y-0.5 ${getButtonColor()}`}
                   >
                      <Upload size={16} strokeWidth={2.5} />
                      <span className="hidden md:inline">导入</span>
                   </button>
                 </>
               )}
            </div>
          </div>
          
          {isSearchFocused && !searchQuery && recentSearches.length > 0 && (
             <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-4 shadow-lg animate-fade-in z-20">
               <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                 <Clock size={12} /> 最近搜索
               </div>
               <div className="flex flex-wrap gap-2">
                 {recentSearches.map(term => (
                   <button 
                     key={term}
                     onClick={() => handleSearchSubmit(term)}
                     className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-700 transition-colors"
                   >
                     {term}
                   </button>
                 ))}
               </div>
             </div>
          )}
        </header>

        {selectedCategory === 'tool-color' ? (
           <ColorTool groups={colorGroups} onUpdateGroups={setColorGroups} />
        ) : selectedCategory === 'tool-note' ? (
           <NoteTool />
        ) : (
          <div className="flex-1 overflow-y-auto p-2 md:p-6 pb-24 md:pb-6 custom-scrollbar">
            
            {isProcessing && (
               <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-4">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-bold">正在导入... {processingCount.current} / {processingCount.total}</span>
               </div>
            )}

            {isSelectionMode && (
              <div className={`sticky top-0 z-20 mb-4 text-white p-3 shadow-md flex flex-wrap gap-y-2 justify-between items-center rounded-none animate-in slide-in-from-top-2 ${themeColor === 'zinc' ? 'bg-slate-900' : `bg-${themeColor}-600`}`}>
                 <div className="flex items-center gap-4 shrink-0">
                    <span className="font-bold text-sm ml-2">已选 {selectedIds.size} 项</span>
                    <button onClick={handleSelectAll} className="text-xs border border-white/30 px-2 py-1 hover:bg-white/10 rounded-sm">
                       {selectedIds.size === filteredPhotos.length ? '取消全选' : '全选'}
                    </button>
                 </div>
                 <div className="flex gap-2 shrink-0 ml-auto">
                    <button onClick={handleBatchMove} disabled={selectedIds.size === 0} className="p-2 hover:bg-white/20 rounded-sm" title="移动"><Folder size={18}/></button>
                    <button onClick={handleBatchTag} disabled={selectedIds.size === 0} className="p-2 hover:bg-white/20 rounded-sm" title="标签"><Tag size={18}/></button>
                    <button onClick={handleBatchRename} disabled={selectedIds.size === 0} className="p-2 hover:bg-white/20 rounded-sm" title="重命名"><Edit2 size={18}/></button>
                    <button onClick={handleBatchDelete} disabled={selectedIds.size === 0} className="p-2 hover:bg-red-500/50 rounded-sm text-red-300" title="删除">
                       {batchDeleteConfirm ? '确认?' : <Trash2 size={18}/>}
                    </button>
                    <button onClick={closeModal} className="ml-2 p-2 hover:bg-white/20 rounded-sm"><X size={18}/></button>
                 </div>
              </div>
            )}

            {filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 mt-10">
                <ImagePlus size={48} strokeWidth={1} className="mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-500">这里空空如也</p>
                <p className="text-sm mt-2">点击右上角“导入”按钮添加照片</p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedPhotos.map(([date, groupPhotos]) => (
                  <div key={date}>
                    <h3 className="text-xs font-bold text-slate-400 mb-3 ml-1 sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 z-10 flex items-center gap-2 uppercase tracking-wider w-fit px-2 rounded-r-md">
                       <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div> {date}
                    </h3>
                    <div className={`grid ${getGridClass()}`}>
                      {groupPhotos.map(photo => (
                        <div 
                          key={photo.id}
                          className={`
                            group relative aspect-square bg-slate-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300
                            ${isSelectionMode && selectedIds.has(photo.id) ? `ring-4 scale-95 ${themeColor === 'zinc' ? 'ring-slate-900' : `ring-${themeColor}-600`}` : ''}
                            ${!isSelectionMode && 'hover:scale-[1.02]'}
                          `}
                          onClick={() => handleGridItemClick(photo)}
                          onPointerDown={() => startPress(photo)}
                          onPointerUp={cancelPress}
                          onPointerLeave={cancelPress}
                          onContextMenu={(e) => e.preventDefault()}
                        >
                          {failedImages.has(photo.id) ? (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                  <ImageIcon size={24} />
                                  <span className="text-[10px] mt-1">加载失败</span>
                              </div>
                          ) : (
                              <img 
                                src={photo.url || ''} // Fallback to empty string while hydrating
                                alt={photo.title} 
                                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${!photo.url ? 'opacity-0' : 'opacity-100'}`}
                                loading="lazy"
                                onError={() => handleImageError(photo.id)}
                              />
                          )}
                          
                          {/* Placeholder while url is loading */}
                          {!photo.url && !failedImages.has(photo.id) && (
                              <div className="absolute inset-0 bg-slate-100 animate-pulse" />
                          )}
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             <div className="absolute bottom-0 left-0 right-0 p-3">
                               <p className="text-white text-xs font-bold truncate">{photo.title}</p>
                               <div className="flex gap-1 mt-1">
                                 {photo.tags.slice(0, 3).map(tag => (
                                   <span key={tag} className="text-[10px] text-white/80 bg-white/20 px-1.5 py-0.5 rounded-sm backdrop-blur-sm">#{tag}</span>
                                 ))}
                               </div>
                             </div>
                          </div>

                          {isSelectionMode && (
                             <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-colors ${selectedIds.has(photo.id) ? (themeColor === 'zinc' ? 'bg-slate-900 border-slate-900' : `bg-${themeColor}-600 border-${themeColor}-600`) : 'bg-black/30'}`}>
                                {selectedIds.has(photo.id) && <Check size={14} className="text-white" />}
                             </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals and Sheets... */}
      {isUploadMenuOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={closeModal}>
            <div className="bg-white w-full max-w-md p-4 rounded-t-xl shadow-2xl animate-in slide-in-from-bottom-full duration-300 flex flex-col gap-2 pb-safe" onClick={e => e.stopPropagation()}>
               <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
               <h3 className="text-center font-bold text-gray-900 mb-2 uppercase tracking-wider text-sm">选择导入方式</h3>
               <button 
                 onClick={handleSelectFiles}
                 className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg text-left group"
               >
                  <div className="bg-white p-3 rounded-full shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                      <FileImage size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-900">选择照片</h4>
                      <p className="text-xs text-gray-500">从图库中选择多张图片</p>
                  </div>
               </button>
               <button 
                 onClick={handleSelectFolder}
                 className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg text-left group"
               >
                  <div className="bg-white p-3 rounded-full shadow-sm text-amber-600 group-hover:scale-110 transition-transform">
                      <FolderInput size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-900">导入文件夹</h4>
                      <p className="text-xs text-gray-500">扫描并导入整个目录 (需浏览器支持)</p>
                  </div>
               </button>
               <div className="mt-2 text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                  <HardDrive size={10} /> 本地存储权限已请求
               </div>
            </div>
        </div>
      )}

      {/* Batch Modals */}
      {isBatchMoveOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={closeModal}>
            <div className="bg-white w-full max-w-md p-6 m-4 shadow-2xl rounded-none animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">移动到相册</h3>
                    <button onClick={closeModal} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                    <button 
                        onClick={handleCreateCategory}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-slate-100 transition-all rounded-none min-h-[100px]"
                    >
                        <FolderPlus size={24} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">新建相册</span>
                    </button>
                    {categories.filter(c => c.id !== 'all' && c.id !== 'favorites').map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => confirmBatchMove(cat.id)}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 hover:border-slate-900 hover:shadow-md transition-all rounded-none min-h-[100px]"
                        >
                            <Folder size={24} className="text-slate-700" />
                            <span className="text-xs font-bold text-slate-900 text-center">{cat.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {isBatchTagOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={closeModal}>
             <div className="bg-white w-full max-w-md p-6 m-4 shadow-2xl rounded-none animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">添加标签</h3>
                    <button onClick={closeModal} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>

                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">新标签</label>
                    <input 
                        type="text" 
                        value={batchTagInput}
                        onChange={(e) => setBatchTagInput(e.target.value)}
                        placeholder="输入标签，多个用逗号分隔"
                        className="w-full border-b-2 border-slate-200 py-2 text-sm font-medium focus:border-slate-900 outline-none bg-transparent"
                    />
                </div>

                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">选择已有标签</label>
                    <div className="flex flex-wrap gap-2 max-h-[30vh] overflow-y-auto custom-scrollbar">
                        {allTags.map(tag => {
                            const isSelected = batchSelectedTags.has(tag);
                            return (
                                <button
                                    key={tag}
                                    onClick={() => toggleBatchTagSelection(tag)}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide border transition-all rounded-none
                                        ${isSelected 
                                            ? (themeColor === 'zinc' ? 'bg-slate-900 text-white border-slate-900' : `bg-${themeColor}-600 text-white border-${themeColor}-600`)
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}
                                    `}
                                >
                                    {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                                    {tag}
                                </button>
                            );
                        })}
                        {allTags.length === 0 && <span className="text-xs text-slate-400 italic">无已有标签</span>}
                    </div>
                </div>

                <button 
                    onClick={confirmBatchTag}
                    className={`w-full text-white py-3 text-sm font-bold uppercase tracking-wider transition-colors rounded-none ${getButtonColor()}`}
                >
                    保存 ({batchTagInput.split(/[,，]/).filter(Boolean).length + batchSelectedTags.size} 个)
                </button>
             </div>
        </div>
      )}

      {isBatchRenameOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={closeModal}>
            <div className="bg-white w-full max-w-md p-6 m-4 shadow-2xl rounded-none animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">批量重命名</h3>
                    <button onClick={closeModal} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">命名模版 (使用 {"{n}"} 代表序号)</label>
                    <input 
                        type="text" 
                        value={batchRenameTemplate}
                        onChange={(e) => setBatchRenameTemplate(e.target.value)}
                        placeholder="例如: 旅行-{n}"
                        className="w-full border-b-2 border-slate-200 py-2 text-sm font-medium focus:border-slate-900 outline-none bg-transparent"
                    />
                     <p className="text-[10px] text-slate-400 mt-2">
                        预览: {batchRenameTemplate.replace('{n}', '01')}, {batchRenameTemplate.replace('{n}', '02')}...
                    </p>
                </div>

                <button 
                    onClick={confirmBatchRename}
                    className={`w-full text-white py-3 text-sm font-bold uppercase tracking-wider transition-colors rounded-none ${getButtonColor()}`}
                >
                    重命名 {selectedIds.size} 张照片
                </button>
            </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
           <div className="bg-white p-8 w-full max-w-sm shadow-2xl rounded-none relative overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={e => e.stopPropagation()}>
              <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20}/></button>
              <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">应用设置</h2>
              
              <div className="mb-8">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">主题色</label>
                 <div className="flex flex-wrap gap-2">
                    {ALL_THEME_COLORS.map((color) => (
                       <button
                         key={color}
                         onClick={() => setThemeColor(color as ThemeColor)}
                         className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${themeColor === color ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                         style={{ backgroundColor: color === 'zinc' ? '#334155' : THEME_COLORS_MAP[color] }}
                       />
                    ))}
                 </div>
              </div>

              <div className="mb-8">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-2"><Database size={12}/> 数据管理</label>
                 
                 <div className="space-y-4">
                     <div className="p-3 bg-slate-50 border border-slate-100">
                        <button onClick={handleExportData} className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold uppercase hover:bg-slate-50 mb-2">
                            <Copy size={14} /> 复制备份数据
                        </button>
                        <p className="text-[10px] text-slate-400 leading-tight">仅包含分类、标签、便签及照片元数据。不包含图片文件本身。</p>
                     </div>

                     <div className="p-3 bg-slate-50 border border-slate-100">
                        <textarea 
                            value={importDataString}
                            onChange={e => setImportDataString(e.target.value)}
                            placeholder="在此粘贴备份数据 (JSON)..."
                            className="w-full h-20 text-[10px] p-2 border border-slate-200 mb-2 focus:border-slate-900 outline-none resize-none font-mono"
                        ></textarea>
                        <button onClick={handleImportData} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 text-white text-xs font-bold uppercase hover:bg-slate-800">
                            <Download size={14} /> 恢复数据
                        </button>
                     </div>
                 </div>
              </div>

              <div className="mb-8">
                 <label className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-3">危险区域</label>
                 <button 
                    onClick={handleDeleteAllPhotos}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm uppercase tracking-wider border border-red-200 transition-colors rounded-none"
                 >
                    <AlertTriangle size={16} /> 删除所有照片
                 </button>
                 <p className="text-[10px] text-slate-400 mt-2 text-center">将保留所有相册分类和标签设置，仅删除图片文件。</p>
              </div>
              
              <div className="border-t border-slate-100 pt-6">
                 <p className="text-xs text-slate-400 text-center">Version 1.3.0</p>
              </div>
           </div>
        </div>
      )}

      <PhotoModal 
        photo={selectedPhoto}
        categories={categories}
        isOpen={!!selectedPhoto}
        onClose={closeModal}
        onUpdate={handleUpdatePhoto}
        onDelete={handleDeletePhoto}
        availableTags={allTags}
        initialEditMode={initialEditMode}
        onNext={handleNextPhoto}
        onPrev={handlePrevPhoto}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onCollectColor={handleCollectColor}
      />
    </div>
  );
};

export default App;
