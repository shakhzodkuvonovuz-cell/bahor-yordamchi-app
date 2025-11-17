export type ChatMode = "general" | "ielts" | "homework" | "job" | "daily" | "business" | "tech" | "religion" | "health";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ModeInfo {
  id: ChatMode;
  title: string;
  subtitle: string;
  icon: string;
  quickSuggestions?: string[];
}
