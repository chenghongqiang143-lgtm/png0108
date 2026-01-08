import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PhotoModal } from './components/PhotoModal';
import { ColorTool } from './components/ColorTool';
import { NoteTool } from './components/NoteTool';
import { Photo, Category, ThemeColor, ColorGroup } from './types';
import { Search, Upload, ImagePlus, Menu, Edit2, Trash2, LayoutGrid, Grid3x3, Square, Folder, ChevronRight, Image as ImageIcon, Check, Loader2, Clock, X, CheckSquare, MousePointer2, Move, Tag } from 'lucide-react';

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

const App: React.FC = () => {
  // --- States ---
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);
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
  
  // Long Press & Context Menu State
  const [contextMenuPhoto, setContextMenuPhoto] = useState<Photo | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  
  // Batch Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete Confirmation States
  const [contextMenuDeleteConfirm, setContextMenuDeleteConfirm] = useState(false);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  // Broken Image State
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isToolView = selectedCategory.startsWith('tool-');

  // New unified processor for single or multiple files
  const handleBatchFileProcess = async (files: File[]) => {
      if (files.length === 0) return;

      const newPhotosToState: Photo[] = [];
      
      for (const file of files) {
          const objectUrl = URL.createObjectURL(file);
          const newPhotoId = crypto.randomUUID();
          
          // Use filename as title, remove extension
          const title = file.name.replace(/\.[^/.]+$/, "");

          const newPhoto: Photo = {
            id: newPhotoId,
            url: objectUrl,
            title: title,
            description: '',
            tags: [],
            categoryId: 'uncategorized',
            createdAt: Date.now(),
          };
          newPhotosToState.push(newPhoto);
      }

      setPhotos(prev => [...newPhotosToState, ...prev]);
  };

  // Startup Effect
  useEffect(() => {
    // Simulate loading resources or checking auth
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // 800ms loading simulation

    // PWA Launch Queue for Android Share Target
    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files || !launchParams.files.length) return;
        
        const files: File[] = [];
        for (const handle of launchParams.files) {
          if (handle.kind === 'file') {
             const file = await handle.getFile();
             files.push(file);
          }
        }
        
        // Handle imported files
        if (files.length > 0) {
            await handleBatchFileProcess(files);
        }
      });
    }

    return () => clearTimeout(timer);
  }, []);

  // --- HISTORY API HANDLER for Mobile Back Gesture ---
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Prioritize closing the deepest nested modal/view
      if (selectedPhoto) {
        setSelectedPhoto(null);
      } else if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else if (isSidebarOpen) {
        setIsSidebarOpen(false);
      } else if (isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedPhoto, isSettingsOpen, isSidebarOpen, isSelectionMode]);

  // Push state when opening modals
  useEffect(() => {
    if (selectedPhoto || isSettingsOpen || isSidebarOpen) {
      window.history.pushState({ modalOpen: true }, '', window.location.href);
    }
  }, [selectedPhoto, isSettingsOpen, isSidebarOpen]);


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

  // Reset confirmation state when menu closes
  useEffect(() => {
    setContextMenuDeleteConfirm(false);
  }, [contextMenuPhoto]);

  // Group tags for Sidebar
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

  // Derive flat list of tags for auto-complete
  const allTags = useMemo(() => {
    return Array.from(new Set(photos.flatMap(p => p.tags))).sort();
  }, [photos]);

  // Filter Photos logic
  const filteredPhotos = useMemo(() => {
    let result = photos;

    // 1. Filter by Category or Tag
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

    // 2. Filter by Search Query
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

  // Group filtered photos by date
  const groupedPhotos = useMemo(() => groupPhotosByDate(filteredPhotos), [filteredPhotos]);

  // Navigation Logic for Modal
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
    setIsSearchFocused(false);
  };

  const handleCollectColor = (hex: string) => {
    setColorGroups(prev => {
      // Find 'favorites' group or create one
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
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    
    // Convert FileList to Array
    const files = Array.from(fileList) as File[];
    
    await handleBatchFileProcess(files);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdatePhoto = (updatedPhoto: Photo) => {
    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    setSelectedPhoto(updatedPhoto);
  };

  const handleDeletePhoto = (photoId: string) => {
    // Check if we are in "Favorites" view
    // Note: If user is in "Favorites" category, delete just removes favorite status
    if (selectedCategory === 'favorites') {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isFavorite: false } : p));
    } else {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
    }
    setContextMenuPhoto(null);
    setSelectedPhoto(null);
  };

  const handleBatchDelete = () => {
    if (batchDeleteConfirm) {
      if (selectedCategory === 'favorites') {
         setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, isFavorite: false } : p));
      } else {
         setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
      }
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setBatchDeleteConfirm(false);
    } else {
      setBatchDeleteConfirm(true);
    }
  };
  
  const handleBatchMove = () => {
    if (selectedIds.size === 0) return;
    const catName = prompt("请输入要移动到的相册名称 (如果不匹配将移至'未分类')");
    if (!catName) return;
    
    const targetCat = categories.find(c => c.name === catName);
    const targetId = targetCat ? targetCat.id : 'uncategorized';
    
    setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, categoryId: targetId } : p));
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    alert(`已将 ${selectedIds.size} 张照片移动到 ${targetCat ? targetCat.name : '未分类'}`);
  };

  const handleBatchTag = () => {
    if (selectedIds.size === 0) return;
    const tagsStr = prompt("请输入标签 (用逗号分隔)");
    if (!tagsStr) return;
    
    const newTags = tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    if (newTags.length === 0) return;

    setPhotos(prev => prev.map(p => {
        if (selectedIds.has(p.id)) {
            const mergedTags = Array.from(new Set([...p.tags, ...newTags]));
            return { ...p, tags: mergedTags };
        }
        return p;
    }));
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    alert(`已为 ${selectedIds.size} 张照片添加标签`);
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
    // Confirmation moved to Sidebar UI
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
    setIsSidebarOpen(false);
  };

  const startPress = (photo: Photo) => {
    isLongPress.current = false; // Always reset long press state on start
    
    if (isSelectionMode) return; // Disable long press menu in selection mode
    
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (!isSelectionMode) {
          // On long press, just enter selection mode with item selected instead of context menu
          setIsSelectionMode(true);
          setSelectedIds(new Set([photo.id]));
          // Optional: Vibrate
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
    // If long press triggered selection mode, don't process click
    if (isLongPress.current) return;
    
    if (isSelectionMode) {
      const newSet = new Set(selectedIds);
      if (newSet.has(photo.id)) {
        newSet.delete(photo.id);
      } else {
        newSet.add(photo.id);
      }
      setSelectedIds(newSet);
      if (newSet.size === 0) setIsSelectionMode(false); // Auto exit if none selected
    } else {
      setInitialEditMode(false);
      setSelectedPhoto(photo);
    }
  };

  const handleEditFromContext = () => {
    if (contextMenuPhoto) {
      setInitialEditMode(true);
      setSelectedPhoto(contextMenuPhoto);
      setContextMenuPhoto(null);
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

  // Theme Helpers
  const getButtonColor = () => {
    switch (themeColor) {
        case 'zinc': return 'bg-slate-900 text-white hover:bg-slate-800';
        default: return `bg-${themeColor}-600 text-white hover:bg-${themeColor}-700`;
    }
  };

  // --- Render ---

  if (isLoading) {
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        totalPhotos={photos.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        themeColor={themeColor}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative transition-all duration-300">
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 pt-safe">
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
            <div className="flex items-center gap-3 md:hidden">
              <button onClick={() => setIsSidebarOpen(true)} className="p-1 -ml-1 text-slate-600">
                <Menu size={24} />
              </button>
            </div>

            <div className="flex-1 px-4 md:px-0 flex justify-center md:justify-start">
               {isSearchFocused ? (
                 <div className="w-full max-w-md relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(searchQuery)}
                      placeholder="搜索照片、标签、描述..."
                      className="w-full bg-slate-100 border-none rounded-full pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all outline-none"
                      autoFocus
                    />
                     {searchQuery && (
                      <button 
                        onClick={() => {setSearchQuery(''); setIsSearchFocused(false);}} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                      <button onClick={() => setIsSearchFocused(true)} className="md:hidden ml-auto p-2 text-slate-500">
                        <Search size={20} />
                      </button>
                    )}
                 </div>
               )}
            </div>

            <div className="flex items-center gap-2 md:gap-4 shrink-0">
               {!isToolView && (
                 <>
                   {/* Selection Mode Toggle */}
                   <button 
                     onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        setSelectedIds(new Set());
                     }}
                     className={`p-2 rounded-full transition-all ${isSelectionMode ? 'bg-black text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                     title="批量选择"
                   >
                     <CheckSquare size={20} />
                   </button>
                   
                   {/* Desktop Search Trigger */}
                   <div className="hidden md:block relative">
                       <button onClick={() => setIsSearchFocused(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                         <Search size={20} />
                       </button>
                   </div>
                   
                   <div className="hidden md:flex bg-slate-100 rounded-lg p-1 items-center gap-1">
                      <button onClick={() => setGridSize('small')} className={`p-1.5 rounded-md ${gridSize === 'small' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}><Grid3x3 size={14}/></button>
                      <button onClick={() => setGridSize('medium')} className={`p-1.5 rounded-md ${gridSize === 'medium' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}><LayoutGrid size={14}/></button>
                      <button onClick={() => setGridSize('large')} className={`p-1.5 rounded-md ${gridSize === 'large' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}><Square size={14}/></button>
                   </div>
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*"
                      multiple 
                   />
                   <button 
                      onClick={handleUploadClick}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-none shadow-lg hover:shadow-xl transition-all active:translate-y-0.5 ${getButtonColor()}`}
                   >
                      <Upload size={16} strokeWidth={2.5} />
                      <span className="hidden md:inline">上传</span>
                   </button>
                 </>
               )}
            </div>
          </div>
          
          {/* Quick Filters / Search History when focused */}
          {isSearchFocused && recentSearches.length > 0 && !searchQuery && (
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

        {/* Content Area */}
        {selectedCategory === 'tool-color' ? (
           <ColorTool groups={colorGroups} onUpdateGroups={setColorGroups} />
        ) : selectedCategory === 'tool-note' ? (
           <NoteTool />
        ) : (
          <div className="flex-1 overflow-y-auto p-2 md:p-6 pb-24 md:pb-6 custom-scrollbar">
            
            {/* Selection Toolbar */}
            {isSelectionMode && (
              <div className="sticky top-0 z-20 mb-4 bg-slate-900 text-white p-3 shadow-md flex justify-between items-center rounded-none animate-in slide-in-from-top-2">
                 <div className="flex items-center gap-4">
                    <span className="font-bold text-sm ml-2">已选 {selectedIds.size} 项</span>
                    <button onClick={handleSelectAll} className="text-xs border border-white/30 px-2 py-1 hover:bg-white/10 rounded-sm">
                       {selectedIds.size === filteredPhotos.length ? '取消全选' : '全选'}
                    </button>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={handleBatchMove} disabled={selectedIds.size === 0} className="p-2 hover:bg-white/20 rounded-sm" title="移动"><Folder size={18}/></button>
                    <button onClick={handleBatchTag} disabled={selectedIds.size === 0} className="p-2 hover:bg-white/20 rounded-sm" title="标签"><Tag size={18}/></button>
                    <button onClick={handleBatchDelete} disabled={selectedIds.size === 0} className="p-2 hover:bg-red-500/50 rounded-sm text-red-300" title="删除">
                       {batchDeleteConfirm ? '确认?' : <Trash2 size={18}/>}
                    </button>
                    <button onClick={() => setIsSelectionMode(false)} className="ml-2 p-2 hover:bg-white/20 rounded-sm"><X size={18}/></button>
                 </div>
              </div>
            )}

            {filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 mt-10">
                <ImagePlus size={48} strokeWidth={1} className="mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-500">这里空空如也</p>
                <p className="text-sm mt-2">点击右上角上传按钮添加照片</p>
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
                            ${isSelectionMode && selectedIds.has(photo.id) ? 'ring-4 ring-slate-900 scale-95' : ''}
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
                                src={photo.url} 
                                alt={photo.title} 
                                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110`}
                                loading="lazy"
                                onError={() => handleImageError(photo.id)}
                              />
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

                          {/* Selection Checkbox */}
                          {isSelectionMode && (
                             <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-colors ${selectedIds.has(photo.id) ? 'bg-slate-900 border-slate-900' : 'bg-black/30'}`}>
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

      {/* Settings Modal (Simplified) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setIsSettingsOpen(false)}>
           <div className="bg-white p-8 w-full max-w-sm shadow-2xl rounded-none relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20}/></button>
              <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">应用设置</h2>
              
              <div className="mb-6">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">主题色</label>
                 <div className="flex flex-wrap gap-2">
                    {['zinc', 'blue', 'indigo', 'rose', 'orange', 'emerald'].map((color) => (
                       <button
                         key={color}
                         onClick={() => setThemeColor(color as ThemeColor)}
                         className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${themeColor === color ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                         style={{ backgroundColor: color === 'zinc' ? '#334155' : `var(--color-${color}-500, ${color})` }}
                       />
                    ))}
                 </div>
              </div>
              
              <div className="border-t border-slate-100 pt-6">
                 <p className="text-xs text-slate-400 text-center">Version 1.2.0</p>
              </div>
           </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      <PhotoModal 
        photo={selectedPhoto}
        categories={categories}
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
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