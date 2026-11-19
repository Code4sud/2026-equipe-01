/**
 * Le bandeau Code4Sud (obligatoire) est injecté par un script externe et sa
 * hauteur varie (1 ligne sur desktop, 2 sur mobile). On la mesure en direct
 * dans la variable CSS --banner-h pour que le « téléphone » tienne à l'écran.
 */
export const BANNER_ID = 'c4s-bandeau';

export function trackBannerHeight(doc: Document = document): () => void {
  const root = doc.documentElement;
  let resize: ResizeObserver | undefined;

  const apply = (el: HTMLElement) => {
    root.style.setProperty('--banner-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
  };

  const attach = (): boolean => {
    const el = doc.getElementById(BANNER_ID);
    if (!el) return false;
    apply(el);
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(() => apply(el));
      resize.observe(el);
    }
    return true;
  };

  if (attach()) return () => resize?.disconnect();

  const mutation = new MutationObserver(() => {
    if (attach()) mutation.disconnect();
  });
  mutation.observe(doc.body, { childList: true });
  return () => {
    mutation.disconnect();
    resize?.disconnect();
  };
}
