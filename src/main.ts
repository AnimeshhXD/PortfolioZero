/**
 * PROJECT ZERO — entry.
 * WebGL2 available → the film. Otherwise (or ?static) → the semantic page, styled as a quiet film still.
 */
import '@fontsource-variable/sora';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/global.css';
import { supportsWebGL2 } from './experience/capabilities';
import type { DebugState } from './experience/ExperienceRoot';
import type { SceneId } from './types/scene';

declare global {
  interface Window {
    __PZ__?: {
      seek(id: SceneId, progress: number): void;
      seekTransition(id: SceneId, t: number): void;
      state(): DebugState;
    };
  }
}

function staticMode(): void {
  document.documentElement.classList.remove('pz-film');
  document.documentElement.classList.add('pz-static-mode');
  document.querySelectorAll<HTMLAnchorElement>('#content a').forEach((a) => a.removeAttribute('tabindex'));
}

async function loadFonts(): Promise<void> {
  const faces = [
    "600 64px 'Sora Variable'",
    "300 32px 'Sora Variable'",
    "400 16px 'Inter Variable'",
    "500 13px 'Inter Variable'",
    "400 14px 'JetBrains Mono Variable'",
  ];
  const timeout = new Promise<void>((r) => window.setTimeout(r, 2500));
  await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f))).then(() => undefined), timeout]);
}

async function boot(): Promise<void> {
  const params = new URLSearchParams(location.search);
  if (params.has('static') || !supportsWebGL2()) {
    staticMode();
    return;
  }
  document.documentElement.classList.add('pz-film');
  // The film's portals are the keyboard path; the semantic copy stays available to screen readers.
  document.querySelectorAll<HTMLAnchorElement>('#content a').forEach((a) => (a.tabIndex = -1));

  await loadFonts();
  const { ExperienceRoot } = await import('./experience/ExperienceRoot');
  const canvas = document.getElementById('pz-stage') as HTMLCanvasElement;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    staticMode();
  });
  const experience = new ExperienceRoot({
    canvas,
    textLayer: document.getElementById('pz-text') as HTMLElement,
    overlay: document.getElementById('pz-overlay') as HTMLElement,
    track: document.getElementById('pz-track') as HTMLElement,
  });
  if (params.has('debug')) {
    window.__PZ__ = {
      seek: (id, p) => experience.seek(id, p),
      seekTransition: (id, t) => experience.seekTransition(id, t),
      state: () => experience.debugState(),
    };
  }
  await experience.start();
  document.documentElement.classList.add('pz-ready');
}

boot().catch((err) => {
  console.error('[PROJECT ZERO] falling back to static mode', err);
  staticMode();
});
