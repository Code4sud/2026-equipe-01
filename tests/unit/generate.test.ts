import { describe, expect, it } from 'vitest';
import { plainCognitive, plainRiasec } from '../../src/engine/generate';
import { RIASEC_KEYS } from '../../src/domain/types';

describe('traductions en langage simple', () => {
  it('traduit chaque dimension RIASEC', () => {
    for (const k of RIASEC_KEYS) expect(plainRiasec(k).length).toBeGreaterThan(5);
    expect(plainRiasec('Réaliste')).toBe('aimer le concret et bouger');
  });

  it('traduit les aptitudes connues et ignore les inconnues', () => {
    expect(plainCognitive('Flexibilité des catégories')).toBe('savoir t’adapter vite');
    expect(plainCognitive('Inconnue')).toBeNull();
  });
});
