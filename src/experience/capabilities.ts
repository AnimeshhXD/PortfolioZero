/**
 * Capability probes with NO three.js import — main.ts uses these before deciding to load the film,
 * so the entry chunk (and the static/SEO page) stays lightweight (doc 8 §11).
 */
export function supportsWebGL2(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}
