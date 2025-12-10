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
  
  // Track if start() is in progress to prevent stop() during initialization
  const isStartingRef = useRef(false);
  // Promise that resolves when start() completes
  const startPromiseRef = useRef<Promise<void> | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log("[useGroqDictation] cleanup called");
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

  // Amplitude analysis loop - uses ref to check recording state to avoid stale closure
  const isRecordingRef = useRef(false);
  
  const updateAmplitude = useCallback(() => {
    if (!isRecordingRef.current) return;
    
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedAmplitude = Math.min(1, average / 128);
      setAmplitude(normalizedAmplitude * 0.7 + 0.3);
    } else {
      // Fallback: simulate amplitude when no analyser
      setAmplitude(0.4 + Math.random() * 0.4);
    }
    animationFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, []);

  // Get best supported audio MIME type - iOS Safari friendly
  const getSupportedMimeType = useCallback((): string | null => {
    // Check if MediaRecorder exists at all
    if (typeof MediaRecorder === "undefined") {
      console.warn("[useGroqDictation] MediaRecorder not supported");
      return null;
    }
    
    // Detect iOS Safari
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                        !(window as any).MSStream &&
                        /Safari/.test(navigator.userAgent);
    
    // Priority order differs by platform
    // iOS Safari: prefer mp4/m4a, or let browser pick (empty string)
    // Chrome/Android: prefer webm/opus
    const types = isIOSSafari
      ? [
          "audio/mp4",
          "audio/aac", 
          "audio/mpeg",
          "", // Let browser pick - often works best on iOS
        ]
      : [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
          "audio/ogg",
          "", // Fallback: let browser pick
        ];
    
    for (const type of types) {
      // Empty string = let browser pick
      if (type === "") {
        console.log("[useGroqDictation] Using browser default MIME type");
        return "";
      }
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`[useGroqDictation] Selected MIME type: ${type}`);
        return type;
      }
    }
    
    // Final fallback: let browser pick
    console.log("[useGroqDictation] No specific MIME supported, using browser default");
    return "";
  }, []);

  // Start recording
  const start = useCallback(async () => {
    console.log("[useGroqDictation] start() called");
    
    // Prevent multiple starts
    if (isStartingRef.current || isRecordingRef.current) {
      console.log("[useGroqDictation] Already starting or recording, skipping");
      return;
    }
    
    // Check debounce
    const now = Date.now();
    if (now - lastRecordingTimeRef.current < DEBOUNCE_MS) {
      console.log("[useGroqDictation] Debounce active, skipping start");
      return;
    }

    isStartingRef.current = true;
    setError(null);
    audioChunksRef.current = [];

    const startInternal = async () => {
      try {
        console.log("[useGroqDictation] Requesting microphone...");
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        console.log("[useGroqDictation] Microphone acquired");
        streamRef.current = stream;

        // Check if MediaRecorder is supported
        const mimeType = getSupportedMimeType();
        if (mimeType === null) {
          throw new Error("MediaRecorder not supported");
        }

        // Create MediaRecorder FIRST before any AudioContext setup
        // This is critical for iOS Safari compatibility
        // If mimeType is empty string, don't pass options - let browser pick
        const options = mimeType ? { mimeType } : undefined;
        
        console.log(`[useGroqDictation] Creating MediaRecorder with options:`, options);
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        console.log(`[useGroqDictation] MediaRecorder created, actual mimeType: ${mediaRecorderRef.current.mimeType}`);
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          console.log(`[useGroqDictation] ondataavailable: ${event.data.size} bytes`);
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
          isRecordingRef.current = false;
          setIsRecording(false);
          isStartingRef.current = false;
        };

        // Start recording with timeslice for chunks
        console.log("[useGroqDictation] Starting MediaRecorder with 250ms timeslice...");
        mediaRecorderRef.current.start(250); // Collect data every 250ms
        startTimeRef.current = Date.now();
        isRecordingRef.current = true;
        setIsRecording(true);
        isStartingRef.current = false;
        console.log("[useGroqDictation] Recording started!");

        // Haptic feedback
        navigator.vibrate?.(10);
        
        // Start amplitude animation immediately (will use fallback if no analyser)
        animationFrameRef.current = requestAnimationFrame(updateAmplitude);

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
            console.log("[useGroqDictation] Audio analysis setup complete");
          }
        } catch (audioErr) {
          // If AudioContext setup fails, amplitude animation continues with fallback
          console.warn("[useGroqDictation] AudioContext setup failed, using simulated waveform:", audioErr);
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
        isStartingRef.current = false;
        
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
        isRecordingRef.current = false;
        setIsRecording(false);
        navigator.vibrate?.([30, 20, 30]); // Error haptic
      }
    };

    startPromiseRef.current = startInternal();
    await startPromiseRef.current;
  }, [language, onError, cleanup, updateAmplitude, getSupportedMimeType]);

  // Stop recording and transcribe
  const stop = useCallback(async (): Promise<string> => {
    console.log("[useGroqDictation] stop() called, isRecording:", isRecordingRef.current, "isStarting:", isStartingRef.current);
    
    // If start is still in progress, wait for it
    if (isStartingRef.current && startPromiseRef.current) {
      console.log("[useGroqDictation] Waiting for start to complete...");
      await startPromiseRef.current;
    }
    
    // Now check if we have a recorder
    if (!mediaRecorderRef.current || !isRecordingRef.current) {
      console.log("[useGroqDictation] No active recording to stop");
      return "";
    }

    lastRecordingTimeRef.current = Date.now();
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    console.log(`[useGroqDictation] Stopping recording after ${duration}s`);

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current!;
      
      recorder.onstop = async () => {
        console.log("[useGroqDictation] MediaRecorder.onstop fired");
        isRecordingRef.current = false;
        setIsRecording(false);
        cleanup();
        
        // Haptic feedback
        navigator.vibrate?.(10);

        // Check if we have audio data
        const chunks = audioChunksRef.current;
        console.log(`[useGroqDictation] Audio chunks collected: ${chunks.length}`);
        
        if (chunks.length === 0) {
          console.log("[useGroqDictation] No audio data recorded");
          resolve("");
          return;
        }

        // Create blob from chunks
        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(chunks, { type: mimeType });
        
        console.log(`[useGroqDictation] Audio blob: ${audioBlob.size} bytes, type: ${mimeType}`);

        // Skip if too small (likely empty)
        if (audioBlob.size < 1000) {
          console.log("[useGroqDictation] Audio too small (<1000 bytes), skipping transcription");
          resolve("");
          return;
        }

        setIsTranscribing(true);
        console.log("[useGroqDictation] Starting transcription...");

        try {
          // Prepare form data with correct file extension based on actual MIME type
          const formData = new FormData();
          const actualMime = recorder.mimeType || mimeType;
          const extension = actualMime.includes("mp4") || actualMime.includes("m4a") ? "m4a" 
                          : actualMime.includes("webm") ? "webm"
                          : actualMime.includes("ogg") ? "ogg"
                          : actualMime.includes("aac") ? "aac"
                          : actualMime.includes("mpeg") ? "mp3"
                          : "webm"; // Default fallback
          
          console.log(`[useGroqDictation] Sending to STT: mime=${actualMime}, ext=${extension}, size=${audioBlob.size}`);
          
          formData.append("file", audioBlob, `recording.${extension}`);
          formData.append("ui_language", language);
          formData.append("duration_seconds", String(duration));

          // Call edge function
          console.log("[useGroqDictation] Invoking stt-groq edge function...");
          const { data, error: funcError } = await supabase.functions.invoke("stt-groq", {
            body: formData,
          });
          console.log("[useGroqDictation] Edge function response:", { data, error: funcError });

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

      // Force a final data chunk before stopping
      try {
        recorder.requestData();
      } catch (e) {
        console.warn("[useGroqDictation] requestData() not supported or failed:", e);
      }
      
      // Stop recording
      try {
        console.log("[useGroqDictation] Calling MediaRecorder.stop()...");
        recorder.stop();
      } catch (e) {
        console.error("[useGroqDictation] Error stopping MediaRecorder:", e);
        isRecordingRef.current = false;
        setIsRecording(false);
        cleanup();
        resolve("");
      }
    });
  }, [language, onError, cleanup]);

  // Cancel recording without transcribing
  const cancel = useCallback(() => {
    console.log("[useGroqDictation] cancel() called");
    if (mediaRecorderRef.current && isRecordingRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    mediaRecorderRef.current = null;
    isRecordingRef.current = false;
    isStartingRef.current = false;
    setIsRecording(false);
    setIsTranscribing(false);
    setError(null);
    cleanup();
    lastRecordingTimeRef.current = Date.now();
  }, [cleanup]);

  // Check if max duration reached
  const hasReachedMaxDuration = elapsedSeconds >= MAX_DURATION_SECONDS;

  // Cleanup on unmount only - stable ref to avoid re-running on state changes
  useEffect(() => {
    return () => {
      // Use refs to check state, not the state values directly
      if (isRecordingRef.current && mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []); // Empty deps - only run on unmount

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
