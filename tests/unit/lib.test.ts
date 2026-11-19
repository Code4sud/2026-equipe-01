import { afterEach, describe, expect, it, vi } from 'vitest';
import { canSpeak, speak, stopSpeaking } from '../../src/lib/speech';

describe('speech', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renvoie false sans Web Speech API', () => {
    expect(canSpeak()).toBe(false);
    expect(speak('bonjour')).toBe(false);
    expect(() => stopSpeaking()).not.toThrow();
  });

  it('lit le texte en français quand l’API existe', () => {
    const spoken: Array<{ text: string; lang: string }> = [];
    const synth = { cancel: vi.fn(), speak: vi.fn((u) => spoken.push(u)), getVoices: () => [] };
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        lang = '';
        rate = 1;
        constructor(public text: string) {}
      },
    );
    expect(speak('Salut')).toBe(true);
    expect(spoken[0]).toMatchObject({ text: 'Salut', lang: 'fr-FR' });
    stopSpeaking();
    expect(synth.cancel).toHaveBeenCalledTimes(2);
  });
});
