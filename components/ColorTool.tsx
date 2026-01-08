import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Check, Plus, Trash2, Palette, Edit3, X, Edit2 } from 'lucide-react';
import { ColorGroup, ColorItem } from '../types';

// --- Helper Functions ---

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

const getDistance = (rgb1: {r:number, g:number, b:number}, rgb2: {r:number, g:number, b:number}) => {
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
};

// Simplified traditional colors for fallback naming
const TRADITIONAL_COLORS_REF: {name: string, hex: string}[] = [
  { name: '精白', hex: '#ffffff' }, { name: '漆黑', hex: '#161823' }, { name: '朱砂', hex: '#ff461f' },
  { name: '鹅黄', hex: '#fff143' }, { name: '天青', hex: '#b5cefc' }, { name: '竹青', hex: '#789262' },
  { name: '海棠红', hex: '#f03752' }, { name: '月白', hex: '#eef7f2' }, { name: '玄青', hex: '#3d3b4f' },
];

const findNearestChineseName = (hex: string) => {
  const targetRgb = hexToRgb(hex);
  let minDistance = Infinity;
  let nearestName = '自定义色';
  
  for (const color of TRADITIONAL_COLORS_REF) {
    const currentRgb = hexToRgb(color.hex);
    const dist = getDistance(targetRgb, currentRgb);
    if (dist < minDistance) {
      minDistance = dist;
      nearestName = color.name;
    }
  }
  return nearestName;
};

interface ColorToolProps {
  groups: ColorGroup[];
  onUpdateGroups: (groups: ColorGroup[]) => void;
}

