// Speech service using Web Speech API

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
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

// Check platform capabilities
export const getSpeechCapabilities = () => {
  const hasWebSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  const hasSpeechSynthesis = 'speechSynthesis' in window;
  
  return {
    hasSTT: hasWebSpeechRecognition,
    hasTTS: hasSpeechSynthesis,
  };
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

export class SpeechToText {
  private recognition: any = null;
  private isListening = false;

  start(options: STTOptions): boolean {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      options.onError('Speech recognition not supported in this browser');
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
