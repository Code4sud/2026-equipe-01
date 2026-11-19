/**
 * Lecture vocale du débrief via la Web Speech API (aucune clé, aucun réseau).
 * Dégrade silencieusement si le navigateur ne la supporte pas.
 */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function speak(text: string, onEnd?: () => void): boolean {
  if (!canSpeak()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = 1.05;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('fr'));
  if (voice) u.voice = voice;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
