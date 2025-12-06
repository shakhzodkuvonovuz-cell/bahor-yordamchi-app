import { useState, useRef, useCallback, useEffect } from "react";

// Check if SpeechRecognition is supported
const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

// Language mapping
const getLanguageCode = (lang: string): string => {
  const langMap: Record<string, string> = {
    uz: "uz-UZ",
    en: "en-US",
    ru: "ru-RU",
    tr: "tr-TR",
  };
  return langMap[lang] || "en-US";
};

export interface PushToTalkState {
  isListening: boolean;
  interimText: string;
  finalText: string;
  error: string | null;
  amplitude: number;
  isSupported: boolean;
}

export interface PushToTalkHandlers {
  start: (language: string) => void;
  stop: () => string;
  cancel: () => void;
}

export function usePushToTalkDictation() {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const accumulatedFinalRef = useRef("");

  const isSupported = !!getSpeechRecognition();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Amplitude analysis loop
  const updateAmplitude = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedAmplitude = Math.min(1, average / 128);
      setAmplitude(normalizedAmplitude * 0.7 + 0.3);
    }
    if (isListening) {
      animationFrameRef.current = requestAnimationFrame(updateAmplitude);
    }
  }, [isListening]);

  const start = useCallback(async (language: string) => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError("not-supported");
      return;
    }

    setError(null);
    setInterimText("");
    setFinalText("");
    accumulatedFinalRef.current = "";

    try {
      // Request microphone for waveform visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio analysis for waveform
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Create and configure speech recognition
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = getLanguageCode(language);

      recognitionRef.current.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          accumulatedFinalRef.current += (accumulatedFinalRef.current ? " " : "") + final;
          setFinalText(accumulatedFinalRef.current);
        }
        setInterimText(interim);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "aborted" && event.error !== "no-speech") {
          setError(event.error);
        }
      };

      recognitionRef.current.onend = () => {
        // Recognition ended - may be due to silence or user action
        // Don't clean up here, let stop() handle it
      };

      recognitionRef.current.start();
      setIsListening(true);

      // Haptic feedback on start (tap)
      navigator.vibrate?.(10);

      // Start amplitude updates
      animationFrameRef.current = requestAnimationFrame(updateAmplitude);
    } catch (err) {
      console.error("Failed to start dictation:", err);
      setError("permission-denied");
      // Error haptic feedback (longer pulse)
      navigator.vibrate?.([30, 20, 30]);
      cleanup();
    }
  }, [cleanup, updateAmplitude]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    cleanup();

    // Haptic feedback on stop (tap)
    navigator.vibrate?.(10);

    // Return the complete transcription
    const result = accumulatedFinalRef.current + (interimText ? " " + interimText : "");
    return result.trim();
  }, [cleanup, interimText]);

  const cancel = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore errors when aborting
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    setInterimText("");
    setFinalText("");
    accumulatedFinalRef.current = "";
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    isListening,
    interimText,
    finalText,
    error,
    amplitude,
    isSupported,
    handlers: { start, stop, cancel },
  };
}
