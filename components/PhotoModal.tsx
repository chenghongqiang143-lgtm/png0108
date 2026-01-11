import React, { useState, useEffect, useRef } from 'react';
import { Photo, Category } from '../types';
import { X, Edit2, Folder, Trash2, ChevronLeft, ChevronRight, Heart, Pipette, ZoomIn, ZoomOut, Maximize, Info, Crop, RotateCw, FlipHorizontal, Save, Plus, RotateCcw, Tag } from 'lucide-react';
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
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const imgRef = useRef<HTMLImageElement>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gestureLayerRef = useRef<HTMLDivElement>(null);

  // 手势状态管理
  const activePointers = useRef(new Map<number, { x: number, y: number }>());
  const physics = useRef({
    x: 0,
    y: 0,
    scale: 1,
    lastDist: 0,
    startScale: 1,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    startTime: 0
  });

  const updateDOM = () => {
    if (stageRef.current) {
      const { x, y, scale } = physics.current;
      stageRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    }
  };

  const resetPhysics = (animate = true) => {
    const p = physics.current;
    p.x = 0; p.y = 0; p.scale = 1;
    if (stageRef.current) {
      if (animate) stageRef.current.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
      updateDOM();
      if (animate) setTimeout(() => { if (stageRef.current) stageRef.current.style.transition = 'none'; }, 400);
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
    } catch (e) {
      console.warn("Color pick failed", e);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.ui-btn')) return;

    if (isPickerActive) {
      extractColor(e.clientX, e.clientY);
      return;
    }

    const p = physics.current;
    if (stageRef.current) stageRef.current.style.transition = 'none';

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      p.isDragging = true;
      p.lastX = e.clientX;
      p.lastY = e.clientY;
      p.startTime = Date.now();
    } else if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values()) as { x: number; y: number }[];
      p.lastDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      p.startScale = p.scale;
    }

    gestureLayerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const p = physics.current;

    if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values()) as { x: number; y: number }[];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / (p.lastDist || 1);
      p.scale = Math.min(Math.max(p.startScale * ratio, 0.5), 10);
      updateDOM();
    } 
    else if (activePointers.current.size === 1 && p.isDragging) {
      const dx = e.clientX - p.lastX;
      const dy = e.clientY - p.lastY;
      p.lastX = e.clientX;
      p.lastY = e.clientY;

      if (p.scale > 1.01 || viewMode === 'image-edit') {
        p.x += dx;
        p.y += dy;
        updateDOM();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const p = physics.current;
    const duration = Date.now() - p.startTime;
    
    // 如果是快速点按
    if (activePointers.current.size === 1 && duration < 250) {
      if (showMobileInfo) {
        // 如果面板开着，点击图片区域收起面板
        setShowMobileInfo(false);
      } else if (viewMode === 'view' && !isPickerActive) {
        // 否则切换控制栏显隐
        setShowControls(prev => !prev);
      }
    }

    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      p.lastDist = 0;
    }
    if (activePointers.current.size === 0) {
      p.isDragging = false;
      if (p.scale < 1) resetPhysics();
    }
  };

  useEffect(() => {
    if (photo) {
      if (photo.id !== prevPhotoIdRef.current) {
         setEditedTitle(photo.title);
         setEditedDesc(photo.description);
         setViewMode(initialEditMode ? 'meta-edit' : 'view');
         setIsPickerActive(false);
         setPickedColor(null);
         setEditRotation(0);
         setEditFlipX(1);
         setCropModeActive(false);
         setShowMobileInfo(initialEditMode);
         setActivePhoto(photo);
         prevPhotoIdRef.current = photo.id;
         resetPhysics(false);
      } else {
         setActivePhoto(photo);
      }
    }
  }, [photo, initialEditMode]);

  const [activePhoto, setActivePhoto] = useState<Photo | null>(photo);
  const prevPhotoIdRef = useRef<string | undefined>(photo?.id);

  if (!isOpen || !photo || !activePhoto) return null;

  const handleImageSave = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);
    try {
      const img = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas support missing");
      
      const rads = (editRotation * Math.PI) / 180;
      const absCos = Math.abs(Math.cos(rads));
      const absSin = Math.abs(Math.sin(rads));
      
      const targetWidth = img.naturalWidth * absCos + img.naturalHeight * absSin;
      const targetHeight = img.naturalWidth * absSin + img.naturalHeight * absCos;

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rads);
      ctx.scale(editFlipX, 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      canvas.toBlob(async (blob) => {
        if (blob) {
          await saveImageToDB(photo!.id, blob);
          onUpdate({ ...photo!, url: URL.createObjectURL(blob), updatedAt: Date.now() });
          setViewMode('view');
          setCropModeActive(false);
          setIsPickerActive(false);
          resetPhysics();
        }
        setIsProcessing(false);
      }, 'image/jpeg', 0.95);
    } catch (e) {
      setIsProcessing(false);
      alert("保存失败");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black overflow-hidden select-none">
      <style>{`
        .viewport-stage { will-change: transform; transition: none; }
        .no-drag { -webkit-user-drag: none; user-select: none; -webkit-touch-callout: none; }
        .ui-btn { pointer-events: auto !important; cursor: pointer; }
        .grid-line { pointer-events: none; border: 0.5px solid rgba(255,255,255,0.4); }
        input[type="range"] { -webkit-appearance: none; background: rgba(255,255,255,0.15); border-radius: 99px; height: 6px; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; background: white; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 2px solid #000; }
      `}</style>

      <div className="bg-black w-full h-full lg:h-auto lg:max-h-[90vh] lg:aspect-video lg:max-w-7xl flex flex-col lg:flex-row relative lg:rounded-lg overflow-hidden">
        
        {/* 图片交互核心区 */}
        <div ref={imgContainerRef} className="w-full lg:w-3/4 bg-black flex items-center justify-center relative shrink-0 overflow-hidden flex-1 min-h-0 touch-none">
          
          <div ref={stageRef} className="viewport-stage relative w-full h-full flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center" style={{ transform: `rotate(${editRotation}deg) scaleX(${editFlipX})` }}>
              <img 
                ref={imgRef} src={activePhoto.url} alt={activePhoto.title}
                crossOrigin="anonymous"
                className="max-w-full max-h-full object-contain pointer-events-auto no-drag"
              />
              
              {/* 编辑模式下的辅助线 */}
              {viewMode === 'image-edit' && cropModeActive && (
                <div className="absolute inset-0 z-20 pointer-events-none border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                   <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                      {[...Array(9)].map((_, i) => <div key={i} className="grid-line"></div>)}
                   </div>
                </div>
              )}
            </div>
          </div>

          <div 
            ref={gestureLayerRef} 
            className={`absolute inset-0 z-40 touch-none ${isPickerActive ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />

          {/* 取色器实时反馈 UI */}
          {isPickerActive && pickedColor && (
             <div 
               className={`absolute left-1/2 -translate-x-1/2 z-[70] flex items-center gap-4 bg-white/95 backdrop-blur-md pl-4 pr-2 py-2 rounded-full shadow-2xl transition-all duration-300 ${viewMode === 'image-edit' ? 'bottom-64' : (showControls ? 'bottom-32 lg:bottom-12' : 'bottom-10')}`}
               onPointerDown={e => e.stopPropagation()}
             >
                <div className="w-8 h-8 rounded-full border border-slate-200 shadow-inner" style={{backgroundColor: pickedColor}}></div>
                <div className="flex flex-col min-w-[80px]">
                  <span className="font-mono font-black text-sm text-slate-900 leading-none">{pickedColor}</span>
                  <span className="font-mono text-[10px] text-slate-500 uppercase mt-1">
                    {(() => { const rgb = hexToRgb(pickedColor); return `RGB ${rgb.r},${rgb.g},${rgb.b}`; })()}
                  </span>
                </div>
                <button 
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => onCollectColor?.(pickedColor)}
                    className="ui-btn p-2 bg-slate-900 text-white rounded-full"
                >
                    <Plus size={16} />
                </button>
             </div>
          )}

          {/* 左右导航按钮 */}
          {viewMode === 'view' && showControls && (
            <>
              <button 
                onPointerDown={e => e.stopPropagation()}
                onClick={onPrev}
                className={`ui-btn absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 text-white backdrop-blur-md z-50 transition-all ${hasPrev ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                <ChevronLeft size={32} />
              </button>
              <button 
                onPointerDown={e => e.stopPropagation()}
                onClick={onNext}
                className={`ui-btn absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 text-white backdrop-blur-md z-50 transition-all ${hasNext ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          {/* 移动端主底部功能栏 (包含退出按钮) */}
          <div className={`absolute bottom-0 inset-x-0 z-50 flex justify-around items-center lg:hidden pb-safe pt-10 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-all duration-300 ${viewMode === 'view' && showControls && !showMobileInfo ? 'translate-y-0' : 'translate-y-full opacity-0 pointer-events-none'}`}>
            <button onPointerDown={e => e.stopPropagation()} onClick={onClose} className="ui-btn p-4 text-white flex flex-col items-center gap-1 transition-transform active:scale-90"><X size={26} /><span className="text-[10px] font-bold">退出</span></button>
            <button onPointerDown={e => e.stopPropagation()} onClick={() => setShowMobileInfo(true)} className="ui-btn p-4 text-white/80 flex flex-col items-center gap-1"><Info size={24} /><span className="text-[10px]">信息</span></button>
            <button onPointerDown={e => e.stopPropagation()} onClick={() => onUpdate({ ...activePhoto, isFavorite: !activePhoto.isFavorite })} className={`ui-btn p-4 flex flex-col items-center gap-1 ${activePhoto.isFavorite ? 'text-red-500' : 'text-white/80'}`}><Heart size={24} fill={activePhoto.isFavorite ? 'currentColor' : 'none'} /><span className="text-[10px]">收藏</span></button>
            <button onPointerDown={e => e.stopPropagation()} onClick={() => setViewMode('image-edit')} className="ui-btn p-4 text-white/80 flex flex-col items-center gap-1"><Crop size={24} /><span className="text-[10px]">编辑</span></button>
            <button onPointerDown={e => e.stopPropagation()} onClick={() => isDeleteConfirm ? (onDelete(activePhoto.id), onClose()) : (setIsDeleteConfirm(true), setTimeout(() => setIsDeleteConfirm(false), 2000))} className={`ui-btn p-4 flex flex-col items-center gap-1 ${isDeleteConfirm ? 'text-red-500 font-bold' : 'text-white/80'}`}><Trash2 size={24} /><span className="text-[10px]">{isDeleteConfirm ? '确认' : '删除'}</span></button>
          </div>

          {/* 编辑模式工具面板 */}
          <div className={`absolute bottom-0 inset-x-0 z-[60] flex flex-col gap-6 bg-black/95 backdrop-blur-2xl border-t border-white/10 p-6 pb-safe transition-all duration-300 ${viewMode === 'image-edit' ? 'translate-y-0' : 'translate-y-full opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/50">
                <span>旋转</span>
                <span className="text-white font-mono">{editRotation}°</span>
              </div>
              <input 
                type="range" min="-180" max="180" step="1" 
                value={editRotation} 
                onChange={e => setEditRotation(parseInt(e.target.value))}
                onPointerDown={e => e.stopPropagation()}
                className="w-full ui-btn"
              />
            </div>

            <div className="flex justify-around items-center">
              <button onPointerDown={e => e.stopPropagation()} onClick={() => setEditRotation(prev => (Math.floor(prev/90)*90 + 90) % 360)} className="ui-btn flex flex-col items-center gap-1 text-white/70 hover:text-white"><RotateCw size={22} /><span className="text-[10px]">90°</span></button>
              <button onPointerDown={e => e.stopPropagation()} onClick={() => setEditFlipX(prev => prev * -1)} className="ui-btn flex flex-col items-center gap-1 text-white/70 hover:text-white"><FlipHorizontal size={22} /><span className="text-[10px]">翻转</span></button>
              <button onPointerDown={e => e.stopPropagation()} onClick={() => setCropModeActive(!cropModeActive)} className={`ui-btn flex flex-col items-center gap-1 ${cropModeActive ? 'text-blue-400' : 'text-white/70'}`}><Maximize size={22} /><span className="text-[10px]">裁切网格</span></button>
              <button onPointerDown={e => e.stopPropagation()} onClick={() => { setIsPickerActive(!isPickerActive); setPickedColor(null); }} className={`ui-btn flex flex-col items-center gap-1 ${isPickerActive ? 'text-blue-400' : 'text-white/70 hover:text-white'}`}><Pipette size={22} /><span className="text-[10px]">取色</span></button>
            </div>
            
            <div className="flex gap-3">
              <button onPointerDown={e => e.stopPropagation()} onClick={() => { setViewMode('view'); setCropModeActive(false); setIsPickerActive(false); resetPhysics(); }} className="ui-btn flex-1 py-4 bg-white/10 text-white font-black uppercase text-xs">取消</button>
              <button onPointerDown={e => e.stopPropagation()} onClick={handleImageSave} disabled={isProcessing} className="ui-btn flex-1 py-4 bg-white text-black font-black uppercase text-xs flex items-center justify-center gap-2">
                {isProcessing ? <div className="w-3 h-3 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : <Save size={16} />} 保存
              </button>
            </div>
          </div>

          {/* 桌面端常驻浮动控制栏 */}
          <div className={`absolute top-8 right-8 z-50 hidden lg:flex gap-3 transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10" onPointerDown={e => e.stopPropagation()}>
              <button onClick={() => { physics.current.scale = Math.max(physics.current.scale - 0.5, 0.5); updateDOM(); }} className="ui-btn p-2 text-white/70 hover:text-white"><ZoomOut size={20} /></button>
              <button onClick={() => { physics.current.scale = Math.min(physics.current.scale + 0.5, 10); updateDOM(); }} className="ui-btn p-2 text-white/70 hover:text-white"><ZoomIn size={20} /></button>
              <div className="w-px bg-white/20 mx-1"></div>
              <button onClick={resetPhysics} title="复位视图" className="ui-btn p-2 text-white/70 hover:text-white"><RotateCcw size={18} /></button>
              <div className="w-px bg-white/20 mx-1"></div>
              <button onClick={onClose} className="ui-btn p-2 text-white/70 hover:text-white"><X size={20} /></button>
            </div>
          </div>
        </div>

        {/* 侧边/底部详情面板 */}
        <div 
          className={`fixed lg:relative inset-x-0 bottom-0 z-[60] lg:z-auto bg-white lg:w-1/4 flex flex-col transition-all duration-300 shadow-2xl lg:shadow-none ${showMobileInfo && showControls ? 'translate-y-0' : (window.innerWidth >= 1024 && showControls && viewMode !== 'image-edit' ? 'translate-y-0' : 'translate-y-full lg:translate-x-full lg:translate-y-0 opacity-0 pointer-events-none lg:pointer-events-auto')}`}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="lg:hidden w-full flex justify-center py-4 cursor-pointer" onClick={() => setShowMobileInfo(false)}><div className="w-12 h-1 bg-gray-200 rounded-full"></div></div>
          
          <div className="px-6 py-4 border-b border-gray-100 hidden lg:flex justify-between items-center">
             <div className="flex gap-4">
                 <button onClick={() => setViewMode('image-edit')} className="ui-btn p-1.5 hover:bg-gray-100 rounded-md text-gray-600"><Crop size={18} /></button>
             </div>
             <button onClick={onClose} className="ui-btn p-1 hover:bg-gray-100 rounded-full"><X size={18} /></button>
          </div>

          <div className="p-6 pb-32 space-y-8 overflow-y-auto max-h-[70vh] lg:max-h-none custom-scrollbar">
            {viewMode === 'meta-edit' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <input value={editedTitle} onChange={e => setEditedTitle(e.target.value)} className="w-full text-xl font-black border-b border-gray-900 focus:outline-none py-1" />
                <textarea value={editedDesc} onChange={e => setEditedDesc(e.target.value)} className="w-full text-sm text-gray-500 border border-gray-200 p-3 h-32 focus:outline-none rounded-none" />
                <button onClick={() => { onUpdate({ ...activePhoto, title: editedTitle, description: editedDesc }); setViewMode('view'); }} className="ui-btn w-full bg-black text-white py-3 font-black uppercase text-xs tracking-widest">确认修改</button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-start gap-4">
                  <h1 className="text-2xl font-black text-gray-900 leading-tight">{activePhoto.title}</h1>
                  <button onClick={() => setViewMode('meta-edit')} className="ui-btn p-2 text-gray-400 hover:text-black"><Edit2 size={20} /></button>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{activePhoto.description || '暂无备注...'}</p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest"><Folder size={14} /> 相册分类</div>
                  <select 
                    value={activePhoto.categoryId} 
                    onChange={e => onUpdate({ ...activePhoto, categoryId: e.target.value })} 
                    className="ui-btn w-full p-3 bg-gray-50 border-none rounded-none text-sm font-bold appearance-none cursor-pointer"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest"><Tag size={14} /> 标签</div>
                  <div className="flex flex-wrap gap-2">
                    {activePhoto.tags.map(t => <span key={t} className="px-2 py-1 bg-gray-100 text-[10px] font-bold text-gray-600 flex items-center gap-1">#{t} <button onClick={() => onUpdate({ ...activePhoto, tags: activePhoto.tags.filter(tag => tag !== t) })} className="ui-btn ml-1 text-gray-300 hover:text-red-500">×</button></span>)}
                    <input 
                      value={newTag} 
                      onChange={e => setNewTag(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && (onUpdate({ ...activePhoto, tags: [...new Set([...activePhoto.tags, newTag.trim()])] }), setNewTag(''))} 
                      placeholder="+ 标签" 
                      className="text-[10px] font-bold border-none outline-none bg-transparent w-20"
                    />
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
