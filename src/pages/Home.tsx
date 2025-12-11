import { useState, useRef, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, ChevronDown, Check, Paperclip, Camera, X, FileText, Image as ImageIcon, MessageSquare } from "lucide-react";
import { CHAT_MODES } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ModelToggle, getModelPreference, type ModelPreference } from "@/components/ModelToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AppFooter } from "@/components/layout/AppFooter";
import bahorLogo from "@/assets/bahor-logo.png";
import { markSessionInitialized } from "@/utils/chatSession";

interface PendingAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  previewUrl?: string;
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [selectedMode, setSelectedMode] = useState("general");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [modelPreference, setModelPreference] = useState<ModelPreference>(getModelPreference);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handle mode preselection from query param
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam && CHAT_MODES.some(m => m.id === modeParam)) {
      setSelectedMode(modeParam);
    }
  }, [searchParams]);

  // Mode icons mapping
  const modeIcons: Record<string, string> = {
    general: "💬",
    tech: "💻",
    daily: "🏠",
    business: "📈",
    ielts: "🎓",
    homework: "📚",
    job: "💼",
    financial: "💰",
    health: "❤️",
  };

  // Get localized mode title
  const getModeTitle = (modeId: string) => {
    const modeKeys: Record<string, string> = {
      general: 'mode.general.title',
      tech: 'mode.tech.title',
      daily: 'mode.life.title',
      business: 'mode.business.title',
      ielts: 'mode.english.title',
      homework: 'mode.homework.title',
      job: 'mode.job.title',
      financial: 'mode.finance.title',
      health: 'mode.health.title',
    };
    return t(modeKeys[modeId] || 'mode.general.title');
  };

  // Get localized beta prompt chips
  const getBetaPrompts = () => {
    const prompts = {
      uz: [
        { label: "📝 IELTS essay", mode: "ielts", prompt: "IELTS Writing Task 2 uchun essay yozishda yordam ber" },
        { label: "💼 CV tayyorlash", mode: "job", prompt: "Professional CV tayyorlashda yordam ber" },
        { label: "🍳 Taom retsepti", mode: "daily", prompt: "Oson va mazali taom retseptini ber" },
        { label: "🏠 Kundalik maslahat", mode: "daily", prompt: "Bugun qanday foydali ish qilsam bo'ladi?" },
        { label: "💻 Kod yozish", mode: "tech", prompt: "React da button komponenti yozishda yordam ber" },
        { label: "📐 Matematika", mode: "homework", prompt: "Kvadrat tenglama yechishni tushuntir" },
        { label: "🖼️ Rasm yaratish", mode: "general", prompt: "Samarqand shahri haqida chiroyli rasm yarat" },
        { label: "📄 PDF yaratish", mode: "general", prompt: "Matnni PDF formatiga o'tkaz" },
      ],
      en: [
        { label: "📝 IELTS essay", mode: "ielts", prompt: "Help me write an IELTS Writing Task 2 essay" },
        { label: "💼 CV/Resume", mode: "job", prompt: "Help me create a professional CV" },
        { label: "🍳 Recipe", mode: "daily", prompt: "Give me an easy and delicious recipe" },
        { label: "🏠 Daily advice", mode: "daily", prompt: "What useful thing can I do today?" },
        { label: "💻 Coding", mode: "tech", prompt: "Help me write a React button component" },
        { label: "📐 Math", mode: "homework", prompt: "Explain how to solve quadratic equations" },
        { label: "🖼️ Generate image", mode: "general", prompt: "Create a beautiful image of Samarkand city" },
        { label: "📄 Create PDF", mode: "general", prompt: "Convert this text to PDF format" },
      ],
      ru: [
        { label: "📝 IELTS эссе", mode: "ielts", prompt: "Помоги написать эссе для IELTS Writing Task 2" },
        { label: "💼 Резюме", mode: "job", prompt: "Помоги создать профессиональное резюме" },
        { label: "🍳 Рецепт", mode: "daily", prompt: "Дай простой и вкусный рецепт" },
        { label: "🏠 Совет на день", mode: "daily", prompt: "Что полезного я могу сделать сегодня?" },
        { label: "💻 Код", mode: "tech", prompt: "Помоги написать компонент кнопки в React" },
        { label: "📐 Математика", mode: "homework", prompt: "Объясни как решать квадратные уравнения" },
        { label: "🖼️ Создать изображение", mode: "general", prompt: "Создай красивое изображение города Самарканд" },
        { label: "📄 Создать PDF", mode: "general", prompt: "Преобразуй этот текст в PDF формат" },
      ],
      tr: [
        { label: "📝 IELTS kompozisyon", mode: "ielts", prompt: "IELTS Writing Task 2 için kompozisyon yazmama yardım et" },
        { label: "💼 CV hazırlama", mode: "job", prompt: "Profesyonel CV hazırlamama yardım et" },
        { label: "🍳 Tarif", mode: "daily", prompt: "Kolay ve lezzetli bir tarif ver" },
        { label: "🏠 Günlük tavsiye", mode: "daily", prompt: "Bugün ne faydalı yapabilirim?" },
        { label: "💻 Kodlama", mode: "tech", prompt: "React'ta bir buton komponenti yazmama yardım et" },
        { label: "📐 Matematik", mode: "homework", prompt: "İkinci dereceden denklemleri çözmeyi açıkla" },
        { label: "🖼️ Görsel oluştur", mode: "general", prompt: "Semerkant şehrinin güzel bir görselini oluştur" },
        { label: "📄 PDF oluştur", mode: "general", prompt: "Bu metni PDF formatına dönüştür" },
      ],
    };
    return prompts[language] || prompts.uz;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: PendingAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // File size check (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: language === "uz" ? "Xatolik" : "Error",
          description: language === "uz" ? `${file.name}: Fayl hajmi 10MB dan oshmasligi kerak` : `${file.name}: File size must not exceed 10MB`,
          variant: "destructive",
        });
        continue;
      }

      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      newAttachments.push({
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        previewUrl,
      });
    }

    if (newAttachments.length > 0) {
      setPendingAttachments(prev => [...prev, ...newAttachments]);
    }
    
    // Reset input
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att?.previewUrl) {
        URL.revokeObjectURL(att.previewUrl);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const handleSend = async () => {
    if (!input.trim() && pendingAttachments.length === 0) return;

    // Mark session as initialized when user sends from /modes
    // This ensures the first message will go into a new chat
    markSessionInitialized();

    // If we have attachments, upload them first then navigate with attachments
    if (pendingAttachments.length > 0 && user) {
      setIsUploading(true);
      try {
        const uploadedAttachments: Array<{ name: string; url: string; type: string; size: number }> = [];
        
        for (const att of pendingAttachments) {
          const fileExt = att.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error } = await supabase.storage
            .from("chat-attachments")
            .upload(filePath, att.file);

          if (error) {
            console.error("Upload error:", error);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("chat-attachments")
            .getPublicUrl(filePath);

          uploadedAttachments.push({
            name: att.name,
            url: publicUrl,
            type: att.type,
            size: att.size,
          });
        }

      // Navigate with ?new to force new chat creation
        // Store pending message and attachments in sessionStorage
        const newChatId = crypto.randomUUID?.() ?? Date.now().toString();
        if (input.trim()) {
          sessionStorage.setItem(`pending_msg_${newChatId}`, input.trim());
        }
        if (uploadedAttachments.length > 0) {
          sessionStorage.setItem(`pending_attachments_${newChatId}`, JSON.stringify(uploadedAttachments));
        }
        navigate(`/chat/${selectedMode}?new=${newChatId}&source=modes`);
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: language === "uz" ? "Xatolik" : "Error",
          description: language === "uz" ? "Fayllarni yuklashda xatolik" : "Failed to upload files",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    } else {
      // Navigate with ?new to force new chat creation
      // Store pending message in sessionStorage for Chat.tsx to pick up
      const newChatId = crypto.randomUUID?.() ?? Date.now().toString();
      if (input.trim()) {
        sessionStorage.setItem(`pending_msg_${newChatId}`, input.trim());
      }
      navigate(`/chat/${selectedMode}?new=${newChatId}&source=modes`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptChip = (mode: string, prompt: string) => {
    markSessionInitialized();
    const newChatId = crypto.randomUUID?.() ?? Date.now().toString();
    sessionStorage.setItem(`pending_msg_${newChatId}`, prompt);
    navigate(`/chat/${mode}?new=${newChatId}&source=modes`);
  };

  return (
    <>
      <SEO 
        title="Suhbat" 
        description="Bahor AI bilan suhbatlashing. O'zbek tiliga moslashtirilgan sun'iy intellekt yordamchisi."
        url="/modes"
      />
      <div className="bg-background flex flex-col min-h-[100dvh]">
      {/* Main content wrapper - ensures footer is below the fold */}
      <div className="min-h-screen flex flex-col">
        {/* Top Bar with page label + Language - subtle, not sticky */}
        <div className="w-full px-4 sm:px-6 py-2.5 border-b border-border/40">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{t('sidebar.chat')}</span>
            </div>
            <LanguageSwitcher variant="compact" />
          </div>
        </div>

        {/* Main Content - Centered with proper vertical balance */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-3xl space-y-5">
          
          {/* Brand Block - Logo + Title centered, larger logo */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <img 
                src={bahorLogo} 
                alt="Bahor AI" 
                className="h-14 w-14 sm:h-16 sm:w-16 object-contain" 
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {t('home.title')}
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              {t('home.subtitle')}
            </p>
          </div>

          {/* Main Input Area */}
          <div className="space-y-3">
            {/* Mode Selector + Input */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              {/* Mode Dropdown + Model Toggle Row */}
              <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('chat.mode')}:</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                      <span>{modeIcons[selectedMode]}</span>
                      <span>{getModeTitle(selectedMode)}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {CHAT_MODES.map((mode) => (
                        <DropdownMenuItem
                          key={mode.id}
                          onClick={() => setSelectedMode(mode.id)}
                          className="flex items-center gap-2"
                        >
                          <span>{modeIcons[mode.id] || mode.icon}</span>
                          <span className="flex-1">{getModeTitle(mode.id)}</span>
                          {selectedMode === mode.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <ModelToggle 
                  value={modelPreference} 
                  onChange={setModelPreference} 
                  size="sm" 
                />
              </div>

              {/* Pending Attachments Preview */}
              {pendingAttachments.length > 0 && (
                <div className="px-3 pt-3 pb-0 flex flex-wrap gap-2">
                  {pendingAttachments.map((att) => (
                    <div 
                      key={att.id}
                      className="relative group flex items-center gap-2 px-2 py-1.5 bg-secondary/50 border border-border rounded-lg text-sm"
                    >
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt={att.name} className="w-8 h-8 object-cover rounded" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="truncate max-w-[100px]">{att.name}</span>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Row - Icons and placeholder on same baseline */}
              <div className="p-3 sm:p-4">
                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* Flex row with consistent vertical alignment */}
                <div className="flex items-center gap-1.5">
                  {/* Paperclip button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg transition-all duration-200 disabled:opacity-40 active:scale-95 flex-shrink-0"
                    aria-label="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  {/* Camera button */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg transition-all duration-200 disabled:opacity-40 active:scale-95 flex-shrink-0"
                    aria-label="Take photo"
                  >
                    <Camera className="w-5 h-5" />
                  </button>

                  {/* Text input - grows to fill, aligned baseline with icons */}
                  <div className="flex-1 min-w-0 bahor-no-zoom">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={t('chat.input.placeholder')}
                      className="w-full h-9 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base leading-9"
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={isUploading || (!input.trim() && pendingAttachments.length === 0)}
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
                    aria-label="Send"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {getBetaPrompts().map((item, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptChip(item.mode, item.prompt)}
                  className="px-3 py-1.5 text-sm bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-full transition-colors border border-border/50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>
      
      {/* Footer - only visible after scrolling past min-h-screen content */}
      <AppFooter />
    </div>
    </>
  );
}
