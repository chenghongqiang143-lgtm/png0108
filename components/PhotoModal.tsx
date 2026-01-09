import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Photo, Category } from '../types';
import { X, Calendar, Tag, Edit2, Folder, Clock, Trash2, ChevronLeft, ChevronRight, Heart, Pipette, Copy, Bookmark, ZoomIn, ZoomOut, Maximize, Minimize, Info, Share2, MoreVertical } from 'lucide-react';

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

// Distance helper for pinch zoom
const getDistance = (touches: React.TouchList) => {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
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
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef(1);

  // Swipe State
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Mobile View State
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(true);

  // Fullscreen State (Desktop)
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
      setZoomLevel(1); 
      setPan({ x: 0, y: 0 }); 
      setShowMobileInfo(initialEditMode); // Auto show info if starting in edit mode
      setShowMobileControls(true);
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
    if (window.innerWidth < 768) {
       setShowMobileInfo(false); // Close sheet on save for mobile
    }
  };
  
  const handleDeleteClick = () => {
     if (isDeleteConfirm) {
         onDelete(photo.id);
         onClose(); 
     } else {
         setIsDeleteConfirm(true);
         // Auto-hide confirm after 3s
         setTimeout(() => setIsDeleteConfirm(false), 3000);
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

  const handleMobileImageTap = () => {
      // Toggle controls on mobile
      if (window.innerWidth < 768) {
          setShowMobileControls(!showMobileControls);
          if (showMobileInfo) setShowMobileInfo(false); // tapping image closes info sheet
      }
  };

  // Zoom Logic
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.5, 0.5); // Allow going below 1 for exit gesture
      if (newZoom <= 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  };

  // Touch & Mouse Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPickerActive) return;
    
    if (e.touches.length === 2) {
      // Pinch Start
      initialPinchDist.current = getDistance(e.touches);
      initialZoom.current = zoomLevel;
    } else if (e.touches.length === 1) {
      // Record for Swipe or Drag
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;

      // Drag Start
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPickerActive) return;

    if (e.touches.length === 2 && initialPinchDist.current) {
       // Pinching
       const dist = getDistance(e.touches);
       const scale = dist / initialPinchDist.current;
       setZoomLevel(Math.min(Math.max(initialZoom.current * scale, 0.5), 5));
       e.preventDefault();
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
       // Panning (only if zoomed in)
       setPan({
         x: e.touches[0].clientX - dragStart.current.x,
         y: e.touches[0].clientY - dragStart.current.y
       });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    initialPinchDist.current = null;
    setIsDragging(false);

    // Swipe Gesture Check (Only when not zoomed in)
    if (zoomLevel === 1 && e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        
        // Horizontal swipe (Nav)
        if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
            if (deltaX > 0 && hasPrev && onPrev) onPrev(); 
            if (deltaX < 0 && hasNext && onNext) onNext(); 
        }
        
        // Vertical swipe (Close / Controls)
        if (Math.abs(deltaY) > 60 && Math.abs(deltaX) < 30) {
            if (deltaY > 0) {
                // Swipe Down: Close modal (like standard gallery apps)
                onClose();
            } else {
                // Swipe Up: Show Info
                setShowMobileInfo(true);
            }
        }
    }

    // Close on Zoom Out Gesture
    if (zoomLevel < 0.7) {
      onClose();
    } else if (zoomLevel < 1) {
      // Snap back to 100%
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Mouse Handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPickerActive || zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Color Picker Logic
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (isPickerActive && imgRef.current) {
        // Picker logic
        const img = imgRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        try {
            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
            const rect = img.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (img.naturalWidth / rect.width);
            const y = (e.clientY - rect.top) * (img.naturalHeight / rect.height);
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
            setPickedColor(hex);
        } catch (err) {
            console.error("Color pick failed", err);
            setIsPickerActive(false);
        }
    } else {
        // Normal Click -> Toggle Mobile Controls
        handleMobileImageTap();
    }
  };

  const currentCategory = categories.find(c => c.id === editedCategory) || categories.find(c => c.id === photo.categoryId);
  const tagSuggestions = availableTags.filter(t => !currentTags.includes(t) && t.toLowerCase().includes(newTag.toLowerCase())).slice(0, 10);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black md:bg-black/90 md:backdrop-blur-md md:p-12 animate-in fade-in duration-200 overflow-hidden">
      
      {/* Main Container */}
      <div className="bg-black w-full h-full md:h-auto md:max-h-[85vh] md:max-w-6xl flex flex-col md:flex-row md:shadow-2xl relative md:rounded-lg overflow-hidden">
        
        {/* IMAGE SECTION */}
        <div 
            ref={imgContainerRef}
            className={`w-full h-full md:w-2/3 bg-black flex items-center justify-center relative group shrink-0 overflow-hidden md:rounded-l-lg`}
        >
          
          {/* Mobile Top Bar */}
          <div className={`absolute top-0 inset-x-0 p-4 z-30 flex justify-between items-start md:hidden pt-safe transition-opacity duration-300 ${showMobileControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <button onClick={onClose} className="p-2.5 text-white/90 bg-black/20 backdrop-blur-md rounded-full active:bg-black/40">
                  <ChevronLeft size={24} />
              </button>
              {/* Optional: Add more top controls here if needed */}
          </div>

          {/* Mobile Bottom Bar */}
          <div className={`absolute bottom-0 inset-x-0 z-30 flex justify-around items-center md:hidden pb-safe pt-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-transform duration-300 ${showMobileControls && !showMobileInfo ? 'translate-y-0' : 'translate-y-full'}`}>
              <button onClick={() => setShowMobileInfo(true)} className="p-4 text-white/90 flex flex-col items-center gap-1 active:scale-95 transition-transform">
                  <Info size={24} strokeWidth={1.5} />
                  <span className="text-[10px] font-medium opacity-80">信息</span>
              </button>
              <button onClick={handleToggleFavorite} className={`p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform ${photo.isFavorite ? 'text-red-500' : 'text-white/90'}`}>
                  <Heart size={24} className={photo.isFavorite ? 'fill-current' : ''} strokeWidth={1.5} />
                  <span className="text-[10px] font-medium opacity-80">收藏</span>
              </button>
              <button onClick={() => { setIsEditing(true); setShowMobileInfo(true); }} className="p-4 text-white/90 flex flex-col items-center gap-1 active:scale-95 transition-transform">
                  <Edit2 size={24} strokeWidth={1.5} />
                  <span className="text-[10px] font-medium opacity-80">编辑</span>
              </button>
              <button onClick={handleDeleteClick} className={`p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform ${isDeleteConfirm ? 'text-red-500' : 'text-white/90'}`}>
                  <Trash2 size={24} strokeWidth={1.5} />
                  <span className="text-[10px] font-medium opacity-80">{isDeleteConfirm ? '确认' : '删除'}</span>
              </button>
          </div>

          {/* Desktop Controls (Zoom & Close) */}
          <div className="hidden md:flex absolute top-0 inset-x-0 z-30 justify-end p-4 pt-8 gap-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2 bg-black/50 p-1.5 rounded-full backdrop-blur-md pointer-events-auto">
                    <button onClick={handleZoomOut} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors" title="缩小">
                        <ZoomOut size={20} />
                    </button>
                    <button onClick={handleZoomIn} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors" title="放大">
                        <ZoomIn size={20} />
                    </button>
                    <div className="w-px bg-white/20 mx-1"></div>
                    <button onClick={onClose} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors" title="关闭">
                        <X size={20} />
                    </button>
                </div>
          </div>

          <img 
            ref={imgRef}
            src={photo.url} 
            alt={photo.title} 
            crossOrigin="anonymous" 
            onClick={handleImageClick}
            // Mouse Events
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            // Touch Events
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            
            className={`object-contain ${isDragging ? '' : 'transition-transform duration-200'} ${isPickerActive ? 'cursor-crosshair' : (zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'default')}`}
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
              maxHeight: '100%',
              maxWidth: '100%',
              touchAction: 'none'
            }}
          />
          
          {/* Mobile Overlay: Zoom hint when zoomed in */}
          {zoomLevel > 1 && window.innerWidth < 768 && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm pointer-events-none">
                {Math.round(zoomLevel * 100)}%
             </div>
          )}

          {/* Color Picker Indicator */}
          {isPickerActive && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md pointer-events-none animate-pulse shadow-lg">
                点击图片取色
             </div>
          )}

          {/* Picked Color Result Overlay */}
          {pickedColor && colorDetails && (
            <div className="absolute bottom-24 md:bottom-8 z-30 flex items-center gap-4 bg-white/95 backdrop-blur shadow-2xl p-3 pr-4 rounded-full animate-in zoom-in slide-in-from-bottom-4 border border-gray-100 mx-auto left-4 right-4 md:left-auto md:right-auto md:min-w-[300px] justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: pickedColor }}></div>
                <div className="flex flex-col gap-0.5 min-w-[80px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 w-6">HEX</span>
                      <span className="text-xs font-black text-gray-900 font-mono">{pickedColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-gray-400 w-6">RGB</span>
                       <span className="text-[10px] font-medium text-gray-600 font-mono">{colorDetails.rgb.r}, {colorDetails.rgb.g}, {colorDetails.rgb.b}</span>
                    </div>
                </div>
                <div className="w-px h-8 bg-gray-200 mx-1"></div>
                <div className="flex items-center gap-1">
                  {onCollectColor && (
                    <button onClick={() => onCollectColor(pickedColor)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600"><Bookmark size={18} /></button>
                  )}
                  <button onClick={() => setPickedColor(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-300 hover:text-red-500"><X size={18}/></button>
                </div>
            </div>
          )}

          {/* Nav Arrows */}
          <div className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none">
              {hasPrev ? (
                  <button onClick={(e) => { e.stopPropagation(); onPrev?.(); }} className="pointer-events-auto p-2 rounded-full bg-black/10 hover:bg-black/40 text-white/50 hover:text-white transition-all backdrop-blur-[2px]">
                      <ChevronLeft size={32} />
                  </button>
              ) : <div></div>}
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
               {hasNext ? (
                  <button onClick={(e) => { e.stopPropagation(); onNext?.(); }} className="pointer-events-auto p-2 rounded-full bg-black/10 hover:bg-black/40 text-white/50 hover:text-white transition-all backdrop-blur-[2px]">
                      <ChevronRight size={32} />
                  </button>
              ) : <div></div>}
          </div>
        </div>

        {/* DETAILS SECTION - Responsive: Sidebar on Desktop, Bottom Sheet on Mobile */}
        <div 
          className={`
             flex flex-col bg-white
             md:w-1/3 md:h-full md:relative md:translate-y-0
             fixed inset-x-0 bottom-0 z-[70] md:z-auto rounded-none
             transition-transform duration-300 ease-out
             ${showMobileInfo ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
             max-h-[85vh] md:max-h-full shadow-[0_-10px_40px_rgba(0,0,0,0.3)] md:shadow-none
             pb-safe
          `}
        >
          {/* Mobile Drag Handle */}
          <div className="md:hidden w-full flex justify-center py-3 shrink-0" onClick={() => !isEditing && setShowMobileInfo(false)}>
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="px-6 py-4 md:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
                {/* Desktop Buttons */}
                <div className="hidden md:flex items-center gap-3">
                    <button onClick={() => setIsPickerActive(!isPickerActive)} className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${isPickerActive ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'}`}>
                       <Pipette size={16} /> 取色器
                    </button>
                    <button onClick={toggleFullscreen} className="text-gray-400 hover:text-black" title="全屏"><Maximize size={16}/></button>
                    <button onClick={handleToggleFavorite} className={`text-gray-400 hover:text-red-500 ${photo.isFavorite ? 'text-red-500' : ''}`}><Heart size={16} className={photo.isFavorite?'fill-current':''}/></button>
                    <button onClick={handleDeleteClick} className={`text-gray-400 hover:text-red-600 ${isDeleteConfirm?'text-red-600':''}`}><Trash2 size={16}/></button>
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-gray-900"><Edit2 size={16}/></button>
                </div>
                {/* Mobile Title */}
                <span className="md:hidden text-xs font-bold text-gray-400 uppercase tracking-widest">照片信息</span>
            </div>
            
            {/* Close Button - Desktop: closes modal. Mobile: closes sheet */}
            <button 
                onClick={() => {
                    if (window.innerWidth < 768) setShowMobileInfo(false);
                    else onClose();
                }}
                className="text-gray-400 hover:text-gray-900 p-1"
            >
                <X size={24} />
            </button>
          </div>

          {/* Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Title & Description */}
            <div className="group relative">
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full text-xl font-bold border-b-2 border-gray-200 focus:border-black focus:outline-none py-2 bg-transparent"
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
                    className="w-full text-sm text-gray-600 border border-gray-200 p-3 focus:border-black focus:outline-none bg-gray-50 rounded-none"
                    rows={4}
                    placeholder="添加描述..."
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">{photo.title}</h1>
                  <p className="text-xs font-mono text-gray-400 flex items-center gap-2 uppercase tracking-wide mt-2 mb-4">
                    <Calendar size={12} />
                    {new Date(photo.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                  <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">{photo.description || '暂无描述'}</p>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
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
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-sm font-bold text-gray-700 bg-gray-50 uppercase tracking-wide rounded-none">
                  <span>{currentCategory?.name || '未分类'}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
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
              </div>
              
              {isEditing && (
                <div className="relative">
                  <input 
                    type="text" 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => handleAddTag(e)}
                    placeholder="输入标签 + 回车..."
                    className="w-full text-sm border border-gray-200 px-3 py-2 focus:border-black outline-none bg-gray-50 rounded-none"
                  />
                  {newTag && tagSuggestions.length > 0 && (
                     <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl mt-1 z-10 max-h-32 overflow-y-auto rounded-none">
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
          
          {/* Footer Actions (Only visible in Edit Mode or Desktop Footer) */}
          <div className={`p-6 border-t border-gray-100 bg-gray-50 shrink-0 gap-3 ${isEditing ? 'flex' : 'hidden md:flex'}`}>
            {isEditing ? (
              <>
                 <button onClick={() => { setIsEditing(false); if(window.innerWidth<768) setShowMobileInfo(false); }} className="flex-1 py-3 bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 uppercase text-xs tracking-wider rounded-none">
                  取消
                </button>
                <button onClick={handleSave} className="flex-1 py-3 bg-black border border-transparent font-bold text-white hover:bg-gray-800 uppercase text-xs tracking-wider rounded-none">
                  保存
                </button>
              </>
            ) : (
               <button onClick={onClose} className="w-full py-3 bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 uppercase text-xs tracking-wider rounded-none">
                  关闭
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};