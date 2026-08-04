/**
 * YearGlass Sanctuary — Standalone Application Entry
 *
 * Boots the sanctuary engine, handles intro screen ("I was here waiting for you."),
 * and provides global error diagnostic boundaries.
 */

import { SimulationEngine } from './simulation/SimulationEngine';

window.onerror = (msg, src, line) => {
  console.error('[YearGlass error]:', msg, src, line);
};

function ensureMount(): HTMLElement {
  let root = document.getElementById('yearglass-mount');
  if (!root) {
    root = document.createElement('div');
    root.id = 'yearglass-mount';
    root.style.cssText =
      'position:fixed;inset:0;overflow:hidden;background:#0d0d0e;color:#f0ede8;';
    const app = document.getElementById('app');
    (app || document.body).appendChild(root);
  }
  return root;
}

async function bootSanctuary(): Promise<void> {
  const mount = ensureMount();

  const intro = document.createElement('div');
  intro.className = 'yearglass-intro';
  intro.style.cssText =
    'position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;' +
    'flex-direction:column;gap:1.25rem;cursor:pointer;background:rgba(10,12,10,0.55);' +
    'backdrop-filter:blur(2px);text-align:center;padding:2rem;user-select:none;';
  intro.innerHTML =
    '<p style="font-size:clamp(1.1rem,4vw,1.6rem);opacity:0.92;max-width:28rem;color:#f0ede8;">I was here waiting for you.</p>' +
    '<p style="opacity:0.7;font-size:0.9rem;color:#d8d2c8;">tap anywhere to enter your sanctuary</p>';
  mount.appendChild(intro);

  const engine = new SimulationEngine({
    onMemory: (message) => console.log('[YearGlass memory]', message),
    onPipObserved: (visited) => console.log('[YearGlass] Pip visit #' + visited),
  });

  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    intro.style.transition = 'opacity 0.6s ease';
    intro.style.opacity = '0';
    setTimeout(() => intro.remove(), 650);
    engine.focusDome();
    try {
      await engine.mount(mount);
    } catch (err) {
      console.error('[YearGlass] mount failed:', err);
    }
  };

  intro.addEventListener('click', start, { once: true });
  intro.addEventListener('touchstart', start, { passive: true, once: true });

  intro.setAttribute('tabindex', '0');
  intro.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      start();
    }
  });

  (window as unknown as { __yearglass?: unknown }).__yearglass = engine;
}

console.log('YearGlass Sanctuary — Standalone Production Engine');
bootSanctuary().catch((e) => {
  console.error('Engine init failed:', e);
});
