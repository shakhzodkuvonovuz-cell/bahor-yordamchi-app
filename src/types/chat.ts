import type { MessageTrace } from "./trace";

export type ChatMode = "general" | "ielts" | "homework" | "job" | "daily" | "business" | "tech" | "financial" | "health";

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  previewUrl?: string;
  extractedText?: string;
  readStatus?: 'ready' | 'unsupported' | 'error';
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
  reaction?: "like" | "dislike" | null;
  trace?: MessageTrace;
  meta?: {
    variant?: "shorter" | "longer" | "simplify" | "detailed" | "regen" | "continue";
    parentAssistantId?: string;
    promptHints?: string;
  } | null;
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
