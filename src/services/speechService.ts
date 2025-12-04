// Cross-platform speech service with Web Speech API + Whisper fallback for iOS

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

// Check platform capabilities
export const getSpeechCapabilities = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const hasWebSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  const hasSpeechSynthesis = 'speechSynthesis' in window;
  
  return {
    isIOS,
    isSafari,
    hasNativeSTT: hasWebSpeechRecognition && !(isIOS && isSafari), // iOS Safari doesn't support STT
    hasTTS: hasSpeechSynthesis,
    needsWhisperFallback: isIOS && isSafari,
  };
};

// Language mapping for speech APIs
const getLanguageCode = (lang: string): string => {
  const langMap: Record<string, string> = {
    uz: 'uz-UZ',
    en: 'en-US',
    ru: 'ru-RU',
    tr: 'tr-TR',
  };
  return langMap[lang] || 'en-US';
};

// ============================================
// Speech-to-Text (STT) Service
// ============================================

interface STTOptions {
  language: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

class WebSpeechRecognition {
  private recognition: any = null;
  private isListening = false;

  start(options: STTOptions) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      options.onError('Speech recognition not supported');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = getLanguageCode(options.language);

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        options.onResult(finalTranscript, true);
      } else if (interimTranscript) {
        options.onResult(interimTranscript, false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted') {
        options.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      options.onEnd();
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start recognition:', error);
      options.onError('Failed to start');
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  abort() {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }
}

// Whisper-based fallback for iOS Safari
class WhisperFallbackRecognition {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;
  private options: STTOptions | null = null;

  async start(options: STTOptions): Promise<boolean> {
    this.options = options;
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });

      // Check for supported mime types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.processAudio();
      };

      this.mediaRecorder.start(1000); // Collect in 1-second chunks
      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      options.onError('Microphone access denied');
      return false;
    }
  }

  private async processAudio() {
    if (this.audioChunks.length === 0 || !this.options) {
      this.options?.onEnd();
      return;
    }

    const audioBlob = new Blob(this.audioChunks, { type: this.audioChunks[0].type });
    
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      
      try {
        // Call Whisper edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-to-text`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              audio: base64Audio,
              language: this.options?.language || 'en',
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Transcription failed');
        }

        const data = await response.json();
        if (data.text) {
          this.options?.onResult(data.text, true);
        }
      } catch (error) {
        console.error('Whisper transcription error:', error);
        this.options?.onError('Transcription failed');
      }

      this.options?.onEnd();
    };
    
    reader.readAsDataURL(audioBlob);
  }

  stop() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  abort() {
    this.audioChunks = [];
    this.stop();
  }
}

// Unified STT interface
export class SpeechToText {
  private webSpeech = new WebSpeechRecognition();
  private whisperFallback = new WhisperFallbackRecognition();
  private usingFallback = false;

  async start(options: STTOptions): Promise<boolean> {
    const capabilities = getSpeechCapabilities();
    
    if (capabilities.hasNativeSTT) {
      this.usingFallback = false;
      return this.webSpeech.start(options);
    } else {
      console.log('Using Whisper fallback for STT');
      this.usingFallback = true;
      return this.whisperFallback.start(options);
    }
  }

  stop() {
    if (this.usingFallback) {
      this.whisperFallback.stop();
    } else {
      this.webSpeech.stop();
    }
  }

  abort() {
    if (this.usingFallback) {
      this.whisperFallback.abort();
    } else {
      this.webSpeech.abort();
    }
  }
}

// ============================================
// Text-to-Speech (TTS) Service
// ============================================

interface TTSOptions {
  text: string;
  language: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export class TextToSpeech {
  private utterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;

  speak(options: TTSOptions): boolean {
    if (!('speechSynthesis' in window)) {
      options.onError?.('Text-to-speech not supported');
      return false;
    }

    // Cancel any ongoing speech
    this.stop();

    this.utterance = new SpeechSynthesisUtterance(options.text);
    this.utterance.lang = getLanguageCode(options.language);
    this.utterance.rate = options.rate || 1.0;
    this.utterance.pitch = options.pitch || 1.0;

    // Try to find a voice for the language
    const voices = window.speechSynthesis.getVoices();
    const langCode = getLanguageCode(options.language);
    const voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
    if (voice) {
      this.utterance.voice = voice;
    }

    this.utterance.onstart = () => {
      this.isSpeaking = true;
      options.onStart?.();
    };

    this.utterance.onend = () => {
      this.isSpeaking = false;
      options.onEnd?.();
    };

    this.utterance.onerror = (event) => {
      this.isSpeaking = false;
      console.error('TTS error:', event);
      options.onError?.(event.error || 'Speech synthesis failed');
    };

    window.speechSynthesis.speak(this.utterance);
    return true;
  }

  stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  get speaking(): boolean {
    return this.isSpeaking;
  }
}

// Singleton instances
export const stt = new SpeechToText();
export const tts = new TextToSpeech();
