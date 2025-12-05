import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Trash2, Menu, Paperclip, X, FileText, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickSuggestions from "@/components/QuickSuggestions";
import { DeleteChatModal } from "@/components/DeleteChatModal";
import DailyUsageIndicator from "@/components/DailyUsageIndicator";
import LimitReachedCard from "@/components/LimitReachedCard";

import { VoiceModeButton, VoiceModePanel } from "@/components/voice";
import {
  ScrollToBottom,
  FollowUpSuggestions,
  ChatEmptyState,
  EditingIndicator,
} from "@/components/chat";
import { ChatListSkeleton, ChatMessagesSkeleton } from "@/components/chat/ChatListSkeleton";
import { ChatMigrationModal, checkMigrationNeeded } from "@/components/ChatMigrationModal";
import { ReasonedChip } from "@/components/chat/ReasonedChip";
import { TraceSheet } from "@/components/chat/TraceSheet";
import { Message, ChatAttachment } from "@/types/chat";
import type { TraceEvent, TraceComplete, MessageTrace, TraceStepData } from "@/types/trace";
import { supabase } from "@/integrations/supabase/client";
import { getModeInfo } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";
import { getTranslation } from "@/data/translations";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { generateChatTitle } from "@/utils/generateChatTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyUsageServer } from "@/hooks/useEntitlements";
import * as chatStore from "@/lib/chatStore";

import { useHaptics } from "@/hooks/useHaptics";
import { haptic } from "@/lib/haptics";
import { useIsMobile } from "@/hooks/use-mobile";
import clsx from "clsx";
import { useToast } from "@/hooks/use-toast";
import bahorLogo from "@/assets/bahor-logo.png";
import { processAttachments } from "@/services/documentService";
import { isVisionSupportedImage } from "@/services/visionService";
import { detectReplyLanguage } from "@/lib/languageDetect";
import { extractTextFromFile, isImageFile, isPdfFile, getFileReadStatusLabel } from "@/lib/fileTextExtractor";

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
function dbMessageToUI(msg: chatStore.ChatMessage): Message {
  return {
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    timestamp: new Date(msg.created_at),
    reaction: msg.reaction,
    meta: msg.meta,
  };
}

