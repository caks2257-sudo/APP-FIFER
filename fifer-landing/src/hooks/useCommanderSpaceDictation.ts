"use client";

import { useEffect, useRef, useState } from "react";

export type CommanderSpeechState = {
  supported: boolean;
  listening: boolean;
  lastError: string | null;
  interimPreview: string;
};

/**
 * Push-to-talk con la barra espaciadora: mientras está pulsada, Web Speech API transcribe (es-CL).
 * Al soltar, el texto confirmado se pasa a `onCommit`.
 */
export function useCommanderSpaceDictation(opts: {
  enabled: boolean;
  onCommit: (text: string) => void;
}): CommanderSpeechState {
  const { enabled, onCommit } = opts;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimPreview, setInterimPreview] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognition | null>(null);
  const heldRef = useRef(false);
  const transcriptRef = useRef("");
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(Boolean(SR));
  }, []);

  useEffect(() => {
    if (!enabled || !supported) return;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (e.repeat) return;
      e.preventDefault();
      if (heldRef.current) return;
      heldRef.current = true;

      transcriptRef.current = "";
      setInterimPreview("");
      setLastError(null);

      const rec = new SR();
      rec.lang = "es-CL";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        transcriptRef.current = text;
        setInterimPreview(text);
      };

      rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
        if (ev.error === "aborted" || ev.error === "no-speech") return;
        setLastError(ev.error);
      };

      rec.onend = () => {
        setListening(false);
        setInterimPreview("");
        recRef.current = null;
        const t = transcriptRef.current.trim();
        transcriptRef.current = "";
        if (t) {
          commitRef.current(t);
        }
      };

      recRef.current = rec;
      try {
        rec.start();
        setListening(true);
      } catch {
        heldRef.current = false;
        setListening(false);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (!heldRef.current) return;
      e.preventDefault();
      heldRef.current = false;
      const rec = recRef.current;
      if (rec) {
        try {
          rec.stop();
        } catch {
          /* noop */
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      const rec = recRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          /* noop */
        }
      }
      recRef.current = null;
      heldRef.current = false;
      setListening(false);
      setInterimPreview("");
    };
  }, [enabled, supported]);

  return { supported, listening, lastError, interimPreview };
}
