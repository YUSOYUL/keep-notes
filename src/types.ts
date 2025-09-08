export type Priority = "low" | "high";
export type Bg = "red" | "blue" | "yellow" | "none";

export interface Note {
  id: string;
  title: string;
  html: string;        // contenteditable의 HTML
  tags: string[];      // 태그 이름 배열
  bg: Bg;
  priority: Priority;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  trashed?: boolean;
}

export interface StoreData {
  notes: Note[];
  tags: string[];      // 전체 태그 목록
  sort: "prio-asc" | "prio-desc" | "latest" | "created" | "edited" | null;
  view: "notes" | "archive" | "trash" | "edit-tags";
  activeTag: string | null; // 사이드바에서 필터
}
