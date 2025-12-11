import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Trash2, Menu, Paperclip, X, FileText, RefreshCw, CheckCircle, AlertCircle, Search, Square, StickyNote, FileStack, Camera } from "lucide-react";
import { FocusCanvas, MessageArea } from "@/components/chat/FocusCanvas";
import { ContextDock } from "@/components/chat/ContextDock";
import ChatMessage from "@/components/ChatMessage";
import QuickSuggestions from "@/components/QuickSuggestions";
import { DeleteChatModal } from "@/components/DeleteChatModal";
import DailyUsageIndicator from "@/components/DailyUsageIndicator";
import LimitReachedSheet from "@/components/LimitReachedSheet";


import {
  ScrollToBottom,
  FollowUpSuggestions,
  ChatEmptyState,
  EditingIndicator,
  ExportToPdfModal,
  ThinkBar,
  VirtualizedMessageList,
  type VirtualizedMessageListHandle,
} from "@/components/chat";

import { ChatListSkeleton, ChatMessagesSkeleton } from "@/components/chat/ChatListSkeleton";
import { ChatMigrationModal, checkMigrationNeeded } from "@/components/ChatMigrationModal";
import { ReasonedChip } from "@/components/chat/ReasonedChip";
import { TraceSheet } from "@/components/chat/TraceSheet";
import ChatSearchBar from "@/components/ChatSearchBar";
import ChatNotesDrawer, { getChatNotes } from "@/components/ChatNotesDrawer";
import ChatStopButton from "@/components/ChatStopButton";
import { ModelToggle, getModelPreference, type ModelPreference } from "@/components/ModelToggle";
import { useNetworkStatus, checkNetwork } from "@/hooks/useNetworkStatus";
import { Message, ChatAttachment } from "@/types/chat";
import type { TraceEvent, TraceComplete, MessageTrace, TraceStepData } from "@/types/trace";
import { supabase } from "@/integrations/supabase/client";
import { getModeInfo } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";
import { getTranslation } from "@/data/translations";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { generateChatTitle } from "@/utils/generateChatTitle";
import { isFreshSession, markSessionInitialized } from "@/utils/chatSession";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyUsageServer } from "@/hooks/useEntitlements";
import * as chatStore from "@/lib/chatStore";

import { useNativeHaptics } from "@/hooks/useNativeHaptics";
import { useIsMobile } from "@/hooks/use-mobile";
import clsx from "clsx";
import { useToast } from "@/hooks/use-toast";
import bahorLogo from "@/assets/bahor-logo.png";
import { processAttachments } from "@/services/documentService";
import { isVisionSupportedImage } from "@/services/visionService";
import { detectReplyLanguage } from "@/lib/languageDetect";
import { extractTextFromFile, isImageFile, isPdfFile, getFileReadStatusLabel } from "@/lib/fileTextExtractor";
import { getPreferencesPromptContext } from "@/components/UserPreferencesSection";

import { useRealtimeChat, useRealtimeThreads } from "@/hooks/useRealtimeChat";

// Helper to format relative time
function formatRelativeTime(dateString: string, lang: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return lang === "uz" ? "hozir" : lang === "ru" ? "сейчас" : lang === "tr" ? "şimdi" : "now";
  if (diffMins < 60) return `${diffMins}${lang === "uz" ? "d" : lang === "ru" ? "м" : lang === "tr" ? "dk" : "m"}`;
  if (diffHours < 24) return `${diffHours}${lang === "uz" ? "s" : lang === "ru" ? "ч" : lang === "tr" ? "sa" : "h"}`;
  if (diffDays === 1) return lang === "uz" ? "kecha" : lang === "ru" ? "вчера" : lang === "tr" ? "dün" : "yesterday";
  if (diffDays < 7) return `${diffDays}${lang === "uz" ? "k" : lang === "ru" ? "д" : lang === "tr" ? "g" : "d"}`;
  
  return date.toLocaleDateString();
}

// Real streaming helper - processes SSE from DeepSeek API with trace events
type StreamOptions = {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  onMetadata?: (metadata: { search_used: boolean; search_urls: string[] }) => void;
  onTrace?: (event: TraceEvent) => void;
  onTraceComplete?: (event: TraceComplete) => void;
};

async function processStreamingResponse(
  response: Response,
  options: StreamOptions
) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    options.onError(new Error("No reader available"));
    return;
  }

  try {
    let buffer = "";
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
        if (!trimmedLine.startsWith("data: ")) continue;
        
        try {
          const jsonStr = trimmedLine.slice(6);
          const parsed = JSON.parse(jsonStr);
          
          // Handle trace events
          if (parsed.type === "trace") {
            options.onTrace?.(parsed as TraceEvent);
            continue;
          }
          
          // Handle trace complete
          if (parsed.type === "trace_complete") {
            options.onTraceComplete?.(parsed as TraceComplete);
            continue;
          }
          
          // Handle metadata event from backend
          if (parsed.type === "metadata") {
            options.onMetadata?.({
              search_used: parsed.search_used || false,
              search_urls: parsed.search_urls || [],
            });
            continue;
          }
          
          const content = parsed.choices?.[0]?.delta?.content;
          
          if (content) {
            options.onChunk(content);
          }
        } catch (e) {
          // Skip malformed JSON chunks
        }
      }
    }
    
    options.onDone();
  } catch (error) {
    options.onError(error instanceof Error ? error : new Error("Stream error"));
  }
}

// Convert DB message to UI Message type
function dbMessageToUI(msg: chatStore.ChatMessageWithAttachments): Message {
  return {
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    timestamp: new Date(msg.created_at),
    reaction: msg.reaction,
    meta: msg.meta,
    attachments: msg.attachments?.map(att => ({
      id: att.id,
      name: att.name,
      size: att.size,
      type: att.type,
      url: att.url,
      previewUrl: att.url,
    })),
  };
}

