import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseVoiceInputProps {
  language?: string;
  onResult: (transcript: string) => void;
}

export const useVoiceInput = ({ language = 'uz-UZ', onResult }: UseVoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Map app languages to speech recognition language codes
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
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getLanguageCode(language);

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript.trim()) {
        onResult(transcript.trim());
        setTranscript('');
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        toast({
          title: language === 'uz' ? "Mikrofonga ruxsat berilmagan" : "Microphone access denied",
          description: language === 'uz' 
            ? "Iltimos, brauzer sozlamalarida mikrofondan foydalanishga ruxsat bering."
            : "Please allow microphone access in your browser settings.",
          variant: "destructive",
        });
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, onResult, transcript, toast]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast({
        title: language === 'uz' ? "Ovozli kirish qo'llab-quvvatlanmaydi" : "Voice input not supported",
        description: language === 'uz'
          ? "Sizning brauzeringiz ovozli kirishni qo'llab-quvvatlamaydi."
          : "Your browser doesn't support voice input.",
        variant: "destructive",
      });
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  }, [language, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: !!recognitionRef.current
  };
};
