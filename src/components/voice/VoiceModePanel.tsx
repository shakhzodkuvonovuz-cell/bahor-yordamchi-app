import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Volume2, VolumeX, MessageSquare, Square } from "lucide-react";
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
    }, 450);
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
      {/* Dark nebula gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 70% at 50% 0%, rgba(0,100,90,0.25) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,80,100,0.2) 0%, transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(0,120,110,0.06) 0%, transparent 50%),
            linear-gradient(180deg, 
              hsl(190,40%,4%) 0%, 
              hsl(185,35%,6%) 35%,
              hsl(180,30%,7%) 65%, 
              hsl(190,40%,4%) 100%
            )
          `
        }}
      />

      {/* Subtle Uzbek-inspired geometric pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2300E0C8' stroke-width='0.5'%3E%3Cpath d='M30 5 L55 30 L30 55 L5 30 Z'/%3E%3Ccircle cx='30' cy='30' r='10'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Soft vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 65% 55% at center, transparent 25%, rgba(0,0,0,0.5) 100%)"
        }}
      />

      {/* Header controls - glassmorphism style */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-5">
        <div className="flex items-center gap-2">
          {/* Switch to text mode */}
          <button
            onClick={handleClose}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-350",
              "bg-white/[0.05] backdrop-blur-xl border border-white/[0.08]",
              "hover:bg-white/[0.1] hover:border-[rgba(0,224,200,0.2)]",
              "text-white/60 hover:text-white/90"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">{t('voice.switchToText') || 'Matn rejimi'}</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Speaker toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-350",
              "bg-white/[0.05] backdrop-blur-xl border border-white/[0.08]",
              "hover:bg-white/[0.1] hover:border-white/[0.15]",
              isMuted 
                ? "text-red-400 border-red-400/20" 
                : "text-white/50 hover:text-[#00E0C8]"
            )}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          {/* Exit button */}
          <button
            onClick={handleClose}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-350",
              "bg-white/[0.05] backdrop-blur-xl border border-white/[0.08]",
              "hover:bg-red-500/15 hover:border-red-500/25 hover:text-red-400",
              "text-white/50"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content - vertically centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5">
        {/* Voice Orb - 3 layer AI core */}
        <div className="mb-4 md:mb-6">
          <VoiceOrb 
            state={state} 
            amplitude={amplitude}
          />
        </div>

        {/* State text with refined typography */}
        <div className="text-center mb-6 md:mb-8 animate-voice-text-in">
          <h2 className={cn(
            "text-2xl md:text-3xl font-light text-white mb-2 tracking-wide",
            "transition-all duration-500"
          )}>
            {getStateTitle()}
          </h2>
          
          <p className="text-sm md:text-base text-white/40 max-w-xs font-light">
            {getStateSubtitle()}
          </p>
        </div>

        {/* Floating curved waveform - under the orb */}
        {(state === "listening" || state === "speaking") && (
          <div className="w-full max-w-md h-20 md:h-24 animate-voice-waveform-float">
            <FluidWaveform 
              isActive={state === "listening" || state === "speaking"} 
              amplitude={amplitude}
              state={state}
            />
          </div>
        )}

        {/* Thinking state - mini reasoning bar */}
        {state === "thinking" && (
          <div className="w-full max-w-sm animate-voice-card-in">
            <div className={cn(
              "rounded-2xl p-5",
              "bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]",
              "shadow-[0_0_50px_rgba(0,200,220,0.06)]"
            )}>
              <div className="space-y-4">
                {PROCESSING_STEPS.map((step, index) => (
                  <div 
                    key={step.key}
                    className={cn(
                      "flex items-center gap-3.5 transition-all duration-500",
                      index < processingStep ? "opacity-100" : "opacity-30"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center text-sm",
                      "transition-all duration-500",
                      index < processingStep 
                        ? "bg-[rgba(0,224,200,0.15)] text-[#00E0C8] shadow-[0_0_20px_rgba(0,224,200,0.3)] scale-105" 
                        : "bg-white/[0.05] text-white/40"
                    )}>
                      {index < processingStep ? (
                        <span className="animate-voice-check">✓</span>
                      ) : (
                        step.icon
                      )}
                    </div>
                    
                    <span className={cn(
                      "text-[14px] font-medium transition-colors duration-500",
                      index < processingStep ? "text-white/90" : "text-white/40"
                    )}>
                      {t(`voice.step.${step.key}`)}
                    </span>
                    
                    {index === processingStep - 1 && processingStep < PROCESSING_STEPS.length && (
                      <div className="flex gap-1 ml-auto">
                        {[0, 1, 2].map((d) => (
                          <div 
                            key={d}
                            className="w-1.5 h-1.5 rounded-full bg-[#00E0C8] animate-voice-bounce"
                            style={{ animationDelay: `${d * 0.12}s` }}
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
          <div className="w-full max-w-md mt-6 animate-voice-answer-rise">
            <div className={cn(
              "rounded-2xl p-5",
              "bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]",
              "shadow-[0_0_50px_rgba(80,255,220,0.05)]"
            )}>
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgba(0,224,200,0.2)] to-[rgba(0,224,200,0.08)] flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,224,200,0.15)]">
                  <img src={bahorLogo} alt="" className="w-5 h-5 object-contain" />
                </div>
                <p className="text-white/85 text-[14px] md:text-[15px] leading-relaxed">
                  {answerPreview}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live transcription */}
        {showCaptions && transcription && (
          <div className="w-full max-w-md mt-5 animate-voice-caption-in">
            <div className={cn(
              "rounded-xl px-4 py-3",
              "bg-black/25 backdrop-blur-lg border border-white/[0.04]"
            )}>
              <p className={cn(
                "text-center text-[14px] transition-all duration-350",
                state === "listening" ? "text-white/50" : "text-white/80 font-medium"
              )}>
                {transcription}
                {state === "listening" && (
                  <span className="inline-block w-0.5 h-3.5 bg-[#00E0C8] ml-1 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 pb-10 md:pb-12 px-5">
        <div className="flex items-center justify-center">
          {/* Main mic button - glassmorphism with halo */}
          <button
            onClick={handleToggle}
            className={cn(
              "relative p-6 rounded-full transition-all duration-500",
              "hover:scale-105 active:scale-95",
              state === "listening" 
                ? "bg-gradient-to-br from-red-500/80 to-red-600/60" 
                : "bg-gradient-to-br from-[rgba(0,224,200,0.7)] to-[rgba(0,200,180,0.5)]",
              state === "listening"
                ? "shadow-[0_0_70px_rgba(255,80,80,0.45)]"
                : "shadow-[0_0_70px_rgba(0,224,200,0.4)]"
            )}
          >
            {/* Expanding halo animations */}
            {state === "listening" && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/25 animate-voice-halo" />
                <div className="absolute inset-[-10px] rounded-full bg-red-500/15 animate-voice-halo-delayed" />
                <div className="absolute inset-[-20px] rounded-full bg-red-500/8 animate-voice-halo-outer" />
              </>
            )}
            
            {state === "idle" && (
              <>
                <div className="absolute inset-0 rounded-full bg-[rgba(0,224,200,0.2)] animate-voice-idle-halo" />
                <div className="absolute inset-[-8px] rounded-full bg-[rgba(0,224,200,0.12)] animate-voice-idle-halo-delayed" />
              </>
            )}
            
            {state === "listening" ? (
              <Square className="w-6 h-6 text-white relative z-10" fill="currentColor" />
            ) : (
              <Mic className="w-6 h-6 text-white relative z-10" />
            )}
          </button>
        </div>
        
        {/* Label underneath */}
        <p className="text-center text-sm text-white/35 mt-5 font-light">
          {state === "listening" ? t('voice.tapToStop') : t('voice.tapToStart')}
        </p>
      </div>
    </div>
  );
}
