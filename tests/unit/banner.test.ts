import { afterEach, describe, expect, it } from 'vitest';
import { BANNER_ID, trackBannerHeight } from '../../src/lib/banner';

function addBanner(height: number) {
  const el = document.createElement('div');
  el.id = BANNER_ID;
  el.getBoundingClientRect = () => ({ height }) as DOMRect;
  document.body.insertBefore(el, document.body.firstChild);
  return el;
}

afterEach(() => {
  document.getElementById(BANNER_ID)?.remove();
  document.documentElement.style.removeProperty('--banner-h');
});

describe('trackBannerHeight', () => {
  it('mesure un bandeau déjà présent', () => {
    addBanner(55.4);
    const stop = trackBannerHeight();
    expect(document.documentElement.style.getPropertyValue('--banner-h')).toBe('56px');
    stop();
  });

  it('attend l’injection du bandeau par le script externe', async () => {
    const stop = trackBannerHeight();
    expect(document.documentElement.style.getPropertyValue('--banner-h')).toBe('');
    addBanner(38);
    await new Promise((r) => setTimeout(r, 0));
    expect(document.documentElement.style.getPropertyValue('--banner-h')).toBe('38px');
    stop();
  });
});
