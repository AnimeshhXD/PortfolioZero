#!/usr/bin/env node
/**
 * Keyframe screenshot harness (doc 9 §10.2 "visual regression": record per-scene keyframes).
 *
 *   node scripts/shoot.mjs --scenes boot,lawlens --at 0,0.2,0.4,0.6,0.8,1 --out shots/run1
 *   node scripts/shoot.mjs --tx lawlens:0.25,0.5,0.75          (transition band after a scene)
 *   node scripts/shoot.mjs --shots "identity:0.72;tx-lawlens:0.5"   (exact scene:progress pairs)
 *   options: --size 1440x900  --tier high|medium|low  --motion full|reduced  --url http://127.0.0.1:5173
 *            --mobile (390x844, touch, coarse pointer)  --wait 900 (ms extra settle after ready)
 *
 * Uses the system Microsoft Edge / Google Chrome through playwright-core (no browser download).
 * Starts its own Vite dev server on a free port unless --url is given. Prints console errors.
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright-core';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return acc;
  }, []),
);

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = args.browser ?? BROWSERS.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No Chromium-based browser found. Pass --browser <path>.');
  process.exit(1);
}

const mobile = args.mobile === 'true';
const [w, h] = (args.size ?? (mobile ? '390x844' : '1440x900')).split('x').map(Number);
const outDir = resolve(args.out ?? 'shots/latest');
mkdirSync(outDir, { recursive: true });
const extraWait = Number(args.wait ?? 700);

let server = null;
let baseUrl = args.url;
// Isolated dep-optimizer cache per run: parallel shoots must not race on node_modules/.vite.
const cacheDir = join(tmpdir(), `pz-vite-${process.pid}-${Date.now()}`);
if (!baseUrl) {
  const { createServer } = await import('vite');
  server = await createServer({ cacheDir, server: { port: 0, host: '127.0.0.1', strictPort: false, hmr: false }, logLevel: 'error' });
  await server.listen();
  const addr = server.httpServer.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const context = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: 1,
  hasTouch: mobile,
  isMobile: mobile,
  reducedMotion: args.motion === 'reduced' ? 'reduce' : 'no-preference',
});
const page = await context.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

const q = new URLSearchParams({ debug: '1' });
if (args.tier) q.set('tier', args.tier);
if (args.motion) q.set('motion', args.motion);

async function waitSettled(timeout = 60000) {
  await page.waitForFunction(() => window.__PZ__ && window.__PZ__.state().settled, null, { timeout, polling: 100 });
  await page.waitForTimeout(extraWait);
}

const shots = [];
const scenes = (args.scenes ?? '').split(',').filter(Boolean);
const at = (args.at ?? '0,0.2,0.4,0.6,0.8,1').split(',').map(Number);
for (const s of scenes) for (const p of at) shots.push({ kind: 'scene', id: s, p });
// --shots "identity:0.72;lawlens:0.64;tx-lawlens:0.5" — exact (scene, progress) pairs; tx- prefix = transition band
for (const spec of (args.shots ?? '').split(';').filter(Boolean)) {
  const [rawId, p] = spec.split(':');
  const tx = rawId.startsWith('tx-');
  shots.push({ kind: tx ? 'tx' : 'scene', id: tx ? rawId.slice(3) : rawId, p: Number(p) });
}
for (const spec of (args.tx ?? '').split(';').filter(Boolean)) {
  const [id, list] = spec.split(':');
  for (const t of (list ?? '0.25,0.5,0.75').split(',').map(Number)) shots.push({ kind: 'tx', id, p: t });
}
if (shots.length === 0) shots.push({ kind: 'scene', id: 'boot', p: 0.2 });

const first = shots[0];
q.set('seek', `${first.id}:${first.kind === 'scene' ? first.p : 1}`);
const t0 = Date.now();
await page.goto(`${baseUrl}/?${q.toString()}`, { waitUntil: 'load', timeout: 120000 });
try {
  await page.waitForFunction(() => !!window.__PZ__, null, { timeout: 60000, polling: 100 });
} catch {
  console.error('Experience never exposed window.__PZ__. Console:');
  for (const e of errors) console.error('  ' + e);
  const mode = await page.evaluate(() => document.documentElement.className);
  console.error('html class:', mode);
  await browser.close();
  if (server) await server.close();
  process.exit(1);
}

const report = [];
for (const s of shots) {
  if (s.kind === 'scene') await page.evaluate(([id, p]) => window.__PZ__.seek(id, p), [s.id, s.p]);
  else await page.evaluate(([id, p]) => window.__PZ__.seekTransition(id, p), [s.id, s.p]);
  try {
    await waitSettled();
  } catch {
    errors.push(`[timeout] settling ${s.kind}:${s.id}:${s.p}`);
  }
  const name = `${s.kind === 'tx' ? 'tx-' : ''}${s.id}-${String(Math.round(s.p * 100)).padStart(3, '0')}.png`;
  const file = resolve(outDir, name);
  await page.screenshot({ path: file });
  const state = await page.evaluate(() => window.__PZ__.state());
  report.push({ file, ...state });
  console.log(`shot ${name}  scene=${state.sceneId} seg=${state.segment} p=${state.progress.toFixed(3)} fps=${state.fps} tier=${state.tier}`);
}

console.log(`\n${shots.length} shots in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${outDir}`);
const unique = [...new Set(errors)];
if (unique.length) {
  console.log(`\nConsole errors/warnings (${unique.length}):`);
  for (const e of unique.slice(0, 40)) console.log('  ' + e);
} else {
  console.log('No console errors.');
}

await browser.close();
if (server) await server.close();
try {
  rmSync(cacheDir, { recursive: true, force: true });
} catch {
  /* temp cache cleanup is best-effort */
}
