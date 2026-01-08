import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PhotoModal } from './components/PhotoModal';
import { ColorTool } from './components/ColorTool';
import { NoteTool } from './components/NoteTool';
import { Photo, Category, ThemeColor, ColorGroup } from './types';
import { analyzeImage, fileToGenerativePart } from './services/geminiService';
import { Search, Upload, ImagePlus, Menu, Edit2, Trash2, LayoutGrid, Grid3x3, Square, Folder, ChevronRight, Image as ImageIcon, Check, Loader2, Clock, Sparkles, X, CheckSquare, MousePointer2 } from 'lucide-react';

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

  // Startup Effect
  useEffect(() => {
    // Simulate loading resources or checking auth
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // 800ms loading simulation
    return () => clearTimeout(timer);
  }, []);

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
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const newPhotoId = crypto.randomUUID();
    
    // Create preliminary photo object
    const newPhoto: Photo = {
      id: newPhotoId,
      url: objectUrl,
      title: 'AI 识别中...',
      description: '',
      tags: [],
      categoryId: 'uncategorized',
      createdAt: Date.now(),
      isAnalyzing: true // Start analysis mode
    };

    setPhotos(prev => [newPhoto, ...prev]);
    // Optional: open modal immediately or wait. Let's wait on list to show loading state.
    
    if (fileInputRef.current) fileInputRef.current.value = '';

    // --- AI ANALYSIS START ---
    try {
      // 1. Convert to Base64
      const base64Data = await fileToGenerativePart(file);
      
      // 2. Get available categories for context
      const categorySlugs = categories.map(c => c.slug).filter(s => s !== 'uncategorized');
      
      // 3. Call Gemini
      const analysis = await analyzeImage(base64Data, categorySlugs);
      
      // 4. Update Photo with AI results
      setPhotos(prev => prev.map(p => {
        if (p.id === newPhotoId) {
          // Map suggested slug back to ID
          const matchedCategory = categories.find(c => c.slug === analysis.suggestedCategorySlug);
          
          return {
            ...p,
            title: analysis.title,
            description: analysis.description,
            tags: analysis.tags,
            categoryId: matchedCategory ? matchedCategory.id : 'uncategorized',
            isAnalyzing: false
          };
        }
        return p;
      }));
      
    } catch (error) {
      console.error("Failed to analyze image:", error);
      // Fallback update on error
      setPhotos(prev => prev.map(p => {
        if (p.id === newPhotoId) {
           return { ...p, title: '未命名照片', isAnalyzing: false };
        }
        return p;
      }));
    }
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
      setContextMenuPhoto(photo);
    }, 600);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleGridItemClick = (photo: Photo) => {
    // Allow click to pass through if in selection mode, ignoring previous long press flags
    // otherwise respect long press flag to prevent opening modal after context menu triggers
    if (!isSelectionMode && isLongPress.current) return;
    
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
      case 'blue': return 'bg-blue-600 hover:bg-blue-700';
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-700';
      case 'rose': return 'bg-rose-600 hover:bg-rose-700';
      case 'orange': return 'bg-orange-600 hover:bg-orange-700';
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-700';
      case 'cyan': return 'bg-cyan-600 hover:bg-cyan-700';
      case 'violet': return 'bg-violet-600 hover:bg-violet-700';
      case 'fuchsia': return 'bg-fuchsia-600 hover:bg-fuchsia-700';
      case 'lime': return 'bg-lime-600 hover:bg-lime-700';
      case 'amber': return 'bg-amber-600 hover:bg-amber-700';
      case 'teal': return 'bg-teal-600 hover:bg-teal-700';
      case 'sky': return 'bg-sky-600 hover:bg-sky-700';
      default: return 'bg-slate-900 hover:bg-slate-800';
    }
  };

  const getFocusColor = () => {
    switch (themeColor) {
      case 'blue': return 'focus:border-blue-600';
      case 'indigo': return 'focus:border-indigo-600';
      case 'rose': return 'focus:border-rose-600';
      case 'orange': return 'focus:border-orange-600';
      case 'emerald': return 'focus:border-emerald-600';
      case 'cyan': return 'focus:border-cyan-600';
      case 'violet': return 'focus:border-violet-600';
      case 'fuchsia': return 'focus:border-fuchsia-600';
      case 'lime': return 'focus:border-lime-600';
      case 'amber': return 'focus:border-amber-600';
      case 'teal': return 'focus:border-teal-600';
      case 'sky': return 'focus:border-sky-600';
      default: return 'focus:border-slate-900';
    }
  };
  
  const getTextThemeColor = () => {
     switch (themeColor) {
      case 'blue': return 'text-blue-600';
      case 'indigo': return 'text-indigo-600';
      case 'rose': return 'text-rose-600';
      case 'orange': return 'text-orange-600';
      case 'emerald': return 'text-emerald-600';
      case 'cyan': return 'text-cyan-600';
      case 'violet': return 'text-violet-600';
      case 'fuchsia': return 'text-fuchsia-600';
      case 'lime': return 'text-lime-600';
      case 'amber': return 'text-amber-600';
      case 'teal': return 'text-teal-600';
      case 'sky': return 'text-sky-600';
      default: return 'text-slate-900';
    }
  };

  // --- Loading Screen ---
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <ImageIcon size={16} className="text-slate-900" />
          </div>
        </div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">加载中...</p>
      </div>
    );
  }

  return (
    // Immersive Gradient Background with Sharp Edges & Safe Areas
    <div className="flex h-screen bg-gradient-to-br from-indigo-50/50 via-white to-white overflow-hidden font-sans select-none text-slate-900">
      {/* Sidebar */}
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
      <main className="flex-1 flex flex-col min-w-0 pt-safe pb-safe">
        
        {/* Top Header - Glass Effect, Sharp borders */}
        <header className="bg-white/70 backdrop-blur-md border-b border-white/50 sticky top-0 z-30 px-6 py-4 flex items-center justify-between flex-shrink-0 gap-4 transition-all">
          <button 
            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100/50"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          {/* Conditional Header Content */}
          {isToolView ? (
             <h1 className="text-xl font-bold text-slate-900 ml-2 tracking-tight uppercase whitespace-nowrap">{getPageTitle()}</h1>
          ) : (
            <>
              {isSelectionMode ? (
                 <div className="flex-1 flex items-center gap-4 animate-fade-in">
                    <span className="font-bold text-slate-700 whitespace-nowrap">已选择 {selectedIds.size} 项</span>
                     <button 
                       onClick={handleSelectAll}
                       className="text-xs uppercase font-bold text-slate-400 hover:text-slate-900 whitespace-nowrap"
                    >
                       全选
                    </button>
                    <button 
                       onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); setBatchDeleteConfirm(false); }}
                       className="text-xs uppercase font-bold text-slate-400 hover:text-slate-900 whitespace-nowrap"
                    >
                       取消
                    </button>
                 </div>
              ) : (
                <div className="flex-1 max-w-lg relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
                  <input 
                    type="text"
                    placeholder="搜索记忆..."
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} // Delay to allow click on history items
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(searchQuery)}
                    className={`w-full bg-slate-100 hover:bg-white focus:bg-white border border-transparent ${getFocusColor()} py-2 pl-10 pr-4 text-sm focus:ring-0 transition-all outline-none rounded-none placeholder:text-slate-400`}
                  />
                  
                  {/* Recent Searches Overlay */}
                  {isSearchFocused && !searchQuery && recentSearches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 mt-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100 rounded-none">
                      <div className="p-2 border-b border-slate-50 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={10} /> 最近搜索
                      </div>
                      {recentSearches.map(term => (
                        <button
                          key={term}
                          onClick={() => handleSearchSubmit(term)}
                          className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0 whitespace-nowrap"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-3">
                {!isSelectionMode && (
                   <button 
                    onClick={() => setIsSelectionMode(true)}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-none"
                    title="批量管理"
                  >
                    <CheckSquare size={20} />
                  </button>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                {!isSelectionMode && (
                  <button 
                    onClick={handleUploadClick}
                    className={`flex items-center gap-2 ${getButtonColor()} text-white px-5 py-2 text-sm font-bold transition-all shadow-sm active:translate-y-0.5 rounded-none tracking-wide whitespace-nowrap`}
                  >
                    <Upload size={16} />
                    <span className="hidden sm:inline">上传</span>
                  </button>
                )}
                
                {isSelectionMode && (
                  <button 
                    onClick={handleBatchDelete}
                    disabled={selectedIds.size === 0}
                    className={`flex items-center gap-2 ${batchDeleteConfirm ? 'bg-red-600 hover:bg-red-700' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'} px-5 py-2 text-sm font-bold transition-all shadow-sm active:translate-y-0.5 rounded-none tracking-wide whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Trash2 size={16} className={batchDeleteConfirm ? "text-white" : "text-rose-600"}/>
                    <span className={batchDeleteConfirm ? "text-white" : ""}>
                       {batchDeleteConfirm ? '确认删除?' : (selectedCategory === 'favorites' ? '取消收藏' : '删除选中')}
                    </span>
                  </button>
                )}
              </div>
            </>
          )}
        </header>

        {/* Content Area */}
        {selectedCategory === 'tool-color' ? (
          <ColorTool groups={colorGroups} onUpdateGroups={setColorGroups} />
        ) : selectedCategory === 'tool-note' ? (
          <NoteTool />
        ) : (
          /* Gallery Grid */
          <div className="flex-1 overflow-y-auto p-4 md:px-8 md:py-6 custom-scrollbar pb-24">
            {/* Header Row: Title on Left, Layout Controls on Right (Bottom Aligned) */}
            <div className="mb-8 flex flex-row items-end justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none whitespace-nowrap">
                  {getPageTitle()}
                </h2>
                <p className="text-slate-500 text-xs mt-1.5 font-mono whitespace-nowrap">
                  {filteredPhotos.length} 张照片
                </p>
              </div>

              {/* Layout Controls - Hard Rectangles */}
              {!isSelectionMode && (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setGridSize('large')}
                    className={`p-2 transition-all border border-transparent ${gridSize === 'large' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900 hover:border-slate-300'} rounded-none`}
                    title="大图"
                  >
                    <Square size={18} />
                  </button>
                  <button 
                    onClick={() => setGridSize('medium')}
                    className={`p-2 transition-all border border-transparent ${gridSize === 'medium' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900 hover:border-slate-300'} rounded-none`}
                    title="中图"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button 
                    onClick={() => setGridSize('small')}
                    className={`p-2 transition-all border border-transparent ${gridSize === 'small' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900 hover:border-slate-300'} rounded-none`}
                    title="小图"
                  >
                    <Grid3x3 size={18} />
                  </button>
                </div>
              )}
            </div>
            
            {/* Albums/Folders Grid View with Thumbnails */}
            {selectedCategory === 'all' && !searchQuery && !isSelectionMode && (
              <div className="mb-12 animate-fade-in">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 whitespace-nowrap">相册分类</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {categories.map(category => {
                    const categoryPhotos = photos.filter(p => p.categoryId === category.id);
                    const count = categoryPhotos.length;
                    const previews = categoryPhotos.slice(0, 4);

                    return (
                      <button 
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className="group flex flex-col gap-3 text-left"
                      >
                         {/* Folder Preview Card - Hard edges */}
                         <div className={`
                            relative w-full aspect-square overflow-hidden
                            border border-slate-200 group-hover:border-slate-900 transition-colors duration-200
                            ${previews.length === 0 ? 'bg-slate-50 flex items-center justify-center' : 'bg-white'}
                            rounded-none
                         `}>
                           {previews.length === 0 ? (
                             <Folder size={32} className={`text-slate-300 group-hover:opacity-80 transition-colors ${getTextThemeColor()}`} />
                           ) : (
                             // 2x2 Grid for thumbnails
                             <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-px bg-slate-100 border-collapse">
                                {previews.map((p, idx) => (
                                  <div key={p.id} className={`relative overflow-hidden ${previews.length === 1 ? 'col-span-2 row-span-2' : ''} ${previews.length === 3 && idx === 0 ? 'col-span-2' : ''} bg-white`}>
                                     {failedImages.has(p.id) ? (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                           <ImageIcon size={20} className={getTextThemeColor()} />
                                        </div>
                                     ) : (
                                       <img 
                                         src={p.url} 
                                         alt="" 
                                         onError={() => handleImageError(p.id)}
                                         className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                                         loading="lazy" 
                                       />
                                     )}
                                  </div>
                                ))}
                             </div>
                           )}
                         </div>

                         {/* Label */}
                         <div>
                           <span className="block font-bold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">
                             {category.name}
                           </span>
                           <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{count} 张</span>
                         </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredPhotos.length === 0 && searchQuery ? (
               <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <p>未找到相关照片</p>
               </div>
            ) : filteredPhotos.length === 0 && selectedCategory !== 'all' ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300 bg-slate-50/50 rounded-none">
                <ImagePlus size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-slate-500">
                   {selectedCategory === 'favorites' ? '暂无收藏' : '相册为空'}
                </p>
                <p className="text-xs mt-1 text-center px-4 uppercase tracking-wide">
                   {selectedCategory === 'favorites' ? '去添加一些喜欢的照片吧' : '上传照片以开始'}
                </p>
              </div>
            ) : (
              // Grouped by Date Rendering
              <div className="space-y-10">
                {groupedPhotos.map(([dateStr, groupPhotos]) => (
                   <div key={dateStr}>
                      <h4 className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 py-2 mb-4 text-sm font-bold text-slate-500 border-b border-slate-100 w-full whitespace-nowrap">
                        {dateStr}
                        <span className="ml-2 font-normal text-slate-300 text-xs">{groupPhotos.length} 张</span>
                      </h4>
                      <div className={`grid ${getGridClass()}`}>
                        {groupPhotos.map((photo) => (
                          <div 
                            key={photo.id}
                            onPointerDown={() => startPress(photo)}
                            onPointerUp={() => { cancelPress(); handleGridItemClick(photo); }}
                            onPointerLeave={cancelPress}
                            onContextMenu={(e) => {
                              e.preventDefault();
                            }}
                            className={`group relative aspect-square bg-slate-100 overflow-hidden cursor-pointer transition-all duration-200 rounded-none border ${isSelectionMode && selectedIds.has(photo.id) ? 'border-4 border-slate-900' : 'border-transparent hover:border-transparent'} ${!isSelectionMode ? 'hover:ring-2 hover:ring-slate-900 hover:ring-offset-2' : ''}`}
                          >
                            {failedImages.has(photo.id) ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-4 text-center">
                                <ImageIcon size={32} className={`mb-2 opacity-50 ${getTextThemeColor()}`} />
                                <span className="text-[10px] text-slate-400">加载失败</span>
                              </div>
                            ) : (
                              <img 
                                src={photo.url} 
                                alt={photo.title} 
                                onError={() => handleImageError(photo.id)}
                                className={`w-full h-full object-cover transition-transform duration-300 ${isSelectionMode && selectedIds.has(photo.id) ? 'scale-90 opacity-90' : 'scale-100'}`}
                                loading="lazy"
                              />
                            )}
                            
                            {/* Selection Overlay */}
                            {isSelectionMode && (
                              <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(photo.id) ? `bg-slate-900 border-slate-900` : 'bg-black/30 border-white'}`}>
                                 {selectedIds.has(photo.id) && <Check size={14} className="text-white" />}
                              </div>
                            )}

                            {/* AI Analyzing Overlay */}
                            {photo.isAnalyzing && (
                              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
                                <Sparkles className="text-white animate-spin mb-1" size={24} />
                                <span className="text-[10px] text-white font-bold uppercase tracking-wider animate-pulse">AI 分析中...</span>
                              </div>
                            )}

                            {/* Immersive Overlay - Hard Style (Only show if not selecting) */}
                            {!isSelectionMode && !photo.isAnalyzing && (
                              <div className="absolute inset-x-0 bottom-0 bg-slate-900/90 py-2 px-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                                <p className="text-white font-bold text-xs truncate uppercase tracking-wider">{photo.title}</p>
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

      {/* Context Menu Modal - Hard Edges */}
      {contextMenuPhoto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-xs shadow-2xl p-0 animate-fade-in border border-slate-200 rounded-none">
             <div className="p-4 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 text-center uppercase tracking-widest whitespace-nowrap">操作</h3>
             </div>
             <div className="flex flex-col">
               <button 
                 onClick={handleEditFromContext}
                 className="flex items-center justify-center gap-2 bg-white text-slate-700 py-4 font-medium hover:bg-slate-50 transition-colors border-b border-slate-100 rounded-none whitespace-nowrap"
               >
                 <Edit2 size={16} /> 编辑信息
               </button>
               <button 
                 onClick={() => {
                    if (contextMenuDeleteConfirm) {
                       handleDeletePhoto(contextMenuPhoto.id);
                    } else {
                       setContextMenuDeleteConfirm(true);
                    }
                 }}
                 className={`flex items-center justify-center gap-2 bg-white py-4 font-bold transition-colors border-b border-slate-100 rounded-none whitespace-nowrap ${contextMenuDeleteConfirm ? 'text-red-600 bg-red-50' : 'text-rose-600 hover:bg-rose-50'}`}
               >
                 <Trash2 size={16} /> 
                 {contextMenuDeleteConfirm ? '确认?' : (selectedCategory === 'favorites' ? '取消收藏' : '删除照片')}
               </button>
               <button 
                 onClick={() => setContextMenuPhoto(null)}
                 className="py-4 text-slate-400 hover:text-slate-900 font-medium bg-slate-50 rounded-none whitespace-nowrap"
               >
                 取消
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Settings Modal (Theme) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md shadow-2xl p-0 border border-slate-200 rounded-none max-h-[90vh] overflow-y-auto">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">设置</h3>
                <button onClick={() => setIsSettingsOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-900"/></button>
             </div>
             <div className="p-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 whitespace-nowrap">UI 主题色</h4>
                <div className="grid grid-cols-4 gap-4">
                  {(['zinc', 'blue', 'indigo', 'rose', 'orange', 'emerald', 'cyan', 'violet', 'fuchsia', 'lime', 'amber', 'teal', 'sky'] as ThemeColor[]).map(color => (
                    <button
                      key={color}
                      onClick={() => setThemeColor(color)}
                      className={`flex flex-col items-center gap-2 p-2 border-2 transition-all rounded-none ${
                        themeColor === color ? 'border-slate-900 bg-slate-50' : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full shadow-sm ${
                        color === 'zinc' ? 'bg-slate-900' : `bg-${color}-600`
                      }`}></div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">{color}</span>
                    </button>
                  ))}
                </div>
             </div>
             <div className="p-4 border-t border-slate-100 bg-slate-50">
               <button 
                 onClick={() => setIsSettingsOpen(false)}
                 className="w-full py-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-800 rounded-none whitespace-nowrap"
               >
                 确定
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Modal */}
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