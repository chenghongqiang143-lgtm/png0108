import React, { useState, useRef, useEffect } from 'react';
import { Note, NoteCategory } from '../types';
import { Bold, Highlighter, Image as ImageIcon, CheckSquare, Plus, Trash2, ArrowLeft, Save, StickyNote, FolderPlus, Edit2, Heading1, Heading2, Heading3, Check, X, FolderInput, Folder } from 'lucide-react';

const DEFAULT_CATEGORIES: NoteCategory[] = [
  { id: 'all', name: '全部' },
  { id: 'idea', name: '灵感' },
  { id: 'todo', name: '待办' },
  { id: 'archive', name: '归档' }
];

interface ToolButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ onClick, icon, title }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-sm transition-colors"
    title={title}
  >
    {icon}
  </button>
);

export const NoteTool: React.FC = () => {
  // State
  const [categories, setCategories] = useState<NoteCategory[]>(() => {
    const saved = localStorage.getItem('note_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('inspiration_notes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Edit State
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  
  // Category Edit State (Long Press)
  const [contextMenuCategory, setContextMenuCategory] = useState<NoteCategory | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('note_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('inspiration_notes', JSON.stringify(notes));
  }, [notes]);

  // History Handler for Editor View and Selection Mode
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const modalKey = e.state?.modal;
      if (selectedNoteId && modalKey !== 'note-editor') {
        setSelectedNoteId(null);
      }
      if (isSelectionMode && modalKey !== 'note-selection') {
        setIsSelectionMode(false);
        setSelectedNoteIds(new Set());
      }
      if (isMoveModalOpen && modalKey !== 'note-move') {
        setIsMoveModalOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedNoteId, isSelectionMode, isMoveModalOpen]);

  const openNoteEditor = (noteId: string) => {
     window.history.pushState({ modal: 'note-editor' }, '', window.location.href);
     setSelectedNoteId(noteId);
  };
  
  const closeNoteEditor = () => {
     window.history.back();
  };
  
  const enterSelectionMode = () => {
    window.history.pushState({ modal: 'note-selection' }, '', window.location.href);
    setIsSelectionMode(true);
  };

  const exitSelectionMode = () => {
    // If move modal is open, we need to close it first if history stack is involved, 
    // but typically we close modal then exit selection.
    window.history.back();
  };

  const openMoveModal = () => {
    window.history.pushState({ modal: 'note-move' }, '', window.location.href);
    setIsMoveModalOpen(true);
  };

  const closeMoveModal = () => {
    window.history.back();
  };

  // Sync content when selecting note
  useEffect(() => {
    if (selectedNoteId) {
      const note = notes.find(n => n.id === selectedNoteId);
      if (note) {
        setEditTitle(note.title);
        setEditContent(note.content);
        setEditCategoryId(note.categoryId);
        if (editorRef.current) {
          editorRef.current.innerHTML = note.content;
        }
      }
    }
  }, [selectedNoteId]);

  // --- Logic ---

  const filteredNotes = notes.filter(note => {
    if (selectedCategoryId === 'all') return true;
    return note.categoryId === selectedCategoryId;
  });

  const handleCreateCategory = () => {
    const name = prompt("新建分类名称：");
    if (name) {
      setCategories([...categories, { id: crypto.randomUUID(), name }]);
    }
  };

  const handleCreateNote = () => {
    if (isSelectionMode) return;
    const categoryId = selectedCategoryId === 'all' ? 'idea' : selectedCategoryId;
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '新灵感',
      content: '', // Initial content is empty
      categoryId: categoryId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    // Use history push for new note creation as well
    openNoteEditor(newNote.id);
  };

  const handleDeleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定删除此便签吗？')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNoteId === id) closeNoteEditor();
    }
  };
  
  const handleBatchDelete = () => {
      if (selectedNoteIds.size === 0) return;
      if (confirm(`确定删除选中的 ${selectedNoteIds.size} 个便签吗？`)) {
          setNotes(prev => prev.filter(n => !selectedNoteIds.has(n.id)));
          exitSelectionMode();
      }
  };

  const handleBatchMove = (targetCategoryId: string) => {
      if (selectedNoteIds.size === 0) return;
      
      setNotes(prev => prev.map(n => {
          if (selectedNoteIds.has(n.id)) {
              return { ...n, categoryId: targetCategoryId, updatedAt: Date.now() };
          }
          return n;
      }));

      closeMoveModal();
      exitSelectionMode();
  };

  const handleSave = () => {
    if (selectedNoteId && editorRef.current) {
      const content = editorRef.current.innerHTML;
      setNotes(prev => prev.map(n => n.id === selectedNoteId ? {
        ...n,
        title: editTitle,
        content: content,
        categoryId: editCategoryId,
        updatedAt: Date.now()
      } : n));
    }
  };

  // Note Long Press for Selection
  const startNotePress = (noteId: string) => {
      if (isSelectionMode) return;
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          if (!isSelectionMode) {
              enterSelectionMode();
              setSelectedNoteIds(new Set([noteId]));
              if (navigator.vibrate) navigator.vibrate(50);
          }
      }, 600);
  };

  const handleNoteClick = (noteId: string) => {
      if (isLongPress.current) return;
      
      if (isSelectionMode) {
          const newSet = new Set(selectedNoteIds);
          if (newSet.has(noteId)) {
              newSet.delete(noteId);
          } else {
              newSet.add(noteId);
          }
          setSelectedNoteIds(newSet);
      } else {
          openNoteEditor(noteId);
      }
  };

  // Category Long Press Logic
  const startCategoryPress = (category: NoteCategory) => {
    if (category.id === 'all') return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setContextMenuCategory(category);
    }, 600);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCategoryClick = (id: string) => {
    if (isLongPress.current) return;
    setSelectedCategoryId(id);
    if (isSelectionMode) {
        exitSelectionMode();
    }
  };

  const handleRenameCategory = () => {
    if (!contextMenuCategory) return;
    const newName = prompt("重命名分类", contextMenuCategory.name);
    const targetId = contextMenuCategory.id;
    if (newName && newName.trim()) {
      setCategories(prev => prev.map(c => c.id === targetId ? { ...c, name: newName.trim() } : c));
    }
    setContextMenuCategory(null);
  };

  const handleDeleteCategory = () => {
     if (!contextMenuCategory) return;
     const targetId = contextMenuCategory.id;
     if (confirm(`删除分类 "${contextMenuCategory.name}"? (该分类下的便签将移至"灵感")`)) {
        setNotes(prev => prev.map(n => n.categoryId === targetId ? { ...n, categoryId: 'idea' } : n));
        setCategories(prev => prev.filter(c => c.id !== targetId));
        if (selectedCategoryId === targetId) setSelectedCategoryId('all');
     }
     setContextMenuCategory(null);
  };

  // --- Editor Logic ---
  // (Editor logic mostly unchanged)
  const getCurrentBlock = (): HTMLElement | null => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    let node = selection.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentElement as HTMLElement;
    
    let el = node as HTMLElement;
    while (el && el !== editorRef.current && el.parentElement !== editorRef.current) {
        if (el.parentElement) el = el.parentElement;
        else break;
    }
    if (el === editorRef.current) return null;
    return el;
  };

  const handleLineFormat = (command: string, value?: string) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    if (!selection.isCollapsed) {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
        return;
    }

    let block = getCurrentBlock();
    if (!block) {
        document.execCommand('formatBlock', false, 'div');
        block = getCurrentBlock(); 
    }

    if (block) {
        const range = document.createRange();
        range.selectNodeContents(block);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand(command, false, value);
        selection.collapseToEnd();
    } else {
        document.execCommand(command, false, value);
    }
    if (editorRef.current) editorRef.current.focus();
  };

  const toggleHeading = (tag: string) => {
      const block = getCurrentBlock();
      if (block && block.tagName === tag.toUpperCase()) {
          document.execCommand('formatBlock', false, 'div');
      } else {
          document.execCommand('formatBlock', false, tag);
      }
      if (editorRef.current) editorRef.current.focus();
  };

  const toggleCheckboxLine = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    let block = getCurrentBlock();
    if (!block) {
         document.execCommand('formatBlock', false, 'div');
         block = getCurrentBlock();
    }
    
    if (block) {
        if (block.classList.contains('todo-item')) {
             const newDiv = document.createElement('div');
             newDiv.innerHTML = block.innerHTML.replace(/<input[^>]*>/i, '');
             block.replaceWith(newDiv);
             const range = document.createRange();
             range.selectNodeContents(newDiv);
             range.collapse(false);
             selection.removeAllRanges();
             selection.addRange(range);
        } else {
            const newDiv = document.createElement('div');
            newDiv.className = 'todo-item';
            newDiv.style.cssText = 'display: flex; align-items: center; min-height: 2em;';
            newDiv.innerHTML = `<input type="checkbox" style="margin-right: 8px;" />${block.innerHTML}`;
            block.replaceWith(newDiv);
            const range = document.createRange();
            range.selectNodeContents(newDiv);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    } else {
        const html = '<div class="todo-item" style="display: flex; align-items: center; min-height: 2em;"><input type="checkbox" style="margin-right: 8px;" /></div>';
        document.execCommand('insertHTML', false, html);
    }
    if (editorRef.current) editorRef.current.focus();
  };

  const insertImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      document.execCommand('insertImage', false, url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentNode!;

      const todoItem = (node as HTMLElement).closest('.todo-item');
      if (todoItem) {
        e.preventDefault(); 
        const newRow = document.createElement('div');
        newRow.className = 'todo-item';
        newRow.style.display = 'flex';
        newRow.style.alignItems = 'center';
        newRow.style.minHeight = '2em';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.marginRight = '8px';
        newRow.appendChild(checkbox);
        
        if (todoItem.nextSibling) {
            todoItem.parentNode?.insertBefore(newRow, todoItem.nextSibling);
        } else {
            todoItem.parentNode?.appendChild(newRow);
        }

        const newRange = document.createRange();
        newRange.selectNodeContents(newRow);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentNode!;
      
      const todoItem = (node as HTMLElement).closest('.todo-item');
      if (todoItem && (todoItem as HTMLElement).innerText.trim() === '') {
         e.preventDefault();
         const newDiv = document.createElement('div');
         newDiv.innerHTML = '<br>'; 
         todoItem.replaceWith(newDiv);
         const newRange = document.createRange();
         newRange.selectNodeContents(newDiv);
         newRange.collapse(true);
         selection.removeAllRanges();
         selection.addRange(newRange);
      }
    }
  };

  // --- Views ---

  if (selectedNoteId) {
    // EDITOR VIEW (Unchanged)
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            <button onClick={closeNoteEditor} className="text-slate-500 hover:text-slate-900 shrink-0">
              <ArrowLeft size={20} />
            </button>
            <input 
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              className="text-lg font-bold text-slate-900 border-none focus:outline-none w-full min-w-0"
              placeholder="标题"
            />
          </div>
          <div className="flex items-center gap-3 pl-2">
            <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                onBlur={handleSave}
                className="text-xs font-bold text-slate-500 bg-slate-50 border-none rounded-sm py-1.5 px-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors max-w-[100px]"
            >
                {categories.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 text-green-600 font-bold uppercase text-xs hover:bg-green-50 px-3 py-1.5 transition-colors shrink-0"
            >
                <Save size={16} /> <span className="hidden sm:inline">已保存</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50 overflow-x-auto">
          <ToolButton onClick={() => toggleHeading('h1')} icon={<Heading1 size={16} />} title="标题1" />
          <ToolButton onClick={() => toggleHeading('h2')} icon={<Heading2 size={16} />} title="标题2" />
          <ToolButton onClick={() => toggleHeading('h3')} icon={<Heading3 size={16} />} title="标题3" />
          <div className="w-px h-4 bg-slate-200 mx-2"></div>
          <ToolButton onClick={() => handleLineFormat('bold')} icon={<Bold size={16} />} title="加粗" />
          <ToolButton onClick={() => handleLineFormat('backColor', 'yellow')} icon={<Highlighter size={16} />} title="高亮" />
          <div className="w-px h-4 bg-slate-200 mx-2"></div>
          <ToolButton onClick={toggleCheckboxLine} icon={<CheckSquare size={16} />} title="复选框" />
          <label className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white cursor-pointer rounded-sm">
             <ImageIcon size={16} />
             <input type="file" ref={fileInputRef} onChange={insertImage} accept="image/*" className="hidden" />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
           <div 
             ref={editorRef}
             className="prose prose-sm prose-slate max-w-3xl mx-auto focus:outline-none min-h-[50vh] 
                        [&>h1]:text-3xl [&>h1]:font-black [&>h1]:mt-6 [&>h1]:mb-4
                        [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-5 [&>h2]:mb-3
                        [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mt-4 [&>h3]:mb-2"
             contentEditable
             onKeyDown={handleKeyDown}
             onInput={handleSave}
             onBlur={handleSave}
             style={{ whiteSpace: 'pre-wrap', lineHeight: '2' }}
           />
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
       
       {/* Top Bar: Categories */}
       <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 pr-4">
             {categories.map(cat => (
               <button
                 key={cat.id}
                 onPointerDown={() => startCategoryPress(cat)}
                 onPointerUp={() => { cancelPress(); handleCategoryClick(cat.id); }}
                 onPointerLeave={cancelPress}
                 onContextMenu={(e) => e.preventDefault()}
                 className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${selectedCategoryId === cat.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                 {cat.name}
               </button>
             ))}
          </div>
          <button 
            onClick={handleCreateCategory}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 shrink-0"
            title="添加分类"
          >
            <FolderPlus size={14} />
          </button>
       </div>

       {/* Main Content */}
       <div className="flex-1 overflow-y-auto p-2 md:p-4 pb-20">
         <div className="flex justify-between items-end mb-4 px-2">
            <div>
               <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">灵感便签</h2>
               <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{filteredNotes.length} 条笔记</p>
            </div>
            
            {isSelectionMode ? (
                <div className="flex gap-2">
                     <button onClick={() => setSelectedNoteIds(new Set(filteredNotes.map(n => n.id)))} className="text-xs px-2 py-1 bg-white border border-slate-200 font-bold uppercase rounded-sm">全选</button>
                     <button onClick={exitSelectionMode} className="text-xs px-2 py-1 bg-white border border-slate-200 font-bold uppercase rounded-sm">取消</button>
                </div>
            ) : (
                <button 
                  onClick={handleCreateNote}
                  className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors rounded-none shadow-lg active:translate-y-0.5"
                >
                  <Plus size={14} /> 新建
                </button>
            )}
         </div>

         {filteredNotes.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-200 bg-white/50 mx-2">
             <StickyNote size={32} className="mb-2 opacity-20" />
             <p className="font-bold text-xs">此分类暂无便签</p>
           </div>
         ) : (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
             {filteredNotes.map(note => (
               <div 
                 key={note.id}
                 onClick={() => handleNoteClick(note.id)}
                 onPointerDown={() => startNotePress(note.id)}
                 onPointerUp={cancelPress}
                 onPointerLeave={cancelPress}
                 onContextMenu={(e) => e.preventDefault()}
                 className={`bg-white p-3 md:p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer border group flex flex-col h-40 rounded-none relative 
                    ${isSelectionMode && selectedNoteIds.has(note.id) ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50' : 'border-slate-100 hover:-translate-y-0.5'}
                 `}
               >
                 <div className="flex justify-between items-start mb-2">
                   <h3 className="font-bold text-sm text-slate-900 truncate pr-4">{note.title}</h3>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isSelectionMode && (
                          <button 
                            onClick={(e) => handleDeleteNote(e, note.id)}
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                      )}
                   </div>
                 </div>
                 <div className="flex-1 overflow-hidden text-xs text-slate-500 opacity-70 mask-image-b leading-relaxed select-none">
                    {note.content.replace(/<[^>]+>/g, ' ').slice(0, 80) || '无内容'}
                 </div>
                 <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase">
                   <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                   <span className="bg-slate-100 px-1.5 py-0.5 rounded-sm truncate max-w-[60px]">{categories.find(c => c.id === note.categoryId)?.name || '未知'}</span>
                 </div>

                 {isSelectionMode && (
                     <div className={`absolute top-2 right-2 w-5 h-5 border flex items-center justify-center ${selectedNoteIds.has(note.id) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300'}`}>
                         {selectedNoteIds.has(note.id) && <Check size={12} />}
                     </div>
                 )}
               </div>
             ))}
           </div>
         )}
      </div>
      
      {/* Batch Action Bar */}
      {isSelectionMode && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto min-w-[300px] max-w-[90%] bg-slate-900 text-white px-6 py-3 shadow-xl flex items-center justify-between gap-6 animate-in slide-in-from-bottom-4 rounded-none z-20">
              <span className="text-xs font-bold whitespace-nowrap">已选 {selectedNoteIds.size} 项</span>
              <div className="flex items-center gap-3">
                  <button 
                      onClick={openMoveModal}
                      disabled={selectedNoteIds.size === 0} 
                      className="flex items-center gap-2 hover:bg-white/10 p-2 rounded-sm disabled:opacity-50 transition-colors text-xs font-bold uppercase"
                  >
                      <FolderInput size={16} /> 移动
                  </button>
                  <div className="h-4 w-px bg-white/20"></div>
                  <button onClick={handleBatchDelete} disabled={selectedNoteIds.size === 0} className="flex items-center gap-2 text-red-400 hover:text-red-300 p-2 rounded-sm disabled:opacity-50 font-bold text-xs uppercase tracking-wider">
                      <Trash2 size={16} /> 删除
                  </button>
                  <button onClick={exitSelectionMode} className="ml-2 p-1 hover:bg-white/20 rounded-full"><X size={16}/></button>
              </div>
          </div>
      )}

      {/* Move Category Modal */}
      {isMoveModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={closeMoveModal}>
            <div className="bg-white w-full max-w-sm p-6 m-4 shadow-2xl rounded-none animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">移动到分类</h3>
                    <button onClick={closeMoveModal} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
                    {categories.filter(c => c.id !== 'all').map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => handleBatchMove(cat.id)}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 hover:border-slate-900 hover:shadow-md transition-all rounded-none min-h-[80px]"
                        >
                            <Folder size={24} className="text-slate-700" />
                            <span className="text-xs font-bold text-slate-900 text-center truncate w-full">{cat.name}</span>
                        </button>
                    ))}
                    <button 
                        onClick={() => { closeMoveModal(); handleCreateCategory(); }}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-slate-100 transition-all rounded-none min-h-[80px]"
                    >
                        <Plus size={24} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">新建分类</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Context Menu for Categories */}
      {contextMenuCategory && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-xs shadow-2xl p-0 animate-fade-in rounded-none border border-slate-200">
             <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 text-center uppercase tracking-widest">管理分类: {contextMenuCategory.name}</h3>
             </div>
             <div className="flex flex-col">
               <button 
                 onClick={handleRenameCategory}
                 className="flex items-center justify-center gap-2 bg-white text-slate-700 py-4 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors border-b border-slate-100"
               >
                 <Edit2 size={14} /> 重命名
               </button>
               <button 
                 onClick={handleDeleteCategory}
                 className="flex items-center justify-center gap-2 bg-white text-red-600 py-4 font-bold text-xs uppercase tracking-wider hover:bg-red-50 transition-colors border-b border-slate-100"
               >
                 <Trash2 size={14} /> 删除分类
               </button>
               <button 
                 onClick={() => setContextMenuCategory(null)}
                 className="py-4 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-wider bg-white"
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