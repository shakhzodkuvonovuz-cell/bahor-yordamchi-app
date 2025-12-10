import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Max recording duration in seconds
const MAX_DURATION_SECONDS = 60;

// Debounce time between recordings
const DEBOUNCE_MS = 1500;

export interface GroqDictationState {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  amplitude: number;
  elapsedSeconds: number;
}

export interface GroqDictationHandlers {
  start: () => Promise<void>;
  stop: () => Promise<string>;
  cancel: () => void;
}

interface UseGroqDictationOptions {
  language: string;
  onError?: (error: string) => void;
}

export function useGroqDictation({ language, onError }: UseGroqDictationOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastRecordingTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    audioChunksRef.current = [];
    setAmplitude(0);
    setElapsedSeconds(0);
  }, []);

  // Amplitude analysis loop
  const updateAmplitude = useCallback(() => {
    if (analyserRef.current && isRecording) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedAmplitude = Math.min(1, average / 128);
      setAmplitude(normalizedAmplitude * 0.7 + 0.3);
      animationFrameRef.current = requestAnimationFrame(updateAmplitude);
    }
  }, [isRecording]);

  // Get best supported audio MIME type
  const getSupportedMimeType = useCallback((): string => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ""; // Browser default
  }, []);

  // Start recording
  const start = useCallback(async () => {
    // Check debounce
    const now = Date.now();
    if (now - lastRecordingTimeRef.current < DEBOUNCE_MS) {
      console.log("[useGroqDictation] Debounce active, skipping start");
      return;
    }

    setError(null);
    audioChunksRef.current = [];

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder FIRST before any AudioContext setup
      // This is critical for iOS Safari compatibility
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("[useGroqDictation] MediaRecorder error:", event);
        const errorMsg = language === "uz" 
          ? "Yozishda xatolik yuz berdi"
          : language === "ru"
          ? "Ошибка записи"
          : language === "tr"
          ? "Kayıt hatası"
          : "Recording error";
        setError(errorMsg);
        onError?.(errorMsg);
        cleanup();
        setIsRecording(false);
      };

      // Start recording BEFORE setting up AudioContext
      // iOS Safari requires MediaRecorder to start before AudioContext connects
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Haptic feedback
      navigator.vibrate?.(10);

      // Setup audio analysis for waveform AFTER MediaRecorder starts
      // Use a separate audio track clone to avoid interfering with MediaRecorder on iOS
      try {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          // Clone the track for analysis to avoid iOS Safari conflicts
          const analysisStream = new MediaStream([audioTrack.clone()]);
          
          audioContextRef.current = new AudioContext();
          // Resume AudioContext (required for iOS Safari)
          if (audioContextRef.current.state === "suspended") {
            await audioContextRef.current.resume();
          }
          
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          const source = audioContextRef.current.createMediaStreamSource(analysisStream);
          source.connect(analyserRef.current);
          
          // Start amplitude updates
          animationFrameRef.current = requestAnimationFrame(updateAmplitude);
        }
      } catch (audioErr) {
        // If AudioContext setup fails, just skip waveform visualization
        console.warn("[useGroqDictation] AudioContext setup failed, skipping waveform:", audioErr);
        // Simulate amplitude for visual feedback
        animationFrameRef.current = requestAnimationFrame(() => {
          setAmplitude(0.5 + Math.random() * 0.3);
        });
      }

      // Start elapsed time counter
      setElapsedSeconds(0);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(elapsed);

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION_SECONDS) {
          console.log("[useGroqDictation] Max duration reached, auto-stopping");
          // Will be handled by the component
        }
      }, 1000);

    } catch (err) {
      console.error("[useGroqDictation] Failed to start recording:", err);
      
      let errorMsg: string;
      if ((err as Error).name === "NotAllowedError") {
        errorMsg = language === "uz" 
          ? "Mikrofonga ruxsat berilmadi"
          : language === "ru"
          ? "Доступ к микрофону запрещен"
          : language === "tr"
          ? "Mikrofon izni reddedildi"
          : "Microphone permission denied";
      } else {
        errorMsg = language === "uz" 
          ? "Mikrofonni ishga tushirib bo'lmadi"
          : language === "ru"
          ? "Не удалось запустить микрофон"
          : language === "tr"
          ? "Mikrofon başlatılamadı"
          : "Could not start microphone";
      }
      
      setError(errorMsg);
      onError?.(errorMsg);
      cleanup();
      setIsRecording(false);
      navigator.vibrate?.([30, 20, 30]); // Error haptic
    }
  }, [language, onError, cleanup, updateAmplitude, getSupportedMimeType]);

  // Stop recording and transcribe
  const stop = useCallback(async (): Promise<string> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return "";
    }

    lastRecordingTimeRef.current = Date.now();
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    return new Promise((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        setIsRecording(false);
        cleanup();
        
        // Haptic feedback
        navigator.vibrate?.(10);

        // Check if we have audio data
        if (audioChunksRef.current.length === 0) {
          console.log("[useGroqDictation] No audio data recorded");
          resolve("");
          return;
        }

        // Create blob from chunks
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        console.log(`[useGroqDictation] Audio blob: ${audioBlob.size} bytes, type: ${mimeType}`);

        // Skip if too small (likely empty)
        if (audioBlob.size < 1000) {
          console.log("[useGroqDictation] Audio too small, skipping transcription");
          resolve("");
          return;
        }

        setIsTranscribing(true);

        try {
          // Prepare form data
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");
          formData.append("ui_language", language);
          formData.append("duration_seconds", String(duration));

          // Call edge function
          const { data, error: funcError } = await supabase.functions.invoke("stt-groq", {
            body: formData,
          });

          if (funcError) {
            console.error("[useGroqDictation] Edge function error:", funcError);
            throw new Error(funcError.message);
          }

          if (data?.error) {
            console.error("[useGroqDictation] STT error:", data.error);
            const errorMsg = data.message || data.error;
            setError(errorMsg);
            onError?.(errorMsg);
            resolve("");
            return;
          }

          const transcript = data?.text || "";
          console.log(`[useGroqDictation] Transcription result: "${transcript.substring(0, 50)}..."`);
          resolve(transcript);

        } catch (err) {
          console.error("[useGroqDictation] Transcription failed:", err);
          const errorMsg = language === "uz" 
            ? "Transkriptsiyada xatolik. Qayta urinib ko'ring."
            : language === "ru"
            ? "Ошибка транскрипции. Попробуйте снова."
            : language === "tr"
            ? "Transkripsiyon hatası. Tekrar deneyin."
            : "Transcription failed. Please try again.";
          setError(errorMsg);
          onError?.(errorMsg);
          resolve("");
        } finally {
          setIsTranscribing(false);
        }
      };

      // Stop recording
      try {
        mediaRecorderRef.current!.stop();
      } catch (e) {
        console.error("[useGroqDictation] Error stopping MediaRecorder:", e);
        setIsRecording(false);
        cleanup();
        resolve("");
      }
    });
  }, [isRecording, language, onError, cleanup]);

  // Cancel recording without transcribing
  const cancel = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setIsTranscribing(false);
    setError(null);
    cleanup();
    lastRecordingTimeRef.current = Date.now();
  }, [isRecording, cleanup]);

  // Check if max duration reached
  const hasReachedMaxDuration = elapsedSeconds >= MAX_DURATION_SECONDS;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    isRecording,
    isTranscribing,
    error,
    amplitude,
    elapsedSeconds,
    hasReachedMaxDuration,
    maxDuration: MAX_DURATION_SECONDS,
    handlers: { start, stop, cancel },
  };
}
