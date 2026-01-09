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
  // Modes: 'view' | 'meta-edit' | 'image-edit'
  const [viewMode, setViewMode] = useState<'view' | 'meta-edit' | 'image-edit'>('view');
  
  // Meta Edit State
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDesc, setEditedDesc] = useState('');
  
  // Tag Input State
  const [newTag, setNewTag] = useState('');
  
  // Image Edit State
  const [editRotation, setEditRotation] = useState(0);
  const [editFlipX, setEditFlipX] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropModeActive, setCropModeActive] = useState(false);
  
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
  const lastTapRef = useRef(0);

  // Swipe State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);

  // UI State
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(true);

  // Animation States
  const [activePhoto, setActivePhoto] = useState<Photo | null>(photo);
  const [exitingPhoto, setExitingPhoto] = useState<Photo | null>(null);
  const prevPhotoIdRef = useRef<string | undefined>(photo?.id);

  // --- Gesture State Management (Refs) ---
  const gestureStateRef = useRef({
      zoomLevel: 1,
      pan: { x: 0, y: 0 },
      isDragging: false,
      swipeOffset: 0,
      isPickerActive: false,
      viewMode: 'view' as 'view' | 'meta-edit' | 'image-edit',
      cropModeActive: false,
      hasPrev: false,
      hasNext: false,
      showMobileInfo: false
  });

  // Sync refs with state for event listeners
  useEffect(() => {
      gestureStateRef.current = {
          zoomLevel,
          pan,
          isDragging,
          swipeOffset,
          isPickerActive,
          viewMode,
          cropModeActive,
          hasPrev: !!hasPrev,
          hasNext: !!hasNext,
          showMobileInfo
      };
  }, [zoomLevel, pan, isDragging, swipeOffset, isPickerActive, viewMode, cropModeActive, hasPrev, hasNext, showMobileInfo]);

  // Helper to stop propagation for UI controls
  const stopPropagation = (e: React.TouchEvent | React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    // @ts-ignore
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
  };

  // Native Gesture Handling
  useEffect(() => {
    if (!isOpen) return;
    const el = imgContainerRef.current;
    if (!el) return;

    const gesture = {
        initialDist: 0,
        initialZoom: 1,
        startPan: { x: 0, y: 0 },
        startTouch: { x: 0, y: 0 },
        startTime: 0, // Track tap duration
        isPinching: false,
        isDragging: false
    };

    const getDistance = (touches: TouchList) => {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    };

    const handleTouchStart = (e: TouchEvent) => {
        // Robust Exclusion: If touching any UI control (slider, buttons), ignore gesture logic
        const target = e.target as HTMLElement;
        if (target.closest('.no-gesture-propagation') || ['INPUT', 'BUTTON', 'A', 'TEXTAREA'].includes(target.tagName)) {
            return;
        }

        const state = gestureStateRef.current;
        if (state.isPickerActive) {
            extractColor(e.touches[0].clientX, e.touches[0].clientY);
            return;
        }

        // AGGRESSIVELY Prevent default to stop ghost dragging of images on mobile (especially Blobs)
        // This is safe because we've already excluded UI controls above.
        if (e.cancelable) e.preventDefault(); 

        if (e.touches.length === 2) {
            gesture.isPinching = true;
            gesture.initialDist = getDistance(e.touches);
            gesture.initialZoom = state.zoomLevel;
            // Clear dragging state momentarily to avoid jump
            gesture.isDragging = false; 
        } else if (e.touches.length === 1) {
            gesture.isDragging = true;
            gesture.startTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            gesture.startPan = { ...state.pan };
            gesture.startTime = Date.now();
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        // Robust Exclusion
        const target = e.target as HTMLElement;
        if (target.closest('.no-gesture-propagation') || ['INPUT', 'BUTTON', 'A', 'TEXTAREA'].includes(target.tagName)) {
            return;
        }

        const state = gestureStateRef.current;
        if (state.isPickerActive) {
            e.preventDefault();
            extractColor(e.touches[0].clientX, e.touches[0].clientY);
            return;
        }

        if (e.touches.length === 2 && gesture.isPinching) {
            e.preventDefault(); // Stop browser zoom
            const dist = getDistance(e.touches);
            if (dist > 0 && gesture.initialDist > 0) {
                const scale = dist / gesture.initialDist;
                const newZoom = Math.min(Math.max(gesture.initialZoom * scale, 0.5), 5);
                setZoomLevel(newZoom);
            }
        } else if (e.touches.length === 1 && gesture.isDragging) {
            const dx = e.touches[0].clientX - gesture.startTouch.x;
            const dy = e.touches[0].clientY - gesture.startTouch.y;

            if (state.zoomLevel > 1 || state.cropModeActive) {
                e.preventDefault(); // Stop browser scroll if zoomed in
                setPan({
                    x: gesture.startPan.x + dx,
                    y: gesture.startPan.y + dy
                });
            } else if (state.viewMode === 'view') {
                // Swipe Logic - only if horizontal
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                     e.preventDefault();
                     setSwipeOffset(dx);
                }
            }
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        // Robust Exclusion
        const target = e.target as HTMLElement;
        if (target.closest('.no-gesture-propagation') || ['INPUT', 'BUTTON', 'A', 'TEXTAREA'].includes(target.tagName)) {
            return;
        }

        const state = gestureStateRef.current;
        
        if (state.isPickerActive) return;

        // Transition from Pinch (2 fingers) to Drag (1 finger)
        if (e.touches.length < 2 && gesture.isPinching) {
            gesture.isPinching = false;
            // If one finger remains, reset the drag origin to prevent "jumping"
            if (e.touches.length === 1) {
                gesture.startTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                gesture.startPan = { ...state.pan };
                gesture.isDragging = true;
                return; // Exit early to continue dragging seamlessly
            }
        }

        if (e.touches.length === 0) {
            const now = Date.now();
            gesture.isDragging = false;
            setIsDragging(false);

            // Double Tap to Zoom Detection
            if (now - lastTapRef.current < 300) {
                if (state.zoomLevel > 1) {
                    setZoomLevel(1);
                    setPan({x: 0, y: 0});
                } else {
                    setZoomLevel(2.5); // Fixed 2.5x zoom
                    setPan({x: 0, y: 0});
                }
                lastTapRef.current = 0;
            } else {
                // Potential Single Tap (Manual implementation since we preventDefault on start)
                const dx = e.changedTouches[0].clientX - gesture.startTouch.x;
                const dy = e.changedTouches[0].clientY - gesture.startTouch.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 10) {
                    // It is a tap
                    if (!state.isPickerActive && window.innerWidth < 1024) {
                        // Toggle mobile controls
                        setShowMobileControls(prev => !prev);
                        if (state.showMobileInfo) setShowMobileInfo(false);
                    }
                }
                lastTapRef.current = now;
            }

            // Handle Swipe Actions or Reset
            if (state.zoomLevel <= 1 && !state.cropModeActive) {
                if (state.zoomLevel < 1) setZoomLevel(1); // Elastic bounce back if zoomed out too much
                setPan({ x: 0, y: 0 });

                if (state.viewMode === 'view') {
                    if (Math.abs(state.swipeOffset) > 80) {
                         if (state.swipeOffset > 0 && state.hasPrev) { 
                             setDirection('left'); 
                             if (onPrev) onPrev();
                         } else if (state.swipeOffset < 0 && state.hasNext) { 
                             setDirection('right'); 
                             if (onNext) onNext();
                         } else {
                             setSwipeOffset(0);
                         }
                    } else {
                        setSwipeOffset(0);
                        // Swipe down to close / up for info
                        const dy = e.changedTouches[0].clientY - gesture.startTouch.y;
                        const dx = e.changedTouches[0].clientX - gesture.startTouch.x;
                        
                        if (Math.abs(state.swipeOffset) < 10 && dy > 60 && Math.abs(dx) < 30) {
                            onClose();
                        } else if (Math.abs(state.swipeOffset) < 10 && dy < -60 && Math.abs(dx) < 30) {
                            setShowMobileInfo(true);
                        }
                    }
                }
            } else if (state.zoomLevel < 1) {
                setZoomLevel(1);
                setPan({ x: 0, y: 0 });
            }
        }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
        el.removeEventListener('touchend', handleTouchEnd);
    };

  }, [isOpen]); 

  // Auto hide controls on zoom for better view, but SHOW them when returning to 1x
  useEffect(() => {
     if (zoomLevel > 1) {
         setShowMobileControls(false);
     } else {
         setShowMobileControls(true);
     }
  }, [zoomLevel]);

  // Sync logic for switching photos
  useEffect(() => {
    if (photo) {
      if (photo.id !== prevPhotoIdRef.current) {
          setEditedTitle(photo.title);
          setEditedDesc(photo.description);
          setViewMode(initialEditMode ? 'meta-edit' : 'view');
          setNewTag(''); 
          setIsDeleteConfirm(false); 
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
          
          setZoomLevel(1); 
          setPan({ x: 0, y: 0 }); 
          setSwipeOffset(0);

          const timer = setTimeout(() => {
              setExitingPhoto(null);
          }, 300); 
          return () => clearTimeout(timer);
      } else {
          setActivePhoto(photo);
      }
    }
  }, [photo, isOpen, initialEditMode]);

  // Keyboard Nav
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        if (viewMode === 'image-edit') return; 

        if (e.key === 'ArrowLeft' && hasPrev && onPrev && viewMode === 'view') {
            setDirection('left');
            onPrev();
        }
        if (e.key === 'ArrowRight' && hasNext && onNext && viewMode === 'view') {
            setDirection('right');
            onNext();
        }
        if (e.key === 'Escape') {
            if (viewMode === 'image-edit') setViewMode('view');
            else onClose();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onPrev, onNext, onClose, viewMode]);

  const colorDetails = useMemo(() => {
    if (!pickedColor) return null;
    const rgb = hexToRgb(pickedColor);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    return { rgb, hsv };
  }, [pickedColor]);

  if (!isOpen || !photo || !activePhoto) return null;

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ ...photo, categoryId: e.target.value });
  };

  const handleAddTag = (e?: React.KeyboardEvent, tagToAdd?: string) => {
    const tag = tagToAdd || newTag;
    if ((!e || e.key === 'Enter') && tag.trim()) {
      e?.preventDefault(); 
      if (!photo.tags.includes(tag.trim())) {
        onUpdate({
            ...photo,
            tags: [...photo.tags, tag.trim()]
        });
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onUpdate({
        ...photo,
        tags: photo.tags.filter(t => t !== tagToRemove)
    });
  };

  const handleMetaSave = () => {
    onUpdate({
      ...photo,
      title: editedTitle,
      description: editedDesc,
    });
    setViewMode('view');
    if (window.innerWidth < 1024) { 
       setShowMobileInfo(false); 
    }
  };

  const handleImageSave = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);

    try {
        const img = imgRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context not supported");

        if (cropModeActive && imgContainerRef.current) {
            const container = imgContainerRef.current;
            const rect = container.getBoundingClientRect();
            const exportScale = 2;
            
            canvas.width = rect.width * exportScale;
            canvas.height = rect.height * exportScale;
            
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.translate(pan.x * exportScale, pan.y * exportScale);
            ctx.scale(zoomLevel * exportScale, zoomLevel * exportScale);
            ctx.rotate((editRotation * Math.PI) / 180);
            ctx.scale(editFlipX, 1);
            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
            
        } else {
            const rads = (editRotation * Math.PI) / 180;
            const c = Math.cos(rads);
            const s = Math.sin(rads);
            const originalWidth = img.naturalWidth;
            const originalHeight = img.naturalHeight;

            canvas.width = Math.abs(originalWidth * c) + Math.abs(originalHeight * s);
            canvas.height = Math.abs(originalWidth * s) + Math.abs(originalHeight * c);

            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rads);
            ctx.scale(editFlipX, 1);
            ctx.drawImage(img, -originalWidth / 2, -originalHeight / 2);
        }

        canvas.toBlob(async (blob) => {
            if (blob) {
                await saveImageToDB(photo.id, blob);
                const newUrl = URL.createObjectURL(blob);
                onUpdate({ ...photo, url: newUrl, updatedAt: Date.now() });
                setViewMode('view');
                setCropModeActive(false); 
            }
            setIsProcessing(false);
        }, 'image/jpeg', 0.9);

    } catch (e) {
        console.error(e);
        setIsProcessing(false);
        alert("保存失败");
    }
  };
  
  const handleDeleteClick = () => {
     if (isDeleteConfirm) {
         onDelete(photo.id);
         onClose(); 
     } else {
         setIsDeleteConfirm(true);
         setTimeout(() => setIsDeleteConfirm(false), 3000);
     }
  };

  const handleToggleFavorite = () => {
      onUpdate({ ...photo, isFavorite: !photo.isFavorite });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        imgContainerRef.current?.requestFullscreen().catch(err => console.error("Error attempting to enable fullscreen:", err));
    } else {
        document.exitFullscreen();
    }
  };

  const handleMobileImageTap = () => {
      if (window.innerWidth < 1024) {
          setShowMobileControls(!showMobileControls);
          if (showMobileInfo) setShowMobileInfo(false);
      }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.5, 0.5); 
      if (newZoom <= 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  };

  // Double click handler for desktop
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (viewMode !== 'view') return;
    
    if (zoomLevel > 1) {
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
    } else {
        setZoomLevel(2.5);
        setPan({ x: 0, y: 0 });
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
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
        ctx.drawImage(img, x, y, 1, 1, 0, 0, 1, 1);
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
        setPickedColor(hex);
    } catch (e) { console.error("Color pick failed", e); }
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPickerActive) { extractColor(e.clientX, e.clientY); return; }
    if (zoomLevel <= 1 && viewMode === 'view' && !cropModeActive) return; 
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPickerActive && e.buttons === 1) { extractColor(e.clientX, e.clientY); return; }
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Note: We disabled onClick on img to support manual tap detection
  // const handleImageClick = ...

  const currentCategory = categories.find(c => c.id === photo.categoryId);
  const tagSuggestions = availableTags.filter(t => !photo.tags.includes(t) && t.toLowerCase().includes(newTag.toLowerCase())).slice(0, 10);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black lg:bg-black/90 lg:backdrop-blur-md lg:p-12 animate-in fade-in duration-200 overflow-hidden">
      
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
        
        .anim-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
        .anim-slide-out-left { animation: slideOutLeft 0.3s ease-out forwards; }
        .anim-slide-in-left { animation: slideInLeft 0.3s ease-out forwards; }
        .anim-slide-out-right { animation: slideOutRight 0.3s ease-out forwards; }
      `}</style>

      {/* Main Container */}
      <div className="bg-black w-full h-full lg:h-auto lg:max-h-[90vh] lg:aspect-video lg:max-w-7xl flex flex-col lg:flex-row lg:shadow-2xl relative lg:rounded-lg overflow-hidden">
        
        {/* IMAGE SECTION */}
        <div 
            ref={imgContainerRef}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            // Use w-full on lg if in edit mode (sidebar hidden)
            className={`w-full ${viewMode === 'image-edit' ? 'lg:w-full' : 'lg:w-3/4'} bg-black flex items-center justify-center relative group shrink-0 overflow-hidden lg:rounded-l-lg flex-1 min-h-0`}
            style={{ touchAction: 'none' }}
        >
          {/* Mobile Top Bar */}
          <div className={`absolute top-6 inset-x-0 p-4 z-30 flex justify-between items-start lg:hidden pt-safe transition-opacity duration-300 no-gesture-propagation ${showMobileControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <button onClick={onClose} className="p-2.5 text-white bg-white/10 border border-white/10 backdrop-blur-md rounded-full active:bg-white/20 shadow-sm">
                  <ChevronLeft size={24} />
              </button>
              {viewMode === 'image-edit' && (
                  <button onClick={handleImageSave} className="px-4 py-2 bg-white text-black font-bold rounded-full text-sm shadow-lg">
                      {cropModeActive ? '确认剪裁' : '保存'}
                  </button>
              )}
          </div>

          {/* Mobile Bottom Bar (View Mode) */}
          {viewMode === 'view' && (
             <div className={`absolute bottom-0 inset-x-0 z-30 flex justify-around items-center lg:hidden pb-safe pt-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-transform duration-300 no-gesture-propagation ${showMobileControls && !showMobileInfo ? 'translate-y-0' : 'translate-y-full'}`}>
                 <button onClick={() => setShowMobileInfo(true)} className="p-4 text-white/90 flex flex-col items-center gap-1 active:scale-95 transition-transform">
                     <Info size={24} strokeWidth={1.5} />
                     <span className="text-[10px] font-medium opacity-80">信息</span>
                 </button>
                 <button onClick={handleToggleFavorite} className={`p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform ${photo.isFavorite ? 'text-red-500' : 'text-white/90'}`}>
                     <Heart size={24} className={photo.isFavorite ? 'fill-current' : ''} strokeWidth={1.5} />
                     <span className="text-[10px] font-medium opacity-80">收藏</span>
                 </button>
                 <button onClick={() => setViewMode('image-edit')} className="p-4 text-white/90 flex flex-col items-center gap-1 active:scale-95 transition-transform">
                     <Crop size={24} strokeWidth={1.5} />
                     <span className="text-[10px] font-medium opacity-80">编辑</span>
                 </button>
                 <button onClick={handleDeleteClick} className={`p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform ${isDeleteConfirm ? 'text-red-500' : 'text-white/90'}`}>
                     <Trash2 size={24} strokeWidth={1.5} />
                     <span className="text-[10px] font-medium opacity-80">{isDeleteConfirm ? '确认' : '删除'}</span>
                 </button>
             </div>
          )}

          {/* Edit Mode Toolbar (Overlay) - Added no-gesture-propagation and FORCE stop propagation */}
          {viewMode === 'image-edit' && (
              <div 
                  className="absolute bottom-0 inset-x-0 z-40 bg-black/80 backdrop-blur-md border-t border-white/10 pb-safe animate-slide-in-from-bottom-4 no-gesture-propagation"
                  // Explicitly stop propagation to prevent interfering with parent gestures
                  onTouchStart={stopPropagation}
                  onTouchMove={stopPropagation}
                  onTouchEnd={stopPropagation}
                  onMouseDown={stopPropagation}
                  onMouseMove={stopPropagation}
                  onMouseUp={stopPropagation}
              >
                  {/* Rotation Slider */}
                  <div className="px-6 py-2 flex items-center gap-4">
                      <span className="text-[10px] text-gray-400 font-bold w-8 text-right">
                          {Number.isInteger(editRotation) ? editRotation : editRotation.toFixed(1)}°
                      </span>
                      <input 
                        type="range" 
                        min="-180" 
                        max="180" 
                        step="0.1"
                        value={editRotation}
                        onChange={(e) => {
                            let val = Number(e.target.value);
                            // Snap to 0, 90, 180, -90, -180 within 2 degrees
                            const threshold = 2;
                            if (Math.abs(val) < threshold) val = 0;
                            else if (Math.abs(val - 90) < threshold) val = 90;
                            else if (Math.abs(val - 180) < threshold) val = 180;
                            else if (Math.abs(val + 90) < threshold) val = -90;
                            else if (Math.abs(val + 180) < threshold) val = -180;
                            setEditRotation(val);
                        }}
                        // Ensure panning this slider works on mobile
                        style={{ touchAction: 'pan-x' }}
                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                  </div>
                  
                  <div className="flex items-center justify-between px-6 py-4 overflow-x-auto no-scrollbar gap-6">
                      <button onClick={() => setEditRotation(r => { const n = r - 90; return n < -180 ? 180 : n; })} className="flex flex-col items-center gap-1 text-white hover:text-indigo-400 min-w-[3rem]">
                          <RotateCw size={24} className="-scale-x-100" />
                          <span className="text-[10px]">-90°</span>
                      </button>
                      <button onClick={() => setEditFlipX(f => f * -1)} className="flex flex-col items-center gap-1 text-white hover:text-indigo-400 min-w-[3rem]">
                          <FlipHorizontal size={24} />
                          <span className="text-[10px]">翻转</span>
                      </button>
                      <button onClick={() => { setCropModeActive(!cropModeActive); setIsPickerActive(false); }} className={`flex flex-col items-center gap-1 min-w-[3rem] ${cropModeActive ? 'text-indigo-400' : 'text-white hover:text-indigo-400'}`}>
                          <Scan size={24} className={cropModeActive ? 'fill-current' : ''} />
                          <span className="text-[10px]">剪裁</span>
                      </button>
                      <button onClick={() => { setIsPickerActive(!isPickerActive); setCropModeActive(false); }} className={`flex flex-col items-center gap-1 min-w-[3rem] ${isPickerActive ? 'text-indigo-400' : 'text-white hover:text-indigo-400'}`}>
                          <Pipette size={24} className={isPickerActive ? 'fill-current' : ''} />
                          <span className="text-[10px]">取色</span>
                      </button>
                  </div>
                  <div className="flex justify-between px-6 py-3 border-t border-white/10">
                      <button onClick={() => setViewMode('view')} className="text-white/70 hover:text-white text-sm font-bold flex items-center gap-2">
                          <X size={18} /> 取消
                      </button>
                      <div className="flex gap-4">
                        <button onClick={() => { setEditRotation(0); setEditFlipX(1); setCropModeActive(false); setZoomLevel(1); setPan({x:0, y:0}); }} className="text-white/70 hover:text-white text-sm flex items-center gap-2">
                             <Undo2 size={18} /> 重置
                        </button>
                        <button onClick={handleImageSave} className="text-indigo-400 hover:text-indigo-300 font-bold text-sm flex items-center gap-2">
                            {isProcessing ? '处理中...' : (cropModeActive ? <><Check size={18} /> 确认剪裁</> : <><Save size={18} /> 保存</>)}
                        </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Desktop Controls */}
          <div className="absolute top-0 inset-x-0 z-30 justify-end p-4 pt-8 gap-3 hidden lg:flex pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2 bg-black/50 p-1.5 rounded-full backdrop-blur-md pointer-events-auto no-gesture-propagation">
                    <button onClick={handleZoomOut} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors" title="缩小"><ZoomOut size={20} /></button>
                    <button onClick={handleZoomIn} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors" title="放大"><ZoomIn size={20} /></button>
                    <div className="w-px bg-white/20 mx-1"></div>
                    <button onClick={onClose} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors" title="关闭"><X size={20} /></button>
                </div>
          </div>

          {/* EXITING PHOTO */}
          {exitingPhoto && (
             <img key={exitingPhoto.id} src={exitingPhoto.url} className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${direction === 'right' ? 'anim-slide-out-left' : 'anim-slide-out-right'}`} style={{ touchAction: 'none' }} />
          )}

          {/* ACTIVE PHOTO */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-none" style={{ transform: exitingPhoto ? undefined : `translate(${pan.x + swipeOffset}px, ${pan.y}px) scale(${zoomLevel})`, transition: isDragging || swipeOffset !== 0 ? 'none' : 'transform 0.2s ease-out' }}>
              <img 
                key={activePhoto.id} ref={imgRef} src={activePhoto.url} alt={activePhoto.title} 
                crossOrigin={activePhoto.url.startsWith('blob:') ? undefined : "anonymous"} 
                draggable={false} 
                onDragStart={(e) => e.preventDefault()} // CRITICAL: Prevent native drag start to fix imported blob gestures
                onDoubleClick={handleDoubleClick} 
                onContextMenu={(e) => e.preventDefault()} 
                className={`max-w-full max-h-full object-contain pointer-events-auto ${exitingPhoto ? (direction === 'right' ? 'anim-slide-in-right' : 'anim-slide-in-left') : ''} ${isPickerActive ? 'cursor-crosshair' : (zoomLevel > 1 || cropModeActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'default')}`}
                style={{ 
                   transform: viewMode === 'image-edit' ? `rotate(${editRotation}deg) scaleX(${editFlipX})` : undefined, 
                   touchAction: 'none', 
                   transition: isDragging || cropModeActive ? 'none' : 'transform 0.3s ease',
                   // Force disable text/element selection and drag behavior
                   WebkitUserSelect: 'none',
                   userSelect: 'none',
                   // @ts-ignore
                   WebkitTouchCallout: 'none',
                   // @ts-ignore
                   WebkitUserDrag: 'none' 
                }}
              />
              {cropModeActive && (
                  <div className="absolute inset-0 pointer-events-none border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-20">
                      <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                          {[...Array(9)].map((_, i) => <div key={i} className="border border-white/20"></div>)}
                      </div>
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">拖拽/缩放以调整剪裁区域</div>
                  </div>
              )}
          </div>
          
          {/* Zoom Hint */}
          {(zoomLevel > 1 || cropModeActive) && window.innerWidth < 1024 && (
             <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm pointer-events-none z-50">{Math.round(zoomLevel * 100)}%</div>
          )}

          {/* Color Picker Indicator */}
          {isPickerActive && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md pointer-events-none animate-pulse shadow-lg whitespace-nowrap">{window.innerWidth < 1024 ? '拖动取色' : '点击取色'}</div>
          )}

          {/* Picked Color Result */}
          {pickedColor && colorDetails && (
            <div className="absolute bottom-24 lg:bottom-8 z-50 flex items-center gap-4 bg-white/95 backdrop-blur shadow-2xl p-3 pr-4 rounded-full animate-in zoom-in slide-in-from-bottom-4 border border-gray-100 mx-auto left-4 right-4 lg:left-auto lg:right-auto lg:min-w-[300px] justify-center no-gesture-propagation">
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: pickedColor }}></div>
                <div className="flex flex-col gap-0.5 min-w-[80px]">
                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 w-6">HEX</span><span className="text-xs font-black text-gray-900 font-mono">{pickedColor}</span></div>
                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 w-6">RGB</span><span className="text-[10px] font-medium text-gray-600 font-mono whitespace-nowrap">{colorDetails.rgb.r}, {colorDetails.rgb.g}, {colorDetails.rgb.b}</span></div>
                </div>
                <div className="w-px h-8 bg-gray-200 mx-1"></div>
                <div className="flex items-center gap-1">
                  {onCollectColor && <button onClick={() => onCollectColor(pickedColor)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600"><Bookmark size={18} /></button>}
                  <button onClick={() => setPickedColor(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-300 hover:text-red-500"><X size={18}/></button>
                </div>
            </div>
          )}

          {/* Nav Arrows */}
          {viewMode === 'view' && zoomLevel <= 1 && (
              <>
                <div className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none z-40">
                    {hasPrev ? <button onClick={(e) => { e.stopPropagation(); setDirection('left'); onPrev?.(); }} className="pointer-events-auto p-2 rounded-full bg-black/10 hover:bg-black/40 text-white/50 hover:text-white transition-all backdrop-blur-[2px] no-gesture-propagation"><ChevronLeft size={32} /></button> : <div></div>}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none z-40">
                    {hasNext ? <button onClick={(e) => { e.stopPropagation(); setDirection('right'); onNext?.(); }} className="pointer-events-auto p-2 rounded-full bg-black/10 hover:bg-black/40 text-white/50 hover:text-white transition-all backdrop-blur-[2px] no-gesture-propagation"><ChevronRight size={32} /></button> : <div></div>}
                </div>
              </>
          )}
        </div>

        {/* DETAILS SECTION */}
        <div 
          className={`
             flex flex-col bg-white
             lg:w-1/4 lg:h-full lg:relative lg:translate-y-0 lg:border-l lg:border-gray-100
             fixed inset-x-0 bottom-0 z-[70] lg:z-auto rounded-none
             transition-transform duration-300 ease-out
             ${showMobileInfo ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
             max-h-[85vh] lg:max-h-full shadow-[0_-10px_40px_rgba(0,0,0,0.3)] lg:shadow-none
             pb-safe
             ${viewMode === 'image-edit' ? 'lg:hidden' : ''} 
          `}
        >
          {/* Mobile Drag Handle */}
          <div className="lg:hidden w-full flex justify-center py-3 shrink-0" onClick={() => viewMode !== 'meta-edit' && setShowMobileInfo(false)}>
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="px-6 py-4 lg:p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 w-full">
                {/* Desktop Buttons */}
                <div className="hidden lg:flex items-center justify-between w-full gap-1">
                    <button onClick={() => setViewMode('image-edit')} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="编辑图片"><Crop size={18} /></button>
                    <button onClick={() => setIsPickerActive(!isPickerActive)} className={`p-1.5 rounded ${isPickerActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`} title="取色器"><Pipette size={18} /></button>
                    <button onClick={toggleFullscreen} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded" title="全屏"><Maximize size={18}/></button>
                    <button onClick={handleToggleFavorite} className={`p-1.5 hover:bg-red-50 rounded ${photo.isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}><Heart size={18} className={photo.isFavorite?'fill-current':''}/></button>
                    <button onClick={handleDeleteClick} className={`p-1.5 hover:bg-red-50 rounded ${isDeleteConfirm?'text-red-600 bg-red-50':'text-gray-400 hover:text-red-600'}`}><Trash2 size={18}/></button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded"><X size={18} /></button>
                </div>
                {/* Mobile Title */}
                <span className="lg:hidden text-xs font-bold text-gray-400 uppercase tracking-widest">照片信息</span>
            </div>
            
            {/* Mobile Close Button */}
            <button onClick={() => { if (window.innerWidth < 1024) setShowMobileInfo(false); else onClose(); }} className="lg:hidden text-gray-400 hover:text-gray-900 p-1"><X size={24} /></button>
          </div>

          {/* Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Title & Description */}
            <div className="group relative">
              {viewMode === 'meta-edit' ? (
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
                  <div className="flex items-start justify-between gap-4">
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{photo.title}</h1>
                      <button onClick={() => setViewMode('meta-edit')} className="text-gray-400 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100 shrink-0">
                         <Edit2 size={18} />
                      </button>
                  </div>
                  <p className="text-xs font-mono text-gray-400 flex items-center gap-2 uppercase tracking-wide mt-2 mb-4">
                    <Calendar size={12} />
                    {new Date(photo.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                  <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">{photo.description || '暂无描述'}</p>
                </div>
              )}
            </div>

            {/* Category - Instant Edit */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                <Folder size={12} /> 所属相册
              </label>
              
              <div className="relative inline-block w-full">
                <select
                  value={photo.categoryId}
                  onChange={handleCategoryChange}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 pl-3 pr-8 py-2 text-sm font-bold text-gray-700 uppercase rounded-none focus:border-black outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Tags - Instant Edit */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                <Tag size={12} /> 标签
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {photo.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-gray-200 text-gray-600 rounded-none group">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="ml-2 text-gray-300 hover:text-red-500">
                        <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              
              {/* Always Visible Input */}
              <div className="relative">
                  <input 
                    type="text" 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => handleAddTag(e)}
                    placeholder="添加标签..."
                    className="w-full text-sm border-b border-gray-200 py-2 focus:border-black outline-none bg-transparent placeholder:text-gray-300 transition-colors"
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
            </div>
          </div>
          
          {/* Footer Actions (Meta Edit Only) */}
          {viewMode === 'meta-edit' ? (
              <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex gap-3">
                 <button onClick={() => { setViewMode('view'); if(window.innerWidth<1024) setShowMobileInfo(false); }} className="flex-1 py-3 bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 uppercase text-xs tracking-wider rounded-none">
                  取消
                </button>
                <button onClick={handleMetaSave} className="flex-1 py-3 bg-black border border-transparent font-bold text-white hover:bg-gray-800 uppercase text-xs tracking-wider rounded-none">
                  保存信息
                </button>
              </div>
          ) : (
               <div className="hidden lg:block p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                   <button onClick={onClose} className="w-full py-3 bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 uppercase text-xs tracking-wider rounded-none">
                      关闭
                   </button>
               </div>
          )}
        </div>
      </div>
    </div>
  );
};