export const ColorTool: React.FC<ColorToolProps> = ({ groups, onUpdateGroups }) => {
  // State
  const [selectedColor, setSelectedColor] = useState('#E1B899');
  const [selectedName, setSelectedName] = useState('杏仁白');
  
  // UI States for creating/adding
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  const [addingColorToGroupId, setAddingColorToGroupId] = useState<string | null>(null);
  const [newColorHex, setNewColorHex] = useState('');
  const [newColorName, setNewColorName] = useState('');

  // Editing main display color code
  const [isEditingHex, setIsEditingHex] = useState(false);
  const [tempHexInput, setTempHexInput] = useState('');

  // Long press / Context Menu for individual Colors
  const [contextMenuColor, setContextMenuColor] = useState<{ groupId: string, colorId: string, name: string, hex: string } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // Derived values
  const rgb = useMemo(() => hexToRgb(selectedColor), [selectedColor]);
  const hsv = useMemo(() => rgbToHsv(rgb.r, rgb.g, rgb.b), [rgb]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: ColorGroup = {
      id: crypto.randomUUID(),
      name: newGroupName,
      colors: [],
      isCustom: true
    };
    onUpdateGroups([...groups, newGroup]);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('确定要删除这个色彩组吗？')) {
      onUpdateGroups(groups.filter(g => g.id !== groupId));
    }
  };

  const handleAddColorToGroup = () => {
    if (!addingColorToGroupId || !newColorHex.trim() || !newColorName.trim()) return;
    
    // Basic validation for hex
    let hex = newColorHex.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (!/^#[0-9A-F]{6}$/i.test(hex)) {
      alert('请输入有效的HEX颜色代码 (例如 #FF0000)');
      return;
    }

    const newColor: ColorItem = {
      id: crypto.randomUUID(),
      name: newColorName,
      hex: hex
    };

    onUpdateGroups(groups.map(g => {
      if (g.id === addingColorToGroupId) {
        return { ...g, colors: [...g.colors, newColor] };
      }
      return g;
    }));

    setAddingColorToGroupId(null);
    setNewColorHex('');
    setNewColorName('');
    setSelectedColor(hex);
    setSelectedName(newColorName);
  };

  const handleColorClick = (color: ColorItem) => {
    if (isLongPress.current) return;
    setSelectedColor(color.hex);
    setSelectedName(color.name);
  };

  const handleHexInputSubmit = () => {
    let hex = tempHexInput.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      setSelectedColor(hex);
      setSelectedName(findNearestChineseName(hex));
      setIsEditingHex(false);
    } else {
      alert('无效的颜色代码');
    }
  };

  // --- Long Press Logic ---
  const startPress = (groupId: string, color: ColorItem) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setContextMenuColor({ groupId, colorId: color.id, name: color.name, hex: color.hex });
    }, 600);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // --- Color Context Actions ---
  const handleDeleteColor = () => {
    if (!contextMenuColor) return;
    if (confirm(`删除颜色 ${contextMenuColor.name}?`)) {
      onUpdateGroups(groups.map(g => {
        if (g.id === contextMenuColor.groupId) {
          return { ...g, colors: g.colors.filter(c => c.id !== contextMenuColor.colorId) };
        }
        return g;
      }));
    }
    setContextMenuColor(null);
  };

  const handleEditColor = () => {
    if (!contextMenuColor) return;
    const newName = prompt("修改颜色名称", contextMenuColor.name);
    const newHex = prompt("修改颜色HEX值", contextMenuColor.hex);

    if (newName && newHex && /^#[0-9A-F]{6}$/i.test(newHex)) {
       onUpdateGroups(groups.map(g => {
        if (g.id === contextMenuColor.groupId) {
          return { ...g, colors: g.colors.map(c => c.id === contextMenuColor.colorId ? { ...c, name: newName, hex: newHex } : c) };
        }
        return g;
      }));
      // Update display if selected
      if (selectedColor === contextMenuColor.hex) {
        setSelectedColor(newHex);
        setSelectedName(newName);
      }
    } else if (newHex && !/^#[0-9A-F]{6}$/i.test(newHex)) {
      alert("无效的HEX代码");
    }
    setContextMenuColor(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-50 overflow-hidden font-sans pt-safe pb-safe">
      
      {/* LEFT: Display Panel */}
      <div className="w-full md:w-5/12 h-2/5 md:h-full relative flex flex-col transition-all duration-500 ease-in-out shadow-xl z-10 border-r border-slate-200 overflow-y-auto custom-scrollbar">
        <div 
          className="absolute inset-0 z-0"
          style={{ background: `linear-gradient(to bottom right, ${selectedColor}, #ffffff)` }}
        />
        
        <div className="relative z-10 flex flex-col flex-1 p-8 items-center justify-center text-center">
           {/* Color Name */}
           <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2 font-serif tracking-tight">
             {selectedName}
           </h2>
           
           {/* Editable HEX */}
           <div className="mb-6 h-10 flex items-center justify-center relative group">
             {isEditingHex ? (
               <div className="flex items-center gap-2">
                 <input 
                    autoFocus
                    type="text" 
                    value={tempHexInput}
                    onChange={(e) => setTempHexInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleHexInputSubmit()}
                    onBlur={() => { /* optional: auto submit or cancel */ }}
                    className="w-32 text-center text-lg font-mono border-b-2 border-gray-900 bg-transparent outline-none uppercase"
                 />
                 <button onClick={handleHexInputSubmit} className="text-green-600"><Check size={20}/></button>
                 <button onClick={() => setIsEditingHex(false)} className="text-red-500"><X size={20}/></button>
               </div>
             ) : (
               <button 
                 onClick={() => { setTempHexInput(selectedColor); setIsEditingHex(true); }}
                 className="text-lg font-mono text-gray-700 uppercase tracking-widest opacity-80 hover:opacity-100 hover:bg-white/50 px-3 py-1 transition-all flex items-center gap-2 rounded-none"
                 title="点击修改颜色代码"
               >
                 {selectedColor}
                 <Edit3 size={14} className="opacity-0 group-hover:opacity-100" />
               </button>
             )}
           </div>

           {/* Values */}
           <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
              <div className="bg-white/60 backdrop-blur-md p-3 shadow-sm border border-white/40 rounded-none">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wider">RGB</span>
                <span className="font-mono text-gray-900 font-medium">{rgb.r}, {rgb.g}, {rgb.b}</span>
              </div>
              <div className="bg-white/60 backdrop-blur-md p-3 shadow-sm border border-white/40 rounded-none">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wider">HSV</span>
                <span className="font-mono text-gray-900 font-medium">{hsv.h}°, {hsv.s}%, {hsv.v}%</span>
              </div>
           </div>
        </div>
      </div>

      {/* RIGHT: Library Panel */}
      <div className="w-full md:w-7/12 h-3/5 md:h-full bg-white overflow-y-auto p-4 md:p-10 relative custom-scrollbar">
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/95 backdrop-blur-sm py-4 z-20 border-b border-gray-100">
           <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-wide whitespace-nowrap">
            <Palette size={20} className="text-gray-900" />
            色彩库
          </h3>
          <button 
            onClick={() => setIsAddingGroup(true)}
            className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-gray-900 px-4 py-2 transition-colors font-bold uppercase tracking-wider rounded-none whitespace-nowrap"
          >
            <Plus size={14} /> 新建色彩组
          </button>
        </div>
        
        {/* Create Group Form */}
        {isAddingGroup && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 animate-fade-in rounded-none">
            <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">新建组名</h4>
            <div className="flex gap-0">
              <input 
                type="text" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="名称"
                className="flex-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black rounded-none"
              />
              <button onClick={handleCreateGroup} className="bg-black text-white px-5 py-2 text-xs font-bold hover:bg-gray-800 uppercase rounded-none whitespace-nowrap">创建</button>
              <button onClick={() => setIsAddingGroup(false)} className="bg-white border border-l-0 border-gray-300 text-gray-700 px-5 py-2 text-xs font-bold hover:bg-gray-50 uppercase rounded-none whitespace-nowrap">取消</button>
            </div>
          </div>
        )}

        <div className="space-y-10 pb-10">
          {groups.map((group) => (
            <div key={group.id} className="relative group/container">
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">{group.name}</h4>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setAddingColorToGroupId(group.id)}
                    className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-black font-bold uppercase tracking-wider whitespace-nowrap"
                  >
                    <Plus size={10} /> 添加颜色
                  </button>
                  {group.isCustom && (
                    <button 
                      onClick={() => handleDeleteGroup(group.id)}
                      className="text-xs text-red-300 hover:text-red-600 p-1 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Add Color Form for this group */}
              {addingColorToGroupId === group.id && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-none shadow-sm">
                   <h5 className="text-xs font-bold text-gray-700 mb-3 uppercase">添加到 "{group.name}"</h5>
                   <div className="flex flex-col md:flex-row gap-2">
                     <input 
                        type="text"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        placeholder="#HEX"
                        className="flex-1 border border-gray-300 px-3 py-2 text-sm uppercase rounded-none focus:border-black outline-none"
                     />
                     <input 
                        type="text"
                        value={newColorName}
                        onChange={(e) => setNewColorName(e.target.value)}
                        placeholder="颜色名称"
                        className="flex-1 border border-gray-300 px-3 py-2 text-sm rounded-none focus:border-black outline-none"
                     />
                     <div className="flex gap-0">
                        <button onClick={handleAddColorToGroup} className="bg-black text-white px-4 py-2 text-sm rounded-none hover:bg-gray-800"><Check size={16}/></button>
                        <button onClick={() => setAddingColorToGroupId(null)} className="bg-white border border-gray-300 border-l-0 text-gray-500 px-4 py-2 text-sm rounded-none hover:bg-gray-50"><X size={16}/></button>
                     </div>
                   </div>
                </div>
              )}

              {group.colors.length === 0 ? (
                <div className="text-xs text-gray-300 italic py-4 border border-dashed border-gray-200 text-center rounded-none whitespace-nowrap">暂无颜色</div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                  {group.colors.map((color) => (
                    <div key={color.id} className="group relative">
                      <button
                        onPointerDown={() => startPress(group.id, color)}
                        onPointerUp={() => { cancelPress(); handleColorClick(color); }}
                        onPointerLeave={cancelPress}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`w-full aspect-square shadow-sm hover:shadow-lg transition-all duration-200 ring-2 ring-offset-2 ${selectedColor === color.hex ? 'ring-black z-10 scale-105' : 'ring-transparent hover:scale-110 hover:z-10'} rounded-none`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Context Menu for Color */}
      {contextMenuColor && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-xs shadow-2xl p-0 animate-fade-in rounded-none border border-gray-200">
             <div className="flex items-center gap-4 p-5 border-b border-gray-100 bg-gray-50">
                <div className="w-10 h-10 shadow-sm border border-gray-200 rounded-none" style={{ backgroundColor: contextMenuColor.hex }}></div>
                <div>
                   <h3 className="text-base font-bold text-gray-900">{contextMenuColor.name}</h3>
                   <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">{contextMenuColor.hex}</p>
                </div>
             </div>
             <div className="flex flex-col">
               <button 
                 onClick={handleEditColor}
                 className="flex items-center justify-center gap-2 bg-white text-gray-700 py-4 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors border-b border-gray-100 rounded-none whitespace-nowrap"
               >
                 <Edit2 size={14} /> 编辑颜色
               </button>
               <button 
                 onClick={handleDeleteColor}
                 className="flex items-center justify-center gap-2 bg-white text-red-600 py-4 font-bold text-xs uppercase tracking-wider hover:bg-red-50 transition-colors border-b border-gray-100 rounded-none whitespace-nowrap"
               >
                 <Trash2 size={14} /> 删除颜色
               </button>
               <button 
                 onClick={() => setContextMenuColor(null)}
                 className="py-4 text-gray-400 hover:text-gray-900 font-bold text-xs uppercase tracking-wider bg-white rounded-none whitespace-nowrap"
               >
                 取消
               </button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
};