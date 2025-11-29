import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Volume2, VolumeX, Type, Square } from "lucide-react";
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

// Processing steps for mini reasoning bar
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
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Update amplitude from audio input
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

  // Start listening
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

  // Stop listening
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

  // Simulate speech recognition
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
        setTimeout(addWord, 200 + Math.random() * 300);
      }
    };
    
    setTimeout(addWord, 500);
  };

  // Simulate processing
  const simulateProcessing = () => {
    setProcessingStep(0);
    
    const stepDuration = 1200;
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

  // Simulate answer
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

  // Handle close
  const handleClose = () => {
    stopListening();
    setState("idle");
    setTranscription("");
    setProcessingStep(0);
    setAnswerPreview("");
    onClose();
  };

  // Toggle listening
  const handleToggle = () => {
    if (state === "listening") {
      stopListening();
    } else if (state === "idle") {
      startListening();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Auto-start
  useEffect(() => {
    if (isOpen && state === "idle") {
      const timer = setTimeout(startListening, 400);
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
      "fixed inset-0 z-50 flex flex-col",
      "animate-voice-panel-in"
    )}>
      {/* Premium gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0, 80, 80, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 100%, rgba(0, 60, 70, 0.3) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(0, 100, 90, 0.15) 0%, transparent 60%),
            linear-gradient(180deg, hsl(200, 30%, 6%) 0%, hsl(195, 25%, 8%) 50%, hsl(200, 30%, 6%) 100%)
          `
        }}
      />

      {/* Subtle animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/20 animate-voice-particle"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${4 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)"
        }}
      />

      {/* Header controls */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          {/* Caption toggle */}
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300",
              "bg-white/5 backdrop-blur-xl border border-white/10",
              "hover:bg-white/10 hover:border-white/20",
              showCaptions ? "text-primary shadow-[0_0_20px_rgba(0,212,180,0.2)]" : "text-white/50"
            )}
            aria-label={t('voice.toggleCaptions')}
          >
            <Type className="w-4 h-4" />
          </button>
          
          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300",
              "bg-white/5 backdrop-blur-xl border border-white/10",
              "hover:bg-white/10 hover:border-white/20",
              isMuted ? "text-red-400 shadow-[0_0_20px_rgba(255,100,100,0.2)]" : "text-white/50"
            )}
            aria-label={t('voice.toggleMute')}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Exit button - frosted glass */}
        <button
          onClick={handleClose}
          className={cn(
            "p-3 rounded-2xl transition-all duration-300",
            "bg-white/5 backdrop-blur-xl border border-white/10",
            "hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
          )}
          aria-label={t('voice.cancel')}
        >
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-40">
        {/* Voice Orb */}
        <div className="mb-8">
          <VoiceOrb 
            state={state} 
            amplitude={amplitude}
          />
        </div>

        {/* State title */}
        <h2 className={cn(
          "text-2xl md:text-3xl font-medium text-white mb-2",
          "transition-all duration-500 animate-fade-in"
        )}>
          {getStateTitle()}
        </h2>
        
        {/* Subtitle */}
        <p className="text-sm md:text-base text-white/50 mb-8 text-center max-w-xs">
          {getStateSubtitle()}
        </p>

        {/* Fluid waveform - visible in listening/speaking states */}
        {(state === "listening" || state === "speaking") && (
          <div className="w-full max-w-lg h-24 md:h-32 mb-8 animate-fade-in">
            <FluidWaveform 
              isActive={state === "listening" || state === "speaking"} 
              amplitude={amplitude}
              state={state}
            />
          </div>
        )}

        {/* Thinking state mini reasoning bar */}
        {state === "thinking" && (
          <div className="w-full max-w-sm mb-8 animate-voice-slide-up">
            <div className={cn(
              "rounded-2xl p-5",
              "bg-white/5 backdrop-blur-xl border border-white/10",
              "shadow-[0_0_40px_rgba(0,212,180,0.1)]"
            )}>
              <div className="space-y-4">
                {PROCESSING_STEPS.map((step, index) => (
                  <div 
                    key={step.key}
                    className={cn(
                      "flex items-center gap-4 transition-all duration-500",
                      index < processingStep ? "opacity-100" : "opacity-30"
                    )}
                  >
                    {/* Glowing badge */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm",
                      "transition-all duration-500",
                      index < processingStep 
                        ? "bg-primary/20 text-primary shadow-[0_0_20px_rgba(0,212,180,0.4)] scale-110" 
                        : "bg-white/5 text-white/40"
                    )}>
                      {index < processingStep ? (
                        <span className="animate-voice-checkmark">✓</span>
                      ) : (
                        step.icon
                      )}
                    </div>
                    
                    {/* Step text */}
                    <span className={cn(
                      "text-sm md:text-base transition-colors duration-500",
                      index < processingStep ? "text-white" : "text-white/40"
                    )}>
                      {t(`voice.step.${step.key}`)}
                    </span>
                    
                    {/* Bouncing dots for active step */}
                    {index === processingStep - 1 && processingStep < PROCESSING_STEPS.length && (
                      <div className="flex gap-1.5 ml-auto">
                        <div className="w-2 h-2 rounded-full bg-primary animate-voice-dot" />
                        <div className="w-2 h-2 rounded-full bg-primary animate-voice-dot animation-delay-150" />
                        <div className="w-2 h-2 rounded-full bg-primary animate-voice-dot animation-delay-300" />
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
          <div className="w-full max-w-md animate-voice-slide-up">
            <div className={cn(
              "rounded-2xl p-5",
              "bg-white/5 backdrop-blur-xl border border-white/10",
              "shadow-[0_0_40px_rgba(100,255,150,0.1)]"
            )}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                  <img src={bahorLogo} alt="" className="w-5 h-5 object-contain" />
                </div>
                <p className="text-white/90 text-sm md:text-base leading-relaxed">
                  {answerPreview}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live transcription */}
        {showCaptions && transcription && (
          <div className="w-full max-w-md mt-6 animate-fade-in">
            <div className={cn(
              "rounded-2xl p-4",
              "bg-black/30 backdrop-blur-sm border border-white/5"
            )}>
              <p className={cn(
                "text-center transition-all duration-300",
                state === "listening" ? "text-white/60" : "text-white font-medium"
              )}>
                {transcription}
                {state === "listening" && (
                  <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 pb-10 px-6">
        <div className="flex items-center justify-center gap-6">
          {/* Main control button */}
          <button
            onClick={handleToggle}
            className={cn(
              "relative p-7 rounded-full transition-all duration-500",
              state === "listening" 
                ? "bg-gradient-to-br from-red-500/80 to-red-600/60" 
                : "bg-gradient-to-br from-primary/80 to-primary/60",
              "hover:scale-105 active:scale-95",
              "shadow-[0_0_60px_rgba(0,212,180,0.4)]",
              state === "listening" && "shadow-[0_0_60px_rgba(255,100,100,0.4)]"
            )}
          >
            {/* Animated glow rings */}
            {state === "listening" && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-voice-pulse" />
                <div className="absolute inset-[-12px] rounded-full bg-red-500/20 animate-voice-pulse animation-delay-300" />
              </>
            )}
            
            {state !== "listening" && state === "idle" && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/30 animate-voice-glow-ring" />
                <div className="absolute inset-[-8px] rounded-full bg-primary/20 animate-voice-glow-ring-delayed" />
              </>
            )}
            
            {state === "listening" ? (
              <Square className="w-7 h-7 text-white relative z-10" fill="currentColor" />
            ) : (
              <Mic className="w-7 h-7 text-white relative z-10" />
            )}
          </button>
        </div>
        
        {/* Hint text */}
        <p className="text-center text-sm text-white/40 mt-5">
          {state === "listening" ? t('voice.tapToStop') : t('voice.tapToStart')}
        </p>
      </div>
    </div>
  );
}
