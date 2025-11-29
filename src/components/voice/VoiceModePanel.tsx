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
  const [micExpanded, setMicExpanded] = useState(false);
  
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
      setMicExpanded(true);
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
      setMicExpanded(false);
    }
  };

  const stopListening = () => {
    setMicExpanded(false);
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
      {/* Deep dark background - #020b0a */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 70% at 50% 45%, rgba(0,100,90,0.12) 0%, transparent 55%),
            linear-gradient(180deg, #020b0a 0%, #061614 50%, #020b0a 100%)
          `
        }}
      />

      {/* Soft vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 65% 55% at center, transparent 25%, rgba(0,0,0,0.65) 100%)"
        }}
      />

      {/* Header - small integrated icons */}
      <div className="relative z-10 flex items-center justify-between p-3 md:p-4">
        <button
          onClick={handleClose}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300",
            "bg-white/[0.03] backdrop-blur-2xl border border-white/[0.04]",
            "hover:bg-white/[0.06] hover:border-[rgba(0,199,177,0.12)]",
            "text-white/40 hover:text-white/70 text-xs"
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
              "bg-white/[0.03] backdrop-blur-2xl border border-white/[0.04]",
              "hover:bg-white/[0.06]",
              isMuted ? "text-white/25" : "text-white/40 hover:text-[#00c7b1]"
            )}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          
          <button
            onClick={handleClose}
            className={cn(
              "p-2 rounded-lg transition-all duration-300",
              "bg-white/[0.03] backdrop-blur-2xl border border-white/[0.04]",
              "hover:bg-white/[0.06] hover:text-white/70",
              "text-white/40"
            )}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main content - centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5">
        {/* Voice Orb with intelligent particle ring */}
        <div className="mb-6 md:mb-8">
          <VoiceOrb 
            state={state} 
            amplitude={amplitude}
          />
        </div>

        {/* Floating text - no box, glass blur behind, wiggle animation */}
        <div className="text-center mb-4 md:mb-6">
          <h2 className={cn(
            "text-2xl md:text-3xl font-light tracking-wide mb-2",
            "transition-all duration-400",
            state === "listening" && "text-[#00c7b1] animate-voice-text-wiggle",
            state === "thinking" && "text-[#00c7b1]/80",
            state === "speaking" && "text-[#00c7b1]",
            state === "idle" && "text-white/70"
          )}
          style={{
            textShadow: state !== "idle" 
              ? "0 0 40px rgba(0,199,177,0.4), 0 0 80px rgba(0,199,177,0.2)" 
              : "none"
          }}>
            {getStateTitle()}
          </h2>
          
          <p className={cn(
            "text-sm text-white/30 font-light transition-all duration-400",
            state === "listening" && "animate-voice-subtitle-float"
          )}>
            {getStateSubtitle()}
          </p>
        </div>

        {/* Liquid waveform - smooth neon wave */}
        {(state === "listening" || state === "speaking") && (
          <div className="w-full max-w-md h-16 md:h-20 mb-4 animate-fade-in">
            <LiquidWaveform 
              isActive={state === "listening" || state === "speaking"} 
              amplitude={amplitude}
            />
          </div>
        )}

        {/* Thinking state - processing steps */}
        {state === "thinking" && (
          <div className="w-full max-w-xs animate-fade-in">
            <div className={cn(
              "rounded-xl p-4",
              "bg-white/[0.02] backdrop-blur-2xl border border-white/[0.04]"
            )}>
              <div className="space-y-2.5">
                {PROCESSING_STEPS.map((step, index) => (
                  <div 
                    key={step.key}
                    className={cn(
                      "flex items-center gap-2.5 transition-all duration-300",
                      index < processingStep ? "opacity-100" : "opacity-25"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center text-xs",
                      "transition-all duration-300",
                      index < processingStep 
                        ? "bg-[rgba(0,199,177,0.12)] text-[#00c7b1]" 
                        : "bg-white/[0.03] text-white/35"
                    )}>
                      {index < processingStep ? "✓" : step.icon}
                    </div>
                    
                    <span className={cn(
                      "text-xs transition-colors duration-300",
                      index < processingStep ? "text-white/70" : "text-white/30"
                    )}>
                      {t(`voice.step.${step.key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Speaking state - answer preview */}
        {state === "speaking" && answerPreview && (
          <div className="w-full max-w-sm animate-voice-answer-up">
            <div className={cn(
              "rounded-xl p-4",
              "bg-white/[0.02] backdrop-blur-2xl border border-white/[0.04]"
            )}>
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[rgba(0,199,177,0.1)] flex items-center justify-center flex-shrink-0">
                  <img src={bahorLogo} alt="" className="w-4 h-4 object-contain" />
                </div>
                <p className="text-white/70 text-xs leading-relaxed">
                  {answerPreview}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live transcription */}
        {transcription && (
          <div className="w-full max-w-sm mt-3 animate-fade-in">
            <div className={cn(
              "rounded-lg px-3 py-2",
              "bg-black/20 backdrop-blur-xl border border-white/[0.02]"
            )}>
              <p className="text-center text-xs text-white/45">
                {transcription}
                {state === "listening" && (
                  <span className="inline-block w-0.5 h-3 bg-[#00c7b1] ml-1 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom - premium mic button */}
      <div className="relative z-10 pb-8 md:pb-10 px-5">
        <div className="flex items-center justify-center">
          {/* Mic button with expansion animation and turquoise glow */}
          <button
            onClick={handleToggle}
            className={cn(
              "relative rounded-full transition-all duration-500",
              "hover:scale-105 active:scale-95",
              "bg-[#020b0a]",
              "border-2 border-[#00c7b1]/30",
              micExpanded ? "p-6" : "p-5",
              state === "listening" 
                ? "shadow-[0_0_50px_rgba(0,199,177,0.4),0_0_25px_rgba(0,199,177,0.3)]" 
                : "shadow-[0_0_30px_rgba(0,199,177,0.2)] hover:shadow-[0_0_40px_rgba(0,199,177,0.3)]"
            )}
          >
            {/* Animated ring halo */}
            {state === "listening" && (
              <>
                <div className="absolute inset-[-6px] rounded-full border border-[#00c7b1]/40 animate-voice-ring-expand" />
                <div className="absolute inset-[-14px] rounded-full border border-[#00c7b1]/20 animate-voice-ring-expand-delay" />
              </>
            )}
            
            {state === "idle" && (
              <div className="absolute inset-[-4px] rounded-full border border-[#00c7b1]/15 animate-voice-ring-breathe" />
            )}
            
            {state === "listening" ? (
              <Square className="w-5 h-5 text-[#00c7b1] relative z-10" />
            ) : (
              <Mic className="w-5 h-5 text-[#00c7b1]/80 relative z-10" />
            )}
          </button>
        </div>
        
        {/* Bottom hint */}
        <p className="text-center text-[10px] text-white/25 mt-4 font-light">
          {state === "listening" ? t('voice.tapToStop') : t('voice.tapToStart')}
        </p>
      </div>
    </div>
  );
}
