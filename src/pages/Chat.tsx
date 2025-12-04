import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Trash2, Menu, Paperclip, X, FileText } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickSuggestions from "@/components/QuickSuggestions";
import { DeleteChatModal } from "@/components/DeleteChatModal";
import DailyUsageIndicator from "@/components/DailyUsageIndicator";
import LimitReachedCard from "@/components/LimitReachedCard";
import ThinkingBar, { ThinkingStatus, ThinkingPhase } from "@/components/ThinkingBar";
import { VoiceModeButton, VoiceModePanel } from "@/components/voice";
import {
  MessageActions,
  ScrollToBottom,
  FollowUpSuggestions,
  ChatEmptyState,
  EditingIndicator,
} from "@/components/chat";
import { Message, ChatSession, ChatAttachment } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { getModeInfo } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";
import { getTranslation } from "@/data/translations";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { loadChatsFromStorage, saveChatsToStorage, createNewSession } from "@/utils/chatStorage";
import { generateChatTitle } from "@/utils/generateChatTitle";
import { useAuth } from "@/contexts/AuthContext";

import { useHaptics } from "@/hooks/useHaptics";
import { useIsMobile } from "@/hooks/use-mobile";
import clsx from "clsx";
import { useToast } from "@/hooks/use-toast";
import bahorLogo from "@/assets/bahor-logo.png";
import { processAttachments } from "@/services/documentService";
import { isVisionSupportedImage } from "@/services/visionService";

