import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Volume2, VolumeX, MessageSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import VoiceOrb from "./VoiceOrb";
import LiquidWaveform from "./LiquidWaveform";
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
  const [isMuted, setIsMuted] = useState(false);
  const [answerPreview, setAnswerPreview] = useState("");
  const [isExiting, setIsExiting] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  
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
      {/* Deep dark background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 50% 48%, rgba(0,80,70,0.1) 0%, transparent 50%),
            linear-gradient(180deg, #020a09 0%, #051412 50%, #020a09 100%)
          `
        }}
      />

      {/* Soft vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at center 45%, transparent 20%, rgba(0,0,0,0.6) 100%)"
        }}
      />

      {/* Header - minimal integrated icons */}
      <div className="relative z-10 flex items-center justify-between p-3">
        <button
          onClick={handleClose}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300",
            "bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05]",
            "hover:bg-white/[0.06] hover:border-[rgba(0,199,177,0.1)]",
            "text-white/35 hover:text-white/60 text-xs"
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="font-medium hidden sm:inline">{t('voice.switchToText') || 'Matn'}</span>
        </button>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-2 rounded-lg transition-all duration-300",
              "bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05]",
              "hover:bg-white/[0.06]",
              isMuted ? "text-white/20" : "text-white/35 hover:text-[#00c7b1]/80"
            )}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          
          <button
            onClick={handleClose}
            className={cn(
              "p-2 rounded-lg transition-all duration-300",
              "bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05]",
              "hover:bg-white/[0.06] hover:text-white/60",
              "text-white/35"
            )}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main content - perfectly centered with adjusted spacing */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pt-4">
        {/* Voice Orb - moved down slightly */}
        <div className="mb-5">
          <VoiceOrb 
            state={state} 
            amplitude={amplitude}
          />
        </div>

        {/* Glassmorphic text pill - closer to orb */}
        <div className={cn(
          "rounded-full px-6 py-3 mb-5",
          "bg-white/[0.03] backdrop-blur-2xl",
          "border border-white/[0.06]",
          "transition-all duration-500",
          state !== "idle" && "shadow-[0_0_30px_rgba(0,199,177,0.12)]",
          "animate-voice-text-scale-in"
        )}>
          <h2 className={cn(
            "text-xl md:text-2xl font-light tracking-wide text-center",
            "transition-all duration-400",
            state === "listening" && "text-[#00c7b1] animate-voice-text-wiggle",
            state === "thinking" && "text-[#00c7b1]/75",
            state === "speaking" && "text-[#00c7b1]",
            state === "idle" && "text-white/60"
          )}
          style={{
            textShadow: state !== "idle" 
              ? "0 0 25px rgba(0,199,177,0.35)" 
              : "none"
          }}>
            {getStateTitle()}
          </h2>
        </div>
        
        {/* Subtitle - soft and minimal */}
        <p className={cn(
          "text-xs text-white/25 font-light mb-6 transition-all duration-400",
          state === "listening" && "animate-voice-subtitle-float"
        )}>
          {getStateSubtitle()}
        </p>

        {/* Liquid waveform - moved up, thinner */}
        {(state === "listening" || state === "speaking") && (
          <div className="w-full max-w-xs h-12 mb-4 animate-fade-in">
            <LiquidWaveform 
              isActive={state === "listening" || state === "speaking"} 
              amplitude={amplitude}
            />
          </div>
        )}

        {/* Thinking state - compact processing */}
        {state === "thinking" && (
          <div className="w-full max-w-[260px] animate-fade-in">
            <div className={cn(
              "rounded-xl p-3.5",
              "bg-white/[0.02] backdrop-blur-2xl border border-white/[0.04]"
            )}>
              <div className="space-y-2">
                {PROCESSING_STEPS.map((step, index) => (
                  <div 
                    key={step.key}
                    className={cn(
                      "flex items-center gap-2 transition-all duration-300",
                      index < processingStep ? "opacity-100" : "opacity-20"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-[10px]",
                      "transition-all duration-300",
                      index < processingStep 
                        ? "bg-[rgba(0,199,177,0.1)] text-[#00c7b1]" 
                        : "bg-white/[0.03] text-white/30"
                    )}>
                      {index < processingStep ? "✓" : step.icon}
                    </div>
                    
                    <span className={cn(
                      "text-[11px] transition-colors duration-300",
                      index < processingStep ? "text-white/60" : "text-white/25"
                    )}>
                      {t(`voice.step.${step.key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Speaking state - answer */}
        {state === "speaking" && answerPreview && (
          <div className="w-full max-w-sm animate-voice-answer-up">
            <div className={cn(
              "rounded-xl p-3.5",
              "bg-white/[0.02] backdrop-blur-2xl border border-white/[0.04]"
            )}>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded bg-[rgba(0,199,177,0.08)] flex items-center justify-center flex-shrink-0">
                  <img src={bahorLogo} alt="" className="w-4 h-4 object-contain" />
                </div>
                <p className="text-white/60 text-[11px] leading-relaxed">
                  {answerPreview}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live transcription */}
        {transcription && (
          <div className="w-full max-w-xs mt-3 animate-fade-in">
            <div className={cn(
              "rounded-lg px-3 py-2",
              "bg-black/15 backdrop-blur-xl border border-white/[0.02]"
            )}>
              <p className="text-center text-[11px] text-white/40">
                {transcription}
                {state === "listening" && (
                  <span className="inline-block w-0.5 h-2.5 bg-[#00c7b1] ml-1 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom - premium floating mic button */}
      <div className="relative z-10 pb-10 px-5">
        <div className="flex items-center justify-center">
          {/* Floating glowing circle button with ripple */}
          <button
            onClick={handleToggle}
            className={cn(
              "relative p-4 rounded-full transition-all duration-400",
              "bg-[#030d0c]",
              "border border-[rgba(0,199,177,0.25)]",
              buttonPressed ? "scale-90" : "hover:scale-105 active:scale-95",
              state === "listening" 
                ? "shadow-[0_0_40px_rgba(0,199,177,0.35),0_0_20px_rgba(0,199,177,0.2)]" 
                : "shadow-[0_0_25px_rgba(0,199,177,0.15)] hover:shadow-[0_0_35px_rgba(0,199,177,0.25)]"
            )}
          >
            {/* Ripple animation on press */}
            {buttonPressed && (
              <div className="absolute inset-0 rounded-full bg-[#00c7b1]/20 animate-voice-ripple" />
            )}
            
            {/* Animated ring halos */}
            {state === "listening" && (
              <>
                <div className="absolute inset-[-5px] rounded-full border border-[#00c7b1]/35 animate-voice-ring-expand" />
                <div className="absolute inset-[-12px] rounded-full border border-[#00c7b1]/15 animate-voice-ring-expand-delay" />
              </>
            )}
            
            {state === "idle" && (
              <div className="absolute inset-[-3px] rounded-full border border-[#00c7b1]/12 animate-voice-ring-breathe" />
            )}
            
            {state === "listening" ? (
              <Square className="w-5 h-5 text-[#00c7b1] relative z-10" />
            ) : (
              <Mic className="w-5 h-5 text-[#00c7b1]/70 relative z-10" />
            )}
          </button>
        </div>
        
        {/* Bottom hint - very subtle */}
        <p className="text-center text-[9px] text-white/20 mt-4 font-light">
          {state === "listening" ? t('voice.tapToStop') : t('voice.tapToStart')}
        </p>
      </div>
    </div>
  );
}
