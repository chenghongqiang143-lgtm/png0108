
import React, { useRef, useState, useEffect } from 'react';
import { Category, ThemeColor } from '../types';
import { LayoutGrid, Folder, Plus, Tag, Settings, Image as ImageIcon, X, Palette, Trash2, Edit2, ChevronDown, Layers, Heart, StickyNote, CheckSquare, Square, Check } from 'lucide-react';

interface SidebarProps {
  categories: Category[];
  groupedTags: Record<string, string[]>;
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  onCreateCategory: () => void;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onCreateTag: () => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
  onDeleteTag: (tag: string) => void;
  onCategorizeTag: (tag: string, newCategory: string) => void;
  onBatchDeleteTags?: (tags: string[]) => void;
  onBatchCategorizeTags?: (tags: string[], category: string) => void;
  onOpenSettings: () => void;
  totalPhotos: number;
  isOpen: boolean;
  onClose: () => void;
  themeColor: ThemeColor;
  activeTagFilters?: Set<string>;
  onToggleTagFilter?: (tag: string) => void;
}

// Helper to get text color based on theme
const getThemeTextColor = (theme: ThemeColor, isActive: boolean) => {
  if (!isActive) return 'text-slate-600 hover:text-slate-900';
  switch (theme) {
    case 'blue': return 'text-blue-700 border-blue-600 bg-blue-50';
    case 'indigo': return 'text-indigo-700 border-indigo-600 bg-indigo-50';
    case 'rose': return 'text-rose-700 border-rose-600 bg-rose-50';
    case 'orange': return 'text-orange-700 border-orange-600 bg-orange-50';
    case 'emerald': return 'text-emerald-700 border-emerald-600 bg-emerald-50';
    case 'cyan': return 'text-cyan-700 border-cyan-600 bg-cyan-50';
    case 'violet': return 'text-violet-700 border-violet-600 bg-violet-50';
    case 'fuchsia': return 'text-fuchsia-700 border-fuchsia-600 bg-fuchsia-50';
    case 'lime': return 'text-lime-700 border-lime-600 bg-lime-50';
    case 'amber': return 'text-amber-700 border-amber-600 bg-amber-50';
    case 'teal': return 'text-teal-700 border-teal-600 bg-teal-50';
    case 'sky': return 'text-sky-700 border-sky-600 bg-sky-50';
    default: return 'text-slate-900 border-slate-900 bg-slate-50'; // zinc/black
  }
};

