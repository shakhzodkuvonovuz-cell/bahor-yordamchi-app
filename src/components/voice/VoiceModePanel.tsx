import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Square, Volume2, VolumeX, MessageSquare, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import { stt, tts, getSpeechCapabilities } from "@/services/speechService";
import bahorLogo from "@/assets/bahor-logo.png";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionComplete?: (text: string) => void;
  onSendMessage?: (text: string) => Promise<string>;
}

// Subtle floating particles
const FloatingParticles = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full bg-primary/20"
          style={{
            left: `${30 + Math.random() * 40}%`,
            top: `${30 + Math.random() * 40}%`,
            animation: `voice-particle-drift ${8 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
            opacity: 0.15 + Math.random() * 0.15,
          }}
        />
      ))}
    </div>
  );
};

// Waveform component
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
      
      const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
      gradient.addColorStop(0, "rgba(0, 199, 177, 0)");
      gradient.addColorStop(0.3, "rgba(0, 199, 177, 0.4)");
      gradient.addColorStop(0.5, "rgba(0, 199, 177, 0.6)");
      gradient.addColorStop(0.7, "rgba(0, 199, 177, 0.4)");
      gradient.addColorStop(1, "rgba(0, 199, 177, 0)");

      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);

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

export default function VoiceModePanel({ isOpen, onClose, onTranscriptionComplete, onSendMessage }: VoiceModeProps) {
  const { t, language } = useTranslation();
  const [state, setState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState(0.3);
  const [transcription, setTranscription] = useState("");
  const [interimTranscription, setInterimTranscription] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [answerPreview, setAnswerPreview] = useState("");
  const [isExiting, setIsExiting] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const finalTranscriptRef = useRef("");

  // Get platform capabilities
  const capabilities = getSpeechCapabilities();

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

  const getErrorText = (errorType: string) => {
    const errors: Record<string, Record<string, string>> = {
      'not-allowed': {
        uz: "Mikrofonga ruxsat berilmadi",
        en: "Microphone permission denied",
        ru: "Доступ к микрофону запрещён",
        tr: "Mikrofon izni reddedildi",
      },
      'no-speech': {
        uz: "Ovoz eshitilmadi",
        en: "No speech detected",
        ru: "Речь не обнаружена",
        tr: "Konuşma algılanmadı",
      },
      default: {
        uz: "Xatolik yuz berdi",
        en: "An error occurred",
        ru: "Произошла ошибка",
        tr: "Bir hata oluştu",
      },
    };
    return errors[errorType]?.[language] || errors.default[language] || errors.default.en;
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
    setError(null);
    finalTranscriptRef.current = "";
    setTranscription("");
    setInterimTranscription("");

    try {
      // Start audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      setState("listening");
      updateAmplitude();

      // Start speech recognition
      const started = await stt.start({
        language,
        onResult: (text, isFinal) => {
          if (isFinal) {
            finalTranscriptRef.current += (finalTranscriptRef.current ? " " : "") + text;
            setTranscription(finalTranscriptRef.current);
            setInterimTranscription("");
          } else {
            setInterimTranscription(text);
          }
        },
        onError: (errorType) => {
          console.error("STT error:", errorType);
          if (errorType !== 'aborted' && errorType !== 'no-speech') {
            setError(getErrorText(errorType));
          }
        },
        onEnd: () => {
          // Speech recognition ended - process if we have text
          if (finalTranscriptRef.current.trim()) {
            processTranscription(finalTranscriptRef.current);
          } else {
            setState("idle");
          }
        },
      });

      if (!started) {
        throw new Error("Failed to start speech recognition");
      }
    } catch (error) {
      console.error("Error starting voice:", error);
      setError(getErrorText('not-allowed'));
      setState("idle");
    }
  };

  const stopListening = () => {
    stt.stop();
    
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
  };

  const processTranscription = async (text: string) => {
    setState("thinking");
    setTranscription(text);
    
    // If we have a message handler, get AI response
    if (onSendMessage) {
      try {
        const response = await onSendMessage(text);
        setAnswerPreview(response);
        setState("speaking");
        
        // Speak the response if not muted
        if (!isMuted) {
          tts.speak({
            text: response,
            language,
            onStart: () => setState("speaking"),
            onEnd: () => {
              if (onTranscriptionComplete) {
                onTranscriptionComplete(text);
              }
              handleClose();
            },
            onError: () => {
              // Even if TTS fails, still complete
              if (onTranscriptionComplete) {
                onTranscriptionComplete(text);
              }
              handleClose();
            },
          });
        } else {
          // If muted, just wait a bit and close
          setTimeout(() => {
            if (onTranscriptionComplete) {
              onTranscriptionComplete(text);
            }
            handleClose();
          }, 2000);
        }
      } catch (error) {
        console.error("Error getting AI response:", error);
        setError(getErrorText('default'));
        setState("idle");
      }
    } else {
      // No message handler - just pass transcription back
      if (onTranscriptionComplete) {
        onTranscriptionComplete(text);
      }
      handleClose();
    }
  };

  const handleClose = () => {
    tts.stop();
    setIsExiting(true);
    setTimeout(() => {
      stopListening();
      setState("idle");
      setTranscription("");
      setInterimTranscription("");
      setAnswerPreview("");
      setError(null);
      setIsExiting(false);
      onClose();
    }, 350);
  };

  const handleToggle = () => {
    setButtonPressed(true);
    setTimeout(() => setButtonPressed(false), 200);

    if (state === "listening") {
      stopListening();
      if (finalTranscriptRef.current.trim() || transcription.trim()) {
        processTranscription(finalTranscriptRef.current || transcription);
      } else {
        setState("idle");
      }
    } else if (state === "idle") {
      startListening();
    } else if (state === "speaking") {
      tts.stop();
      handleClose();
    }
  };

  useEffect(() => {
    return () => {
      stt.abort();
      tts.stop();
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

  const displayTranscription = transcription + (interimTranscription ? (transcription ? " " : "") + interimTranscription : "");

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col overflow-hidden",
        isExiting ? "animate-voice-panel-exit" : "animate-voice-panel-enter"
      )}
    >
      {/* Backdrop blur */}
      <div
        className="absolute inset-0 backdrop-blur-[16px] bg-background/80"
        onClick={handleClose}
      />

      {/* Main content */}
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
            {/* Platform indicator for iOS */}
            {capabilities.needsWhisperFallback && (
              <span className="text-xs text-muted-foreground/50 hidden sm:inline">
                iOS mode
              </span>
            )}
            
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
          <FloatingParticles count={6} />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 40% 30% at center 45%, hsl(var(--primary) / 0.03) 0%, transparent 60%)",
            }}
          />

          {/* Main orb */}
          <div className="relative mb-6">
            <div
              className={cn(
                "absolute inset-[-12px] rounded-full transition-all duration-700",
                state === "idle" && "animate-voice-orb-breathe-idle",
                state === "listening" && "animate-voice-orb-breathe-listening",
                state === "thinking" && "animate-voice-orb-breathe-thinking",
                state === "speaking" && "animate-voice-orb-breathe-speaking"
              )}
              style={{
                background:
                  state === "listening"
                    ? "radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)"
                    : state === "thinking"
                    ? "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)"
                    : state === "speaking"
                    ? "radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)"
                    : "radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)",
              }}
            />

            {state === "thinking" && (
              <div
                className="absolute inset-[-6px] rounded-full border border-primary/30 animate-voice-ring-rotate"
                style={{ borderStyle: "dashed" }}
              />
            )}

            {state === "speaking" && (
              <>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary/50 animate-voice-orbit"
                    style={{
                      animationDelay: `${i * 1}s`,
                      animationDuration: "4s",
                    }}
                  />
                ))}
              </>
            )}

            <div
              className={cn(
                "relative w-[110px] h-[110px] md:w-[130px] md:h-[130px] rounded-full",
                "flex items-center justify-center",
                "transition-all duration-500",
                state === "listening" && "scale-[1.02]"
              )}
              style={{
                background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
                boxShadow:
                  state === "listening"
                    ? "0 0 30px hsl(var(--primary) / 0.25), inset 0 0 15px hsl(var(--primary) / 0.05)"
                    : state === "thinking"
                    ? "0 0 20px hsl(var(--primary) / 0.15), inset 0 0 10px hsl(var(--primary) / 0.03)"
                    : state === "speaking"
                    ? "0 0 25px hsl(var(--primary) / 0.2), inset 0 0 12px hsl(var(--primary) / 0.04)"
                    : "0 0 15px hsl(var(--primary) / 0.1), inset 0 0 8px hsl(var(--primary) / 0.02)",
              }}
            >
              <img
                src={bahorLogo}
                alt="Bahor AI"
                className={cn(
                  "w-12 h-12 md:w-14 md:h-14 object-contain transition-all duration-500",
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

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 animate-voice-fade-in">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Waveform */}
          {state === "listening" && (
            <div className="w-full max-w-xs h-[14px] mb-5 animate-voice-fade-in">
              <VoiceWaveform amplitude={amplitude} isActive={true} />
            </div>
          )}

          {/* Live transcription */}
          {displayTranscription && (
            <div className="w-full max-w-sm mb-4 animate-voice-fade-in">
              <div className="rounded-xl px-4 py-3 bg-card/50 backdrop-blur-sm border border-border/20">
                <p className="text-center text-sm text-foreground/70">
                  {displayTranscription}
                  {state === "listening" && (
                    <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse" />
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Answer preview */}
          {state === "speaking" && answerPreview && (
            <div className="w-full max-w-sm animate-voice-slide-up">
              <div className="rounded-xl p-4 bg-card/60 backdrop-blur-sm border border-border/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <img src={bahorLogo} alt="" className="w-5 h-5 object-contain" />
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">{answerPreview}</p>
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
              {buttonPressed && (
                <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-voice-button-ripple" />
              )}

              {state === "listening" ? (
                <>
                  <Square className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">{getStopText()}</span>
                </>
              ) : state === "speaking" ? (
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
