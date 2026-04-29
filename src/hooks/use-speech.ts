import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'savo_voice_prompts_enabled';

/**
 * Lightweight wrapper around the browser's SpeechSynthesis API.
 * - Persists an enabled/disabled toggle in localStorage (default: enabled).
 * - Cancels any in-flight utterance before queuing a new one.
 * - No-ops gracefully when the API is unavailable (older browsers, some WebViews).
 *
 * IMPORTANT: Mobile browsers (especially iOS Safari and Android Chrome) require
 * speechSynthesis to be "unlocked" by a direct user gesture before any utterance
 * will actually play. Call `prime()` from a click/tap handler once per session
 * before relying on `speak()` from non-gesture contexts (e.g. useEffect).
 */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === '1';
  });

  const [primed, setPrimed] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const pendingRef = useRef<string | null>(null);

  // Pick a sensible default voice (prefer en-NZ → en-AU → en-GB → en-US → first English).
  useEffect(() => {
    if (!supported) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const order = ['en-NZ', 'en-AU', 'en-GB', 'en-US'];
      for (const lang of order) {
        const v = voices.find((vv) => vv.lang === lang);
        if (v) { voiceRef.current = v; return; }
      }
      voiceRef.current = voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [supported]);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    try { localStorage.setItem(STORAGE_KEY, value ? '1' : '0'); } catch { /* ignore */ }
    if (!value && supported) {
      window.speechSynthesis.cancel();
    }
  }, [supported]);

  /**
   * MUST be called synchronously inside a user gesture handler (onClick/onTouchStart)
   * to unlock speechSynthesis on mobile. Speaks a near-silent utterance to satisfy
   * the gesture requirement, then plays any pending text queued before priming.
   */
  const prime = useCallback(() => {
    if (!supported || primed) return;
    try {
      // Silent priming utterance — created INSIDE the gesture context.
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0;
      silent.rate = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(silent);
      setPrimed(true);

      // If something tried to speak before priming, play it now.
      if (pendingRef.current) {
        const text = pendingRef.current;
        pendingRef.current = null;
        const utter = new SpeechSynthesisUtterance(text);
        if (voiceRef.current) utter.voice = voiceRef.current;
        utter.rate = 1; utter.pitch = 1; utter.volume = 1;
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {
      console.warn('speech prime failed', e);
    }
  }, [supported, primed]);

  const speak = useCallback((text: string) => {
    if (!supported || !enabled || !text.trim()) return;
    // If we haven't been unlocked by a gesture yet, queue the latest text and
    // let `prime()` flush it on the next tap. Avoids silent failure on mobile.
    if (!primed) {
      pendingRef.current = text;
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) utter.voice = voiceRef.current;
      utter.rate = 1;
      utter.pitch = 1;
      utter.volume = 1;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('speech synthesis failed', e);
    }
  }, [supported, enabled, primed]);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, enabled, primed, setEnabled, prime, speak, stop };
}