const getThemeIconColor = (theme: ThemeColor, isActive: boolean) => {
  if (!isActive) return 'text-slate-400';
  switch (theme) {
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

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  groupedTags,
  selectedCategory,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onCreateTag,
  onRenameTag,
  onDeleteTag,
  onCategorizeTag,
  onBatchDeleteTags,
  onBatchCategorizeTags,
  onOpenSettings,
  totalPhotos,
  isOpen,
  onClose,
  themeColor,
  activeTagFilters = new Set<string>(),
  onToggleTagFilter
}) => {
  const [isAlbumsOpen, setIsAlbumsOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  const [contextMenuCategory, setContextMenuCategory] = useState<Category | null>(null);
  
  // Tag Selection State (for Batch Editing, distinct from filtering)
  const [isTagSelectionMode, setIsTagSelectionMode] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Confirmation state for deleting within sidebar context menu
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    if (selectedCategory.startsWith('tag-') || activeTagFilters.size > 0) setIsTagsOpen(true);
    const isCat = categories.some(c => c.id === selectedCategory);
    if (isCat) setIsAlbumsOpen(true);
  }, [selectedCategory, categories, activeTagFilters]);
  
  // Reset delete confirmation when menu closes or changes
  useEffect(() => {
    setDeleteConfirmId(null);
  }, [contextMenuCategory]);

  const handleStartPress = (item: Category | string, type: 'category' | 'tag') => {
    if (type === 'category') {
       const cat = item as Category;
       if (cat.id === 'uncategorized') return;
    }
    
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (type === 'category') {
          setContextMenuCategory(item as Category);
      }
      if (type === 'tag') {
          // Enter multi-select mode for tags (batch edit)
          if (!isTagSelectionMode) {
              setIsTagSelectionMode(true);
              setSelectedTags(new Set([item as string]));
              if (navigator.vibrate) navigator.vibrate(50);
          }
      }
    }, 600);
  };

  const handleCancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (id: string, type: 'category' | 'tag') => {
    if (isLongPress.current) return;
    
    if (type === 'tag') {
        const tagName = id.replace('tag-', '');
        
        if (isTagSelectionMode) {
            // In Batch Edit Mode: Toggle selection for renaming/deleting
            setSelectedTags(prev => {
                const next = new Set(prev);
                if (next.has(tagName)) next.delete(tagName);
                else next.add(tagName);
                return next;
            });
        } else {
            // Normal Mode: Toggle Filter
            if (onToggleTagFilter) {
                onToggleTagFilter(tagName);
            } else {
                // Fallback for old behavior if prop not passed
                onSelectCategory(id);
            }
        }
    } else {
        // Categories/Albums
        onSelectCategory(id);
    }
  };

  const handleRenameCat = () => {
    if (!contextMenuCategory) return;
    const newName = prompt("重命名相册", contextMenuCategory.name);
    if (newName && newName.trim()) onRenameCategory(contextMenuCategory.id, newName.trim());
    setContextMenuCategory(null);
  };

  const handleDeleteCat = () => {
    if (!contextMenuCategory) return;
    
    if (deleteConfirmId === contextMenuCategory.id) {
       onDeleteCategory(contextMenuCategory.id);
       setContextMenuCategory(null);
       setDeleteConfirmId(null);
    } else {
       setDeleteConfirmId(contextMenuCategory.id);
    }
  };

  const handleBatchRenameTag = () => {
      if (selectedTags.size !== 1) return;
      const tagToRename = Array.from(selectedTags)[0];
      const newName = prompt("重命名标签", tagToRename);
      if (newName && newName.trim() && newName !== tagToRename) {
          onRenameTag(tagToRename, newName.trim());
          setSelectedTags(new Set());
          setIsTagSelectionMode(false);
      }
  };

  const handleBatchCategorize = () => {
      if (selectedTags.size === 0) return;
      const newCat = prompt("设置标签分类 (例如: '地点', '人物', '风格')", "");
      if (newCat !== null) {
          const tags = Array.from(selectedTags);
          if (onBatchCategorizeTags) {
              onBatchCategorizeTags(tags, newCat.trim());
          } else {
              tags.forEach(t => onCategorizeTag(t, newCat.trim()));
          }
          setSelectedTags(new Set());
          setIsTagSelectionMode(false);
      }
  };

  const handleBatchDelete = () => {
      if (selectedTags.size === 0) return;
      if (confirm(`确定删除选中的 ${selectedTags.size} 个标签吗？\n(照片不会被删除)`)) {
          const tags = Array.from(selectedTags);
          if (onBatchDeleteTags) {
              onBatchDeleteTags(tags);
          } else {
              tags.forEach(t => onDeleteTag(t));
          }
          setSelectedTags(new Set());
          setIsTagSelectionMode(false);
      }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col h-full 
        transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:z-auto
        bg-white/80 backdrop-blur-xl border-r border-slate-200 pt-safe pb-safe
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 flex items-center justify-center text-white rounded-none ${
              themeColor === 'zinc' ? 'bg-slate-900' : `bg-${themeColor}-600`
            }`}>
              <ImageIcon size={18} />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter whitespace-nowrap">灵感相册</h1>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-900 p-1">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 select-none custom-scrollbar">
          
          {/* Library Section */}
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-widest mb-3 px-2 whitespace-nowrap">图库</h3>
            <button
              onClick={() => onSelectCategory('all')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-2 rounded-none whitespace-nowrap ${getThemeTextColor(themeColor, selectedCategory === 'all' && activeTagFilters.size === 0)}`}
            >
              <LayoutGrid size={18} strokeWidth={2} />
              <span>所有照片</span>
              <span className="ml-auto text-[10px] font-mono text-slate-400">{totalPhotos}</span>
            </button>
            <button
              onClick={() => onSelectCategory('favorites')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-2 rounded-none whitespace-nowrap mt-1 ${getThemeTextColor(themeColor, selectedCategory === 'favorites')}`}
            >
              <Heart size={18} strokeWidth={2} className={selectedCategory === 'favorites' ? 'fill-current' : ''} />
              <span>我的收藏</span>
            </button>
          </div>

          {/* Albums Section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2 group">
              <button 
                onClick={() => setIsAlbumsOpen(!isAlbumsOpen)}
                className="flex items-center gap-2 flex-1 whitespace-nowrap"
              >
                <h3 className="text-base font-black text-slate-900 uppercase tracking-widest group-hover:text-slate-600 transition-colors">我的相册</h3>
                <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${isAlbumsOpen ? 'rotate-180' : ''}`} />
              </button>
              <button onClick={onCreateCategory} className="text-slate-400 hover:text-slate-900 transition-colors p-1" title="新建相册">
                <Plus size={14} />
              </button>
            </div>
            
            {isAlbumsOpen && (
              <div className="space-y-0.5 relative animate-in slide-in-from-top-1 fade-in duration-200">
                {categories.map((category: Category) => (
                  <div key={category.id} className="relative">
                     <button
                      onPointerDown={() => handleStartPress(category, 'category')}
                      onPointerUp={() => { handleCancelPress(); handleClick(category.id, 'category'); }}
                      onPointerLeave={handleCancelPress}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 border-l-2 rounded-none whitespace-nowrap ${getThemeTextColor(themeColor, selectedCategory === category.id && activeTagFilters.size === 0)}`}
                    >
                      <Folder size={16} className={getThemeIconColor(themeColor, selectedCategory === category.id && activeTagFilters.size === 0)} />
                      <span className="truncate">{category.name}</span>
                    </button>
                    
                    {contextMenuCategory?.id === category.id && (
                      <div className="absolute left-6 right-0 top-full mt-0 bg-white border border-slate-200 shadow-xl z-20 flex flex-col animate-fade-in rounded-none w-32">
                         <button onClick={handleRenameCat} className="flex items-center gap-2 px-4 py-3 text-xs text-slate-700 hover:bg-slate-50 text-left border-b border-slate-50 whitespace-nowrap w-full"><Edit2 size={12} /> 重命名</button>
                         <button onClick={handleDeleteCat} className={`flex items-center gap-2 px-4 py-3 text-xs text-left border-b border-slate-50 whitespace-nowrap w-full transition-colors ${deleteConfirmId === category.id ? 'bg-red-50 text-red-600 font-bold' : 'text-rose-600 hover:bg-rose-50'}`}>
                            <Trash2 size={12} /> {deleteConfirmId === category.id ? '确认删除?' : '删除'}
                         </button>
                         <button onClick={() => setContextMenuCategory(null)} className="px-4 py-2 text-[10px] text-center text-slate-400 bg-slate-50 hover:bg-slate-100 uppercase tracking-wider whitespace-nowrap w-full">取消</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div>
            <div className="flex items-center justify-between w-full px-2 mb-3 group">
                 <button 
                  onClick={() => setIsTagsOpen(!isTagsOpen)}
                  className="flex items-center gap-2"
                >
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-widest group-hover:text-slate-600 transition-colors whitespace-nowrap">标签分类</h3>
                    <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${isTagsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isTagSelectionMode ? (
                    <div className="flex gap-1">
                        <span className="text-xs font-bold text-slate-500 mr-2">{selectedTags.size}</span>
                        <button onClick={() => { setIsTagSelectionMode(false); setSelectedTags(new Set()); }} className="text-slate-400 hover:text-slate-900 p-1"><X size={14}/></button>
                    </div>
                ) : (
                    <button onClick={onCreateTag} className="text-slate-400 hover:text-slate-900 transition-colors p-1" title="新建标签">
                        <Plus size={14} />
                    </button>
                )}
            </div>
            
            {isTagsOpen && (
              <div className="space-y-4 px-2 animate-in slide-in-from-top-1 fade-in duration-200">
                {Object.keys(groupedTags).length === 0 ? (
                   <p className="text-xs text-slate-400 italic px-2 whitespace-nowrap">暂无标签</p>
                ) : (
                  Object.entries(groupedTags).map(([groupName, tags]: [string, string[]]) => (
                    <div key={groupName}>
                      {groupName !== '未分类' && (
                        <h4 className="text-[10px] font-bold text-slate-800 mb-2 px-1 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-1 whitespace-nowrap">
                          <Layers size={10} /> {groupName}
                        </h4>
                      )}
                      <div className="flex flex-wrap gap-1 px-1">
                        {tags.map(tag => {
                            const isSelectedInBatchMode = isTagSelectionMode && selectedTags.has(tag);
                            const isSelectedFilter = !isTagSelectionMode && activeTagFilters.has(tag);
                            
                            return (
                                <div key={tag} className="relative">
                                    <button
                                    onPointerDown={() => handleStartPress(tag, 'tag')}
                                    onPointerUp={() => { handleCancelPress(); handleClick(`tag-${tag}`, 'tag'); }}
                                    onPointerLeave={handleCancelPress}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-all border rounded-none whitespace-nowrap ${
                                        isTagSelectionMode 
                                            ? (isSelectedInBatchMode ? `bg-${themeColor === 'zinc' ? 'slate-900' : themeColor + '-600'} text-white border-transparent` : 'bg-gray-50 text-gray-400 border-gray-200')
                                            : (isSelectedFilter ? 'bg-slate-800 text-white border-slate-800 shadow-md ring-1 ring-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')
                                    }`}
                                    >
                                    {isTagSelectionMode ? (isSelectedInBatchMode ? <CheckSquare size={10}/> : <Square size={10}/>) : (
                                        isSelectedFilter ? <Check size={10} /> : <Tag size={10} />
                                    )}
                                    <span>{tag}</span>
                                    </button>
                                </div>
                            );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-widest mb-3 px-2 whitespace-nowrap">工具箱</h3>
            <div className="space-y-1">
              <button
                onClick={() => onSelectCategory('tool-color')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all border-l-2 rounded-none whitespace-nowrap ${getThemeTextColor(themeColor, selectedCategory === 'tool-color')}`}
              >
                <Palette size={18} />
                <span>配色助手</span>
              </button>
               <button
                onClick={() => onSelectCategory('tool-note')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all border-l-2 rounded-none whitespace-nowrap ${getThemeTextColor(themeColor, selectedCategory === 'tool-note')}`}
              >
                <StickyNote size={18} />
                <span>灵感便签</span>
              </button>
            </div>
          </div>
        </nav>

        {isTagSelectionMode ? (
            <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-1">
                <button 
                    onClick={handleBatchRenameTag}
                    disabled={selectedTags.size !== 1}
                    className="flex flex-col items-center justify-center p-2 text-[10px] font-bold uppercase text-slate-600 disabled:opacity-30 hover:bg-white rounded-sm flex-1"
                >
                    <Edit2 size={14} className="mb-1"/> 重命名
                </button>
                 <button 
                    onClick={handleBatchCategorize}
                    disabled={selectedTags.size === 0}
                    className="flex flex-col items-center justify-center p-2 text-[10px] font-bold uppercase text-slate-600 disabled:opacity-30 hover:bg-white rounded-sm flex-1"
                >
                    <Layers size={14} className="mb-1"/> 分类
                </button>
                 <button 
                    onClick={handleBatchDelete}
                    disabled={selectedTags.size === 0}
                    className="flex flex-col items-center justify-center p-2 text-[10px] font-bold uppercase text-red-500 disabled:opacity-30 hover:bg-white rounded-sm flex-1"
                >
                    <Trash2 size={14} className="mb-1"/> 删除
                </button>
            </div>
        ) : (
            <div className="p-4 border-t border-slate-100">
            <button 
                onClick={onOpenSettings}
                className="flex items-center gap-3 px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors w-full whitespace-nowrap"
            >
                <Settings size={14} />
                <span>设置</span>
            </button>
            </div>
        )}
      </aside>
    </>
  );
};
