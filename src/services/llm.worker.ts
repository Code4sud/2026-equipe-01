/// <reference lib="webworker" />
/**
 * Web Worker WebLLM : le modèle tourne hors du thread principal pour que
 * l'interface (feed, story) reste fluide pendant le chargement et la génération.
 */
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg);
