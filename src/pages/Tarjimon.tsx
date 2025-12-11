import { useState, useEffect, useCallback, useRef } from "react";
import { SEO } from "@/components/SEO";
import { useTranslation } from "@/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  Copy,
  Share2,
  Trash2,
  ClipboardPaste,
  Check,
  Loader2,
  ChevronDown,
  History,
  X,
  RefreshCw,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Language list - curated 60+ languages grouped
const POPULAR_LANGUAGES = [
  { code: "auto", name: "Auto Detect", nativeName: "Avtomatik aniqlash" },
  { code: "uz", name: "Uzbek", nativeName: "O'zbekcha" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "kk", name: "Kazakh", nativeName: "Қазақша" },
  { code: "ky", name: "Kyrgyz", nativeName: "Кыргызча" },
  { code: "tg", name: "Tajik", nativeName: "Тоҷикӣ" },
  { code: "fa", name: "Persian", nativeName: "فارسی" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
];

const ALL_LANGUAGES = [
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans" },
  { code: "sq", name: "Albanian", nativeName: "Shqip" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "hy", name: "Armenian", nativeName: "Հայերdelays" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan" },
  { code: "eu", name: "Basque", nativeName: "Euskara" },
  { code: "be", name: "Belarusian", nativeName: "Беларуская" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "bs", name: "Bosnian", nativeName: "Bosanski" },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "ca", name: "Catalan", nativeName: "Català" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "et", name: "Estonian", nativeName: "Eesti" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "ka", name: "Georgian", nativeName: "ქართული" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "he", name: "Hebrew", nativeName: "עברית" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "mt", name: "Maltese", nativeName: "Malti" },
  { code: "mn", name: "Mongolian", nativeName: "Монгол" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "no", name: "Norwegian", nativeName: "Norsk" },
  { code: "ps", name: "Pashto", nativeName: "پښتو" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "sr", name: "Serbian", nativeName: "Српски" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "ur", name: "Urdu", nativeName: "اردو" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg" },
];

// Action modes
type ActionMode = 
  | "translate" 
  | "simplify" 
  | "formal" 
  | "friendly" 
  | "shorten" 
  | "expand" 
  | "grammar" 
  | "explain" 
  | "translit";

interface HistoryItem {
  id: string;
  input: string;
  output: string;
  fromLang: string;
  toLang: string;
  action: ActionMode;
  timestamp: number;
}

// Templates
const TEMPLATES = [
  { id: "uni-email", labelKey: "tarjimon.template.uniEmail", from: "uz", to: "en", action: "formal" as ActionMode },
  { id: "work-letter", labelKey: "tarjimon.template.workLetter", from: "uz", to: "en", action: "formal" as ActionMode },
  { id: "official-app", labelKey: "tarjimon.template.officialApp", from: "uz", to: "ru", action: "formal" as ActionMode },
  { id: "cv-bullets", labelKey: "tarjimon.template.cvBullets", from: "uz", to: "en", action: "formal" as ActionMode },
];

export default function Tarjimon() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // State
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [fromLang, setFromLang] = useState("auto");
  const [toLang, setToLang] = useState("en");
  const [actionMode, setActionMode] = useState<ActionMode>("translate");
  const [status, setStatus] = useState<"idle" | "translating" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Toggles
  const [preserveNames, setPreserveNames] = useState(true);
  const [naturalTranslation, setNaturalTranslation] = useState(true);
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [showBilingual, setShowBilingual] = useState(false);
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // Templates
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Compare mode
  const [showCompare, setShowCompare] = useState(false);
  
  // Refs
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [copied, setCopied] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("tarjimon_history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = useCallback((item: Omit<HistoryItem, "id" | "timestamp">) => {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      timestamp: Date.now(),
    };
    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 10);
      localStorage.setItem("tarjimon_history", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Swap languages
  const handleSwap = () => {
    if (fromLang === "auto") {
      // If from is auto, set from to current "to" and to to previous detected or uz
      setFromLang(toLang);
      setToLang(detectedLang || "uz");
    } else {
      const temp = fromLang;
      setFromLang(toLang);
      setToLang(temp);
    }
    // Also swap text if output exists
    if (outputText) {
      setInputText(outputText);
      setOutputText("");
      setStatus("idle");
    }
  };

  // Translate function
  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    
    setStatus("translating");
    setErrorMessage(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: {
          text: inputText,
          from_language: fromLang,
          to_language: toLang,
          action_mode: actionMode,
          preserve_names: preserveNames,
          natural_translation: naturalTranslation,
          preserve_formatting: preserveFormatting,
          show_bilingual: showBilingual,
        },
      });
      
      if (error) throw error;
      
      if (data?.output_text) {
        setOutputText(data.output_text);
        setDetectedLang(data.detected_language || null);
        setStatus("done");
        
        // Save to history
        saveToHistory({
          input: inputText.slice(0, 100),
          output: data.output_text.slice(0, 100),
          fromLang: data.detected_language || fromLang,
          toLang,
          action: actionMode,
        });
      } else {
        throw new Error("No output received");
      }
    } catch (err: any) {
      console.error("Translation error:", err);
      setStatus("error");
      setErrorMessage(err.message || t("tarjimon.error.generic"));
      toast({
        title: t("tarjimon.error.title"),
        description: err.message || t("tarjimon.error.generic"),
        variant: "destructive",
      });
    }
  }, [inputText, fromLang, toLang, actionMode, preserveNames, naturalTranslation, preserveFormatting, showBilingual, saveToHistory, t, toast]);

  // Auto-translate with debounce
  useEffect(() => {
    if (!autoTranslate || !inputText.trim()) return;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      handleTranslate();
    }, 600);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputText, autoTranslate, handleTranslate]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: t("tarjimon.copied") });
    } catch {
      toast({ title: t("tarjimon.error.copy"), variant: "destructive" });
    }
  };

  // Share
  const handleShare = async () => {
    if (!outputText) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: outputText });
      } catch {}
    } else {
      handleCopy();
    }
  };

  // Paste
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch {
      toast({ title: t("tarjimon.error.paste"), variant: "destructive" });
    }
  };

  // Clear
  const handleClear = () => {
    setInputText("");
    setOutputText("");
    setStatus("idle");
    setErrorMessage(null);
    setDetectedLang(null);
  };

  // Apply template
  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setFromLang(template.from);
    setToLang(template.to);
    setActionMode(template.action);
    setSelectedTemplate(template.id);
    toast({ title: t("tarjimon.templateApplied") });
  };

  // Restore from history
  const restoreFromHistory = (item: HistoryItem) => {
    setInputText(item.input);
    setOutputText(item.output);
    setFromLang(item.fromLang);
    setToLang(item.toLang);
    setActionMode(item.action);
    setHistoryOpen(false);
  };

  // Delete from history
  const deleteFromHistory = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      localStorage.setItem("tarjimon_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Get language name
  const getLangName = (code: string) => {
    const lang = [...POPULAR_LANGUAGES, ...ALL_LANGUAGES].find((l) => l.code === code);
    return lang?.nativeName || lang?.name || code;
  };

  // Action chips
  const actionChips: { mode: ActionMode; labelKey: string; icon?: React.ReactNode }[] = [
    { mode: "translate", labelKey: "tarjimon.action.translate" },
    { mode: "simplify", labelKey: "tarjimon.action.simplify" },
    { mode: "formal", labelKey: "tarjimon.action.formal" },
    { mode: "friendly", labelKey: "tarjimon.action.friendly" },
    { mode: "shorten", labelKey: "tarjimon.action.shorten" },
    { mode: "expand", labelKey: "tarjimon.action.expand" },
    { mode: "grammar", labelKey: "tarjimon.action.grammar" },
    { mode: "explain", labelKey: "tarjimon.action.explain" },
    { mode: "translit", labelKey: "tarjimon.action.translit" },
  ];

  return (
    <>
      <SEO 
        title="Tarjimon" 
        description="Bahor AI Tarjimon - 100+ tilda professional tarjima. O'zbek, ingliz, rus va boshqa tillar."
        url="/translate"
      />
      <div className="min-h-[calc(100dvh-4rem)] md:min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b border-border/50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">{t("tarjimon.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("tarjimon.subtitle")}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Language Selector Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* From Language */}
            <Select value={fromLang} onValueChange={setFromLang}>
              <SelectTrigger className="w-[160px] h-11 text-base">
                <SelectValue placeholder={t("tarjimon.from")} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectGroup>
                  <SelectLabel>{t("tarjimon.popular")}</SelectLabel>
                  {POPULAR_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>{t("tarjimon.allLanguages")}</SelectLabel>
                  {ALL_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Swap Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwap}
              className="shrink-0"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </Button>

            {/* To Language */}
            <Select value={toLang} onValueChange={setToLang}>
              <SelectTrigger className="w-[160px] h-11 text-base">
                <SelectValue placeholder={t("tarjimon.to")} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectGroup>
                  <SelectLabel>{t("tarjimon.popular")}</SelectLabel>
                  {POPULAR_LANGUAGES.filter((l) => l.code !== "auto").map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>{t("tarjimon.allLanguages")}</SelectLabel>
                  {ALL_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Detected language badge */}
            {detectedLang && fromLang === "auto" && (
              <Badge variant="secondary" className="text-xs">
                {t("tarjimon.detected")}: {getLangName(detectedLang)}
              </Badge>
            )}
          </div>

          {/* Text Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input Box */}
            <div className="relative">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t("tarjimon.inputPlaceholder")}
                className="min-h-[200px] text-base resize-none pr-20"
                style={{ fontSize: "16px" }} // Prevent iOS zoom
              />
              <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                {inputText.length} {t("tarjimon.chars")}
              </div>
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePaste}>
                  <ClipboardPaste className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Output Box */}
            <div className="relative">
              <Textarea
                value={outputText}
                readOnly
                placeholder={status === "translating" ? t("tarjimon.translating") : t("tarjimon.outputPlaceholder")}
                className={cn(
                  "min-h-[200px] text-base resize-none pr-20",
                  status === "translating" && "animate-pulse"
                )}
                style={{ fontSize: "16px" }}
              />
              {status === "translating" && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopy}
                  disabled={!outputText}
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleShare}
                  disabled={!outputText}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowCompare(!showCompare)}
                  disabled={!outputText}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Toggles Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Switch
                id="preserve-names"
                checked={preserveNames}
                onCheckedChange={setPreserveNames}
              />
              <Label htmlFor="preserve-names" className="text-xs md:text-sm cursor-pointer">
                {t("tarjimon.toggle.preserveNames")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="natural"
                checked={naturalTranslation}
                onCheckedChange={setNaturalTranslation}
              />
              <Label htmlFor="natural" className="text-xs md:text-sm cursor-pointer">
                {t("tarjimon.toggle.natural")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="format"
                checked={preserveFormatting}
                onCheckedChange={setPreserveFormatting}
              />
              <Label htmlFor="format" className="text-xs md:text-sm cursor-pointer">
                {t("tarjimon.toggle.preserveFormat")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="auto"
                checked={autoTranslate}
                onCheckedChange={setAutoTranslate}
              />
              <Label htmlFor="auto" className="text-xs md:text-sm cursor-pointer">
                {t("tarjimon.toggle.auto")}
              </Label>
            </div>
          </div>

          {/* Action Chips */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t("tarjimon.actions")}</p>
            <div className="flex flex-wrap gap-2">
              {actionChips.map((chip) => (
                <button
                  key={chip.mode}
                  onClick={() => setActionMode(chip.mode)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    actionMode === chip.mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {t(chip.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Translate Button */}
          {!autoTranslate && (
            <Button
              onClick={handleTranslate}
              disabled={!inputText.trim() || status === "translating"}
              className="w-full h-12 text-base"
            >
              {status === "translating" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t("tarjimon.translating")}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t("tarjimon.translateButton")}
                </>
              )}
            </Button>
          )}

          {/* Error with Retry */}
          {status === "error" && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{errorMessage || t("tarjimon.error.generic")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleTranslate}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("tarjimon.retry")}
              </Button>
            </div>
          )}

          {/* Compare View */}
          {showCompare && outputText && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-2">{t("tarjimon.compare")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("tarjimon.original")}</p>
                  <p className="whitespace-pre-wrap">{inputText}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("tarjimon.result")}</p>
                  <p className="whitespace-pre-wrap">{outputText}</p>
                </div>
              </div>
            </div>
          )}

          {/* Templates Section */}
          <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>{t("tarjimon.templates")}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", templatesOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className={cn(
                      "p-3 rounded-lg border text-left text-sm transition-colors",
                      selectedTemplate === tpl.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">{t(tpl.labelKey)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getLangName(tpl.from)} → {getLangName(tpl.to)}
                    </p>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* History Section */}
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  {t("tarjimon.history")}
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", historyOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("tarjimon.noHistory")}
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer flex items-start justify-between gap-2"
                        onClick={() => restoreFromHistory(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.input}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getLangName(item.fromLang)} → {getLangName(item.toLang)} • {new Date(item.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFromHistory(item.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CollapsibleContent>
          </Collapsible>

        </div>
      </div>
    </div>
    </>
  );
}
