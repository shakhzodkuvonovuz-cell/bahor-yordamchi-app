import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceOutputProps {
  language?: string;
  rate?: number;
  pitch?: number;
}

export const useVoiceOutput = ({ 
  language = 'uz-UZ', 
  rate = 1.0, 
  pitch = 1.0 
}: UseVoiceOutputProps = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Map app languages to speech synthesis language codes
  const getLanguageCode = (lang: string) => {
    const languageMap: Record<string, string> = {
      'uz': 'uz-UZ',
      'en': 'en-US',
      'ru': 'ru-RU',
      'tr': 'tr-TR'
    };
    return languageMap[lang] || 'uz-UZ';
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageCode(language);
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [language, rate, pitch]);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.pause();
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.resume();
    }
  }, [isSpeaking]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported: !!synthRef.current
  };
};
