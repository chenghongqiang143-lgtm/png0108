import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Photo, Category } from '../types';
import { X, Calendar, Tag, Edit2, Check, Folder, Clock, Trash2, ChevronLeft, ChevronRight, Heart, Pipette, Copy, Bookmark, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';

interface PhotoModalProps {
  photo: Photo | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedPhoto: Photo) => void;
  onDelete: (photoId: string) => void;
  availableTags: string[];
  initialEditMode?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onCollectColor?: (hex: string) => void;
}

// Helper functions for color conversion
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
};

export const PhotoModal: React.FC<PhotoModalProps> = ({
  photo,
  categories,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  availableTags,
  initialEditMode = false,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onCollectColor
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDesc, setEditedDesc] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  
  // Confirmation state for deleting within modal
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

  // Color Picker State
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (photo) {
      setEditedTitle(photo.title);
      setEditedDesc(photo.description);
      setEditedCategory(photo.categoryId);
      setCurrentTags([...photo.tags]);
      setIsEditing(initialEditMode);
      setNewTag(''); 
      setIsDeleteConfirm(false); 
      setIsPickerActive(false);
      setPickedColor(null);
      setZoomLevel(1); // Reset zoom
      setPan({ x: 0, y: 0 }); // Reset pan
    }
  }, [photo, isOpen, initialEditMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'ArrowLeft' && hasPrev && onPrev && !isEditing) onPrev();
        if (e.key === 'ArrowRight' && hasNext && onNext && !isEditing) onNext();
        if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onPrev, onNext, onClose, isEditing]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const colorDetails = useMemo(() => {
    if (!pickedColor) return null;
    const rgb = hexToRgb(pickedColor);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    return { rgb, hsv };
  }, [pickedColor]);

  if (!isOpen || !photo) return null;

  const handleSave = () => {
    let finalTags = [...currentTags];
    const pendingTag = newTag.trim();
    if (pendingTag && !finalTags.includes(pendingTag)) {
      finalTags.push(pendingTag);
    }

    onUpdate({
      ...photo,
      title: editedTitle,
      description: editedDesc,
      categoryId: editedCategory,
      tags: finalTags
    });
    setIsEditing(false);
  };
  
  const handleDeleteClick = () => {
     if (isDeleteConfirm) {
         onDelete(photo.id);
         onClose(); 
     } else {
         setIsDeleteConfirm(true);
     }
  };

  const handleToggleFavorite = () => {
      onUpdate({
          ...photo,
          isFavorite: !photo.isFavorite
      });
  };

  const handleAddTag = (e?: React.KeyboardEvent, tagToAdd?: string) => {
    const tag = tagToAdd || newTag;
    if ((!e || e.key === 'Enter') && tag.trim()) {
      e?.preventDefault(); 
      if (!currentTags.includes(tag.trim())) {
        setCurrentTags([...currentTags, tag.trim()]);
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(t => t !== tagToRemove));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        imgContainerRef.current?.requestFullscreen().catch(err => {
            console.error("Error attempting to enable fullscreen:", err);
        });
    } else {
        document.exitFullscreen();
    }
  };

  // Zoom Logic
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPan({ x: 0, y: 0 }); // Reset pan when fully zoomed out
      return newZoom;
    });
  };

  // Panning Logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPickerActive || zoomLevel <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
    e.preventDefault();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Color Picker Logic
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isPickerActive || !imgRef.current) return;

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // We must set canvas size to natural image size to get accurate pixel
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw the image onto the canvas
    try {
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
        
        // Calculate click position relative to the displayed image size vs natural size
        // Use getBoundingClientRect to account for zoom transform
        const rect = img.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (img.naturalWidth / rect.width);
        const y = (e.clientY - rect.top) * (img.naturalHeight / rect.height);

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
        
        setPickedColor(hex);
    } catch (err) {
        console.error("Color pick failed (likely CORS):", err);
        alert("无法从该图片提取颜色（跨域限制）。请尝试上传本地图片。");
        setIsPickerActive(false);
    }
  };

  const currentCategory = categories.find(c => c.id === editedCategory) || categories.find(c => c.id === photo.categoryId);
  const tagSuggestions = availableTags.filter(t => !currentTags.includes(t) && t.toLowerCase().includes(newTag.toLowerCase())).slice(0, 10);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 md:bg-black/90 backdrop-blur-md md:p-12 animate-in fade-in duration-200">
      
      {/* Main Container */}
      <div className="bg-transparent md:bg-white w-full h-full md:h-auto md:max-h-[85vh] md:max-w-6xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative rounded-none">
        
        {/* Mobile Close Button (Top Right) */}
        {!isEditing && (
            <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-30 md:hidden bg-black/50 p-2 text-white/80 rounded-full backdrop-blur-sm pt-safe"
            >
            <X size={20} />
            </button>
        )}

        {/* IMAGE SECTION (Full screen on mobile view, Partial on mobile edit, Left side on Desktop) */}
        <div 
            ref={imgContainerRef}
            className={`${isEditing ? 'h-72 md:h-auto md:h-full' : 'h-full md:h-auto'} w-full md:w-2/3 bg-black/40 md:bg-zinc-950 flex items-center justify-center relative group shrink-0 overflow-hidden transition-all duration-300`}
        >
          
          {/* Zoom Controls (Top Left) */}
          <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-auto">
             <button onClick={handleZoomIn} className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-none backdrop-blur-sm transition-colors" title="放大">
                <ZoomIn size={20} />
             </button>
             <button onClick={handleZoomOut} className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-none backdrop-blur-sm transition-colors" title="缩小">
                <ZoomOut size={20} />
             </button>
          </div>

          <img 
            ref={imgRef}
            src={photo.url} 
            alt={photo.title} 
            crossOrigin="anonymous" 
            onClick={handleImageClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={`object-contain ${isDragging ? '' : 'transition-transform duration-200'} ${isPickerActive ? 'cursor-crosshair' : (zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'default')}`}
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
              maxHeight: '100%',
              maxWidth: '100%',
              touchAction: 'none' // Prevent default touch actions when dragging
            }}
          />
          
          {/* Picker Active Indicator Overlay */}
          {isPickerActive && (
             <div className="absolute top-4 left-16 md:left-20 z-20 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md pointer-events-none animate-pulse">
                点击图片取色中...
             </div>
          )}

          {/* Picked Color Result Overlay */}
          {pickedColor && colorDetails && (
            <div className="absolute bottom-24 md:bottom-8 z-30 flex items-center gap-4 bg-white/95 backdrop-blur shadow-2xl p-3 pr-4 rounded-full animate-in zoom-in slide-in-from-bottom-4 border border-gray-100">
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: pickedColor }}></div>
                
                {/* Color Values */}
                <div className="flex flex-col gap-0.5 min-w-[80px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 w-6">HEX</span>
                      <span className="text-xs font-black text-gray-900 font-mono">{pickedColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-gray-400 w-6">RGB</span>
                       <span className="text-[10px] font-medium text-gray-600 font-mono">{colorDetails.rgb.r}, {colorDetails.rgb.g}, {colorDetails.rgb.b}</span>
                    </div>
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-gray-400 w-6">HSV</span>
                       <span className="text-[10px] font-medium text-gray-600 font-mono">{colorDetails.hsv.h}°, {colorDetails.hsv.s}%, {colorDetails.hsv.v}%</span>
                    </div>
                </div>

                <div className="w-px h-8 bg-gray-200 mx-1"></div>
                
                <div className="flex items-center gap-1">
                  {onCollectColor && (
                    <button 
                      onClick={() => onCollectColor(pickedColor)}
                      className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600 transition-colors"
                      title="收藏到色彩库"
                    >
                        <Bookmark size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => navigator.clipboard.writeText(pickedColor)}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black"
                    title="复制HEX"
                  >
                      <Copy size={18} />
                  </button>
                  <button onClick={() => setPickedColor(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-300 hover:text-red-500"><X size={18}/></button>
                </div>
            </div>
          )}

          {/* Navigation Arrows (Desktop) */}
          <div className="absolute inset-0 hidden md:flex items-center justify-between px-4 pointer-events-none">
              {hasPrev ? (
                  <button onClick={(e) => { e.stopPropagation(); onPrev?.(); }} className="pointer-events-auto p-2 rounded-full bg-black/20 hover:bg-black/50 text-white/70 hover:text-white transition-all backdrop-blur-sm">
                      <ChevronLeft size={32} />
                  </button>
              ) : <div></div>}
               {hasNext ? (
                  <button onClick={(e) => { e.stopPropagation(); onNext?.(); }} className="pointer-events-auto p-2 rounded-full bg-black/20 hover:bg-black/50 text-white/70 hover:text-white transition-all backdrop-blur-sm">
                      <ChevronRight size={32} />
                  </button>
              ) : <div></div>}
          </div>

          {/* MOBILE BOTTOM BAR (Overlay) - Hide when editing */}
          {!isEditing && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-6 pb-safe pt-12 flex items-end justify-between md:hidden z-20">
               <div className="flex-1 min-w-0 mr-4">
                  <h2 className="text-white font-bold text-lg truncate drop-shadow-md">{photo.title}</h2>
               </div>
               <div className="flex items-center gap-4 shrink-0">
                  <button 
                    onClick={() => setIsPickerActive(!isPickerActive)}
                    className={`p-3 rounded-full backdrop-blur-md transition-all ${isPickerActive ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                  >
                     <Pipette size={20} />
                  </button>
                  <button 
                     onClick={handleToggleFavorite}
                     className={`p-3 rounded-full backdrop-blur-md bg-white/10 transition-all ${photo.isFavorite ? 'text-red-500 bg-white/20' : 'text-white'}`}
                  >
                     <Heart size={20} className={photo.isFavorite ? 'fill-current' : ''} />
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* DETAILS SECTION (Visible on Desktop always, Visible on Mobile ONLY when editing) */}
        <div className={`${isEditing ? 'flex' : 'hidden md:flex'} w-full md:w-1/3 flex-col h-full bg-white overflow-hidden border-l border-gray-100 pb-safe`}>
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-end shrink-0">
            <div>
               {/* Date removed from here */}
            </div>
            <div className="flex items-center gap-4">
               {!isEditing && (
                 <>
                   {/* Color Picker Toggle Desktop */}
                   <button 
                      onClick={() => setIsPickerActive(!isPickerActive)}
                      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${isPickerActive ? 'text-indigo-600 bg-indigo-50 px-2 py-1 rounded-none' : 'text-gray-400 hover:text-indigo-600'}`}
                      title="取色器"
                   >
                       <Pipette size={16} /> {isPickerActive ? '取色中' : ''}
                   </button>
                   
                   <button 
                      onClick={toggleFullscreen}
                      className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors text-gray-400 hover:text-black"
                      title={isFullscreen ? "退出全屏" : "全屏"}
                   >
                       {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                   </button>

                   <button 
                       onClick={handleToggleFavorite}
                       className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${photo.isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                       title="收藏"
                   >
                       <Heart size={16} className={photo.isFavorite ? 'fill-current' : ''} />
                   </button>
                   <div className="w-px h-4 bg-gray-200 mx-1"></div>
                   <button 
                     onClick={handleDeleteClick} 
                     className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${isDeleteConfirm ? 'text-red-600 bg-red-50 px-2 py-1 rounded-none' : 'text-gray-400 hover:text-red-600'}`}
                     title={isDeleteConfirm ? "确认删除?" : "删除"}
                   >
                     {isDeleteConfirm ? "确认?" : <Trash2 size={14} />}
                   </button>
                   <button 
                     onClick={() => setIsEditing(true)} 
                     className="flex items-center gap-1 text-gray-400 hover:text-gray-900 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                   >
                     <Edit2 size={14} /> 编辑
                   </button>
                 </>
               )}
               <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-6 custom-scrollbar">
            
            {/* Title & Description */}
            <div className="group relative">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">基本信息</label>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full text-xl font-bold border-b-2 border-gray-200 focus:border-black focus:outline-none py-2 transition-colors rounded-none bg-transparent"
                    placeholder="标题"
                  />
                  <div className="flex items-center gap-2 mb-2">
                     <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                        <Calendar size={12}/> {new Date(photo.createdAt).toLocaleDateString('zh-CN')}
                     </span>
                  </div>
                  <textarea
                    value={editedDesc}
                    onChange={(e) => setEditedDesc(e.target.value)}
                    className="w-full text-sm text-gray-600 border border-gray-200 p-3 focus:border-black focus:outline-none transition-colors bg-gray-50 focus:bg-white rounded-none"
                    rows={4}
                    placeholder="添加描述..."
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">{photo.title}</h1>
                  <p className="text-xs font-mono text-gray-400 flex items-center gap-2 uppercase tracking-wide whitespace-nowrap mt-2 mb-4">
                    <Calendar size={12} />
                    {new Date(photo.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                  <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">{photo.description || '暂无描述'}</p>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2 whitespace-nowrap">
                <Folder size={12} /> 所属相册
              </label>
              {isEditing ? (
                <select
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 text-sm focus:border-black outline-none rounded-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              ) : (
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-sm font-bold text-gray-700 bg-gray-50 uppercase tracking-wide">
                  <span>{currentCategory?.name || '未分类'}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2 whitespace-nowrap">
                <Tag size={12} /> 标签
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {currentTags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-200 text-gray-600 rounded-none">
                    #{tag}
                    {isEditing && (
                      <button onClick={() => removeTag(tag)} className="ml-2 hover:text-red-500">
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
                {currentTags.length === 0 && !isEditing && <span className="text-gray-300 text-sm italic">无标签</span>}
              </div>
              
              {isEditing && (
                <div className="relative">
                  <input 
                    type="text" 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => handleAddTag(e)}
                    placeholder="输入标签 + 回车..."
                    className="w-full text-sm border border-gray-200 px-3 py-2 focus:border-black outline-none bg-gray-50 focus:bg-white rounded-none"
                  />
                  {newTag && tagSuggestions.length > 0 && (
                     <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl mt-0 z-10 max-h-32 overflow-y-auto rounded-none">
                        <div className="p-2 text-[10px] font-bold text-gray-400 border-b border-gray-100 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap"><Clock size={10}/> 历史记录</div>
                        {tagSuggestions.map(tag => (
                          <button 
                            key={tag}
                            onClick={() => handleAddTag(undefined, tag)}
                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 text-gray-700 uppercase"
                          >
                            #{tag}
                          </button>
                        ))}
                     </div>
                  )}
                </div>
              )}
            </div>

          </div>
          
          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex gap-0">
            {isEditing ? (
              <>
                 <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 transition-colors uppercase text-xs tracking-wider rounded-none whitespace-nowrap">
                  取消
                </button>
                <button onClick={handleSave} className="flex-1 py-3 bg-black border border-transparent font-bold text-white hover:bg-gray-800 transition-colors uppercase text-xs tracking-wider rounded-none whitespace-nowrap">
                  保存修改
                </button>
              </>
            ) : (
               <button onClick={onClose} className="w-full py-3 bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 transition-colors uppercase text-xs tracking-wider rounded-none whitespace-nowrap">
                  关闭
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};