import { afterEach, describe, expect, it, vi } from 'vitest';
import { radarPoints, toPath } from '../../src/lib/radar';
import { canSpeak, speak, stopSpeaking } from '../../src/lib/speech';

describe('radarPoints', () => {
  it('place le premier axe en haut et le 4e en bas (hexagone)', () => {
    const pts = radarPoints([100, 0, 0, 100, 0, 0], 50, 100);
    expect(pts[0]).toEqual({ x: 100, y: 50 });
    expect(pts[3]).toEqual({ x: 100, y: 150 });
    expect(pts[1]).toEqual({ x: 100, y: 100 });
  });

  it('borne les valeurs hors échelle et les valeurs invalides', () => {
    const pts = radarPoints([500, -10, Number.NaN], 10, 0);
    expect(pts[0]).toEqual({ x: 0, y: -10 });
    expect(pts[1]).toEqual({ x: 0, y: 0 });
    expect(pts[2]).toEqual({ x: 0, y: 0 });
  });

  it('produit un attribut points SVG', () => {
    expect(toPath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('1,2 3,4');
  });
});

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