export default function Chat() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t: translate } = useTranslation();
  const t = getTranslation(language);
  const { user, session, profile, refreshProfile } = useAuth();
  const isMobile = useIsMobile();
  const { lightTap } = useHaptics();
  
  // Supabase-backed state
  const [threads, setThreads] = useState<chatStore.ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  
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
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [searchUsed, setSearchUsed] = useState(false);
  const [searchUrls, setSearchUrls] = useState<string[]>([]);
  const [failedMessageContent, setFailedMessageContent] = useState<string | null>(null);
  
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Usage tracking from server entitlements (includes devBypass)
  const { usage, hasReachedLimit, isNearLimit, isPremium, isDevBypass, refresh: refreshUsage } = useDailyUsageServer();
  const usedToday = usage.used;
  const dailyLimit = usage.limit;
  const [showLimitCard, setShowLimitCard] = useState(false);

  const modeInfo = getModeInfo(mode || "");
  const modeTranslation = t.modes[mode as keyof typeof t.modes];
  const modeSuggestions = [...(t.suggestions[mode as keyof typeof t.suggestions] || modeInfo?.quickSuggestions || [])];

  // Scroll tracking
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 100;
    
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom && messages.length > 0);
  }, [messages.length]);

  // Throttled scroll handler
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

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
    
    setIsLoadingThreads(true);
    try {
      const fetchedThreads = await chatStore.listThreads(user.id, mode);
      setThreads(fetchedThreads);
      
      // If no threads exist, create one
      if (fetchedThreads.length === 0) {
        const newThread = await chatStore.createThread(user.id, {
          title: t.chat.defaultChatTitle,
          mode,
        });
        setThreads([newThread]);
        setCurrentThreadId(newThread.id);
        setMessages([]);
      } else {
        // Select most recent thread
        const mostRecent = fetchedThreads[0];
        setCurrentThreadId(mostRecent.id);
      }
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
  }, [user, mode, t.chat.defaultChatTitle, language, toast]);

  // Load messages for current thread
  const loadMessages = useCallback(async (threadId: string, append = false) => {
    if (!threadId) return;
    
    setIsLoadingMessages(true);
    try {
      const offset = append ? messageOffset : 0;
      const fetchedMessages = await chatStore.getMessages(threadId, { limit: 30, offset });
      const uiMessages = fetchedMessages.map(dbMessageToUI);
      
      if (append) {
        setMessages(prev => [...uiMessages, ...prev]);
      } else {
        setMessages(uiMessages);
        setMessageOffset(0);
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
  }, [messageOffset, language, toast]);

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
    if (currentThreadId) {
      loadMessages(currentThreadId);
    }
  }, [currentThreadId, loadMessages]);

  useEffect(() => {
    if (!modeInfo) {
      navigate("/");
    }
  }, [modeInfo, navigate]);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, typing, isAtBottom]);

  // Auto-focus input after AI finishes responding
  useEffect(() => {
    if (!isLoading && !typing) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, typing]);

  // Handle initial message from home page
  useEffect(() => {
    const state = location.state as { initialMessage?: string } | null;
    if (state?.initialMessage && currentThreadId) {
      handleSendMessage(state.initialMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [currentThreadId]);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

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

  // Handle continue - generate continuation of assistant message
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
            isVariant: true,
            variantType: variant,
            reply_language: language, // Use UI language for variants since instruction is system-generated
            ui_language: language,
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

        // Try to extract text from file (for text-like files)
        let extractedText: string | undefined;
        let readStatus: ChatAttachment['readStatus'] = undefined;
        
        if (!isImage && !isPDF) {
          // Attempt text extraction for non-image/PDF files
          const extraction = await extractTextFromFile(file);
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

        const { data, error } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, file);

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
        };

        newAttachments.push(attachment);

        // Save attachment record to DB
        if (currentThreadId && user) {
          await chatStore.attachFile(user.id, {
            threadId: currentThreadId,
            path: filePath,
            mimeType: file.type,
            sizeBytes: file.size,
            originalName: file.name,
          }).catch(console.error);
        }
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

  const handleSendMessage = async (content: string) => {
    if ((!content.trim() && pendingAttachments.length === 0) || isLoading || typing || !mode || !user || !currentThreadId) return;
    
    if (editingMessageId) {
      setEditingMessageId(null);
    }
    
    lightTap();
    
    if (hasReachedLimit) {
      setShowLimitCard(true);
      scrollToBottom();
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

    setMessages((prev) => [...prev, userMessage]);
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
      // Save user message to DB
      const savedUserMessage = await chatStore.addMessage(user.id, {
        threadId: currentThreadId,
        role: "user",
        content: content.trim(),
      });
      savedUserMessageId = savedUserMessage.id;
      
      // Update optimistic message with real ID
      setMessages((prev) => 
        prev.map(m => m.id === tempUserMessageId ? { ...m, id: savedUserMessage.id } : m)
      );
      
      // Auto-title thread if it's the first message
      const currentThread = threads.find(t => t.id === currentThreadId);
      if (currentThread && (currentThread.title === "Yangi chat" || currentThread.title === t.chat.defaultChatTitle)) {
        const newTitle = generateChatTitle(content.trim());
        await chatStore.renameThread(currentThreadId, newTitle);
        setThreads(prev => prev.map(th => 
          th.id === currentThreadId ? { ...th, title: newTitle } : th
        ));
      }

      // Process attachments
      let analysisContent: string | null = null;
      let analysisType: 'vision' | 'ocr' | 'mixed' | null = null;
      
      if (attachmentsToProcess.length > 0) {
        const hasImages = attachmentsToProcess.some(att => isVisionSupportedImage(att));
        
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
          attachmentsToProcess,
          {
            mode: mode || 'general',
            language,
            userPrompt: content.trim(),
            onProgress: (status) => setProcessingStatus(status),
          }
        );
        
        analysisContent = analysisResult.content;
        analysisType = analysisResult.type;
        setProcessingStatus(null);
        
        if (!analysisContent && attachmentsToProcess.length > 0) {
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
        currentThreadId,
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
            }),
            signal: controller.signal,
          }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.error === "DAILY_LIMIT_REACHED") {
          setShowLimitCard(true);
          setTyping(false);
          setIsLoading(false);
          setMessages((prev) => prev.filter(m => m.id !== (savedUserMessageId || tempUserMessageId)));
          toast({
            title: language === "uz" ? "Limit tugadi" : "Limit reached",
            description: language === "uz" 
              ? "Bugungi limit tugadi. Ertaga yana davom eting yoki Premiumga o'ting." 
              : "Daily limit reached. Continue tomorrow or upgrade to Premium.",
            variant: "destructive",
          });
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

      let assistantContent = "";
      
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
          const { step, status, t, data } = event;
          if (status === 'start') {
            traceStepsRef.current.set(step, { step, startMs: t });
          } else if (status === 'end') {
            const existing = traceStepsRef.current.get(step);
            if (existing) {
              existing.endMs = t;
              existing.durMs = t - existing.startMs;
              if (data) existing.data = data;
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
            setMessages((prev) => [...prev, newAssistantMessage]);
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
          setTyping(false);
          setIsLoading(false);
          setProcessingStatus(null);
          inputRef.current?.focus();
          
          // Attach trace to message using ref (avoids stale closure issue)
          const finalTrace = activeTraceRef.current;
          if (finalTrace?.isComplete) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, trace: finalTrace } : m
              )
            );
          }
          
          // Save assistant message to DB
          if (assistantContent && user) {
            try {
              const savedAssistant = await chatStore.addMessage(user.id, {
                threadId: currentThreadId,
                role: "assistant",
                content: assistantContent,
              });
              
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, id: savedAssistant.id } : m
                )
              );
              setLastAssistantMessageId(savedAssistant.id);
              
              if (session?.access_token) {
                chatStore.maybeGenerateSummary(currentThreadId, session.access_token)
                  .then(result => {
                    if (result.summary) {
                      setThreads(prev => prev.map(t => 
                        t.id === currentThreadId 
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
          
          refreshProfile();
          
          // Clear failed message on success
          setFailedMessageContent(null);
        },
        onError: (error) => {
          throw error;
        },
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      
      setTyping(false);
      setIsLoading(false);
      setProcessingStatus(null);
      setActiveTrace(null);
      inputRef.current?.focus();
      
      // Store failed message for retry
      setFailedMessageContent(content.trim());
      
      // Check if it was a timeout (AbortError)
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: isTimeout 
          ? (language === "uz" 
              ? "Ulanish cho'zildi. Qayta urinib ko'ring." 
              : "Connection timed out. Please try again.")
          : (language === "uz" 
              ? "Internetda muammo. Qayta urinib ko'ring." 
              : "Network error. Please try again."),
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
      setIsHistoryOpen(false);
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

      {/* Main Chat Container */}
      <div className="flex flex-col h-screen max-w-5xl mx-auto">
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
                {isPremium ? translate('settings.unlimited') : `${usedToday}/${dailyLimit}`} {translate('usage.requests')}
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
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
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-3 sm:px-6 pb-4 pt-4 sm:pt-6"
        >
          {isLoadingMessages ? (
            <ChatMessagesSkeleton />
          ) : messages.length === 0 ? (
            <ChatEmptyState modeInfo={modeInfo} modeTranslation={modeTranslation} />
          ) : (
            <div className="space-y-5 max-w-3xl mx-auto">
              {/* Load more button */}
              {hasMoreMessages && (
                <div className="flex justify-center">
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
              
              {messages.map((message, index) => (
                <div key={message.id}>
                  <ChatMessage
                    message={message}
                    onCopy={handleCopyMessage}
                    onEdit={handleEditMessage}
                    onRegenerate={handleRegenerateMessage}
                    onReaction={handleReaction}
                    onShare={handleShare}
                    onContinue={handleContinue}
                    onVariant={handleVariant}
                    showActions={!isLoading && !typing}
                    showActionBar={!isLoading && !typing}
                    isStreaming={isLoading || typing}
                    isMobile={isMobile}
                  />
                  
                  
                  {/* ReasonedChip (status pill) - shows during streaming and persists after completion */}
                  {message.role === 'assistant' && (
                    message.trace ||  // Persisted trace from DB/history
                    (message.id === lastAssistantMessageId && (activeTrace || isLoading)) // Current message while generating
                  ) && (
                    <div className="flex justify-start mt-2 ml-12">
                      <ReasonedChip
                        trace={message.trace || (message.id === lastAssistantMessageId ? activeTrace : null)}
                        isGenerating={(isLoading || typing) && !message.trace && message.id === lastAssistantMessageId}
                        language={language}
                        elapsedLive={message.id === lastAssistantMessageId && !message.trace ? liveElapsedMs : undefined}
                        onClick={() => {
                          const traceData = message.trace || (message.id === lastAssistantMessageId ? activeTrace : null);
                          if (traceData?.isComplete) {
                            haptic("selection");
                            setSelectedTraceMessageId(message.id);
                            setTraceSheetOpen(true);
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  {message.role === 'assistant' && 
                   message.id === lastAssistantMessageId && 
                   !isLoading && 
                   !typing && (
                    <FollowUpSuggestions
                      onSelect={handleSendMessage}
                      disabled={isLoading || typing}
                      mode={mode}
                    />
                  )}
                </div>
              ))}
              
              {showLimitCard && hasReachedLimit && (
                <LimitReachedCard onDismiss={() => setShowLimitCard(false)} />
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>
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
                          attachment.readStatus === 'unsupported' && "text-amber-600 dark:text-amber-400",
                          attachment.readStatus === 'error' && "text-destructive"
                        )}>
                          {attachment.readStatus === 'ready' && <CheckCircle className="w-2.5 h-2.5" />}
                          {attachment.readStatus === 'unsupported' && <AlertCircle className="w-2.5 h-2.5" />}
                          {getFileReadStatusLabel(attachment.readStatus, language)}
                        </p>
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

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf,.txt,.md,.json,.csv,.xml,.yaml,.yml,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.h,.css,.sql,.sh,.html"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || typing || isUploading}
                className="p-3 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-all duration-200 disabled:opacity-40 flex-shrink-0 active:scale-95"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t.chatPlaceholder}
                disabled={isLoading || typing}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50 max-h-[140px] overflow-y-auto py-3 px-1"
              />
              
              <VoiceModeButton
                onClick={() => setIsVoiceModeOpen(true)}
                disabled={isLoading || typing}
                className="flex-shrink-0"
              />
              
              <button
                type="submit"
                disabled={(!inputValue.trim() && pendingAttachments.length === 0) || isLoading || typing}
                className="p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 active:scale-95 glow-primary-subtle hover:glow-primary"
                aria-label={language === "uz" ? "Yuborish" : language === "en" ? "Send" : language === "ru" ? "Отправить" : "Gönder"}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
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

      {/* Voice Mode Panel */}
      <VoiceModePanel
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        onTranscriptionComplete={(text) => {
          setInputValue(text);
          setIsVoiceModeOpen(false);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      />

      {/* Trace Sheet */}
      <TraceSheet
        open={traceSheetOpen}
        onOpenChange={setTraceSheetOpen}
        trace={selectedTraceMessageId ? messages.find(m => m.id === selectedTraceMessageId)?.trace || activeTrace : null}
        language={language}
      />
    </div>
  );
}
