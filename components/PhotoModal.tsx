import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Photo, Category } from '../types';
import { X, Calendar, Tag, Edit2, Folder, Clock, Trash2, ChevronLeft, ChevronRight, Heart, Pipette, Copy, Bookmark, ZoomIn, ZoomOut, Maximize, Minimize, Info, Share2, MoreVertical, Crop, RotateCw, FlipHorizontal, Wand2, Check, Undo2, Image as ImageIcon, Save, Scan, ChevronDown } from 'lucide-react';
import { saveImageToDB } from '../services/imageDB';

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
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
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
  const [viewMode, setViewMode] = useState<'view' | 'meta-edit' | 'image-edit'>('view');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDesc, setEditedDesc] = useState('');
  const [newTag, setNewTag] = useState('');
  const [editRotation, setEditRotation] = useState(0);
  const [editFlipX, setEditFlipX] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropModeActive, setCropModeActive] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [pickedColor, setPickedColor] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  
  // --- HARDWARE ACCELERATED ENGINE ---
  const stageRef = useRef<HTMLDivElement>(null);
  const gestureLayerRef = useRef<HTMLDivElement>(null);
  const [uiZoomLevel, setUiZoomLevel] = useState(1);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(true);

  const physics = useRef({
    x: 0,
    y: 0,
    scale: 1,
    isDragging: false,
    isPinching: false,
    lastTouchX: 0,
    lastTouchY: 0,
    pinchStartDist: 0,
    startScale: 1,
    startPanX: 0,
    startPanY: 0,
    rafId: 0
  });

  const updateDOM = () => {
    if (stageRef.current) {
      const { x, y, scale } = physics.current;
      stageRef.current.style.setProperty('transform', `translate3d(${x}px, ${y}px, 0) scale(${scale})`, 'important');
    }
  };

  const resetPhysics = (animate = true) => {
    const p = physics.current;
    p.x = 0;
    p.y = 0;
    p.scale = 1;
    setUiZoomLevel(1);
    if (stageRef.current) {
      if (animate) stageRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)';
      updateDOM();
      if (animate) setTimeout(() => { if (stageRef.current) stageRef.current.style.transition = 'none'; }, 300);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const el = gestureLayerRef.current;
    if (!el) return;

    const handleStart = (e: TouchEvent | MouseEvent) => {
      const p = physics.current;
      if (isPickerActive) return;
      
      if (stageRef.current) stageRef.current.style.transition = 'none';

      if (window.TouchEvent && e instanceof TouchEvent && e.touches.length === 2) {
        p.isPinching = true;
        p.isDragging = false;
        p.pinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        p.startScale = p.scale;
        p.startPanX = p.x;
        p.startPanY = p.y;
        e.preventDefault();
        return;
      }

      p.isDragging = true;
      p.isPinching = false;
      const clientX = (e instanceof TouchEvent) ? e.touches[0].clientX : e.clientX;
      const clientY = (e instanceof TouchEvent) ? e.touches[0].clientY : e.clientY;
      p.lastTouchX = clientX;
      p.lastTouchY = clientY;
      p.startPanX = p.x;
      p.startPanY = p.y;
    };

    const handleMove = (e: TouchEvent | MouseEvent) => {
      const p = physics.current;
      if (isPickerActive) return;

      if (window.TouchEvent && e instanceof TouchEvent && e.touches.length === 2 && p.isPinching) {
        e.preventDefault();
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const factor = dist / p.pinchStartDist;
        const newScale = Math.min(Math.max(p.startScale * factor, 0.8), 8);
        
        const scaleChange = newScale / p.scale;
        p.scale = newScale;
        p.x *= scaleChange;
        p.y *= scaleChange;
        
        updateDOM();
        return;
      }

      if (p.isDragging) {
        const clientX = (e instanceof TouchEvent) ? e.touches[0].clientX : e.clientX;
        const clientY = (e instanceof TouchEvent) ? e.touches[0].clientY : e.clientY;
        const dx = clientX - p.lastTouchX;
        const dy = clientY - p.lastTouchY;
        p.lastTouchX = clientX;
        p.lastTouchY = clientY;

        if (p.scale > 1.05 || cropModeActive) {
          e.preventDefault();
          p.x += dx;
          p.y += dy;
          updateDOM();
        } else {
          if (Math.abs(p.x) > 5 || Math.abs(dx) > Math.abs(dy)) {
            e.preventDefault();
            p.x += dx;
            updateDOM();
          }
        }
      }
    };

    const handleEnd = (e: TouchEvent | MouseEvent) => {
      const p = physics.current;
      if (isPickerActive) return;

      const wasDragging = p.isDragging || p.isPinching;
      const moveDistance = Math.hypot(p.x - p.startPanX, p.y - p.startPanY);

      p.isDragging = false;
      p.isPinching = false;

      if (p.scale <= 1.05 && !cropModeActive) {
        if (Math.abs(p.x) > 100) {
          if (p.x > 0 && hasPrev) onPrev?.();
          else if (p.x < 0 && hasNext) onNext?.();
          else resetPhysics();
        } else {
          resetPhysics();
          // 改良后的 Tap 判定：如果移动距离很小，则视为点击，切换 UI 显隐
          if (moveDistance < 10) {
            if (window.innerWidth < 1024) {
              setShowMobileControls(prev => !prev);
              setShowMobileInfo(false);
            }
          }
        }
      } else if (p.scale < 1) {
        resetPhysics();
      }
      setUiZoomLevel(p.scale);
    };

    el.addEventListener('touchstart', handleStart, { passive: false });
    el.addEventListener('touchmove', handleMove, { passive: false });
    el.addEventListener('touchend', handleEnd);
    el.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    return () => {
      el.removeEventListener('touchstart', handleStart);
      el.removeEventListener('touchmove', handleMove);
      el.removeEventListener('touchend', handleEnd);
      el.removeEventListener('mousedown', handleStart);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [isOpen, isPickerActive, hasNext, hasPrev, cropModeActive]);

  useEffect(() => {
    if (photo && photo.id !== prevPhotoIdRef.current) {
      setEditedTitle(photo.title);
      setEditedDesc(photo.description);
      setViewMode(initialEditMode ? 'meta-edit' : 'view');
      setIsPickerActive(false);
      setPickedColor(null);
      setEditRotation(0);
      setEditFlipX(1);
      setCropModeActive(false);
      setShowMobileInfo(initialEditMode);
      setShowMobileControls(true);
      setExitingPhoto(activePhoto);
      setActivePhoto(photo);
      prevPhotoIdRef.current = photo.id;
      resetPhysics(false);
      setTimeout(() => setExitingPhoto(null), 300);
    }
  }, [photo, initialEditMode]);

  const [activePhoto, setActivePhoto] = useState<Photo | null>(photo);
  const [exitingPhoto, setExitingPhoto] = useState<Photo | null>(null);
  const prevPhotoIdRef = useRef<string | undefined>(photo?.id);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    physics.current.scale = Math.min(physics.current.scale + 0.5, 8);
    setUiZoomLevel(physics.current.scale);
    updateDOM();
    setShowMobileControls(true); // 确保操作时 UI 可见
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    physics.current.scale = Math.max(physics.current.scale - 0.5, 1);
    if (physics.current.scale === 1) { physics.current.x = 0; physics.current.y = 0; }
    setUiZoomLevel(physics.current.scale);
    updateDOM();
    setShowMobileControls(true); // 确保操作时 UI 可见
  };

  if (!isOpen || !photo || !activePhoto) return null;

  const handleImageSave = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);
    try {
      const img = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas support missing");
      if (cropModeActive && imgContainerRef.current) {
        const container = imgContainerRef.current;
        const rect = container.getBoundingClientRect();
        const exportScale = 2;
        canvas.width = rect.width * exportScale;
        canvas.height = rect.height * exportScale;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.translate(physics.current.x * exportScale, physics.current.y * exportScale);
        ctx.scale(physics.current.scale * exportScale, physics.current.scale * exportScale);
        ctx.rotate((editRotation * Math.PI) / 180);
        ctx.scale(editFlipX, 1);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      } else {
        const rads = (editRotation * Math.PI) / 180;
        const c = Math.abs(Math.cos(rads)), s = Math.abs(Math.sin(rads));
        canvas.width = img.naturalWidth * c + img.naturalHeight * s;
        canvas.height = img.naturalWidth * s + img.naturalHeight * c;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rads);
        ctx.scale(editFlipX, 1);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      }
      canvas.toBlob(async (blob) => {
        if (blob) {
          await saveImageToDB(photo!.id, blob);
          onUpdate({ ...photo!, url: URL.createObjectURL(blob), updatedAt: Date.now() });
          setViewMode('view');
          setCropModeActive(false);
          resetPhysics();
        }
        setIsProcessing(false);
      }, 'image/jpeg', 0.9);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      alert("保存失败");
    }
  };

  const extractColor = (clientX: number, clientY: number) => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
    const x = (clientX - rect.left) * (img.naturalWidth / rect.width);
    const y = (clientY - rect.top) * (img.naturalHeight / rect.height);
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      ctx.drawImage(img, x, y, 1, 1, 0, 0, 1, 1);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
      setPickedColor(hex);
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black lg:bg-black/90 lg:backdrop-blur-md lg:p-12 overflow-hidden select-none">
      <style>{`
        .viewport-stage { will-change: transform; transition: none; }
        .no-drag { -webkit-user-drag: none; user-select: none; -webkit-touch-callout: none; }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
        .anim-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
        .anim-slide-out-left { animation: slideOutLeft 0.3s ease-out forwards; }
        .anim-slide-in-left { animation: slideInLeft 0.3s ease-out forwards; }
        .anim-slide-out-right { animation: slideOutRight 0.3s ease-out forwards; }
      `}</style>

      <div className="bg-black w-full h-full lg:h-auto lg:max-h-[90vh] lg:aspect-video lg:max-w-7xl flex flex-col lg:flex-row lg:shadow-2xl relative lg:rounded-lg overflow-hidden">
        
        {/* IMAGE SECTION */}
        <div ref={imgContainerRef} className="w-full lg:w-3/4 bg-black flex items-center justify-center relative shrink-0 overflow-hidden flex-1 min-h-0 touch-none">
          
          <div ref={stageRef} className="viewport-stage relative w-full h-full flex items-center justify-center pointer-events-none">
            {exitingPhoto && (
              <img src={exitingPhoto.url} className="absolute inset-0 w-full h-full object-contain anim-slide-out-left no-drag" />
            )}
            <img 
              ref={imgRef} src={activePhoto.url} alt={activePhoto.title}
              className={`max-w-full max-h-full object-contain pointer-events-auto no-drag ${exitingPhoto ? 'opacity-0' : ''}`}
              style={{ transform: viewMode === 'image-edit' ? `rotate(${editRotation}deg) scaleX(${editFlipX})` : undefined }}
              onDragStart={e => e.preventDefault()}
            />
            {cropModeActive && (
              <div className="absolute inset-0 border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-20">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-20">
                  {[...Array(9)].map((_, i) => <div key={i} className="border border-white"></div>)}
                </div>
              </div>
            )}
          </div>

          {/* Gesture Layer: 置于 UI 下方，但在图片上方 */}
          <div ref={gestureLayerRef} className="absolute inset-0 z-40 touch-none cursor-grab active:cursor-grabbing" 
            onPointerDown={e => isPickerActive && extractColor(e.clientX, e.clientY)}
            onContextMenu={e => e.preventDefault()}
          />

          {/* UI Controls - Mobile Top: z-50 确保在手势层之上 */}
          <div className={`absolute top-6 inset-x-0 p-4 z-50 flex justify-between items-start lg:hidden pt-safe transition-opacity duration-300 ${showMobileControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2.5 text-white bg-white/10 border border-white/10 backdrop-blur-md rounded-full shadow-lg active:scale-95 transition-transform"><ChevronLeft size={24} /></button>
            {viewMode === 'view' && (
              <div className="flex gap-4">
                <button onClick={handleZoomOut} className="p-2.5 text-white bg-white/10 border border-white/10 backdrop-blur-md rounded-full shadow-lg active:scale-95 transition-transform"><ZoomOut size={20} /></button>
                <button onClick={handleZoomIn} className="p-2.5 text-white bg-white/10 border border-white/10 backdrop-blur-md rounded-full shadow-lg active:scale-95 transition-transform"><ZoomIn size={20} /></button>
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation: z-50 */}
          {viewMode === 'view' && (
            <div className={`absolute bottom-0 inset-x-0 z-50 flex justify-around items-center lg:hidden pb-safe pt-6 bg-gradient-to-t from-black/90 to-transparent transition-transform duration-300 ${showMobileControls && !showMobileInfo ? 'translate-y-0' : 'translate-y-full'}`}>
              <button onClick={(e) => { e.stopPropagation(); setShowMobileInfo(true); }} className="p-4 text-white/90 flex flex-col items-center gap-1"><Info size={24} /><span className="text-[10px]">信息</span></button>
              <button onClick={(e) => { e.stopPropagation(); onUpdate({ ...activePhoto, isFavorite: !activePhoto.isFavorite }); }} className={`p-4 flex flex-col items-center gap-1 ${activePhoto.isFavorite ? 'text-red-500' : 'text-white'}`}><Heart size={24} fill={activePhoto.isFavorite ? 'currentColor' : 'none'} /><span className="text-[10px]">收藏</span></button>
              <button onClick={(e) => { e.stopPropagation(); setViewMode('image-edit'); }} className="p-4 text-white/90 flex flex-col items-center gap-1"><Crop size={24} /><span className="text-[10px]">编辑</span></button>
              <button onClick={(e) => { e.stopPropagation(); isDeleteConfirm ? (onDelete(activePhoto.id), onClose()) : (setIsDeleteConfirm(true), setTimeout(() => setIsDeleteConfirm(false), 2000)); }} className={`p-4 flex flex-col items-center gap-1 ${isDeleteConfirm ? 'text-red-500' : 'text-white'}`}><Trash2 size={24} /><span className="text-[10px]">{isDeleteConfirm ? '确认' : '删除'}</span></button>
            </div>
          )}

          {/* Desktop Close & Zoom */}
          <div className="absolute top-8 right-8 z-50 hidden lg:flex gap-3">
            <div className="flex bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10">
              <button onClick={handleZoomOut} className="p-2 text-white/70 hover:text-white"><ZoomOut size={20} /></button>
              <button onClick={handleZoomIn} className="p-2 text-white/70 hover:text-white"><ZoomIn size={20} /></button>
              <div className="w-px bg-white/20 mx-1"></div>
              <button onClick={onClose} className="p-2 text-white/70 hover:text-white"><X size={20} /></button>
            </div>
          </div>

          {/* Image Edit Tools */}
          {viewMode === 'image-edit' && (
            <div className="absolute bottom-0 inset-x-0 z-50 bg-black/90 backdrop-blur-lg border-t border-white/10 p-6 flex flex-col gap-6 animate-in slide-in-from-bottom-full">
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-white/50 font-mono w-12">{editRotation}°</span>
                <input type="range" min="-180" max="180" value={editRotation} onChange={e => setEditRotation(Number(e.target.value))} className="flex-1 accent-white" />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-6">
                  <button onClick={() => setEditRotation(r => r - 90)} className="text-white flex flex-col items-center gap-1"><RotateCw size={24} className="-scale-x-100" /><span className="text-[10px]">左旋</span></button>
                  <button onClick={() => setEditFlipX(f => f * -1)} className="text-white flex flex-col items-center gap-1"><FlipHorizontal size={24} /><span className="text-[10px]">翻转</span></button>
                  <button onClick={() => setCropModeActive(!cropModeActive)} className={`flex flex-col items-center gap-1 ${cropModeActive ? 'text-blue-400' : 'text-white'}`}><Scan size={24} /><span className="text-[10px]">剪裁</span></button>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setViewMode('view')} className="px-6 py-2 text-white/50 font-bold">取消</button>
                  <button onClick={handleImageSave} className="px-6 py-2 bg-white text-black font-bold rounded-full shadow-xl">{isProcessing ? '处理中...' : '保存'}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DETAILS PANEL */}
        <div className={`fixed lg:relative inset-x-0 bottom-0 z-[60] lg:z-auto bg-white lg:w-1/4 flex flex-col transition-transform duration-300 lg:translate-y-0 ${showMobileInfo ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="lg:hidden w-full flex justify-center py-4" onClick={() => setShowMobileInfo(false)}><div className="w-12 h-1 bg-gray-200 rounded-full"></div></div>
          <div className="px-6 py-4 border-b border-gray-100 hidden lg:flex justify-between items-center">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">属性详情</span>
             <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh] lg:max-h-none">
            {viewMode === 'meta-edit' ? (
              <div className="space-y-4">
                <input value={editedTitle} onChange={e => setEditedTitle(e.target.value)} className="w-full text-xl font-bold border-b border-gray-900 focus:outline-none py-1" />
                <textarea value={editedDesc} onChange={e => setEditedDesc(e.target.value)} className="w-full text-sm text-gray-500 border border-gray-200 p-3 h-32 focus:outline-none" />
                <button onClick={() => { onUpdate({ ...activePhoto, title: editedTitle, description: editedDesc }); setViewMode('view'); }} className="w-full bg-black text-white py-3 font-bold uppercase text-xs tracking-widest">确认修改</button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <h1 className="text-2xl font-black text-gray-900 leading-tight">{activePhoto.title}</h1>
                  <button onClick={() => setViewMode('meta-edit')} className="p-2 text-gray-400 hover:text-black"><Edit2 size={20} /></button>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{activePhoto.description || '点击右上角图标添加描述...'}</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest"><Folder size={14} /> 相册</div>
                  <select value={activePhoto.categoryId} onChange={e => onUpdate({ ...activePhoto, categoryId: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-none text-sm font-bold">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest"><Tag size={14} /> 标签</div>
                  <div className="flex flex-wrap gap-2">
                    {activePhoto.tags.map(t => <span key={t} className="px-2 py-1 bg-gray-100 text-[10px] font-bold text-gray-600">#{t} <button onClick={() => onUpdate({ ...activePhoto, tags: activePhoto.tags.filter(tag => tag !== t) })} className="ml-1 text-gray-400">×</button></span>)}
                    <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (onUpdate({ ...activePhoto, tags: [...new Set([...activePhoto.tags, newTag.trim()])] }), setNewTag(''))} placeholder="+ 标签" className="text-[10px] font-bold border-none outline-none bg-transparent w-20" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
