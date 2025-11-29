import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Volume2, VolumeX, Type, Square, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import VoiceOrb from "./VoiceOrb";
import FluidWaveform from "./FluidWaveform";
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
        setTimeout(addWord, 180 + Math.random() * 250);
      }
    };
    
    setTimeout(addWord, 400);
  };

  const simulateProcessing = () => {
    setProcessingStep(0);
    
    const stepDuration = 1000;
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
    }, 3500);
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
      const timer = setTimeout(startListening, 500);
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
      isExiting ? "animate-voice-panel-out" : "animate-voice-panel-in"
    )}>
      {/* Premium layered gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 60% at 50% -10%, rgba(0, 100, 90, 0.35) 0%, transparent 50%),
            radial-gradient(ellipse 100% 50% at 50% 110%, rgba(0, 70, 80, 0.25) 0%, transparent 40%),
            radial-gradient(circle at 50% 45%, rgba(0, 180, 160, 0.08) 0%, transparent 40%),
            linear-gradient(180deg, 
              hsl(195, 35%, 5%) 0%, 
              hsl(190, 30%, 7%) 30%,
              hsl(185, 28%, 8%) 60%, 
              hsl(195, 35%, 5%) 100%
            )
          `
        }}
      />

      {/* Ambient floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/15 animate-voice-float-particle"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              left: `${5 + Math.random() * 90}%`,
              top: `${5 + Math.random() * 90}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Soft vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at center, transparent 30%, rgba(0,0,0,0.45) 100%)"
        }}
      />

      {/* Header controls */}
      <div className="relative z-10 flex items-center justify-between p-5 md:p-6">
        <div className="flex items-center gap-3">
          {/* Switch to text mode */}
          <button
            onClick={handleClose}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-400",
              "bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08]",
              "hover:bg-white/[0.1] hover:border-white/[0.15]",
              "text-white/60 hover:text-white/90"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">{t('voice.switchToText')}</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Caption toggle */}
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={cn(
              "p-3 rounded-2xl transition-all duration-400",
              "bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08]",
              "hover:bg-white/[0.1] hover:border-white/[0.15]",
              showCaptions 
                ? "text-primary shadow-[0_0_25px_rgba(0,212,180,0.25)]" 
                : "text-white/50"
            )}
          >
            <Type className="w-4 h-4" />
          </button>
          
          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-3 rounded-2xl transition-all duration-400",
              "bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08]",
              "hover:bg-white/[0.1] hover:border-white/[0.15]",
              isMuted 
                ? "text-red-400 shadow-[0_0_25px_rgba(255,100,100,0.25)]" 
                : "text-white/50"
            )}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          {/* Exit button */}
          <button
            onClick={handleClose}
            className={cn(
              "p-3 rounded-2xl transition-all duration-400",
              "bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08]",
              "hover:bg-red-500/15 hover:border-red-500/25 hover:text-red-400",
              "text-white/60"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-32 md:pb-36">
        {/* Voice Orb - centered focal point */}
        <div className="mb-6 md:mb-8">
          <VoiceOrb 
            state={state} 
            amplitude={amplitude}
          />
        </div>

        {/* State title with smooth transition */}
        <div className="text-center mb-10 md:mb-12">
          <h2 className={cn(
            "text-2xl md:text-3xl lg:text-4xl font-light text-white mb-3",
            "transition-all duration-500 animate-voice-title-in"
          )}>
            {getStateTitle()}
          </h2>
          
          <p className="text-sm md:text-base text-white/45 max-w-sm">
            {getStateSubtitle()}
          </p>
        </div>

        {/* Fluid waveform - visible in listening/speaking states */}
        {(state === "listening" || state === "speaking") && (
          <div className="w-full max-w-xl h-28 md:h-36 lg:h-40 animate-voice-waveform-in">
            <FluidWaveform 
              isActive={state === "listening" || state === "speaking"} 
              amplitude={amplitude}
              state={state}
            />
          </div>
        )}

        {/* Thinking state - mini reasoning bar */}
        {state === "thinking" && (
          <div className="w-full max-w-md animate-voice-slide-up">
            <div className={cn(
              "rounded-3xl p-6",
              "bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08]",
              "shadow-[0_0_60px_rgba(0,180,220,0.08)]"
            )}>
              <div className="space-y-5">
                {PROCESSING_STEPS.map((step, index) => (
                  <div 
                    key={step.key}
                    className={cn(
                      "flex items-center gap-4 transition-all duration-600",
                      index < processingStep ? "opacity-100" : "opacity-35"
                    )}
                  >
                    {/* Step indicator */}
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center text-base",
                      "transition-all duration-600",
                      index < processingStep 
                        ? "bg-primary/20 text-primary shadow-[0_0_25px_rgba(0,212,180,0.35)] scale-105" 
                        : "bg-white/[0.06] text-white/45"
                    )}>
                      {index < processingStep ? (
                        <span className="animate-voice-checkmark-pop">✓</span>
                      ) : (
                        step.icon
                      )}
                    </div>
                    
                    {/* Step text */}
                    <span className={cn(
                      "text-[15px] md:text-base font-medium transition-colors duration-600",
                      index < processingStep ? "text-white" : "text-white/45"
                    )}>
                      {t(`voice.step.${step.key}`)}
                    </span>
                    
                    {/* Activity dots for current step */}
                    {index === processingStep - 1 && processingStep < PROCESSING_STEPS.length && (
                      <div className="flex gap-1.5 ml-auto">
                        {[0, 1, 2].map((dotIndex) => (
                          <div 
                            key={dotIndex}
                            className="w-2 h-2 rounded-full bg-primary animate-voice-dot"
                            style={{ animationDelay: `${dotIndex * 0.15}s` }}
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
          <div className="w-full max-w-lg mt-8 animate-voice-answer-in">
            <div className={cn(
              "rounded-3xl p-6",
              "bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08]",
              "shadow-[0_0_60px_rgba(100,255,150,0.08)]"
            )}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(0,212,180,0.2)]">
                  <img src={bahorLogo} alt="" className="w-6 h-6 object-contain" />
                </div>
                <p className="text-white/90 text-[15px] md:text-base leading-relaxed">
                  {answerPreview}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live transcription display */}
        {showCaptions && transcription && (
          <div className="w-full max-w-lg mt-8 animate-voice-transcription-in">
            <div className={cn(
              "rounded-2xl p-5",
              "bg-black/25 backdrop-blur-xl border border-white/[0.05]"
            )}>
              <p className={cn(
                "text-center text-[15px] md:text-base transition-all duration-400",
                state === "listening" ? "text-white/55" : "text-white font-medium"
              )}>
                {transcription}
                {state === "listening" && (
                  <span className="inline-block w-0.5 h-4 bg-primary ml-1.5 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 pb-12 px-6">
        <div className="flex items-center justify-center">
          {/* Main control button */}
          <button
            onClick={handleToggle}
            className={cn(
              "relative p-8 rounded-full transition-all duration-500",
              "hover:scale-105 active:scale-95",
              state === "listening" 
                ? "bg-gradient-to-br from-red-500/85 to-red-600/70 shadow-[0_0_80px_rgba(255,100,100,0.45)]" 
                : "bg-gradient-to-br from-primary/85 to-primary/65 shadow-[0_0_80px_rgba(0,212,180,0.45)]"
            )}
          >
            {/* Animated glow rings */}
            {state === "listening" && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/25 animate-voice-pulse-ring" />
                <div className="absolute inset-[-14px] rounded-full bg-red-500/15 animate-voice-pulse-ring-delayed" />
                <div className="absolute inset-[-28px] rounded-full bg-red-500/8 animate-voice-pulse-ring-outer" />
              </>
            )}
            
            {state === "idle" && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/25 animate-voice-glow-ring" />
                <div className="absolute inset-[-10px] rounded-full bg-primary/15 animate-voice-glow-ring-delayed" />
              </>
            )}
            
            {state === "listening" ? (
              <Square className="w-8 h-8 text-white relative z-10" fill="currentColor" />
            ) : (
              <Mic className="w-8 h-8 text-white relative z-10" />
            )}
          </button>
        </div>
        
        {/* Hint text */}
        <p className="text-center text-sm text-white/35 mt-6 font-light">
          {state === "listening" ? t('voice.tapToStop') : t('voice.tapToStart')}
        </p>
      </div>
    </div>
  );
}
