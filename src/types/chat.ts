export type ChatMode = "general" | "ielts" | "homework" | "job" | "daily" | "business" | "tech" | "financial" | "health";

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  previewUrl?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
}

export interface ModeInfo {
  id: ChatMode;
  title: string;
  subtitle: string;
  icon: string;
  quickSuggestions?: string[];
}

export interface ChatSession {
  id: string;
  mode: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatsStorage {
  [mode: string]: {
    sessions: ChatSession[];
    messagesById: {
      [sessionId: string]: Message[];
    };
  };
}