// CRITICAL: Safe message adder that prevents duplicate keys using Map-based dedupe
function addMessageSafe(prev: Message[], newMsg: Message): Message[] {
  const messageMap = new Map(prev.map(m => [m.id, m]));
  if (messageMap.has(newMsg.id)) {
    console.log("[Chat] Duplicate message blocked:", newMsg.id);
    return prev; // Return same reference to avoid re-render
  }
  messageMap.set(newMsg.id, newMsg);
  return Array.from(messageMap.values()).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export default function Chat() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t: translate } = useTranslation();
  const t = getTranslation(language);
  const { user, session, profile, refreshProfile } = useAuth();
  const isMobile = useIsMobile();
  const { onSend, onCopy, onNewChat, onSuccess, onError, lightTap } = useNativeHaptics();
  
  // Supabase-backed state
  const [threads, setThreads] = useState<chatStore.ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  
  // Ref to track thread creation in progress (prevents double-creation loop)
  const pendingThreadCreationRef = useRef<string | null>(null);
  
  // Migration modal state
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteThreadId, setPendingDeleteThreadId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const [searchUsed, setSearchUsed] = useState(false);
  const [searchUrls, setSearchUrls] = useState<string[]>([]);
  const [failedMessageContent, setFailedMessageContent] = useState<string | null>(null);
  const [modelPreference, setModelPreference] = useState<ModelPreference>(getModelPreference);
  
  // Trace state for "Reasoned for Xs" feature
  const [activeTrace, setActiveTrace] = useState<MessageTrace | null>(null);
  const activeTraceRef = useRef<MessageTrace | null>(null);
  const [traceSheetOpen, setTraceSheetOpen] = useState(false);
  const [selectedTraceMessageId, setSelectedTraceMessageId] = useState<string | null>(null);
  const traceStepsRef = useRef<Map<string, TraceStepData>>(new Map());
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);
  const traceStartTimeRef = useRef<number | null>(null);
  const traceTimerRef = useRef<number | null>(null);
  
  // Chat UX polish states
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const [lastAssistantMessageId, setLastAssistantMessageId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  
  // PDF Export modal state
  const [exportPdfModalOpen, setExportPdfModalOpen] = useState(false);
  const [exportPdfContent, setExportPdfContent] = useState("");
  const [exportPdfTitle, setExportPdfTitle] = useState("");
  
  
  // Network status
  const { isOnline } = useNetworkStatus();
  
  // Abort controller for stop button
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtualizedMessageListHandle>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Usage tracking from server entitlements (includes devBypass)
  const { usage, hasReachedLimit, isNearLimit, isPremium, isDevBypass, refresh: refreshUsage } = useDailyUsageServer();
  const usedToday = usage.used;
  const dailyLimit = usage.limit;
  const [showLimitCard, setShowLimitCard] = useState(false);
  const [showLimitSheet, setShowLimitSheet] = useState(false);
  const lastShownRemainingRef = useRef<number | null>(null);

  const modeInfo = getModeInfo(mode || "");
  const modeTranslation = t.modes[mode as keyof typeof t.modes];
  const modeSuggestions = [...(t.suggestions[mode as keyof typeof t.suggestions] || modeInfo?.quickSuggestions || [])];

  // Note: Scroll tracking now handled by VirtualizedMessageList's onAtBottomStateChange

  // ============= REALTIME SYNC =============
  
  // Callback: handle new message from realtime
  const handleRealtimeNewMessage = useCallback((newMessage: Message) => {
    // Only add if not currently loading/streaming (avoid conflicts)
    if (isLoading || typing) {
      console.log("[Realtime] Skipping new message during streaming");
      return;
    }
    
    setMessages((prev) => {
      // CRITICAL: Use Map to dedupe by ID - prevents duplicate key errors
      const messageMap = new Map(prev.map(m => [m.id, m]));
      if (messageMap.has(newMessage.id)) {
        console.log("[Realtime] Duplicate message blocked in setState:", newMessage.id);
        return prev; // Return same reference to avoid re-render
      }
      messageMap.set(newMessage.id, newMessage);
      
      // Convert back to sorted array
      const updated = Array.from(messageMap.values()).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      return updated;
    });
    
    // If at bottom, scroll to show new message
    if (isAtBottom) {
      setTimeout(() => scrollToBottom(), 100);
    }
    
    // Update last assistant message id if applicable
    if (newMessage.role === "assistant") {
      setLastAssistantMessageId(newMessage.id);
    }
  }, [isLoading, typing, isAtBottom]);

  // Callback: handle message update from realtime
  const handleRealtimeMessageUpdate = useCallback((messageId: string, content: string) => {
    setMessages((prev) =>
      prev.map(m => m.id === messageId ? { ...m, content } : m)
    );
  }, []);

  // Callback: handle new attachment from realtime
  const handleRealtimeNewAttachment = useCallback((messageId: string, attachment: ChatAttachment) => {
    setMessages((prev) =>
      prev.map(m => {
        if (m.id === messageId) {
          const existingAttachments = m.attachments || [];
          // Dedupe
          if (existingAttachments.some(a => a.id === attachment.id)) {
            return m;
          }
          return { ...m, attachments: [...existingAttachments, attachment] };
        }
        return m;
      })
    );
  }, []);

  // Callback: handle new thread from realtime
  const handleRealtimeThreadInsert = useCallback((thread: chatStore.ChatThread) => {
    setThreads((prev) => {
      if (prev.some(t => t.id === thread.id)) {
        return prev;
      }
      return [thread, ...prev];
    });
  }, []);

  // Callback: handle thread update from realtime
  const handleRealtimeThreadUpdate = useCallback((threadId: string, updates: Partial<chatStore.ChatThread>) => {
    setThreads((prev) =>
      prev.map(t => t.id === threadId ? { ...t, ...updates } : t)
    );
  }, []);

  // Track if messages have been loaded and initialized for realtime
  const [realtimeReady, setRealtimeReady] = useState(false);

  // Setup realtime chat sync - ONLY enabled AFTER messages loaded and seen IDs initialized
  const {
    markMessageSeen,
    markAttachmentSeen,
    initializeSeenIds,
  } = useRealtimeChat({
    userId: user?.id,
    threadId: currentThreadId,
    enabled: !!user && !!currentThreadId && !isLoading && realtimeReady,
    onNewMessage: handleRealtimeNewMessage,
    onMessageUpdate: handleRealtimeMessageUpdate,
    onNewAttachment: handleRealtimeNewAttachment,
  });

  // Setup realtime threads sync
  const {
    markThreadSeen,
    initializeSeenThreads,
  } = useRealtimeThreads({
    userId: user?.id,
    mode,
    enabled: !!user,
    onThreadInsert: handleRealtimeThreadInsert,
    onThreadUpdate: handleRealtimeThreadUpdate,
  });

  // Reset realtimeReady when thread changes
  useEffect(() => {
    setRealtimeReady(false);
  }, [currentThreadId]);

  // Initialize seen threads when threads load
  useEffect(() => {
    if (threads.length > 0) {
      initializeSeenThreads(threads);
    }
  }, [threads.length > 0]); // Only when threads first load

  // Check for migration on mount (only for logged in users)
  useEffect(() => {
    if (user && checkMigrationNeeded()) {
      setShowMigrationModal(true);
    }
  }, [user]);

  // Cleanup trace timer on unmount
  useEffect(() => {
    return () => {
      if (traceTimerRef.current) {
        clearInterval(traceTimerRef.current);
      }
    };
  }, []);

  // Load threads from Supabase
  const loadThreads = useCallback(async () => {
    if (!user || !mode) return;
    
    // Skip loading if we're processing a "new" query param - thread will be created by that effect
    const params = new URLSearchParams(location.search);
    if (params.get("new")) return;
    
    setIsLoadingThreads(true);
    try {
      const fetchedThreads = await chatStore.listThreads(user.id, mode);
      setThreads(fetchedThreads);
      
      if (fetchedThreads.length > 0) {
        // Select most recent thread
        const mostRecent = fetchedThreads[0];
        setCurrentThreadId(mostRecent.id);
      }
      // Don't auto-create thread - let handleSendMessage create one when user sends first message
    } catch (error) {
      console.error("Error loading threads:", error);
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: language === "uz" 
          ? "Suhbatlarni yuklashda xatolik" 
          : "Failed to load chats",
        variant: "destructive",
      });
    } finally {
      setIsLoadingThreads(false);
    }
  }, [user, mode, t.chat.defaultChatTitle, language, toast, location.search]);

  // Load messages for current thread
  const loadMessages = useCallback(async (threadId: string, append = false) => {
    if (!threadId) return;
    
    setIsLoadingMessages(true);
    try {
      const offset = append ? messageOffset : 0;
      // Use getMessagesWithAttachments to include image attachments
      const fetchedMessages = await chatStore.getMessagesWithAttachments(threadId, { limit: 30, offset });
      const uiMessages = fetchedMessages.map(dbMessageToUI);
      
      // CRITICAL: Initialize seen IDs BEFORE setting messages to prevent realtime duplicates
      if (!append && uiMessages.length > 0) {
        initializeSeenIds(uiMessages);
      }
      
      if (append) {
        setMessages(prev => [...uiMessages, ...prev]);
      } else {
        setMessages(uiMessages);
        setMessageOffset(0);
      }
      
      // CRITICAL: Enable realtime ONLY AFTER messages loaded and seen IDs initialized
      if (!append) {
        setRealtimeReady(true);
      }
      
      // Check if there are more messages
      const totalCount = await chatStore.getMessageCount(threadId);
      setHasMoreMessages(totalCount > (append ? messageOffset + 30 : 30));
      
      // Track last assistant message
      const lastAssistant = [...uiMessages].reverse().find(m => m.role === "assistant");
      if (lastAssistant) {
        setLastAssistantMessageId(lastAssistant.id);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: language === "uz" 
          ? "Xabarlarni yuklashda xatolik" 
          : "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [messageOffset, language, toast, initializeSeenIds]);

  // Load more (earlier) messages
  const loadMoreMessages = useCallback(async () => {
    if (!currentThreadId || isLoadingMessages) return;
    
    const newOffset = messageOffset + 30;
    setMessageOffset(newOffset);
    await loadMessages(currentThreadId, true);
  }, [currentThreadId, messageOffset, isLoadingMessages, loadMessages]);

  // Initialize on mount
  useEffect(() => {
    if (!mode) return;
    if (!user) {
      // Not logged in - redirect to auth
      navigate("/auth");
      return;
    }
    
    loadThreads();
  }, [mode, user, loadThreads, navigate]);

  // Load messages when thread changes
  useEffect(() => {
    // Skip loading if we're about to send a pending message (new thread from /modes)
    // The ?new effect will handle adding the first message
    if (pendingThreadCreationRef.current) {
      return;
    }
    if (currentThreadId) {
      loadMessages(currentThreadId);
    }
  }, [currentThreadId, loadMessages]);

  useEffect(() => {
    if (!modeInfo) {
      navigate("/");
    }
  }, [modeInfo, navigate]);

  // Note: Auto-scroll handled by Virtuoso's followOutput prop

  // Auto-focus input after AI finishes responding
  useEffect(() => {
    if (!isLoading && !typing) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, typing]);

  // Note: Initial messages from /modes are now handled via sessionStorage in the ?new effect above
  // This legacy location.state handler is kept for backwards compatibility with deep links

  // Handle ?thread=<id> query param to open specific thread from history
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const threadParam = params.get("thread");
    
    if (threadParam && user) {
      // Set the thread ID directly - loadMessages will be triggered by the currentThreadId effect
      setCurrentThreadId(threadParam);
      // Clear the query param to avoid re-triggering
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, user, navigate]);

  // Handle ?new=<id> query param to create new chat
  // Uses unique id per click to ensure each "Yangi chat" click creates a truly new chat
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newParam = params.get("new");
    
    // Skip if already processing this newParam (prevents double-creation)
    if (newParam && pendingThreadCreationRef.current === newParam) {
      return;
    }
    
    if (newParam && user && mode) {
      // Mark as in-progress
      pendingThreadCreationRef.current = newParam;
      
      // Create a new chat thread immediately
      const createNewThread = async () => {
        try {
          const newThread = await chatStore.createThread(user.id, {
            title: t.chat.defaultChatTitle,
            mode,
          });
          setThreads(prev => [newThread, ...prev]);
          setCurrentThreadId(newThread.id);
          setMessages([]);
          setRealtimeReady(true); // Empty thread, ready immediately
          markThreadSeen(newThread.id);
          // Mark session as initialized since we're starting fresh
          markSessionInitialized();
          // Clear the query param
          navigate(location.pathname, { replace: true });
          
          // Check for pending message in sessionStorage (from /modes input)
          const pendingMessage = sessionStorage.getItem(`pending_msg_${newParam}`);
          const pendingAttachmentsJson = sessionStorage.getItem(`pending_attachments_${newParam}`);
          
          // Clean up sessionStorage
          sessionStorage.removeItem(`pending_msg_${newParam}`);
          sessionStorage.removeItem(`pending_attachments_${newParam}`);
          
          if (pendingMessage || pendingAttachmentsJson) {
            // Parse attachments if present
            let attachments: ChatAttachment[] = [];
            if (pendingAttachmentsJson) {
              try {
                attachments = JSON.parse(pendingAttachmentsJson);
              } catch (e) {
                console.error("Error parsing pending attachments:", e);
              }
            }
            
            // Set pending attachments if any
            if (attachments.length > 0) {
              setPendingAttachments(attachments);
            }
            
            // Auto-send the pending message using the new thread ID directly
            if (pendingMessage) {
              // Use a small delay and pass thread ID directly to avoid stale state issues
              setTimeout(() => {
                // Clear the pending flag since thread is created
                pendingThreadCreationRef.current = null;
                handleSendMessage(pendingMessage, newThread.id);
              }, 50);
              return; // Don't clear pendingThreadCreationRef yet
            }
          }
          
          // Clear the pending flag
          pendingThreadCreationRef.current = null;
          // Focus input if no pending message
          setTimeout(() => inputRef.current?.focus(), 100);
        } catch (error) {
          console.error("Error creating new chat:", error);
          pendingThreadCreationRef.current = null;
        }
      };
      createNewThread();
    }
  }, [location.search, user, mode, t.chat.defaultChatTitle, navigate]);


  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToBottom();
  }, []);

  // Copy message content
  const handleCopyMessage = (content: string) => {
    try {
      navigator.clipboard.writeText(content);
      lightTap();
      toast({
        description: language === "uz" ? "Nusxa olindi" : language === "en" ? "Copied" : language === "ru" ? "Скопировано" : "Kopyalandı",
      });
    } catch {
      toast({
        description: language === "uz" ? "Xatolik. Qayta urinib ko'ring." : "Error. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Edit message - put content in composer
  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setInputValue(content);
    inputRef.current?.focus();
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        const newHeight = Math.min(inputRef.current.scrollHeight, 140);
        inputRef.current.style.height = `${newHeight}px`;
      }
    }, 0);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  // Regenerate assistant response
  const handleRegenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) return;
    
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== "user") {
      userMessageIndex--;
    }
    
    if (userMessageIndex < 0) return;
    
    const userMessage = messages[userMessageIndex];
    handleSendMessage(userMessage.content);
  };

  // Mobile long press handler
  const handleLongPress = (messageId: string) => {
    lightTap();
    setActiveActionMessageId(messageId);
    setShowMobileActions(true);
  };

  // Handle message reaction (like/dislike)
  const handleReaction = async (messageId: string, reaction: "like" | "dislike" | null) => {
    lightTap();
    // Optimistic update
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, reaction } : m
    ));
    
    try {
      await chatStore.setMessageReaction(messageId, reaction);
      toast({
        description: language === "uz" ? "Baholandi" : language === "en" ? "Rated" : language === "ru" ? "Оценено" : "Değerlendirildi",
      });
    } catch (error) {
      // Revert on error
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, reaction: undefined } : m
      ));
    }
  };

  // Handle share
  const handleShare = async (content: string) => {
    lightTap();
    const shareData = {
      title: "Bahor AI",
      text: content,
    };
    
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        toast({
          description: language === "uz" ? "Ulashildi" : "Shared",
        });
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== "AbortError") {
          handleCopyMessage(content);
        }
      }
    } else {
      // Fallback to copy
      handleCopyMessage(content);
      toast({
        description: language === "uz" ? "Ko'chirildi (ulashish o'rniga)" : "Copied (share unavailable)",
      });
    }
  };

  // Handle export to PDF
  const handleExportPdf = (messageId: string, content: string) => {
    const thread = threads.find(t => t.id === currentThreadId);
    const defaultTitle = thread?.title || modeTranslation?.title || modeInfo.title;
    setExportPdfContent(content);
    setExportPdfTitle(defaultTitle);
    setExportPdfModalOpen(true);
  };

  const handleContinue = async (messageId: string) => {
    if (isLoading || typing || !user || !currentThreadId) return;
    
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== "assistant") return;
    
    // Find the user message before this assistant message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== "user") {
      userMessageIndex--;
    }
    
    const userMessage = userMessageIndex >= 0 ? messages[userMessageIndex] : null;
    
    // Build continuation prompt
    const continuePrompt = userMessage 
      ? `Continue your previous answer to: "${userMessage.content.substring(0, 200)}..." Start exactly where you left off without repeating anything.`
      : "Continue from where you left off without repeating anything.";
    
    await handleVariantMessage(messageId, "continue", continuePrompt);
  };

  // Handle variant generation (shorter, longer, simplify, detailed, regen)
  const handleVariant = async (messageId: string, variant: "shorter" | "longer" | "simplify" | "detailed" | "regen" | "continue") => {
    if (variant === "continue") {
      return handleContinue(messageId);
    }
    if (variant === "regen") {
      return handleRegenerateMessage(messageId);
    }
    
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== "assistant") return;
    
    // Find the user message before this assistant message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== "user") {
      userMessageIndex--;
    }
    
    const userMessage = userMessageIndex >= 0 ? messages[userMessageIndex] : null;
    
    const variantPrompts: Record<string, string> = {
      shorter: "Rewrite the previous answer more concisely, using bullet points if helpful. Keep the core meaning. Max 150 words.",
      longer: "Expand the previous answer with more detail, examples, and deeper explanation. Target 800-1200 words. Keep the same structure.",
      simplify: "Rewrite the previous answer in simpler language, as if explaining to a beginner. Avoid jargon. Use analogies.",
      detailed: "Provide a more detailed version with step-by-step reasoning, examples, and thorough explanation.",
    };
    
    const prompt = userMessage 
      ? `Original question: "${userMessage.content.substring(0, 300)}"\n\n${variantPrompts[variant]}`
      : variantPrompts[variant];
    
    await handleVariantMessage(messageId, variant, prompt);
  };

  // Shared logic for variant message generation
  const handleVariantMessage = async (
    parentMessageId: string,
    variant: "shorter" | "longer" | "simplify" | "detailed" | "regen" | "continue",
    instructionPrompt: string
  ) => {
    if (isLoading || typing || !user || !currentThreadId || !session?.access_token) return;
    
    lightTap();
    setIsLoading(true);
    setTyping(true);
    
    const parentMessage = messages.find(m => m.id === parentMessageId);
    
    const assistantId = crypto.randomUUID?.() ?? (Date.now() + 1).toString();
    
    try {
      // Build context - use last 10 messages for context
      const { messages: contextMessages } = await chatStore.getMessagesWithContext(currentThreadId, { recentLimit: 10 });
      
      const conversationMessages = contextMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Add the variant instruction
      conversationMessages.push({
        role: "user",
        content: instructionPrompt,
      });
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: conversationMessages,
            mode: mode || "general",
            modelPreference: modelPreference,
            isVariant: true,
            variantType: variant,
            reply_language: language, // Use UI language for variants since instruction is system-generated
            ui_language: language,
            userToneContext: getPreferencesPromptContext(),
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Create optimistic assistant message
      const newAssistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        meta: { variant, parentAssistantId: parentMessageId },
      };
      
      // Insert after parent message
      const parentIndex = messages.findIndex(m => m.id === parentMessageId);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.splice(parentIndex + 1, 0, newAssistantMessage);
        return newMessages;
      });
      
      let fullContent = "";
      
      await processStreamingResponse(response, {
        onChunk: (chunk) => {
          fullContent += chunk;
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, content: fullContent } : m
          ));
        },
        onDone: async () => {
          setTyping(false);
          setIsLoading(false);
          
          // Save to DB
          if (fullContent.trim()) {
            const savedMessage = await chatStore.addVariantMessage(user.id, {
              threadId: currentThreadId,
              role: "assistant",
              content: fullContent.trim(),
              meta: { variant, parentAssistantId: parentMessageId },
            });
            
            setMessages(prev => prev.map(m => 
              m.id === assistantId ? { ...m, id: savedMessage.id } : m
            ));
          }
          
          scrollToBottom();
        },
        onError: (error) => {
          console.error("Variant stream error:", error);
          setTyping(false);
          setIsLoading(false);
          
          // Remove failed message
          setMessages(prev => prev.filter(m => m.id !== assistantId));
          
          toast({
            title: language === "uz" ? "Xatolik" : "Error",
            description: language === "uz" ? "Javob yaratishda xatolik" : "Failed to generate response",
            variant: "destructive",
          });
        },
        onMetadata: (metadata) => {
          if (metadata.search_used) {
            setSearchUsed(true);
            setSearchUrls(metadata.search_urls || []);
          }
        },
      });
      
    } catch (error) {
      console.error("Variant generation error:", error);
      setTyping(false);
      setIsLoading(false);
      
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: language === "uz" ? "Javob yaratishda xatolik" : "Failed to generate response",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newAttachments: ChatAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const isImage = isImageFile(file);
        const isPDF = isPdfFile(file);
        
        // File size check
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: language === "uz" ? "Xatolik" : "Error",
            description: language === "uz" ? `${file.name}: Fayl hajmi 10MB dan oshmasligi kerak` : `${file.name}: File size must not exceed 10MB`,
            variant: "destructive",
          });
          continue;
        }

        // Try to extract text from file (for text-like files AND PDFs)
        let extractedText: string | undefined;
        let readStatus: ChatAttachment['readStatus'] = undefined;
        
        if (!isImage) {
          // Attempt text extraction for non-image files (including PDFs)
          console.log('[FileUpload] Extracting text from:', file.name, file.type);
          const extraction = await extractTextFromFile(file);
          console.log('[FileUpload] Extraction result:', { status: extraction.status, textLength: extraction.text?.length || 0, truncated: extraction.truncated });
          if (extraction.status === 'ready' && extraction.text) {
            extractedText = extraction.text;
            readStatus = 'ready';
          } else if (extraction.status === 'unsupported') {
            readStatus = 'unsupported';
          } else if (extraction.status === 'error') {
            readStatus = 'error';
            toast({
              title: language === "uz" ? "Ogohlantirish" : "Warning",
              description: language === "uz" ? `${file.name}: O'qib bo'lmadi` : `${file.name}: Could not read file`,
            });
          }
        }

        const previewUrl = URL.createObjectURL(file);
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${i}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        console.log('[FileUpload] Starting storage upload:', { fileName, filePath, userId: user?.id, hasUser: !!user });

        // Skip storage upload if no user - just add to pending with local preview
        if (!user) {
          console.warn('[FileUpload] No user logged in, skipping storage upload');
          const attachment: ChatAttachment = {
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${i}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: previewUrl,
            previewUrl,
            extractedText,
            readStatus,
          };
          newAttachments.push(attachment);
          continue;
        }

        const { data, error } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, file);

        console.log('[FileUpload] Storage upload result:', { data, error: error?.message });

        if (error) {
          console.error("Upload error:", error);
          toast({
            title: language === "uz" ? "Xatolik" : "Error",
            description: language === "uz" ? `${file.name}: Yuklashda xatolik` : `${file.name}: Upload failed`,
            variant: "destructive",
          });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(filePath);

        const attachment: ChatAttachment = {
          id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${i}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
          previewUrl,
          extractedText,
          readStatus,
          storagePath: filePath, // Store path for DB linking
        };

        // Save attachment record to DB and store the DB ID
        if (currentThreadId && user) {
          try {
            const dbAttachment = await chatStore.attachFile(user.id, {
              threadId: currentThreadId,
              path: filePath,
              mimeType: file.type,
              sizeBytes: file.size,
              originalName: file.name,
            });
            attachment.dbId = dbAttachment.id; // Store DB ID for later linking
            // Mark as seen for realtime dedupe
            markAttachmentSeen(dbAttachment.id);
            
            // For non-images: either use client-extracted text OR trigger server extraction
            if (!isImage) {
              if (extractedText && extractedText.length > 50) {
                // Client-side extraction succeeded (including OCR) - store directly
                console.log('[Extract] Using client-extracted text:', extractedText.length, 'chars');
                attachment.readStatus = 'ready';
                supabase
                  .from('attachment_text')
                  .upsert({
                    attachment_id: dbAttachment.id,
                    user_id: user.id,
                    status: 'ready',
                    text: extractedText.slice(0, 60000), // Cap at 60k chars
                    char_count: extractedText.length,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'attachment_id' })
                  .then(({ error }) => {
                    if (error) console.error('[Extract] Failed to store client text:', error);
                    else console.log('[Extract] Client text stored successfully');
                  });
              } else {
                // No client text - try server-side extraction
                attachment.readStatus = 'processing';
                supabase.functions.invoke('extract-attachment-text', {
                  body: { attachment_id: dbAttachment.id },
                }).then((result) => {
                  console.log('[Extract] Server extraction result:', result.data);
                  setPendingAttachments(prev => prev.map(a => 
                    a.dbId === dbAttachment.id 
                      ? { ...a, readStatus: result.data?.status === 'ready' ? 'ready' : (result.data?.error ? 'error' : a.readStatus) }
                      : a
                  ));
                }).catch(err => {
                  console.error('[Extract] Server extraction error:', err);
                });
              }
            }
          } catch (err) {
            console.error("Error saving attachment to DB:", err);
          }
        }

        newAttachments.push(attachment);
      }

      if (newAttachments.length > 0) {
        setPendingAttachments((prev) => [...prev, ...newAttachments]);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: language === "uz" ? "Fayllarni yuklashda xatolik yuz berdi" : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    const attachment = pendingAttachments.find((a) => a.id === attachmentId);
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  // handleSendMessage with optional thread override to bypass stale state
  const handleSendMessage = async (content: string, overrideThreadId?: string) => {
    if ((!content.trim() && pendingAttachments.length === 0) || isLoading || typing || !mode || !user) return;
    
    // Use override thread if provided, otherwise use state
    const effectiveThreadId = overrideThreadId || currentThreadId;
    
    // Create new thread if:
    // 1. No effective thread exists (empty chat history), OR
    // 2. Fresh session (tab just opened) AND current thread has messages (to avoid appending to old chat)
    const needsNewThread = !effectiveThreadId || (!overrideThreadId && isFreshSession() && messages.length > 0);
    
    if (needsNewThread) {
      try {
        const newThread = await chatStore.createThread(user.id, {
          title: t.chat.defaultChatTitle,
          mode,
        });
        setThreads(prev => [newThread, ...prev]);
        setCurrentThreadId(newThread.id);
        setMessages([]);
        setRealtimeReady(true); // Empty thread, ready immediately
        markSessionInitialized();
        markThreadSeen(newThread.id);
        // Use the new thread directly to avoid stale state
        await handleSendMessage(content, newThread.id);
        return;
      } catch (error) {
        console.error("Error creating new chat:", error);
        return;
      }
    }
    
    // Must have effective thread ID at this point
    if (!effectiveThreadId) return;
    
    // Mark session as initialized (user has sent a message)
    markSessionInitialized();
    
    if (editingMessageId) {
      setEditingMessageId(null);
    }
    
    lightTap();
    
    if (hasReachedLimit) {
      setShowLimitSheet(true);
      return;
    }

    const attachmentsToProcess = [...pendingAttachments];
    
    // Create optimistic user message
    const tempUserMessageId = `temp-${Date.now()}`;
    const userMessage: Message = {
      id: tempUserMessageId,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
      attachments: attachmentsToProcess.length > 0 ? attachmentsToProcess : undefined,
    };

    setMessages((prev) => addMessageSafe(prev, userMessage));
    setInputValue("");
    setPendingAttachments([]);
    setIsLoading(true);
    setTyping(true);
    
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    
    const hasImages = attachmentsToProcess.some(att => isVisionSupportedImage(att));
    const hasPdf = attachmentsToProcess.some(att => att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf'));
    
    setSearchUsed(false);
    setSearchUrls([]);

    const assistantId = crypto.randomUUID?.() ?? (Date.now() + 1).toString();
    let assistantMessageCreated = false;
    let savedUserMessageId: string | null = null;

    try {
      // Save user message to DB - use effectiveThreadId
      const savedUserMessage = await chatStore.addMessage(user.id, {
        threadId: effectiveThreadId,
        role: "user",
        content: content.trim(),
      });
      savedUserMessageId = savedUserMessage.id;
      
      // Mark as seen for realtime dedupe
      markMessageSeen(savedUserMessage.id);
      
      // Update optimistic message with real ID
      setMessages((prev) => 
        prev.map(m => m.id === tempUserMessageId ? { ...m, id: savedUserMessage.id } : m)
      );
      
      // Link pending attachments to the saved user message
      const attachmentDbIds = attachmentsToProcess
        .filter(att => att.dbId)
        .map(att => att.dbId as string);
      
      if (attachmentDbIds.length > 0) {
        await chatStore.linkAttachmentsToMessage(attachmentDbIds, savedUserMessage.id)
          .catch(err => console.error("Error linking attachments:", err));
      }
      
      // Auto-title thread if it's the first message
      const currentThread = threads.find(t => t.id === effectiveThreadId);
      if (currentThread && (currentThread.title === "Yangi chat" || currentThread.title === t.chat.defaultChatTitle)) {
        const newTitle = generateChatTitle(content.trim());
        await chatStore.renameThread(effectiveThreadId, newTitle);
        setThreads(prev => prev.map(th => 
          th.id === effectiveThreadId ? { ...th, title: newTitle } : th
        ));
      }

      // Process attachments
      let analysisContent: string | null = null;
      let analysisType: 'vision' | 'ocr' | 'mixed' | null = null;
      
      if (attachmentsToProcess.length > 0) {
        const hasImages = attachmentsToProcess.some(att => isVisionSupportedImage(att));
        
        // Debug logging for attachments
        console.log('[Chat] Processing attachments:', attachmentsToProcess.map(att => ({
          name: att.name,
          type: att.type,
          readStatus: att.readStatus,
          hasExtractedText: !!att.extractedText,
          extractedTextLength: att.extractedText?.length || 0,
        })));
        
        // Check if any attachments already have extracted text (from PDF text extraction on upload)
        const attachmentsWithExtractedText = attachmentsToProcess.filter(att => att.extractedText && att.readStatus === 'ready');
        const attachmentsNeedingProcessing = attachmentsToProcess.filter(att => !att.extractedText || att.readStatus !== 'ready');
        
        console.log('[Chat] Attachments with extracted text:', attachmentsWithExtractedText.length);
        console.log('[Chat] Attachments needing processing:', attachmentsNeedingProcessing.length);
        
        // Use already-extracted text for text-based PDFs
        if (attachmentsWithExtractedText.length > 0) {
          const extractedContents = attachmentsWithExtractedText
            .map(att => `[${att.name}]\n${att.extractedText}`)
            .join('\n\n---\n\n');
          
          analysisContent = extractedContents;
          analysisType = 'ocr';
          console.log('[Chat] Using pre-extracted text, length:', extractedContents.length);
        }
        
        // Only process attachments that need Vision/OCR analysis (images, scanned PDFs)
        if (attachmentsNeedingProcessing.length > 0) {
          console.log('[Chat] Starting processAttachments for:', attachmentsNeedingProcessing.map(a => a.name));
          setProcessingStatus(
            hasImages
              ? (language === "uz" ? "Tasvir tahlil qilinmoqda..." : 
                 language === "en" ? "Analyzing image..." :
                 language === "ru" ? "Анализ изображения..." : 
                 "Görsel analiz ediliyor...")
              : (language === "uz" ? "Hujjat o'qilmoqda..." : 
                 language === "en" ? "Reading document..." :
                 language === "ru" ? "Чтение документа..." : 
                 "Belge okunuyor...")
          );
          
          const analysisResult = await processAttachments(
            attachmentsNeedingProcessing,
            {
              mode: mode || 'general',
              language,
              userPrompt: content.trim(),
              onProgress: (status) => setProcessingStatus(status),
            }
          );
          
          console.log('[Chat] processAttachments result:', { hasContent: !!analysisResult.content, type: analysisResult.type });
          
          if (analysisResult.content) {
            // Combine with already extracted text
            if (analysisContent) {
              analysisContent = `${analysisContent}\n\n---\n\n${analysisResult.content}`;
              analysisType = 'mixed';
            } else {
              analysisContent = analysisResult.content;
              analysisType = analysisResult.type;
            }
          }
          
          setProcessingStatus(null);
        }
        
        console.log('[Chat] Final analysisContent length:', analysisContent?.length || 0);
        
        if (!analysisContent && attachmentsToProcess.length > 0 && !attachmentsWithExtractedText.length) {
          toast({
            title: language === "uz" ? "Ogohlantirish" : "Warning",
            description: language === "uz" 
              ? "Faylni tahlil qilib bo'lmadi. Iltimos, aniqroq rasm yuklang." 
              : "Could not analyze file. Please upload a clearer image.",
            variant: "destructive",
          });
        }
      }
      
      // Get thread context (summary + recent messages) for API
      const { summary: threadSummary, messages: contextMessages } = await chatStore.getMessagesWithContext(
        effectiveThreadId,
        { recentLimit: 10 }
      );
      
      // Build conversation messages from recent context (excluding the message we just added)
      const conversationMessages = contextMessages
        .filter(m => m.id !== savedUserMessage.id)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      
      let messageContent = content.trim();
      if (analysisContent) {
        const analysisPrefix = analysisType === 'vision'
          ? (language === "uz" 
              ? "Rasm tahlili:" 
              : language === "en" 
              ? "Image analysis:"
              : language === "ru"
              ? "Анализ изображения:"
              : "Görsel analizi:")
          : (language === "uz" 
              ? "Hujjat tahlili:" 
              : language === "en" 
              ? "Document analysis:"
              : language === "ru"
              ? "Анализ документа:"
              : "Belge analizi:");
        
        messageContent = `${messageContent}\n\n${analysisPrefix}\n\`\`\`\n${analysisContent}\n\`\`\``;
      }
      
      conversationMessages.push({
        role: "user" as const,
        content: messageContent,
      });


      const accessToken = session?.access_token;
      if (!accessToken) {
        toast({
          title: language === "uz" ? "Xatolik" : "Error",
          description: language === "uz" 
            ? "Iltimos, tizimga qaytadan kiring" 
            : "Please log in again",
          variant: "destructive",
        });
        setTyping(false);
        setIsLoading(false);
        return;
      }

      // Detect if this is an image generation request (for showing appropriate loading status)
      const contentLower = content.trim().toLowerCase();
      const imageKeywords = [
        // Explicit commands
        "/image ", "/rasm ",
        // Uzbek keywords
        "rasm yarat", "rasm chiz", "surat yarat", "tasvir yarat", "rasm qil", "rasmini yarat",
        "surat chiz", "tasvir chiz", "chizib ber", "rasm yasab ber", "foto yarat",
        // English keywords
        "generate an image", "create an image", "make an image", "draw an image", "render an image",
        "generate image", "create image", "make image", "draw image", "render image",
        "generate a picture", "create a picture", "make a picture", "draw a picture",
        "generate photo", "create photo", "create a photo", "generate a photo",
        "make a photo", "make photo", "draw a photo", "draw photo", "render a photo", "render photo"
      ];
      const isImageRequest = imageKeywords.some(kw => contentLower.startsWith(kw) || contentLower.includes(kw));
      
      if (isImageRequest) {
        setIsGeneratingImage(true);
        setProcessingStatus(
          language === "uz" ? "Rasm yaratilmoqda..." :
          language === "ru" ? "Создание изображения..." :
          language === "tr" ? "Görsel oluşturuluyor..." :
          "Generating image..."
        );
      }

      console.log('[Chat] About to call chat API with:', {
        messageCount: conversationMessages.length,
        lastMessageLength: conversationMessages[conversationMessages.length - 1]?.content?.length || 0,
        hasAnalysis: !!analysisContent,
        analysisType,
        isImageRequest,
      });

      // Add timeout with AbortController (40 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000);
      
      let response: Response;
      try {
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
    body: JSON.stringify({
              messages: conversationMessages,
              mode: mode || "general",
              modelPreference: modelPreference,
              attachments: attachmentsToProcess.map(att => ({
                name: att.name,
                type: att.type,
                url: att.url,
                extractedText: att.extractedText,
                readStatus: att.readStatus,
              })),
              hasAnalysis: !!analysisContent,
              analysisType,
              threadSummary: threadSummary || undefined,
              reply_language: detectReplyLanguage(content.trim(), language as "uz" | "ru" | "en" | "tr").lang,
              ui_language: language,
              userToneContext: getPreferencesPromptContext(),
            }),
            signal: controller.signal,
          }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle limit errors (server sends "LIMIT_REACHED" with reason)
        if (errorData.error === "DAILY_LIMIT_REACHED" || errorData.error === "LIMIT_REACHED") {
          setShowLimitSheet(true);
          setTyping(false);
          setIsLoading(false);
          setMessages((prev) => prev.filter(m => m.id !== (savedUserMessageId || tempUserMessageId)));
          refreshProfile();
          return;
        }
        
        if (errorData.error === "AUTH_REQUIRED") {
          toast({
            title: language === "uz" ? "Sessiya tugadi" : "Session expired",
            description: errorData.message || (language === "uz" ? "Qaytadan kiring" : "Please log in again"),
            variant: "destructive",
          });
          setTyping(false);
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorData.message || "Failed to get response from server");
      }
      
      // Check if response is JSON (image generation) or SSE stream (regular chat)
      const contentType = response.headers.get('Content-Type') || '';
      
      if (contentType.includes('application/json')) {
        // Image generation or error response
        const jsonData = await response.json();
        
        if (jsonData.type === 'image_generated') {
          // Handle successful image generation
          console.log('[Chat] Image generated:', jsonData);
          
          const imageAttachment: ChatAttachment = {
            id: crypto.randomUUID?.() ?? `img-${Date.now()}`,
            name: jsonData.fileName,
            size: 0,
            type: 'image/png',
            url: jsonData.fileUrl,
            previewUrl: jsonData.fileUrl,
          };
          
          const imageMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: language === "uz" 
              ? `✨ Mana rasm tayyor!\n\n**Prompt:** ${jsonData.prompt_uz}`
              : language === "ru"
              ? `✨ Изображение готово!\n\n**Prompt:** ${jsonData.prompt_uz}`
              : language === "tr"
              ? `✨ Görsel hazır!\n\n**Prompt:** ${jsonData.prompt_uz}`
              : `✨ Image ready!\n\n**Prompt:** ${jsonData.prompt_uz}`,
            timestamp: new Date(),
            attachments: [imageAttachment],
          };
          
          setMessages((prev) => addMessageSafe(prev, imageMessage));
          setTyping(false);
          setIsLoading(false);
          setIsGeneratingImage(false);
          setProcessingStatus(null);
          
          // Save to DB with attachment
          if (user) {
            try {
              const savedAssistant = await chatStore.addMessage(user.id, {
                threadId: effectiveThreadId,
                role: "assistant",
                content: imageMessage.content,
              });
              
              // CRITICAL: Mark as seen IMMEDIATELY after save to prevent realtime duplicate
              markMessageSeen(savedAssistant.id);
              
              // Also save the attachment reference with correct storage path
              if (jsonData.fileUrl && jsonData.filePath) {
                const imgAttachment = await chatStore.attachFile(user.id, {
                  threadId: effectiveThreadId,
                  messageId: savedAssistant.id,
                  bucket: "user-files",
                  path: jsonData.filePath,
                  mimeType: "image/png",
                  originalName: jsonData.fileName,
                });
                // Mark as seen for realtime dedupe
                markAttachmentSeen(imgAttachment.id);
              }
              
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, id: savedAssistant.id } : m
                )
              );
              setLastAssistantMessageId(savedAssistant.id);
            } catch (e) {
              console.error('Error saving image message:', e);
            }
          }
          
          toast({
            description: language === "uz" ? "Rasm tayyor!" : "Image generated!",
          });
          
          return;
        }
        
        if (jsonData.type === 'image_error') {
          // Handle image generation error
          console.error('[Chat] Image generation error:', jsonData);
          
          const errorMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: jsonData.message || (language === "uz" 
              ? "Rasm yaratishda xatolik yuz berdi. Qayta urinib ko'ring."
              : "Failed to generate image. Please try again."),
            timestamp: new Date(),
          };
          
          setMessages((prev) => addMessageSafe(prev, errorMessage));
          setTyping(false);
          setIsLoading(false);
          setIsGeneratingImage(false);
          setProcessingStatus(null);
          
          toast({
            title: language === "uz" ? "Xatolik" : "Error",
            description: jsonData.message,
            variant: "destructive",
          });
          
          return;
        }
      }

      let assistantContent = "";
      
      // If we're here with an SSE stream, backend routed to text, not image - clear image generating state
      if (isGeneratingImage) {
        console.log('[Chat] Backend routed to text instead of image, clearing image state');
        setIsGeneratingImage(false);
        setProcessingStatus(null);
      }
      
      // Reset trace state and start live timer
      traceStepsRef.current.clear();
      setActiveTrace({ steps: [], elapsedMs: 0, sources: [], isComplete: false });
      setLiveElapsedMs(0);
      traceStartTimeRef.current = Date.now();
      
      // Clear any existing timer
      if (traceTimerRef.current) {
        clearInterval(traceTimerRef.current);
      }
      
      // Start live elapsed timer (update every 100ms for smooth display)
      traceTimerRef.current = window.setInterval(() => {
        if (traceStartTimeRef.current) {
          setLiveElapsedMs(Date.now() - traceStartTimeRef.current);
        }
      }, 100);
      
      await processStreamingResponse(response, {
        onTrace: (event) => {
          const { step, status, t, detail, data } = event;
          const stepDetail = detail || data; // Support both new and legacy field names
          if (status === 'start') {
            traceStepsRef.current.set(step, { step, startMs: t, detail: stepDetail });
          } else if (status === 'end' || status === 'done') {
            const existing = traceStepsRef.current.get(step);
            if (existing) {
              existing.endMs = t;
              existing.durMs = t - existing.startMs;
              if (stepDetail) existing.detail = { ...existing.detail, ...stepDetail };
            }
            setActiveTrace(prev => prev ? {
              ...prev,
              steps: Array.from(traceStepsRef.current.values()),
            } : null);
          }
        },
        onTraceComplete: (event) => {
          // Stop the live timer
          if (traceTimerRef.current) {
            clearInterval(traceTimerRef.current);
            traceTimerRef.current = null;
          }
          traceStartTimeRef.current = null;
          
          const completedTrace: MessageTrace = {
            steps: Array.from(traceStepsRef.current.values()),
            elapsedMs: event.elapsed_ms,
            sources: event.sources || [],
            isComplete: true,
          };
          activeTraceRef.current = completedTrace;
          setActiveTrace(completedTrace);
        },
        onMetadata: (metadata) => {
          if (metadata.search_used) {
            setSearchUsed(true);
            setSearchUrls(metadata.search_urls || []);
          }
        },
        onChunk: (chunk) => {
          assistantContent += chunk;
          
          if (!assistantMessageCreated) {
            
            const analysisPrefix = analysisContent 
              ? (analysisType === 'vision'
                ? (language === "uz" 
                  ? "📷 Rasm tahlili:\n\n" 
                  : language === "en"
                  ? "📷 Image analysis:\n\n"
                  : language === "ru"
                  ? "📷 Анализ изображения:\n\n"
                  : "📷 Görsel analizi:\n\n")
                : (language === "uz" 
                  ? "📄 Hujjat tahlili:\n\n" 
                  : language === "en"
                  ? "📄 Document analysis:\n\n"
                  : language === "ru"
                  ? "📄 Анализ документа:\n\n"
                  : "📄 Belge analizi:\n\n"))
              : "";
            
            const newAssistantMessage: Message = {
              id: assistantId,
              role: "assistant",
              content: analysisPrefix + chunk,
              timestamp: new Date(),
            };
            setMessages((prev) => addMessageSafe(prev, newAssistantMessage));
            setLastAssistantMessageId(assistantId);
            assistantMessageCreated = true;
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m
              )
            );
          }
        },
        onDone: async () => {
          setProcessingStatus(null);
          inputRef.current?.focus();
          
          // Attach trace and citations to message using ref (avoids stale closure issue)
          const finalTrace = activeTraceRef.current;
          if (finalTrace?.isComplete) {
            // Extract citations from trace sources
            const citations = finalTrace.sources?.map(s => ({
              title: s.title,
              url: s.url,
            })) || [];
            
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId 
                  ? { ...m, trace: finalTrace, citations: citations.length > 0 ? citations : undefined } 
                  : m
              )
            );
          }
          
          // Save assistant message to DB BEFORE setting isLoading to false
          // This prevents realtime subscription from adding duplicate message
          if (assistantContent && user) {
            try {
              const savedAssistant = await chatStore.addMessage(user.id, {
                threadId: effectiveThreadId,
                role: "assistant",
                content: assistantContent,
              });
              
              // Mark as seen BEFORE updating state to prevent race condition
              markMessageSeen(savedAssistant.id);
              
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, id: savedAssistant.id } : m
                )
              );
              setLastAssistantMessageId(savedAssistant.id);
              
              if (session?.access_token) {
                chatStore.maybeGenerateSummary(effectiveThreadId, session.access_token)
                  .then(result => {
                    if (result.summary) {
                      setThreads(prev => prev.map(t => 
                        t.id === effectiveThreadId 
                          ? { ...t, summary: result.summary }
                          : t
                      ));
                    }
                  })
                  .catch(() => {});
              }
            } catch (err) {
              console.error("Error saving assistant message:", err);
            }
          }
          
          // NOW set loading to false - after message is saved and marked as seen
          setTyping(false);
          setIsLoading(false);
          
          refreshProfile();
          refreshUsage().then(() => {
            // Show soft warning toasts based on remaining count
            const remaining = usage.limit - usage.used - 1; // After this message
            if (remaining >= 0 && remaining <= 3 && lastShownRemainingRef.current !== remaining) {
              lastShownRemainingRef.current = remaining;
              
              if (remaining === 0) {
                // Show sheet after streaming finishes if this was the last message
                setTimeout(() => setShowLimitSheet(true), 500);
              } else if (remaining === 1) {
                toast({
                  description: language === "uz" 
                    ? "Oxirgi so'rov. Ertaga yangilanadi" 
                    : language === "ru" 
                    ? "Последний запрос. Обновится завтра"
                    : language === "tr"
                    ? "Son istek. Yarın yenilenir"
                    : "Last request. Resets tomorrow",
                  className: "bg-amber-500/10 border-amber-500/30 text-amber-100",
                });
              } else if (remaining === 3) {
                toast({
                  description: language === "uz" 
                    ? "Bugun 3 ta so'rov qoldi" 
                    : language === "ru" 
                    ? "Осталось 3 запроса на сегодня"
                    : language === "tr"
                    ? "Bugün 3 istek kaldı"
                    : "3 requests remaining today",
                  className: "bg-secondary/80 border-border/30",
                });
              }
            }
          });
          
          // Clear failed message on success
          setFailedMessageContent(null);
        },
        onError: (error) => {
          throw error;
        },
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      console.error("Error details:", {
        name: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      setTyping(false);
      setIsLoading(false);
      setProcessingStatus(null);
      setIsGeneratingImage(false);
      setActiveTrace(null);
      inputRef.current?.focus();
      
      // Store failed message for retry
      setFailedMessageContent(content.trim());
      
      // Check if it was a timeout (AbortError)
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const errorMessage = error instanceof Error ? error.message : '';
      
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: isTimeout 
          ? (language === "uz" 
              ? "Ulanish cho'zildi. Qayta urinib ko'ring." 
              : "Connection timed out. Please try again.")
          : (language === "uz" 
              ? `Internetda muammo. Qayta urinib ko'ring.` 
              : `Network error. Please try again.`),
        variant: "destructive",
      });
    }
  };

  const handleClearChat = async () => {
    if (!currentThreadId || !mode || !user) return;
    
    try {
      // Delete all messages for this thread (messages will cascade delete)
      // Then recreate an empty state
      await chatStore.deleteThread(currentThreadId);
      
      // Create new thread
      const newThread = await chatStore.createThread(user.id, {
        title: t.chat.defaultChatTitle,
        mode,
      });
      
      setThreads(prev => prev.filter(t => t.id !== currentThreadId).concat([newThread]));
      setCurrentThreadId(newThread.id);
      setMessages([]);
      setRealtimeReady(true); // Empty thread, ready immediately
      markThreadSeen(newThread.id);
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: language === "uz" ? "Suhbatni tozalashda xatolik" : "Failed to clear chat",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewThread = async () => {
    if (!mode || !user) return;

    try {
      const newThread = await chatStore.createThread(user.id, {
        title: t.chat.defaultChatTitle,
        mode,
      });
      
      setThreads(prev => [newThread, ...prev]);
      setCurrentThreadId(newThread.id);
      setMessages([]);
      setRealtimeReady(true); // Empty thread, ready immediately
      setIsHistoryOpen(false);
      markThreadSeen(newThread.id);
    } catch (error) {
      console.error("Error creating new thread:", error);
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: language === "uz" ? "Yangi suhbat yaratishda xatolik" : "Failed to create new chat",
        variant: "destructive",
      });
    }
  };

  const handleSelectThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    setIsHistoryOpen(false);
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!mode || !user) return;

    try {
      await chatStore.deleteThread(threadId);
      
      const updatedThreads = threads.filter(t => t.id !== threadId);
      
      if (updatedThreads.length === 0) {
        // Create new default thread
        const newThread = await chatStore.createThread(user.id, {
          title: t.chat.defaultChatTitle,
          mode,
        });
        setThreads([newThread]);
        setCurrentThreadId(newThread.id);
        setMessages([]);
        setRealtimeReady(true); // Empty thread, ready immediately
        markThreadSeen(newThread.id);
      } else {
        setThreads(updatedThreads);
        
        if (threadId === currentThreadId) {
          setCurrentThreadId(updatedThreads[0].id);
        }
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: language === "uz" ? "Suhbatni o'chirishda xatolik" : "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    const textarea = e.target;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 140);
    textarea.style.height = `${newHeight}px`;
  };

  const activeMessage = messages.find(m => m.id === activeActionMessageId);

  if (!modeInfo) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 relative">
      {/* Migration Modal */}
      {user && (
        <ChatMigrationModal
          open={showMigrationModal}
          onComplete={() => {
            setShowMigrationModal(false);
            loadThreads();
          }}
          userId={user.id}
        />
      )}

      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-[150px]" />
      </div>

      {/* History Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsHistoryOpen(false)}
          />

          <div className="w-80 max-w-[85vw] bg-card/95 backdrop-blur-xl border-l border-border/30 flex flex-col shadow-2xl animate-slide-in-right">
            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={bahorLogo} alt="Bahor AI" className="w-8 h-8 object-contain" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">
                    {t.chat.chatHistory}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {modeTranslation?.title || modeInfo.title}
                  </span>
                </div>
              </div>
              <button
                className="p-2 rounded-xl hover:bg-secondary/80 transition-colors"
                onClick={() => setIsHistoryOpen(false)}
                aria-label="Close history"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <button
              onClick={handleCreateNewThread}
              className="mx-4 mt-4 mb-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              + {t.chat.defaultChatTitle}
            </button>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {isLoadingThreads ? (
                <ChatListSkeleton />
              ) : (
                threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={clsx(
                      "flex items-start justify-between px-3 py-3 text-sm cursor-pointer rounded-xl my-1.5 transition-all group",
                      thread.id === currentThreadId
                        ? "bg-primary/10 border border-primary/20 text-foreground"
                        : "hover:bg-secondary/60 border border-transparent"
                    )}
                    onClick={() => handleSelectThread(thread.id)}
                  >
                    <div className="flex-1 pr-2 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground truncate flex-1">
                          {thread.title || t.chat.defaultChatTitle}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">
                          {formatRelativeTime(thread.updated_at, language)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {thread.summary 
                          ? thread.summary.split('\n')[0].substring(0, 80) + (thread.summary.length > 80 ? '...' : '')
                          : thread.last_message_preview || (language === "uz" ? "Yangi suhbat" : "New chat")
                        }
                      </div>
                      {thread.message_count && thread.message_count > 0 && (
                        <div className="text-[10px] text-muted-foreground/50 mt-1">
                          {thread.message_count} {language === "uz" ? "xabar" : language === "ru" ? "сообщ." : language === "tr" ? "mesaj" : "msg"}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDeleteThreadId(thread.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Container with Context Dock */}
      <div className="flex min-h-[100dvh] w-full max-w-7xl mx-auto">
        {/* Focus Canvas - Main Chat Area */}
        <FocusCanvas>
          {/* Header */}
          <div className="sticky top-0 z-40 glass-strong border-b border-border/20">
            <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => navigate("/")}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all duration-200 flex-shrink-0"
                  aria-label={t.chat.back}
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all duration-200 flex-shrink-0"
                  aria-label="Open chat history"
                >
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="flex-1 min-w-0 text-center">
                <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
                  {modeTranslation?.title || modeInfo.title}
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {isDevBypass ? translate('settings.unlimited') : `${usedToday}/${dailyLimit}`} {translate('usage.requests')}
                </p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <ModelToggle 
                  value={modelPreference} 
                  onChange={setModelPreference} 
                  size="sm" 
                />
                {messages.length > 0 && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl hover:bg-secondary/60 flex items-center justify-center transition-all duration-200 active:scale-[0.97]"
                    aria-label={t.chat.clearChat}
                    title={t.chat.clearChat}
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  </button>
                )}
                <LanguageSwitcher variant="compact" />
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isLoadingMessages ? (
              <div className="px-3 sm:px-6 pb-4 pt-4 sm:pt-6">
                <ChatMessagesSkeleton />
              </div>
            ) : messages.length === 0 ? (
              <div className="px-3 sm:px-6 pb-4 pt-4 sm:pt-6">
                <ChatEmptyState modeInfo={modeInfo} modeTranslation={modeTranslation} />
              </div>
            ) : (
              <>
                {/* Load more button */}
                {hasMoreMessages && (
                  <div className="flex justify-center py-2 px-3 sm:px-6">
                    <button
                      onClick={loadMoreMessages}
                      disabled={isLoadingMessages}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-xl transition-colors"
                    >
                      <RefreshCw className={clsx("w-4 h-4", isLoadingMessages && "animate-spin")} />
                      {language === "uz" ? "Oldingi xabarlar" : "Earlier messages"}
                    </button>
                  </div>
                )}
                
                <VirtualizedMessageList
                  ref={virtuosoRef}
                  messages={messages}
                  typing={typing}
                  isLoading={isLoading}
                  lastAssistantMessageId={lastAssistantMessageId}
                  onCopy={handleCopyMessage}
                  onEdit={handleEditMessage}
                  onRegenerate={handleRegenerateMessage}
                  onReaction={handleReaction}
                  onShare={handleShare}
                  onContinue={handleContinue}
                  onVariant={handleVariant}
                  onExportPdf={handleExportPdf}
                  onSendMessage={handleSendMessage}
                  isMobile={isMobile}
                  onAtBottomStateChange={(atBottom) => {
                    setIsAtBottom(atBottom);
                    setShowScrollButton(!atBottom && messages.length > 0);
                  }}
                  activeTrace={activeTrace}
                  liveElapsedMs={liveElapsedMs}
                  modelPreference={modelPreference}
                  language={language}
                  mode={mode}
                  onTraceClick={(messageId) => {
                    lightTap();
                    setSelectedTraceMessageId(messageId);
                    setTraceSheetOpen(true);
                  }}
                  isGeneratingImage={isGeneratingImage}
                />
              </>
            )}
          </div>

        <ScrollToBottom 
          visible={showScrollButton} 
          onClick={() => scrollToBottom()} 
        />

        {/* Input Area */}
        <div className="sticky bottom-0 px-3 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 pt-2">
          {modeSuggestions && modeSuggestions.length > 0 && messages.length === 0 && (
            <div className="pb-3">
              <QuickSuggestions
                suggestions={modeSuggestions}
                onSelect={handleSendMessage}
                disabled={isLoading || typing}
              />
            </div>
          )}

          <div className="glass-strong rounded-2xl border border-border/30 shadow-lg p-2">
            {editingMessageId && (
              <EditingIndicator onCancel={handleCancelEdit} />
            )}
            
            {pendingAttachments.length > 0 && (
              <div className="mb-2 px-2 flex flex-wrap gap-2">
                {pendingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 px-3 py-2 bg-secondary/60 rounded-xl border border-border/30 animate-scale-in"
                  >
                    {attachment.type.startsWith("image/") && attachment.previewUrl ? (
                      <img
                        src={attachment.previewUrl}
                        alt={attachment.name}
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 max-w-[120px]">
                      <p className="text-xs font-medium text-foreground truncate">
                        {attachment.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                      {/* Read status indicator for text files */}
                      {attachment.readStatus && (
                        <p className={clsx(
                          "text-[9px] flex items-center gap-0.5 mt-0.5",
                          attachment.readStatus === 'ready' && "text-emerald-600 dark:text-emerald-400",
                          attachment.readStatus === 'processing' && "text-primary",
                          attachment.readStatus === 'unsupported' && "text-amber-600 dark:text-amber-400",
                          attachment.readStatus === 'error' && "text-destructive"
                        )}>
                          {attachment.readStatus === 'ready' && <CheckCircle className="w-2.5 h-2.5" />}
                          {attachment.readStatus === 'processing' && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          {attachment.readStatus === 'unsupported' && <AlertCircle className="w-2.5 h-2.5" />}
                          {attachment.readStatus === 'error' && <AlertCircle className="w-2.5 h-2.5" />}
                          {attachment.readStatus === 'processing' 
                            ? (language === 'uz' ? "O'qilmoqda..." : language === 'ru' ? 'Обработка...' : language === 'tr' ? 'İşleniyor...' : 'Processing...')
                            : getFileReadStatusLabel(attachment.readStatus, language)
                          }
                        </p>
                      )}
                      {/* Retry button for failed extractions */}
                      {attachment.readStatus === 'error' && attachment.dbId && (
                        <button
                          type="button"
                          onClick={() => {
                            setPendingAttachments(prev => prev.map(a => 
                              a.id === attachment.id ? { ...a, readStatus: 'processing' } : a
                            ));
                            supabase.functions.invoke('extract-attachment-text', {
                              body: { attachment_id: attachment.dbId },
                            }).then((result) => {
                              setPendingAttachments(prev => prev.map(a => 
                                a.id === attachment.id 
                                  ? { ...a, readStatus: result.data?.status === 'ready' ? 'ready' : 'error' }
                                  : a
                              ));
                            });
                          }}
                          className="text-[9px] text-primary hover:text-primary/80 underline mt-0.5"
                        >
                          {language === 'uz' ? 'Qayta urinish' : language === 'ru' ? 'Повторить' : language === 'tr' ? 'Yeniden dene' : 'Retry'}
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors active:scale-95"
                      aria-label="Remove attachment"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
            </div>
            )}

            {/* Retry button when last message failed */}
            {failedMessageContent && !isLoading && !typing && (
              <div className="mb-2 px-2">
                <button
                  onClick={() => {
                    setFailedMessageContent(null);
                    handleSendMessage(failedMessageContent);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl transition-colors w-full justify-center"
                >
                  <RefreshCw className="w-4 h-4" />
                  {language === "uz" ? "Qayta yuborish" : "Retry"}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-1.5 sm:gap-2">
              {/* File input for general files */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf,.txt,.md,.json,.csv,.xml,.yaml,.yml,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.h,.css,.sql,.sh,.html"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              {/* Camera input for mobile camera capture */}
              <input
                id="camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Paperclip - File upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || typing || isUploading}
                className="p-2.5 sm:p-3 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-all duration-200 disabled:opacity-40 flex-shrink-0 active:scale-95"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              {/* Camera - Image capture (shows camera on mobile) */}
              <button
                type="button"
                onClick={() => document.getElementById('camera-input')?.click()}
                disabled={isLoading || typing || isUploading}
                className="p-2.5 sm:p-3 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-all duration-200 disabled:opacity-40 flex-shrink-0 active:scale-95"
                aria-label="Take photo"
              >
                <Camera className="w-5 h-5" />
              </button>
              
              <button
                type="button"
                onClick={() => navigate("/tools/documents")}
                disabled={isLoading || typing}
                className="p-3 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-all duration-200 disabled:opacity-40 flex-shrink-0 active:scale-95"
                aria-label={language === "uz" ? "PDF Asboblar" : language === "ru" ? "PDF Инструменты" : language === "tr" ? "PDF Araçları" : "PDF Tools"}
                title={language === "uz" ? "PDF Asboblar" : language === "ru" ? "PDF Инструменты" : language === "tr" ? "PDF Araçları" : "PDF Tools"}
              >
                <FileStack className="w-5 h-5" />
              </button>
              
              <div className="relative flex-1 bahor-no-zoom">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    hasReachedLimit
                      ? (language === "uz" 
                          ? "Bugungi limit tugadi — Premium yoki ertaga davom eting" 
                          : language === "ru" 
                          ? "Лимит исчерпан — Premium или завтра"
                          : language === "tr"
                          ? "Günlük limit doldu — Premium veya yarın devam edin"
                          : "Daily limit reached — Premium or continue tomorrow")
                      : t.chatPlaceholder
                  }
                  disabled={isLoading || typing}
                  rows={1}
                  className="w-full bg-transparent border-none outline-none resize-none text-base leading-relaxed text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50 max-h-[140px] overflow-y-auto py-3 px-1"
                  style={{ fontSize: '16px' }}
                />
              </div>
              
              <button
                type="submit"
                disabled={(!inputValue.trim() && pendingAttachments.length === 0) || isLoading || typing || hasReachedLimit}
                className="p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 active:scale-95 glow-primary-subtle hover:glow-primary"
                aria-label={language === "uz" ? "Yuborish" : language === "en" ? "Send" : language === "ru" ? "Отправить" : "Gönder"}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
        </FocusCanvas>

        {/* Context Dock - Desktop only */}
        <ContextDock
          modeInfo={modeInfo ? {
            icon: modeInfo.icon || '💬',
            title: modeInfo.title,
          } : undefined}
          modeTranslation={modeTranslation ? { title: modeTranslation.title } : undefined}
          lastAttachment={pendingAttachments.length > 0 ? pendingAttachments[pendingAttachments.length - 1] : undefined}
          sources={searchUrls}
          aiActionsAvailable={false}
        />
      </div>


      {/* Delete Chat Modal */}
      <DeleteChatModal
        open={showDeleteModal}
        onConfirm={() => {
          handleClearChat();
          setShowDeleteModal(false);
        }}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Delete Thread Modal */}
      <DeleteChatModal
        open={!!pendingDeleteThreadId}
        onConfirm={() => {
          if (pendingDeleteThreadId) {
            handleDeleteThread(pendingDeleteThreadId);
            setPendingDeleteThreadId(null);
          }
        }}
        onCancel={() => setPendingDeleteThreadId(null)}
      />


      {/* Trace Sheet */}
      <TraceSheet
        open={traceSheetOpen}
        onOpenChange={setTraceSheetOpen}
        trace={selectedTraceMessageId ? messages.find(m => m.id === selectedTraceMessageId)?.trace || activeTrace : null}
        language={language}
      />

      {/* Export to PDF Modal */}
      <ExportToPdfModal
        open={exportPdfModalOpen}
        onOpenChange={setExportPdfModalOpen}
        messageContent={exportPdfContent}
        defaultTitle={exportPdfTitle}
      />

      {/* Limit Reached Sheet */}
      <LimitReachedSheet
        open={showLimitSheet || (showLimitCard && hasReachedLimit)}
        onClose={() => {
          setShowLimitSheet(false);
          setShowLimitCard(false);
        }}
        scope="chat_daily"
        used={usage?.used || 0}
        limit={usage?.limit || 5}
        onUpgrade={() => navigate("/settings")}
      />
    </div>
  );
}