// Real streaming helper - processes SSE from DeepSeek API
type StreamOptions = {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  onMetadata?: (metadata: { search_used: boolean; search_urls: string[] }) => void;
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
          console.warn("Failed to parse chunk:", e);
        }
      }
    }
    
    options.onDone();
  } catch (error) {
    options.onError(error instanceof Error ? error : new Error("Stream error"));
  }
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
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState<ThinkingStatus>({
    phase: 'idle',
    shortLabel: '',
    details: [],
  });
  const [searchUsed, setSearchUsed] = useState(false);
  const [searchUrls, setSearchUrls] = useState<string[]>([]);
  const [thinkingMessageId, setThinkingMessageId] = useState<string | null>(null);
  
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
  
  // Usage tracking from profile (backend-driven)
  const usedToday = profile?.messages_today || 0;
  const dailyLimit = profile?.daily_limit || 5;
  const hasReachedLimit = usedToday >= dailyLimit;
  const isNearLimit = usedToday >= dailyLimit - 1;
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

  // Initialize sessions on mount
  useEffect(() => {
    if (!mode) return;

    const storage = loadChatsFromStorage();
    
    // If no data for this mode, create default session
    if (!storage[mode]) {
      const defaultSession = createNewSession(mode, t.chat.defaultChatTitle);
      storage[mode] = {
        sessions: [defaultSession],
        messagesById: { [defaultSession.id]: [] },
      };
      saveChatsToStorage(storage);
      setSessions([defaultSession]);
      setCurrentSessionId(defaultSession.id);
      setMessages([]);
    } else {
      const modeData = storage[mode];
      setSessions(modeData.sessions);
      
      // Pick most recent session
      const mostRecent = [...modeData.sessions].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      
      setCurrentSessionId(mostRecent.id);
      setMessages(modeData.messagesById[mostRecent.id] || []);
    }
  }, [mode, t.chat.defaultChatTitle]);

  // Save messages whenever they change
  useEffect(() => {
    if (!mode || !currentSessionId) return;

    const storage = loadChatsFromStorage();
    if (!storage[mode]) return;

    storage[mode].messagesById[currentSessionId] = messages;
    
    // Update updatedAt for current session
    const session = storage[mode].sessions.find(s => s.id === currentSessionId);
    if (session) {
      session.updatedAt = new Date().toISOString();
      
      // Auto-name chat from first user message
      const isDefaultTitle = 
        session.title === t.chat.defaultChatTitle || 
        session.title === "Yangi suhbat" || 
        session.title === "New chat";
      
      const firstUserMessage = messages.find(m => m.role === "user");
      
      if (isDefaultTitle && firstUserMessage && messages.length >= 1) {
        session.title = generateChatTitle(firstUserMessage.content, mode);
      }
    }

    saveChatsToStorage(storage);
    
    // Update sessions state to reflect new updatedAt
    setSessions([...storage[mode].sessions]);
    
    // Track last assistant message for follow-up suggestions
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistant) {
      setLastAssistantMessageId(lastAssistant.id);
    }
  }, [messages, currentSessionId, mode, t.chat.defaultChatTitle]);

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
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, typing]);

  // Handle initial message from home page
  useEffect(() => {
    const state = location.state as { initialMessage?: string } | null;
    if (state?.initialMessage) {
      handleSendMessage(state.initialMessage);
      // Clear the state to prevent re-sending on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

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
    
    // Auto-grow textarea
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
    // Find the user message that preceded this assistant message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) return;
    
    // Find the last user message before this assistant message
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== "user") {
      userMessageIndex--;
    }
    
    if (userMessageIndex < 0) return;
    
    const userMessage = messages[userMessageIndex];
    
    // Send the user message again (will append new response)
    handleSendMessage(userMessage.content);
  };

  // Mobile long press handler
  const handleLongPress = (messageId: string) => {
    lightTap();
    setActiveActionMessageId(messageId);
    setShowMobileActions(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newAttachments: ChatAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Support images and PDFs
        const isImage = file.type.startsWith("image/");
        const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        
        if (!isImage && !isPDF) {
          toast({
            title: language === "uz" ? "Xatolik" : "Error",
            description: language === "uz" ? `${file.name}: Faqat rasm va PDF fayllar qo'llab-quvvatlanadi` : `${file.name}: Only image and PDF files are supported`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: language === "uz" ? "Xatolik" : "Error",
            description: language === "uz" ? `${file.name}: Fayl hajmi 10MB dan oshmasligi kerak` : `${file.name}: File size must not exceed 10MB`,
            variant: "destructive",
          });
          continue;
        }

        // Create preview URL for images and PDFs (used for OCR processing)
        const previewUrl = URL.createObjectURL(file);

        // Upload to Supabase storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${i}.${fileExt}`;
        const filePath = `${fileName}`;

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

        // Get public URL
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
        };

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

  const handleSendMessage = async (content: string) => {
    if ((!content.trim() && pendingAttachments.length === 0) || isLoading || typing || !mode) return;
    
    // Clear editing state if active
    if (editingMessageId) {
      setEditingMessageId(null);
    }
    
    // Haptic feedback on send
    lightTap();
    
    // TODO: Backend integration - Check limit via backend API instead of local storage
    if (hasReachedLimit) {
      setShowLimitCard(true);
      scrollToBottom();
      return;
    }

    const attachmentsToProcess = [...pendingAttachments];
    
    const userMessage: Message = {
      id: Date.now().toString(),
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
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    
    // Determine initial thinking phase based on attachments
    const hasImages = attachmentsToProcess.some(att => isVisionSupportedImage(att));
    const hasPdf = attachmentsToProcess.some(att => att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf'));
    
    let initialPhase: ThinkingPhase = 'reasoning';
    let initialLabel = translate('thinking.reasoning');
    
    if (hasImages || hasPdf) {
      initialPhase = 'vision';
      initialLabel = translate('thinking.vision');
    }
    
    setThinkingStatus({
      phase: initialPhase,
      shortLabel: initialLabel,
      details: [
        translate('thinking.step.understanding'),
        translate('thinking.step.selecting'),
        translate('thinking.step.drafting'),
      ],
    });
    
    // Reset search state for new message
    setSearchUsed(false);
    setSearchUrls([]);
    setThinkingMessageId(userMessage.id);

    // Prepare assistant message ID but don't add to state yet
    const assistantId = crypto.randomUUID?.() ?? (Date.now() + 1).toString();
    let assistantMessageCreated = false;

    try {
      // Process attachments with Vision AI (images) or OCR (text PDFs)
      let analysisContent: string | null = null;
      let analysisType: 'vision' | 'ocr' | 'mixed' | null = null;
      
      if (attachmentsToProcess.length > 0) {
        // Check if any images need vision analysis
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
        
        // If processing was attempted but failed
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
      
      // Create conversation history for API (limit to last 12 messages)
      const recentMessages = messages.slice(-12);
      const conversationMessages = recentMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Build the message content with analysis if available
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
      
      // Add the new user message with analysis content
      conversationMessages.push({
        role: "user" as const,
        content: messageContent,
      });

      // Update thinking status to reasoning phase after attachment processing
      if (attachmentsToProcess.length > 0) {
        setThinkingStatus(prev => ({
          ...prev,
          phase: 'reasoning',
          shortLabel: translate('thinking.reasoning'),
        }));
      }

      // Call the backend API for streaming response
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

      const response = await fetch(
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
            attachments: attachmentsToProcess,
            hasAnalysis: !!analysisContent,
            analysisType,
          }),
        }
      );

      // Handle specific error codes
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.error === "DAILY_LIMIT_REACHED") {
          setShowLimitCard(true);
          setTyping(false);
          setIsLoading(false);
          setThinkingStatus({ phase: 'idle', shortLabel: '', details: [] });
          // Remove the user message we just added since it wasn't processed
          setMessages((prev) => prev.filter(m => m.id !== userMessage.id));
          toast({
            title: language === "uz" ? "Limit tugadi" : "Limit reached",
            description: language === "uz" 
              ? "Bugungi limit tugadi. Ertaga yana davom eting yoki Premiumga o'ting." 
              : "Daily limit reached. Continue tomorrow or upgrade to Premium.",
            variant: "destructive",
          });
          // Refresh profile to get updated usage
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

      // Process the streaming response
      await processStreamingResponse(response, {
        onMetadata: (metadata) => {
          // Handle search metadata from backend
          if (metadata.search_used) {
            setSearchUsed(true);
            setSearchUrls(metadata.search_urls || []);
            setThinkingStatus(prev => ({
              ...prev,
              phase: 'searching',
              shortLabel: translate('thinking.searching'),
              searchUsed: true,
              searchUrls: metadata.search_urls || [],
            }));
          }
        },
        onChunk: (chunk) => {
          // Update to finalising phase when streaming starts
          if (!assistantMessageCreated) {
            setThinkingStatus(prev => ({
              ...prev,
              phase: 'finalising',
              shortLabel: translate('thinking.finalising'),
            }));
            // Create assistant message on first chunk
            // Add analysis prefix based on type (vision or OCR)
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
            // Update existing assistant message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m
              )
            );
          }
        },
        onDone: () => {
          setTyping(false);
          setIsLoading(false);
          setProcessingStatus(null);
          setThinkingStatus({ phase: 'idle', shortLabel: '', details: [] });
          setThinkingMessageId(null);
          inputRef.current?.focus();
          
          // Refresh profile to get updated usage from backend
          refreshProfile();
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
      setThinkingStatus({ phase: 'idle', shortLabel: '', details: [] });
      inputRef.current?.focus();
      
      // Show error toast
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: language === "uz" 
          ? "Internetda muammo. Qayta urinib ko'ring." 
          : "Network error. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClearChat = () => {
    if (!currentSessionId || !mode) return;
    
    const storage = loadChatsFromStorage();
    if (!storage[mode]) return;

    // Clear messages for current session
    storage[mode].messagesById[currentSessionId] = [];
    saveChatsToStorage(storage);
    setMessages([]);
  };

  const handleCreateNewSession = () => {
    if (!mode) return;

    const newSession = createNewSession(mode, t.chat.defaultChatTitle);
    const storage = loadChatsFromStorage();
    
    if (!storage[mode]) {
      storage[mode] = {
        sessions: [newSession],
        messagesById: { [newSession.id]: [] },
      };
    } else {
      storage[mode].sessions.unshift(newSession);
      storage[mode].messagesById[newSession.id] = [];
    }
    
    saveChatsToStorage(storage);
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setIsHistoryOpen(false);
  };

  const handleSelectSession = (sessionId: string) => {
    if (!mode) return;
    
    const storage = loadChatsFromStorage();
    if (!storage[mode]) return;

    setCurrentSessionId(sessionId);
    setMessages(storage[mode].messagesById[sessionId] || []);
    setIsHistoryOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!mode) return;

    const storage = loadChatsFromStorage();
    if (!storage[mode]) return;

    const modeData = storage[mode];
    const updatedSessions = modeData.sessions.filter(s => s.id !== sessionId);
    const { [sessionId]: _removed, ...updatedMessagesById } = modeData.messagesById;

    if (updatedSessions.length === 0) {
      // No sessions left: create a new default one
      const newSession = createNewSession(mode, t.chat.defaultChatTitle);
      storage[mode] = {
        sessions: [newSession],
        messagesById: { [newSession.id]: [] },
      };
      saveChatsToStorage(storage);
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
    } else {
      // Still have sessions
      storage[mode] = {
        sessions: updatedSessions,
        messagesById: updatedMessagesById,
      };
      saveChatsToStorage(storage);
      setSessions(updatedSessions);

      // If deleted current session, switch to another
      if (sessionId === currentSessionId) {
        const newCurrentId = updatedSessions[0].id;
        setCurrentSessionId(newCurrentId);
        setMessages(updatedMessagesById[newCurrentId] || []);
      }
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
    
    // Auto-grow textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 140); // Max ~6 lines
    textarea.style.height = `${newHeight}px`;
  };

  // Get active message for mobile actions
  const activeMessage = messages.find(m => m.id === activeActionMessageId);

  if (!modeInfo) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 relative">
      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-[150px]" />
      </div>

      {/* History Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="flex-1 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsHistoryOpen(false)}
          />

          {/* Drawer */}
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
              onClick={handleCreateNewSession}
              className="mx-4 mt-4 mb-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              + {t.chat.defaultChatTitle}
            </button>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={clsx(
                    "flex items-center justify-between px-3 py-3 text-sm cursor-pointer rounded-xl my-1.5 transition-all",
                    session.id === currentSessionId
                      ? "bg-primary/10 border border-primary/20 text-foreground"
                      : "hover:bg-secondary/60 border border-transparent"
                  )}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="flex-1 pr-2 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {session.title || t.chat.defaultChatTitle}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteSessionId(session.id);
                    }}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Container */}
      <div className="relative mx-auto w-full max-w-4xl lg:max-w-5xl flex flex-col h-[100dvh]">
        {/* Header - Compact glass bar */}
        <div className="sticky top-0 z-10 px-3 sm:px-6 pt-2 sm:pt-3 pb-1">
          <div className="glass-strong rounded-xl sm:rounded-2xl border border-border/30 shadow-md">
            <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
              {/* Left section - Back + History */}
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

              {/* Center - Mode title */}
              <div className="flex-1 min-w-0 text-center">
                <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
                  {modeTranslation?.title || modeInfo.title}
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {usedToday}/{dailyLimit} {translate('usage.requests')}
                </p>
              </div>

              {/* Right section - Actions */}
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
        </div>

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-3 sm:px-6 pb-4 pt-4 sm:pt-6"
        >
          {messages.length === 0 ? (
            <ChatEmptyState modeInfo={modeInfo} modeTranslation={modeTranslation} />
          ) : (
            <div className="space-y-5 max-w-3xl mx-auto">
              {messages.map((message, index) => (
                <div key={message.id}>
                  <ChatMessage
                    message={message}
                    onCopy={handleCopyMessage}
                    onEdit={handleEditMessage}
                    onRegenerate={handleRegenerateMessage}
                    showActions={!isLoading && !typing}
                    isMobile={isMobile}
                    onLongPress={handleLongPress}
                  />
                  
                  {/* Show ThinkingBar right after the user message that triggered it */}
                  {message.role === 'user' && 
                   message.id === thinkingMessageId && 
                   thinkingStatus.phase !== 'idle' && (
                    <div className="flex justify-start mt-4">
                      <ThinkingBar 
                        status={thinkingStatus}
                        searchUsed={searchUsed}
                        searchUrls={searchUrls}
                        onToggleExpand={() => {
                          setThinkingStatus(prev => ({
                            ...prev,
                            expanded: !prev.expanded,
                          }));
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Follow-up suggestions after last assistant message */}
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
              
              {/* Show limit reached card */}
              {showLimitCard && hasReachedLimit && (
                <LimitReachedCard onDismiss={() => setShowLimitCard(false)} />
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Scroll to bottom button - positioned inside container */}
        <ScrollToBottom 
          visible={showScrollButton} 
          onClick={() => scrollToBottom()} 
        />

        {/* Input Area - Premium sticky bottom bar with safe area */}
        <div className="sticky bottom-0 px-3 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 pt-2">
          {/* Quick Suggestions */}
          {modeSuggestions && modeSuggestions.length > 0 && messages.length === 0 && (
            <div className="pb-3">
              <QuickSuggestions
                suggestions={modeSuggestions}
                onSelect={handleSendMessage}
                disabled={isLoading || typing}
              />
            </div>
          )}

          {/* Input Container */}
          <div className="glass-strong rounded-2xl border border-border/30 shadow-lg p-2">
            {/* Editing indicator */}
            {editingMessageId && (
              <EditingIndicator onCancel={handleCancelEdit} />
            )}
            
            {/* Attachment Previews */}
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
                    <div className="flex-1 min-w-0 max-w-[100px]">
                      <p className="text-xs font-medium text-foreground truncate">
                        {attachment.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
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

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
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
              
              {/* Voice Mode Button */}
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

      {/* Mobile Message Actions */}
      {isMobile && activeMessage && (
        <MessageActions
          messageId={activeMessage.id}
          messageRole={activeMessage.role}
          messageContent={activeMessage.content}
          isOpen={showMobileActions}
          onClose={() => {
            setShowMobileActions(false);
            setActiveActionMessageId(null);
          }}
          onCopy={() => handleCopyMessage(activeMessage.content)}
          onEdit={activeMessage.role === "user" ? () => handleEditMessage(activeMessage.id, activeMessage.content) : undefined}
          onRegenerate={activeMessage.role === "assistant" ? () => handleRegenerateMessage(activeMessage.id) : undefined}
          isMobile={true}
        />
      )}

      {/* Delete Chat Modal */}
      <DeleteChatModal
        open={showDeleteModal}
        onConfirm={() => {
          handleClearChat();
          setShowDeleteModal(false);
        }}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Delete Session Modal */}
      <DeleteChatModal
        open={!!pendingDeleteSessionId}
        onConfirm={() => {
          if (pendingDeleteSessionId) {
            handleDeleteSession(pendingDeleteSessionId);
            setPendingDeleteSessionId(null);
          }
        }}
        onCancel={() => setPendingDeleteSessionId(null)}
      />

      {/* Voice Mode Panel */}
      <VoiceModePanel
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        onTranscriptionComplete={(text) => {
          setInputValue(text);
          setIsVoiceModeOpen(false);
          // Auto-focus the input so user can edit or send
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      />
    </div>
  );
}
