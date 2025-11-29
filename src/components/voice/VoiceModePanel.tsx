import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Volume2, VolumeX, MessageSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import VoiceOrb from "./VoiceOrb";
import bahorLogo from "@/assets/bahor-logo.png";

export type VoiceState = "listening" | "thinking" | "speaking" | "idle";

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionComplete?: (text: string) => void;
}

const PROCESSING_STEPS = [
  { key: "transcribing", icon: "🎙️" },
  { key: "analyzing", icon: "🧠" },
  { key: "preparing", icon: "✨" },
];

export default function VoiceModePanel({ isOpen, onClose, onTranscriptionComplete }: VoiceModeProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState(0.3);
  const [transcription, setTranscription] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [answerPreview, setAnswerPreview] = useState("");
  const [isExiting, setIsExiting] = useState(false);
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

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
      streamRef.current.getTracks().forEach(track => track.stop());
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
    const demoTexts = [
      t('voice.demo.greeting'),
      t('voice.demo.question'),
    ];
    
    let currentText = "";
    const fullText = demoTexts[Math.floor(Math.random() * demoTexts.length)];
    const words = fullText.split(" ");
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
    setProcessingStep(0);
    
    const stepDuration = 900;
    PROCESSING_STEPS.forEach((_, index) => {
      setTimeout(() => {
        setProcessingStep(index + 1);
        
        if (index === PROCESSING_STEPS.length - 1) {
          setTimeout(() => {
            setState("speaking");
            simulateAnswer();
          }, stepDuration);
        }
      }, index * stepDuration);
    });
  };

  const simulateAnswer = () => {
    const answer = t('voice.demo.answer');
    setAnswerPreview(answer);
    
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
      setProcessingStep(0);
      setAnswerPreview("");
      setIsExiting(false);
      onClose();
    }, 400);
  };

  const handleToggle = () => {
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
      const timer = setTimeout(startListening, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStateTitle = () => {
    switch (state) {
      case "listening": return t('voice.state.listening');
      case "thinking": return t('voice.state.thinking');
      case "speaking": return t('voice.state.speaking');
      default: return t('voice.tapToSpeak');
    }
  };

  const getStateSubtitle = () => {
    switch (state) {
      case "listening": return t('voice.state.listening.sub');
      case "thinking": return t('voice.state.thinking.sub');
      case "speaking": return t('voice.state.speaking.sub');
      default: return t('voice.readyToListen');
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col overflow-hidden",
      isExiting ? "animate-voice-exit" : "animate-voice-enter"
    )}>
      {/* Premium dark gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% 40%, rgba(0,100,90,0.15) 0%, transparent 60%),
            radial-gradient(circle at 50% 50%, rgba(0,120,110,0.08) 0%, transparent 40%),
            linear-gradient(180deg, 
              hsl(190,45%,3%) 0%, 
              hsl(185,40%,5%) 50%,
              hsl(190,45%,3%) 100%
            )
          `
        }}
      />

      {/* Soft vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at center, transparent 30%, rgba(0,0,0,0.6) 100%)"
        }}
      />

      {/* Header - glassmorphism controls */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-5">
        <button
          onClick={handleClose}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300",
            "bg-white/[0.04] backdrop-blur-xl border border-white/[0.06]",
            "hover:bg-white/[0.08] hover:border-[rgba(0,224,200,0.15)]",
            "text-white/50 hover:text-white/80"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">{t('voice.switchToText') || 'Matn rejimi'}</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300",
              "bg-white/[0.04] backdrop-blur-xl border border-white/[0.06]",
              "hover:bg-white/[0.08]",
              isMuted ? "text-white/30" : "text-white/50 hover:text-[#00E0C8]"
            )}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleClose}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300",
              "bg-white/[0.04] backdrop-blur-xl border border-white/[0.06]",
              "hover:bg-white/[0.08] hover:text-white/80",
              "text-white/50"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content - centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5">
        {/* Voice Orb */}
        <div className="mb-8 md:mb-10">
          <VoiceOrb 
            state={state} 
            amplitude={amplitude}
          />
        </div>

        {/* Glassmorphic text panel */}
        <div className={cn(
          "rounded-2xl px-8 py-5 mb-6",
          "bg-white/[0.03] backdrop-blur-xl border border-white/[0.05]",
          "transition-all duration-500"
        )}>
          <h2 className={cn(
            "text-2xl md:text-3xl font-light text-center mb-2 tracking-wide",
            "transition-all duration-500",
            state === "listening" && "text-[#00E0C8]",
            state === "thinking" && "text-[#00C8DC]",
            state === "speaking" && "text-[#50FFDC]",
            state === "idle" && "text-white/80"
          )}
          style={{
            textShadow: state !== "idle" ? "0 0 30px rgba(0,224,200,0.3)" : "none"
          }}>
            {getStateTitle()}
          </h2>
          
          <p className="text-sm md:text-base text-white/35 text-center font-light">
            {getStateSubtitle()}
          </p>
        </div>

        {/* Thinking state - processing card */}
        {state === "thinking" && (
          <div className="w-full max-w-sm animate-fade-in">
            <div className={cn(
              "rounded-2xl p-5",
              "bg-white/[0.03] backdrop-blur-xl border border-white/[0.05]"
            )}>
              <div className="space-y-3">
                {PROCESSING_STEPS.map((step, index) => (
                  <div 
                    key={step.key}
                    className={cn(
                      "flex items-center gap-3 transition-all duration-400",
                      index < processingStep ? "opacity-100" : "opacity-30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                      "transition-all duration-400",
                      index < processingStep 
                        ? "bg-[rgba(0,224,200,0.12)] text-[#00E0C8]" 
                        : "bg-white/[0.04] text-white/40"
                    )}>
                      {index < processingStep ? "✓" : step.icon}
                    </div>
                    
                    <span className={cn(
                      "text-sm transition-colors duration-400",
                      index < processingStep ? "text-white/80" : "text-white/35"
                    )}>
                      {t(`voice.step.${step.key}`)}
                    </span>
                    
                    {index === processingStep - 1 && processingStep < PROCESSING_STEPS.length && (
                      <div className="flex gap-1 ml-auto">
                        {[0, 1, 2].map((d) => (
                          <div 
                            key={d}
                            className="w-1 h-1 rounded-full bg-[#00E0C8] animate-pulse"
                            style={{ animationDelay: `${d * 0.15}s` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Speaking state - answer preview */}
        {state === "speaking" && answerPreview && (
          <div className="w-full max-w-md animate-fade-in">
            <div className={cn(
              "rounded-2xl p-5",
              "bg-white/[0.03] backdrop-blur-xl border border-white/[0.05]"
            )}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(0,224,200,0.1)] flex items-center justify-center flex-shrink-0">
                  <img src={bahorLogo} alt="" className="w-5 h-5 object-contain" />
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  {answerPreview}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live transcription */}
        {showCaptions && transcription && (
          <div className="w-full max-w-md mt-4 animate-fade-in">
            <div className={cn(
              "rounded-xl px-4 py-3",
              "bg-black/20 backdrop-blur-lg border border-white/[0.03]"
            )}>
              <p className="text-center text-sm text-white/50">
                {transcription}
                {state === "listening" && (
                  <span className="inline-block w-0.5 h-3 bg-[#00E0C8] ml-1 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 pb-10 md:pb-12 px-5">
        <div className="flex items-center justify-center">
          {/* Main mic/stop button - glass with turquoise accent */}
          <button
            onClick={handleToggle}
            className={cn(
              "relative p-5 rounded-full transition-all duration-400",
              "hover:scale-105 active:scale-95",
              "bg-white/[0.06] backdrop-blur-xl",
              "border-2",
              state === "listening" 
                ? "border-[#00E0C8] shadow-[0_0_40px_rgba(0,224,200,0.3)]" 
                : "border-white/10 hover:border-[rgba(0,224,200,0.3)] shadow-[0_0_30px_rgba(0,224,200,0.15)]"
            )}
          >
            {/* Soft expanding halo */}
            {state === "listening" && (
              <>
                <div className="absolute inset-[-4px] rounded-full border border-[rgba(0,224,200,0.3)] animate-ping opacity-40" />
                <div className="absolute inset-[-12px] rounded-full border border-[rgba(0,224,200,0.15)] animate-ping opacity-20" style={{ animationDelay: '0.2s' }} />
              </>
            )}
            
            {state === "listening" ? (
              <Square className="w-6 h-6 text-[#00E0C8] relative z-10" />
            ) : (
              <Mic className="w-6 h-6 text-white/70 relative z-10" />
            )}
          </button>
        </div>
        
        {/* Bottom hint - glassmorphic */}
        <div className="flex justify-center mt-5">
          <div className={cn(
            "px-4 py-2 rounded-lg",
            "bg-white/[0.02] backdrop-blur-lg border border-white/[0.03]"
          )}>
            <p className="text-xs text-white/30 font-light">
              {state === "listening" ? t('voice.tapToStop') : t('voice.tapToStart')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
