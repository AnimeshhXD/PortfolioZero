/**
 * Minimal browser globals for director unit tests in a Node environment.
 * Only what ScrollDirector / AccessibilityDirector touch at construction time.
 */
type Listener = (...args: unknown[]) => void;

const g = globalThis as unknown as Record<string, unknown>;

export const scrollState = { y: 0, calls: [] as Array<{ top: number }> };

g.innerHeight = 900;
g.innerWidth = 1440;
g.window = globalThis;
g.addEventListener = (_t: string, _l: Listener) => undefined;
g.removeEventListener = (_t: string, _l: Listener) => undefined;
g.scrollTo = (opts: { top: number }) => {
  scrollState.y = opts.top;
  scrollState.calls.push(opts);
};
Object.defineProperty(globalThis, 'scrollY', { get: () => scrollState.y, configurable: true });
g.matchMedia = () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined });

export function fakeTrack(): HTMLElement {
  return { style: {} as CSSStyleDeclaration } as HTMLElement;
}
