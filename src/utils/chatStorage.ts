import { ChatsStorage, ChatSession, Message } from "@/types/chat";

const STORAGE_KEY = "bahorai_chats_v1";

export function loadChatsFromStorage(): ChatsStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading chats from storage:", error);
    return {};
  }
}

export function saveChatsToStorage(chats: ChatsStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error("Error saving chats to storage:", error);
  }
}

export function getOrCreateModeChats(
  storage: ChatsStorage,
  mode: string
): ChatsStorage {
  if (!storage[mode]) {
    const newSessionId = crypto.randomUUID?.() ?? String(Date.now());
    const now = new Date().toISOString();
    
    const defaultSession: ChatSession = {
      id: newSessionId,
      mode,
      title: "Yangi suhbat",
      createdAt: now,
      updatedAt: now,
    };

    storage[mode] = {
      sessions: [defaultSession],
      messagesById: {
        [newSessionId]: [],
      },
    };
  }
  
  return storage;
}

export function createNewSession(mode: string): ChatSession {
  const newId = crypto.randomUUID?.() ?? String(Date.now());
  const now = new Date().toISOString();

  return {
    id: newId,
    mode,
    title: "Yangi suhbat",
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSessionMessages(
  storage: ChatsStorage,
  mode: string,
  sessionId: string,
  messages: Message[]
): ChatsStorage {
  if (!storage[mode]) return storage;

  storage[mode].messagesById[sessionId] = messages;
  
  // Update session's updatedAt timestamp
  const session = storage[mode].sessions.find(s => s.id === sessionId);
  if (session) {
    session.updatedAt = new Date().toISOString();
  }

  return storage;
}
