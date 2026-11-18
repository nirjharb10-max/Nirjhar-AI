export interface PictureColumn {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  fileName?: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  focusColumnId?: string;
  focusColumnIndex?: number;
  focusImageUrl?: string | null;
  focusTitle?: string;
  isError?: boolean;
}

export type ColumnGridMode = 2 | 3;
