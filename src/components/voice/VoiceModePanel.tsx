import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, MicOff, Volume2, VolumeX, RotateCcw, Type, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import VoiceWaveform from "./VoiceWaveform";
import bahorLogo from "@/assets/bahor-logo.png";

export type VoiceState = "listening" | "processing" | "answering" | "idle";

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionComplete?: (text: string) => void;
}

// Processing steps for the mini reasoning bar
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
  const [tapToToggle, setTapToToggle] = useState(true);
  const [answerPreview, setAnswerPreview] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  // Simulate voice amplitude based on actual audio input
  const updateAmplitude = useCallback(() => {
    if (analyserRef.current && state === "listening") {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average amplitude
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedAmplitude = Math.min(1, average / 128);
      
      setAmplitude(normalizedAmplitude * 0.7 + 0.3); // Keep minimum amplitude
    }
    animationFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, [state]);

  // Start listening
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio analysis for waveform
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      setState("listening");
      setTranscription("");
      updateAmplitude();
      
      // Simulate speech recognition (replace with real API later)
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
      setState("processing");
      simulateProcessing();
    } else {
      setState("idle");
    }
  };

  // Simulate speech recognition (demo purposes)
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

  // Simulate processing steps
  const simulateProcessing = () => {
    setProcessingStep(0);
    
    const stepDuration = 1200;
    PROCESSING_STEPS.forEach((_, index) => {
      setTimeout(() => {
        setProcessingStep(index + 1);
        
        if (index === PROCESSING_STEPS.length - 1) {
          setTimeout(() => {
            setState("answering");
            simulateAnswer();
          }, stepDuration);
        }
      }, index * stepDuration);
    });
  };

  // Simulate AI answer
  const simulateAnswer = () => {
    const answer = t('voice.demo.answer');
    setAnswerPreview(answer);
    
    // After showing answer, return to idle
    setTimeout(() => {
      if (onTranscriptionComplete && transcription.trim()) {
        onTranscriptionComplete(transcription);
      }
      handleClose();
    }, 3000);
  };

  // Handle panel close
  const handleClose = () => {
    stopListening();
    setState("idle");
    setTranscription("");
    setProcessingStep(0);
    setAnswerPreview("");
    onClose();
  };

  // Toggle listening on tap
  const handleToggle = () => {
    if (tapToToggle) {
      if (state === "listening") {
        stopListening();
      } else if (state === "idle") {
        startListening();
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Auto-start listening when panel opens
  useEffect(() => {
    if (isOpen && state === "idle") {
      const timer = setTimeout(startListening, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col",
        "animate-voice-panel-in"
      )}
    >
      {/* Overlay background */}
      <div 
        className="absolute inset-0 bg-background/95 backdrop-blur-xl"
        onClick={handleClose}
      />
      
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, hsla(175, 60%, 50%, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 70%, hsla(175, 50%, 40%, 0.05) 0%, transparent 40%)
          `
        }}
      />

      {/* Header controls */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          {/* Caption toggle */}
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              "bg-card/50 border border-border/30 backdrop-blur-sm",
              showCaptions ? "text-primary" : "text-muted-foreground"
            )}
            aria-label={t('voice.toggleCaptions')}
          >
            <Type className="w-4 h-4" />
          </button>
          
          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              "bg-card/50 border border-border/30 backdrop-blur-sm",
              isMuted ? "text-destructive" : "text-muted-foreground"
            )}
            aria-label={t('voice.toggleMute')}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
        
        <button
          onClick={handleClose}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200",
            "bg-card/50 border border-border/30 backdrop-blur-sm",
            "hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
          )}
          aria-label={t('voice.cancel')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Logo with pulse animation */}
        <div className={cn(
          "relative mb-6 transition-all duration-500",
          state === "processing" && "animate-voice-logo-pulse"
        )}>
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <img 
              src={bahorLogo} 
              alt="Bahor AI"
              className={cn(
                "w-10 h-10 md:w-12 md:h-12 object-contain",
                state === "processing" && "animate-voice-logo-rotate"
              )}
            />
          </div>
          
          {/* Breathing glow */}
          <div className={cn(
            "absolute inset-0 rounded-full blur-xl transition-opacity duration-1000",
            state === "listening" ? "opacity-60 animate-voice-breathe" : "opacity-30"
          )}
            style={{
              background: "radial-gradient(circle, hsla(175, 60%, 50%, 0.4) 0%, transparent 70%)"
            }}
          />
        </div>

        {/* State title */}
        <h2 className={cn(
          "text-xl md:text-2xl font-medium text-foreground mb-2 transition-all duration-300",
          "animate-fade-in"
        )}>
          {state === "listening" && t('voice.listening')}
          {state === "processing" && t('voice.understanding')}
          {state === "answering" && t('voice.preparing')}
          {state === "idle" && t('voice.tapToSpeak')}
        </h2>
        
        {/* Subtitle */}
        <p className="text-sm md:text-base text-muted-foreground mb-8 text-center max-w-xs">
          {state === "listening" && t('voice.speakNaturally')}
          {state === "processing" && t('voice.processingVoice')}
          {state === "answering" && t('voice.almostReady')}
          {state === "idle" && t('voice.readyToListen')}
        </p>

        {/* Waveform */}
        <div 
          className="w-full max-w-md h-32 md:h-40 mb-8 cursor-pointer"
          onClick={handleToggle}
        >
          <VoiceWaveform 
            isActive={state === "listening"} 
            amplitude={amplitude}
          />
        </div>

        {/* Processing steps - Mini reasoning bar */}
        {state === "processing" && (
          <div className="w-full max-w-sm mb-8 animate-fade-in">
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-4">
              <div className="space-y-3">
                {PROCESSING_STEPS.map((step, index) => (
                  <div 
                    key={step.key}
                    className={cn(
                      "flex items-center gap-3 transition-all duration-300",
                      index < processingStep ? "opacity-100" : "opacity-40"
                    )}
                  >
                    {/* Step indicator */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                      "transition-all duration-300",
                      index < processingStep 
                        ? "bg-primary/20 text-primary shadow-[0_0_12px_hsla(175,60%,50%,0.3)]" 
                        : "bg-muted/50 text-muted-foreground"
                    )}>
                      {index < processingStep ? "✓" : step.icon}
                    </div>
                    
                    {/* Step text */}
                    <span className={cn(
                      "text-sm transition-colors duration-300",
                      index < processingStep ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {t(`voice.step.${step.key}`)}
                    </span>
                    
                    {/* Progress dots */}
                    {index === processingStep - 1 && processingStep < PROCESSING_STEPS.length && (
                      <div className="flex gap-1 ml-auto">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-voice-dot" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-voice-dot animation-delay-150" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-voice-dot animation-delay-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Answer preview skeleton */}
        {state === "answering" && (
          <div className="w-full max-w-sm mb-8 animate-fade-in">
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-4">
              {answerPreview ? (
                <p className="text-foreground text-sm leading-relaxed">{answerPreview}</p>
              ) : (
                <div className="space-y-2">
                  <div className="h-3 bg-muted/50 rounded-full w-full animate-pulse" />
                  <div className="h-3 bg-muted/50 rounded-full w-4/5 animate-pulse animation-delay-150" />
                  <div className="h-3 bg-muted/50 rounded-full w-3/5 animate-pulse animation-delay-300" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live transcription */}
        {showCaptions && transcription && (
          <div className="w-full max-w-md animate-fade-in">
            <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-border/20 p-4">
              <p className={cn(
                "text-center text-foreground transition-all duration-200",
                state === "listening" ? "text-muted-foreground" : "font-medium"
              )}>
                {transcription}
                {state === "listening" && (
                  <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 pb-8 px-6">
        <div className="flex items-center justify-center gap-6">
          {/* Replay button */}
          {(state === "answering" || answerPreview) && (
            <button
              onClick={() => {/* Replay logic */}}
              className={cn(
                "p-4 rounded-full transition-all duration-200",
                "bg-card/50 border border-border/30 backdrop-blur-sm",
                "hover:bg-card/70 hover:border-border/50"
              )}
              aria-label={t('voice.replay')}
            >
              <RotateCcw className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          
          {/* Main mic button */}
          <button
            onClick={handleToggle}
            className={cn(
              "relative p-6 rounded-full transition-all duration-300",
              "bg-gradient-to-br",
              state === "listening" 
                ? "from-destructive/80 to-destructive/60 shadow-[0_0_40px_hsla(0,70%,50%,0.3)]" 
                : "from-primary/80 to-primary/60 shadow-[0_0_40px_hsla(175,60%,50%,0.3)]",
              "hover:scale-105 active:scale-95"
            )}
          >
            {/* Pulse rings */}
            {state === "listening" && (
              <>
                <div className="absolute inset-0 rounded-full bg-destructive/30 animate-voice-pulse" />
                <div className="absolute inset-[-8px] rounded-full bg-destructive/20 animate-voice-pulse animation-delay-300" />
              </>
            )}
            
            {state === "listening" ? (
              <Square className="w-6 h-6 text-white relative z-10" fill="currentColor" />
            ) : (
              <Mic className="w-6 h-6 text-white relative z-10" />
            )}
          </button>
          
          {/* Cancel/Close button */}
          {state === "listening" && (
            <button
              onClick={handleClose}
              className={cn(
                "p-4 rounded-full transition-all duration-200",
                "bg-card/50 border border-border/30 backdrop-blur-sm",
                "hover:bg-destructive/10 hover:border-destructive/30"
              )}
              aria-label={t('voice.cancel')}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {/* Tap to stop hint */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          {state === "listening" ? t('voice.tapToStop') : t('voice.tapToStart')}
        </p>
      </div>
    </div>
  );
}
