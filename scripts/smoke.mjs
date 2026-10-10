#!/usr/bin/env node
/**
 * End-to-end smoke test against the PRODUCTION build (run `npm run build` first):
 * autoplay · wheel scroll · End → Ending with focus on a portal · Home · motion toggle · static fallback.
 *
 *   node scripts/smoke.mjs
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = BROWSERS.find((p) => existsSync(p));
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ executablePath, headless: true, args: ['--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const state = () => page.evaluate(() => window.__PZ__.state());
const waitFor = async (fn, timeout) => {
  const t0 = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - t0 > timeout) return s;
    await page.waitForTimeout(250);
  }
};

try {
  await page.goto(`${base}/?debug&tier=medium`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__PZ__, null, { timeout: 60000 });

  // 1. autoplay advances Scene 0 on its own
  const auto = await waitFor((s) => s.progress > 0.12, 9000);
  check('autoplay plays the boot sequence', auto.sceneId === 'boot' && auto.progress > 0.12, `progress ${auto.progress.toFixed(2)}`);

  // 2. scrolling drives the timeline forward (and fast scrolling is rate-limited, not skipped)
  await page.mouse.move(700, 450);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(60);
  }
  const scrolled = await waitFor((s) => s.position > 230, 8000);
  check('wheel scroll moves past the boot band', scrolled.position > 230, `${scrolled.sceneId} @ ${scrolled.position.toFixed(0)} units`);

  // 3. End → fog cut to the ending, focus lands on the first contact portal
  await page.keyboard.press('End');
  const end = await waitFor((s) => s.sceneId === 'ending' && s.progress > 0.9, 20000);
  check('End reaches the ending hold', end.sceneId === 'ending' && end.progress > 0.9, `${end.sceneId} p=${end.progress.toFixed(2)}`);
  await page.waitForTimeout(800);
  const focus = await page.evaluate(() => ({
    cls: document.activeElement?.className ?? '',
    label: document.activeElement?.getAttribute('aria-label') ?? '',
    live: [...document.querySelectorAll('.pz-portal[data-state="live"]')].map((a) => a.getAttribute('href')),
  }));
  check('keyboard focus lands on a contact portal', focus.cls.includes('pz-portal'), focus.label);
  check('four contact portals are live', focus.live.length === 4, focus.live.join('  '));

  // 4. Tab moves through the portals only (no hidden duplicates in the tab order)
  await page.keyboard.press('Tab');
  const next = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName);
  check('Tab reaches the next portal', /github\.com|linkedin\.com|@|Résumé/i.test(next ?? ''), String(next));

  // 5. Home → back to the beginning
  await page.keyboard.press('Home');
  const home = await waitFor((s) => s.sceneId === 'boot', 20000);
  check('Home returns to the boot sequence', home.sceneId === 'boot', `${home.sceneId} @ ${home.position.toFixed(0)}`);

  // 6. motion toggle
  await page.click('.pz-motion-toggle');
  const reduced = await page.evaluate(() => document.documentElement.classList.contains('pz-reduced'));
  check('motion toggle switches to reduced motion', reduced);

  // 7. static fallback (no WebGL / ?static): semantic content becomes the page
  const s2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await s2.goto(`${base}/?static`, { waitUntil: 'load' });
  await s2.waitForTimeout(500);
  const stat = await s2.evaluate(() => ({
    mode: document.documentElement.classList.contains('pz-static-mode'),
    h: document.getElementById('content')?.getBoundingClientRect().height ?? 0,
    canvas: getComputedStyle(document.getElementById('pz-stage')).display,
    projects: document.querySelectorAll('.pz-static__project').length,
  }));
  check('static fallback renders the semantic page', stat.mode && stat.h > 1500 && stat.canvas === 'none' && stat.projects === 6, JSON.stringify(stat));
  await s2.close();

  check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (e) {
  check('smoke run', false, e.message);
}

await browser.close();
await new Promise((r) => server.httpServer.close(r));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
