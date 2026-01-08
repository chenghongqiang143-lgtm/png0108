import React, { useState, useRef, useEffect } from 'react';
import { Note, NoteCategory } from '../types';
import { Bold, Highlighter, ListOrdered, Image as ImageIcon, Heading1, Heading2, Heading3, CheckSquare, Plus, Trash2, ArrowLeft, Save, StickyNote, FolderPlus, MoreHorizontal, Edit2 } from 'lucide-react';

const DEFAULT_CATEGORIES: NoteCategory[] = [
  { id: 'all', name: '全部' },
  { id: 'idea', name: '灵感' },
  { id: 'todo', name: '待办' },
  { id: 'archive', name: '归档' }
];

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
  
  // Edit State
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  
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

  // Sync content when selecting note
  useEffect(() => {
    if (selectedNoteId) {
      const note = notes.find(n => n.id === selectedNoteId);
      if (note) {
        setEditTitle(note.title);
        setEditContent(note.content);
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
    setSelectedNoteId(newNote.id);
  };

  const handleDeleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定删除此便签吗？')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNoteId === id) setSelectedNoteId(null);
    }
  };

  const handleSave = () => {
    if (selectedNoteId && editorRef.current) {
      const content = editorRef.current.innerHTML;
      setNotes(prev => prev.map(n => n.id === selectedNoteId ? {
        ...n,
        title: editTitle,
        content: content,
        updatedAt: Date.now()
      } : n));
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

  const cancelCategoryPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCategoryClick = (id: string) => {
    if (isLongPress.current) return;
    setSelectedCategoryId(id);
  };

  const handleRenameCategory = () => {
    if (!contextMenuCategory) return;
    const newName = prompt("重命名分类", contextMenuCategory.name);
    // Explicitly using the captured ID to ensure closure scope is correct, though state ref is usually fine
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
        // Move notes to default 'idea' or 'all' equivalent before deleting
        setNotes(prev => prev.map(n => n.categoryId === targetId ? { ...n, categoryId: 'idea' } : n));
        setCategories(prev => prev.filter(c => c.id !== targetId));
        if (selectedCategoryId === targetId) setSelectedCategoryId('all');
     }
     setContextMenuCategory(null);
  };

  // Editor Commands
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
       editorRef.current.focus();
    }
  };

  const insertImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      execCmd('insertImage', url);
    }
  };
  
  const insertCheckbox = () => {
     // Insert a checkbox wrapped in a div with a specific class for identification
     const html = '<div class="todo-item" style="display: flex; align-items: center;"><input type="checkbox" style="margin-right: 8px;" /> &nbsp;</div>';
     execCmd('insertHTML', html);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentNode!;

      // Check for Checkbox Line
      const todoItem = (node as HTMLElement).closest('.todo-item');
      if (todoItem) {
        // We are in a todo item, create a new one
        e.preventDefault(); // Prevent default div split
        
        // Manual insertion of new checkbox line
        const newRow = document.createElement('div');
        newRow.className = 'todo-item';
        newRow.style.display = 'flex';
        newRow.style.alignItems = 'center';
        newRow.innerHTML = '<input type="checkbox" style="margin-right: 8px;" /> &nbsp;';
        
        // Insert after current row
        if (todoItem.nextSibling) {
            todoItem.parentNode?.insertBefore(newRow, todoItem.nextSibling);
        } else {
            todoItem.parentNode?.appendChild(newRow);
        }

        // Move cursor to new row
        const newRange = document.createRange();
        // Position at end of the new row's text content (the &nbsp;)
        newRange.selectNodeContents(newRow);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  };

  // --- Views ---

  if (selectedNoteId) {
    // EDITOR VIEW
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSelectedNoteId(null)} className="text-slate-500 hover:text-slate-900">
              <ArrowLeft size={20} />
            </button>
            <input 
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              className="text-xl font-bold text-slate-900 border-none focus:outline-none w-full"
              placeholder="标题"
            />
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 text-green-600 font-bold uppercase text-xs hover:bg-green-50 px-3 py-1.5 transition-colors"
          >
            <Save size={16} /> 已保存
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50 overflow-x-auto">
          <ToolButton onClick={() => execCmd('formatBlock', 'H1')} icon={<Heading1 size={18} />} title="一级标题" />
          <ToolButton onClick={() => execCmd('formatBlock', 'H2')} icon={<Heading2 size={18} />} title="二级标题" />
          <ToolButton onClick={() => execCmd('formatBlock', 'H3')} icon={<Heading3 size={18} />} title="三级标题" />
          <div className="w-px h-6 bg-slate-200 mx-2"></div>
          <ToolButton onClick={() => execCmd('bold')} icon={<Bold size={18} />} title="加粗" />
          <ToolButton onClick={() => execCmd('backColor', 'yellow')} icon={<Highlighter size={18} />} title="高亮" />
          <div className="w-px h-6 bg-slate-200 mx-2"></div>
          <ToolButton onClick={() => execCmd('insertOrderedList')} icon={<ListOrdered size={18} />} title="数字列表" />
          <ToolButton onClick={insertCheckbox} icon={<CheckSquare size={18} />} title="复选框" />
          <div className="w-px h-6 bg-slate-200 mx-2"></div>
          <label className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white cursor-pointer rounded-sm">
             <ImageIcon size={18} />
             <input type="file" ref={fileInputRef} onChange={insertImage} accept="image/*" className="hidden" />
          </label>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
           <div 
             ref={editorRef}
             className="prose prose-slate max-w-3xl mx-auto focus:outline-none min-h-[50vh]"
             contentEditable
             onKeyDown={handleKeyDown}
             onInput={handleSave} // Auto save on input
             onBlur={handleSave}
             style={{ whiteSpace: 'pre-wrap' }}
           />
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="h-full flex flex-col bg-gray-50">
       
       {/* Top Bar: Categories */}
       <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 pr-4">
             {categories.map(cat => (
               <button
                 key={cat.id}
                 onPointerDown={() => startCategoryPress(cat)}
                 onPointerUp={() => { cancelCategoryPress(); handleCategoryClick(cat.id); }}
                 onPointerLeave={cancelCategoryPress}
                 onContextMenu={(e) => e.preventDefault()}
                 className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedCategoryId === cat.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                 {cat.name}
               </button>
             ))}
          </div>
          <button 
            onClick={handleCreateCategory}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 shrink-0"
            title="添加分类"
          >
            <FolderPlus size={16} />
          </button>
       </div>

       {/* Main Content */}
       <div className="flex-1 overflow-y-auto p-6 md:p-8">
         <div className="flex justify-between items-end mb-6">
            <div>
               <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">灵感便签</h2>
               <p className="text-xs text-slate-400 mt-1 font-mono">{filteredNotes.length} 条笔记</p>
            </div>
            <button 
              onClick={handleCreateNote}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors rounded-none shadow-lg active:translate-y-0.5"
            >
              <Plus size={18} /> 新建便签
            </button>
         </div>

         {filteredNotes.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 bg-white/50">
             <StickyNote size={48} className="mb-4 opacity-20" />
             <p className="font-bold">此分类暂无便签</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {filteredNotes.map(note => (
               <div 
                 key={note.id}
                 onClick={() => setSelectedNoteId(note.id)}
                 className="bg-white p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer border border-slate-100 group flex flex-col h-56 rounded-none relative hover:-translate-y-1"
               >
                 <div className="flex justify-between items-start mb-4">
                   <h3 className="font-bold text-lg text-slate-900 truncate pr-4">{note.title}</h3>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleDeleteNote(e, note.id)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                   </div>
                 </div>
                 <div className="flex-1 overflow-hidden text-sm text-slate-500 opacity-70 mask-image-b leading-relaxed">
                    {/* Strip tags for preview, simplify text */}
                    {note.content.replace(/<[^>]+>/g, ' ').slice(0, 100) || '无内容'}
                 </div>
                 <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase">
                   <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                   <span className="bg-slate-100 px-2 py-0.5 rounded-sm">{categories.find(c => c.id === note.categoryId)?.name || '未知'}</span>
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>

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

const ToolButton: React.FC<{onClick: () => void, icon: React.ReactNode, title: string}> = ({ onClick, icon, title }) => (
  <button 
    onClick={onClick}
    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white transition-colors rounded-sm"
    title={title}
    onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from editor
  >
    {icon}
  </button>
);
