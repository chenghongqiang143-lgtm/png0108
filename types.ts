
export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name or emoji
  slug: string;
}

export interface Photo {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string; // Links to Category.id
  createdAt: number;
  width?: number;
  height?: number;
  isFavorite?: boolean; // New: Favorite status
}

export interface NoteCategory {
  id: string;
  name: string;
}

export interface Note {
  id: string;
  title: string;
  content: string; // HTML content
  categoryId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ColorItem {
  id: string;
  name: string;
  hex: string;
}

export interface ColorGroup {
  id: string;
  name: string;
  colors: ColorItem[];
  isCustom?: boolean;
}

export type ThemeColor = 'zinc' | 'blue' | 'indigo' | 'rose' | 'orange' | 'emerald' | 'cyan' | 'violet' | 'fuchsia' | 'lime' | 'amber' | 'teal' | 'sky';