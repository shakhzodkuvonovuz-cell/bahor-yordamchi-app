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
  debugTrail: string[]; // Debug trail for troubleshooting
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
  const [debugTrail, setDebugTrail] = useState<string[]>([]);

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

  // Debug trail helper
  const pushDebug = useCallback((msg: string) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    const entry = `${timestamp} ${msg}`;
    console.log(`[STT_DEBUG] ${entry}`);
    setDebugTrail(prev => [...prev.slice(-9), entry]);
  }, []);

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

  // Get best supported audio MIME type - Groq compatible
  // IMPORTANT: Groq cannot parse WebM duration metadata, causing "audio too short" errors
  // Priority: MP4/AAC > MPEG > WAV > WebM (last resort)
  const getSupportedMimeType = useCallback((): string | null => {
    // Check if MediaRecorder exists at all
    if (typeof MediaRecorder === "undefined") {
      console.warn("[useGroqDictation] MediaRecorder not supported");
      return null;
    }
    
    // Prefer formats Groq can properly parse (MP4/AAC first, WebM last)
    const types = [
      "audio/mp4",
      "audio/aac",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/webm;codecs=opus", // WebM last - Groq has parsing issues
      "audio/webm",
      "", // Final fallback: let browser pick
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
    pushDebug("START_PRESSED");
    
    // Prevent multiple starts
    if (isStartingRef.current || isRecordingRef.current) {
      pushDebug("SKIP: already starting/recording");
      return;
    }
    
    // Check debounce
    const now = Date.now();
    if (now - lastRecordingTimeRef.current < DEBOUNCE_MS) {
      pushDebug("SKIP: debounce active");
      return;
    }

    isStartingRef.current = true;
    setError(null);
    audioChunksRef.current = [];

    const startInternal = async () => {
      try {
        pushDebug("GETUSERMEDIA...");
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        pushDebug("GETUSERMEDIA_OK");
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
        
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        const actualMime = mediaRecorderRef.current.mimeType || "(default)";
        pushDebug(`RECORDER_CREATED mime=${actualMime}`);
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          pushDebug(`CHUNK size=${event.data.size}`);
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onerror = (event) => {
          pushDebug(`RECORDER_ERROR: ${(event as any).error?.message || "unknown"}`);
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

        // Start recording WITHOUT timeslice - some browsers don't fire ondataavailable with timeslice
        // Instead, we'll get all data in one chunk when stop() is called
        mediaRecorderRef.current.start();
        startTimeRef.current = Date.now();
        isRecordingRef.current = true;
        setIsRecording(true);
        isStartingRef.current = false;
        pushDebug("RECORDER_STARTED");

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
          }
        } catch (audioErr) {
          // If AudioContext setup fails, amplitude animation continues with fallback
          pushDebug("AUDIOCONTEXT_FALLBACK");
        }

        // Start elapsed time counter
        setElapsedSeconds(0);
        timerRef.current = window.setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(elapsed);

          // Auto-stop at max duration
          if (elapsed >= MAX_DURATION_SECONDS) {
            pushDebug("MAX_DURATION_REACHED");
          }
        }, 1000);

      } catch (err) {
        const errMsg = (err as Error).message || "unknown";
        pushDebug(`START_ERROR: ${errMsg}`);
        isStartingRef.current = false;
        
        let errorMsg: string;
        if ((err as Error).name === "NotAllowedError") {
          pushDebug("PERMISSION_DENIED");
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
  }, [language, onError, cleanup, updateAmplitude, getSupportedMimeType, pushDebug]);

  // Stop recording and transcribe
  const stop = useCallback(async (): Promise<string> => {
    pushDebug("STOP_TRIGGERED");
    
    // If start is still in progress, wait for it
    if (isStartingRef.current && startPromiseRef.current) {
      pushDebug("WAITING_FOR_START...");
      await startPromiseRef.current;
    }
    
    // Now check if we have a recorder
    if (!mediaRecorderRef.current || !isRecordingRef.current) {
      pushDebug("NO_ACTIVE_RECORDING");
      return "";
    }

    lastRecordingTimeRef.current = Date.now();
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    pushDebug(`STOPPING after ${duration}s`);

    // Set transcribing state IMMEDIATELY before any async work
    setIsTranscribing(true);

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current!;
      
      recorder.onstop = async () => {
        pushDebug("RECORDER_ONSTOP");
        isRecordingRef.current = false;
        setIsRecording(false);
        
        // Haptic feedback
        navigator.vibrate?.(10);

        // CRITICAL: Copy chunks BEFORE cleanup (cleanup clears the array!)
        const chunks = [...audioChunksRef.current];
        pushDebug(`CHUNKS_COUNT=${chunks.length}`);
        
        // Now cleanup (after copying chunks)
        cleanup();
        
        if (chunks.length === 0) {
          pushDebug("NO_CHUNKS");
          setIsTranscribing(false);
          resolve("");
          return;
        }

        // Create blob from chunks
        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(chunks, { type: mimeType });
        pushDebug(`BLOB_READY size=${audioBlob.size}`);

        // Skip if too small (likely empty)
        if (audioBlob.size < 1000) {
          pushDebug("BLOB_TOO_SMALL");
          setIsTranscribing(false);
          resolve("");
          return;
        }

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
          
          formData.append("file", audioBlob, `recording.${extension}`);
          formData.append("ui_language", language);
          formData.append("duration_seconds", String(duration));

          // Call edge function
          pushDebug("CALLING_STT...");
          const { data, error: funcError } = await supabase.functions.invoke("stt-groq", {
            body: formData,
          });

          if (funcError) {
            pushDebug(`STT_FUNC_ERROR: ${funcError.message}`);
            throw new Error(funcError.message);
          }

          if (data?.error) {
            pushDebug(`STT_ERROR: ${data.error}`);
            const errorMsg = data.message || data.error;
            setError(errorMsg);
            onError?.(errorMsg);
            resolve("");
            return;
          }

          const transcript = data?.text || "";
          pushDebug(`STT_OK len=${transcript.length}`);
          resolve(transcript);

        } catch (err) {
          const errMsg = (err as Error).message || "unknown";
          pushDebug(`STT_CATCH: ${errMsg}`);
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
        pushDebug("requestData_FAILED");
      }
      
      // Stop recording
      try {
        recorder.stop();
        pushDebug("RECORDER_STOP_CALLED");
      } catch (e) {
        pushDebug(`STOP_ERROR: ${(e as Error).message}`);
        isRecordingRef.current = false;
        setIsRecording(false);
        setIsTranscribing(false);
        cleanup();
        resolve("");
      }
    });
  }, [language, onError, cleanup, pushDebug]);

  // Cancel recording without transcribing
  const cancel = useCallback(() => {
    pushDebug("CANCEL");
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
  }, [cleanup, pushDebug]);

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
    debugTrail, // Expose debug trail for UI display
    handlers: { start, stop, cancel },
  };
}
