import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

export function useSpeechRecognition(onFinalText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onFinalText);
  callbackRef.current = onFinalText;

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: unknown) => {
      const data = event as RecognitionEvent;
      let text = "";
      for (let index = data.resultIndex; index < data.results.length; index += 1) {
        const result = data.results[index];
        if (result.isFinal) text += result[0]?.transcript ?? "";
      }
      const clean = text.trim();
      if (clean) callbackRef.current(clean);
    };

    recognition.onerror = (event: unknown) => {
      const code = (event as { error?: string })?.error;
      setError(
        code === "not-allowed" || code === "service-not-allowed"
          ? "El navegador bloqueó el micrófono. Revisa el permiso del sitio."
          : "No se pudo usar el micrófono.",
      );
      setListening(false);
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // sin sesión activa
      }
    };
  }, []);

  const start = useCallback(() => {
    setError(null);
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      setListening(false);
      setError("No se pudo iniciar el micrófono.");
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // sin sesión activa
    }
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop, clearError: () => setError(null) };
}

export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 4000));
      utterance.lang = "es-MX";
      utterance.rate = 1.02;
      const voices = window.speechSynthesis.getVoices();
      const spanish = voices.find((voice) => voice.lang?.toLowerCase().startsWith("es"));
      if (spanish) utterance.voice = spanish;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  return { supported, speaking, speak, stop };
}
