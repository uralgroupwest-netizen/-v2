#!/usr/bin/env node
/**
 * render.mjs — превращает страницу (файл или URL) в кадры, которые видит критик ремесла.
 *
 * Зависимостей нет: говорит с Chrome напрямую по CDP через встроенный в Node WebSocket.
 * Нужен Node 22+ (или 21+) и любой Chrome/Chromium на машине.
 *
 *   node render.mjs index.html --out renders --name hero
 *   node render.mjs http://localhost:3000 --out renders --mobile --pdf
 *
 * Опции:
 *   --out DIR        куда класть кадры (по умолчанию ./renders)
 *   --name PREFIX    префикс имён файлов (по умолчанию из имени цели)
 *   --viewport WxH   десктопный вьюпорт (по умолчанию 1440x900)
 *   --dpr N          плотность пикселей (по умолчанию 2)
 *   --mobile         добавить мобильный проход 390x844 @3
 *   --no-screens     не резать страницу на поэкранные кадры
 *   --no-full        не снимать длинный кадр всей страницы
 *   --pdf            дополнительно напечатать в PDF
 *   --wait MS        пауза после загрузки (по умолчанию 1200)
 *   --timeline N     раскадровка анимации: N кадров вьюпорта подряд, без прокрутки
 *   --interval MS    шаг раскадровки (по умолчанию 250)
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MAX_PX = 16000; // дальше Chrome не отдаёт скриншот одним куском

function parseArgs(argv) {
  const opts = {
    out: 'renders', name: null, viewport: '1440x900', dpr: 2,
    mobile: false, screens: true, full: true, pdf: false, wait: 1200, target: null,
    timeline: 0, interval: 250,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') opts.out = argv[++i];
    else if (a === '--name') opts.name = argv[++i];
    else if (a === '--viewport') opts.viewport = argv[++i];
    else if (a === '--dpr') opts.dpr = Number(argv[++i]);
    else if (a === '--wait') opts.wait = Number(argv[++i]);
    else if (a === '--timeline') opts.timeline = Number(argv[++i]);
    else if (a === '--interval') opts.interval = Number(argv[++i]);
    else if (a === '--mobile') opts.mobile = true;
    else if (a === '--no-screens') opts.screens = false;
    else if (a === '--no-full') opts.full = false;
    else if (a === '--pdf') opts.pdf = true;
    else if (!a.startsWith('--')) opts.target = a;
  }
  return opts;
}

async function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/opt/pw-browsers',
    path.join(os.homedir(), '.cache/ms-playwright'),
    path.join(os.homedir(), 'Library/Caches/ms-playwright'),
  ].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    let entries = [];
    try { entries = await readdir(root); } catch { continue; }
    const dirs = entries.filter((e) => e.startsWith('chromium-')).sort().reverse();
    for (const d of dirs) {
      for (const rel of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
        const p = path.join(root, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  const pf = process.env['PROGRAMFILES'] || 'C:\\Program Files';
  const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const local = process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local');
  const fixed = [
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // Linux
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
    // Windows: Edge тоже на Chromium и умеет CDP, поэтому годится запасным вариантом
    path.join(pf, 'Google/Chrome/Application/chrome.exe'),
    path.join(pf86, 'Google/Chrome/Application/chrome.exe'),
    path.join(local, 'Google/Chrome/Application/chrome.exe'),
    path.join(pf86, 'Microsoft/Edge/Application/msedge.exe'),
    path.join(pf, 'Microsoft/Edge/Application/msedge.exe'),
  ];
  return fixed.find((p) => existsSync(p)) || null;
}

function launch(chrome) {
  const userDataDir = path.join(os.tmpdir(), `design-loop-${Date.now()}`);
  const proc = spawn(chrome, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${userDataDir}`,
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--disable-gpu',
    '--force-color-profile=srgb', '--font-render-hinting=none',
    '--disable-background-timer-throttling', '--allow-file-access-from-files', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome не отдал адрес DevTools за 20 секунд')), 20000);
    let buf = '';
    proc.stderr.on('data', (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/ws:\/\/[^\s]+/);
      if (m) { clearTimeout(timer); resolve({ proc, wsUrl: m[0] }); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Chrome завершился с кодом ${code}: ${buf.slice(-500)}`)); });
  });
}

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id);
        msg.error ? reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? '')})`)) : resolve(msg.result);
      } else if (msg.method) {
        (this.events.get(msg.method) || []).forEach((fn) => fn(msg.params));
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  once(method) { return new Promise((resolve) => {
    const list = this.events.get(method) || []; const fn = (p) => {
      this.events.set(method, (this.events.get(method) || []).filter((f) => f !== fn)); resolve(p);
    };
    this.events.set(method, [...list, fn]);
  }); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(cdp, sid, { url, width, height, dpr, label, outDir, prefix, opts }) {
  const written = [];
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: dpr, mobile: label === 'mobile' }, sid);
  await cdp.send('Page.navigate', { url }, sid);
  await Promise.race([cdp.once('Page.loadEventFired'), sleep(15000)]);

  // Раскадровка снимается сразу после загрузки: прокрутка и долгая пауза
  // съедают ровно то движение, которое критик и должен увидеть.
  if (opts.timeline > 0) {
    for (let i = 0; i < opts.timeline; i++) {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sid);
      const file = path.join(outDir, `${prefix}-${label}-t${String(i + 1).padStart(2, '0')}.png`);
      await writeFile(file, Buffer.from(data, 'base64')); written.push(file);
      if (i < opts.timeline - 1) await sleep(opts.interval);
    }
    if (!opts.full && !opts.screens) return written;
  }

  await sleep(opts.wait);

  // Прокрутить страницу до низа и обратно: иначе reveal-on-scroll блоки
  // останутся прозрачными и критик будет судить пустые экраны.
  const { result: metrics } = await cdp.send('Runtime.evaluate', { expression: `
    (async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < h; y += window.innerHeight) {
        window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120));
      }
      window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 400));
      return JSON.stringify({ h: document.documentElement.scrollHeight, w: window.innerWidth });
    })()`, awaitPromise: true, returnByValue: true }, sid);
  const pageHeight = JSON.parse(metrics.value).h;

  if (opts.full) {
    const safeDpr = Math.max(1, Math.min(dpr, Math.floor(MAX_PX / Math.max(pageHeight, 1))));
    if (pageHeight <= MAX_PX) {
      if (safeDpr < dpr) console.warn(`  ! длинная страница (${pageHeight}px): dpr снижен до ${safeDpr}`);
      await cdp.send('Emulation.setDeviceMetricsOverride',
        { width, height, deviceScaleFactor: safeDpr, mobile: label === 'mobile' }, sid);
      const { data } = await cdp.send('Page.captureScreenshot',
        { format: 'png', captureBeyondViewport: true }, sid);
      const file = path.join(outDir, `${prefix}-${label}-full.png`);
      await writeFile(file, Buffer.from(data, 'base64')); written.push(file);
      await cdp.send('Emulation.setDeviceMetricsOverride',
        { width, height, deviceScaleFactor: dpr, mobile: label === 'mobile' }, sid);
    } else {
      console.warn(`  ! страница ${pageHeight}px — длинный кадр пропущен, смотри поэкранные`);
    }
  }

  if (opts.screens) {
    const count = Math.min(Math.ceil(pageHeight / height), 24);
    for (let i = 0; i < count; i++) {
      await cdp.send('Runtime.evaluate',
        { expression: `window.scrollTo(0, ${i * height})`, returnByValue: true }, sid);
      await sleep(450); // дать доиграть появлению блоков
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sid);
      const file = path.join(outDir, `${prefix}-${label}-${String(i + 1).padStart(2, '0')}.png`);
      await writeFile(file, Buffer.from(data, 'base64')); written.push(file);
    }
  }

  if (opts.pdf && label === 'desktop') {
    const { data } = await cdp.send('Page.printToPDF', { printBackground: true }, sid);
    const file = path.join(outDir, `${prefix}.pdf`);
    await writeFile(file, Buffer.from(data, 'base64')); written.push(file);
  }
  return written;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.target) { console.error('Укажи файл или URL: node render.mjs index.html --out renders'); process.exit(1); }
  if (typeof globalThis.WebSocket === 'undefined') {
    console.error('Нужен Node 22+ (встроенный WebSocket). Текущий: ' + process.version); process.exit(1);
  }
  const url = /^https?:|^file:/.test(opts.target) ? opts.target : 'file://' + path.resolve(opts.target);
  const prefix = opts.name || path.basename(opts.target).replace(/\.[a-z]+$/i, '').replace(/[^\w.-]+/g, '-') || 'page';
  const outDir = path.resolve(opts.out);
  await mkdir(outDir, { recursive: true });

  const chrome = await findChrome();
  if (!chrome) { console.error('Chrome не найден. Задай путь через CHROME_PATH=...'); process.exit(1); }

  const { proc, wsUrl } = await launch(chrome);
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
  const cdp = new Cdp(ws);
  const written = [];
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);

    const [w, h] = opts.viewport.split('x').map(Number);
    console.log(`→ десктоп ${w}x${h} @${opts.dpr}`);
    written.push(...await shoot(cdp, sessionId, { url, width: w, height: h, dpr: opts.dpr, label: 'desktop', outDir, prefix, opts }));
    if (opts.mobile) {
      console.log('→ мобильный 390x844 @3');
      written.push(...await shoot(cdp, sessionId, { url, width: 390, height: 844, dpr: 3, label: 'mobile', outDir, prefix, opts }));
    }
  } finally {
    try { ws.close(); } catch {}
    proc.kill();
  }
  console.log(`\nКадры (${written.length}) в ${outDir}:`);
  written.forEach((f) => console.log('  ' + path.relative(process.cwd(), f)));
}

main().catch((e) => { console.error('Рендер сорвался: ' + e.message); process.exit(1); });
