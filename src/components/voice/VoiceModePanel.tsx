import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Square, Volume2, VolumeX, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionComplete?: (text: string) => void;
}

// Floating particles component
const FloatingParticles = ({ count = 10 }: { count?: number }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
            animation: `voice-particle-drift ${6 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
            opacity: 0.2 + Math.random() * 0.3,
          }}
        />
      ))}
    </div>
  );
};

// Waveform component - soft flowing animation
const VoiceWaveform = ({ amplitude = 0.5, isActive = false }: { amplitude?: number; isActive?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      if (!isActive) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      phaseRef.current += 0.02;
      const phase = phaseRef.current;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
      gradient.addColorStop(0, "rgba(0, 199, 177, 0)");
      gradient.addColorStop(0.3, "rgba(0, 199, 177, 0.4)");
      gradient.addColorStop(0.5, "rgba(0, 199, 177, 0.6)");
      gradient.addColorStop(0.7, "rgba(0, 199, 177, 0.4)");
      gradient.addColorStop(1, "rgba(0, 199, 177, 0)");

      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);

      // Draw smooth wave
      for (let x = 0; x <= rect.width; x += 2) {
        const normalizedX = x / rect.width;
        const waveHeight = Math.sin(normalizedX * Math.PI * 3 + phase) * 
                          Math.sin(normalizedX * Math.PI) * 
                          (amplitude * 8 + 4);
        ctx.lineTo(x, rect.height / 2 + waveHeight);
      }

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.filter = "blur(1px)";
      ctx.stroke();

      // Draw glow layer
      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);
      for (let x = 0; x <= rect.width; x += 2) {
        const normalizedX = x / rect.width;
        const waveHeight = Math.sin(normalizedX * Math.PI * 3 + phase) * 
                          Math.sin(normalizedX * Math.PI) * 
                          (amplitude * 8 + 4);
        ctx.lineTo(x, rect.height / 2 + waveHeight);
      }
      ctx.strokeStyle = "rgba(0, 199, 177, 0.2)";
      ctx.lineWidth = 6;
      ctx.filter = "blur(4px)";
      ctx.stroke();

      ctx.filter = "none";
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [amplitude, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default function VoiceModePanel({ isOpen, onClose, onTranscriptionComplete }: VoiceModeProps) {
  const { t, language } = useTranslation();
  const [state, setState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState(0.3);
  const [transcription, setTranscription] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [answerPreview, setAnswerPreview] = useState("");
  const [isExiting, setIsExiting] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Localized state text
  const getStateText = () => {
    const texts: Record<string, Record<VoiceState, string>> = {
      uz: { idle: "", listening: "Tinglayapti…", thinking: "Bahor AI fikrlamoqda…", speaking: "Bahor AI javob bermoqda…" },
      en: { idle: "", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…" },
      ru: { idle: "", listening: "Слушаю…", thinking: "Думаю…", speaking: "Отвечаю…" },
      tr: { idle: "", listening: "Dinleniyor…", thinking: "Düşünüyor…", speaking: "Cevaplıyor…" },
    };
    return texts[language]?.[state] || texts.en[state];
  };

  const getStopText = () => {
    const texts: Record<string, string> = {
      uz: "To'xtatish",
      en: "Stop",
      ru: "Стоп",
      tr: "Durdur",
    };
    return texts[language] || texts.en;
  };

  const updateAmplitude = useCallback(() => {
    if (analyserRef.current && state === "listening") {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedAmplitude = Math.min(1, average / 128);
      setAmplitude(normalizedAmplitude * 0.7 + 0.3);
    }
    animationFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, [state]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      setState("listening");
      setTranscription("");
      updateAmplitude();
      simulateSpeechRecognition();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopListening = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (state === "listening" && transcription.trim()) {
      setState("thinking");
      simulateProcessing();
    } else {
      setState("idle");
    }
  };

  const simulateSpeechRecognition = () => {
    const demoTexts: Record<string, string[]> = {
      uz: ["Salom, bugun menga qanday yordam bera olasiz?", "Ingliz tilida essay yozishga yordam bering"],
      en: ["Hello, how can you help me today?", "Help me write an essay in English"],
      ru: ["Привет, как ты можешь мне помочь сегодня?", "Помоги мне написать эссе на английском"],
      tr: ["Merhaba, bugün bana nasıl yardımcı olabilirsin?", "İngilizce bir makale yazmama yardım et"],
    };

    const texts = demoTexts[language] || demoTexts.en;
    const fullText = texts[Math.floor(Math.random() * texts.length)];
    const words = fullText.split(" ");
    let currentText = "";
    let wordIndex = 0;

    const addWord = () => {
      if (wordIndex < words.length && state === "listening") {
        currentText += (currentText ? " " : "") + words[wordIndex];
        setTranscription(currentText);
        wordIndex++;
        setTimeout(addWord, 160 + Math.random() * 200);
      }
    };

    setTimeout(addWord, 350);
  };

  const simulateProcessing = () => {
    setTimeout(() => {
      setState("speaking");
      simulateAnswer();
    }, 2000);
  };

  const simulateAnswer = () => {
    const answers: Record<string, string> = {
      uz: "Albatta! Essay mavzusi nima bo'ladi? Men sizga tuzilma, kirish, asosiy qism va xulosa yozishda yordam beraman.",
      en: "Of course! What topic would you like? I can help you with structure, introduction, body, and conclusion.",
      ru: "Конечно! Какую тему вы хотите? Я помогу вам со структурой, введением, основной частью и заключением.",
      tr: "Tabii! Hangi konuyu tercih edersiniz? Yapı, giriş, ana bölüm ve sonuç konusunda yardımcı olabilirim.",
    };

    setAnswerPreview(answers[language] || answers.en);

    setTimeout(() => {
      if (onTranscriptionComplete && transcription.trim()) {
        onTranscriptionComplete(transcription);
      }
      handleClose();
    }, 3000);
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      stopListening();
      setState("idle");
      setTranscription("");
      setAnswerPreview("");
      setIsExiting(false);
      onClose();
    }, 350);
  };

  const handleToggle = () => {
    setButtonPressed(true);
    setTimeout(() => setButtonPressed(false), 200);

    if (state === "listening") {
      stopListening();
    } else if (state === "idle") {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (isOpen && state === "idle") {
      const timer = setTimeout(startListening, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col overflow-hidden",
        isExiting ? "animate-voice-panel-exit" : "animate-voice-panel-enter"
      )}
    >
      {/* Backdrop blur over chat */}
      <div
        className="absolute inset-0 backdrop-blur-[16px] bg-background/80"
        onClick={handleClose}
      />

      {/* Main content container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleClose}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300",
              "bg-card/50 backdrop-blur-sm border border-border/30",
              "hover:bg-card/70 hover:border-primary/20",
              "text-muted-foreground hover:text-foreground text-sm"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">
              {language === "uz" ? "Matn" : language === "ru" ? "Текст" : language === "tr" ? "Metin" : "Text"}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "p-2.5 rounded-xl transition-all duration-300",
                "bg-card/50 backdrop-blur-sm border border-border/30",
                "hover:bg-card/70",
                isMuted ? "text-muted-foreground/50" : "text-muted-foreground hover:text-primary"
              )}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleClose}
              className={cn(
                "p-2.5 rounded-xl transition-all duration-300",
                "bg-card/50 backdrop-blur-sm border border-border/30",
                "hover:bg-card/70 hover:text-foreground",
                "text-muted-foreground"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main interaction zone */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Floating particles */}
          <FloatingParticles count={10} />

          {/* Radial gradient depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 50% 40% at center 45%, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
            }}
          />

          {/* Main orb container */}
          <div className="relative mb-8">
            {/* Breathing glow background */}
            <div
              className={cn(
                "absolute inset-[-30px] rounded-full transition-all duration-700",
                state === "idle" && "animate-voice-orb-breathe-idle",
                state === "listening" && "animate-voice-orb-breathe-listening",
                state === "thinking" && "animate-voice-orb-breathe-thinking",
                state === "speaking" && "animate-voice-orb-breathe-speaking"
              )}
              style={{
                background:
                  state === "listening"
                    ? "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)"
                    : state === "thinking"
                    ? "radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)"
                    : state === "speaking"
                    ? "radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, transparent 70%)"
                    : "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
              }}
            />

            {/* Rotating thin ring (thinking state) */}
            {state === "thinking" && (
              <div
                className="absolute inset-[-8px] rounded-full border border-primary/40 animate-voice-ring-rotate"
                style={{ borderStyle: "dashed" }}
              />
            )}

            {/* Orbiting particles (speaking state) */}
            {state === "speaking" && (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary/60 animate-voice-orbit"
                    style={{
                      animationDelay: `${i * 0.75}s`,
                      animationDuration: "3s",
                    }}
                  />
                ))}
              </>
            )}

            {/* Main circle */}
            <div
              className={cn(
                "relative w-[110px] h-[110px] md:w-[150px] md:h-[150px] rounded-full",
                "flex items-center justify-center",
                "transition-all duration-500",
                state === "listening" && "scale-[1.03]"
              )}
              style={{
                background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
                boxShadow:
                  state === "listening"
                    ? "0 0 60px hsl(var(--primary) / 0.35), 0 0 30px hsl(var(--primary) / 0.2), inset 0 0 30px hsl(var(--primary) / 0.05)"
                    : state === "thinking"
                    ? "0 0 40px hsl(var(--primary) / 0.2), inset 0 0 20px hsl(var(--primary) / 0.03)"
                    : state === "speaking"
                    ? "0 0 50px hsl(var(--primary) / 0.3), 0 0 25px hsl(var(--primary) / 0.15), inset 0 0 25px hsl(var(--primary) / 0.05)"
                    : "0 0 30px hsl(var(--primary) / 0.15), inset 0 0 15px hsl(var(--primary) / 0.02)",
              }}
            >
              {/* Bahor AI Logo */}
              <img
                src={bahorLogo}
                alt="Bahor AI"
                className={cn(
                  "w-14 h-14 md:w-20 md:h-20 object-contain transition-all duration-500",
                  state === "listening" && "animate-voice-logo-glow"
                )}
              />
            </div>
          </div>

          {/* State text */}
          {state !== "idle" && (
            <div className="mb-4 animate-voice-fade-in">
              <p
                className={cn(
                  "text-base md:text-lg font-medium text-center transition-all duration-300",
                  state === "listening" && "text-primary animate-voice-text-glow",
                  state === "thinking" && "text-muted-foreground",
                  state === "speaking" && "text-primary"
                )}
              >
                {getStateText()}
              </p>
            </div>
          )}

          {/* Waveform (listening only) */}
          {state === "listening" && (
            <div className="w-full max-w-sm h-[18px] mb-6 animate-voice-fade-in">
              <VoiceWaveform amplitude={amplitude} isActive={true} />
            </div>
          )}

          {/* Live transcription */}
          {transcription && (
            <div className="w-full max-w-sm mb-4 animate-voice-fade-in">
              <div className="rounded-xl px-4 py-3 bg-card/50 backdrop-blur-sm border border-border/20">
                <p className="text-center text-sm text-foreground/70">
                  {transcription}
                  {state === "listening" && (
                    <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse" />
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Answer preview (speaking state) */}
          {state === "speaking" && answerPreview && (
            <div className="w-full max-w-sm animate-voice-slide-up">
              <div className="rounded-xl p-4 bg-card/60 backdrop-blur-sm border border-border/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <img src={bahorLogo} alt="" className="w-5 h-5 object-contain" />
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{answerPreview}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom - Stop button */}
        <div className="pb-10 px-6">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleToggle}
              className={cn(
                "relative flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-300",
                "bg-card/60 backdrop-blur-sm",
                "border border-primary/30",
                "hover:border-primary/50 hover:bg-card/80",
                "active:scale-95",
                buttonPressed && "scale-95"
              )}
              style={{
                boxShadow: "0 0 20px hsl(var(--primary) / 0.1)",
              }}
            >
              {/* Ripple effect */}
              {buttonPressed && (
                <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-voice-button-ripple" />
              )}

              {state === "listening" ? (
                <>
                  <Square className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">{getStopText()}</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 text-primary/70" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {language === "uz" ? "Boshlash" : language === "ru" ? "Начать" : language === "tr" ? "Başla" : "Start"}
                  </span>
                </>
              )}
            </button>

            {/* Hint text */}
            <p className="text-xs text-muted-foreground/50">
              {state === "listening"
                ? language === "uz"
                  ? "To'xtatish uchun bosing"
                  : language === "ru"
                  ? "Нажмите, чтобы остановить"
                  : language === "tr"
                  ? "Durdurmak için basın"
                  : "Tap to stop"
                : language === "uz"
                ? "Boshlash uchun bosing"
                : language === "ru"
                ? "Нажмите, чтобы начать"
                : language === "tr"
                ? "Başlamak için basın"
                : "Tap to start"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
