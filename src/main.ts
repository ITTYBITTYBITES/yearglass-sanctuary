/**
 * YearGlass Sanctuary — Standalone Application Entry
 *
 * Boots the sanctuary engine, mounts room background & WebGL scene immediately,
 * and renders the original elegant arrival overlay ("I was here waiting for you.").
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

  // Create & mount the simulation engine immediately so room & scene render behind the overlay
  const engine = new SimulationEngine({
    onMemory: (message) => console.log('[YearGlass memory]', message),
    onPipObserved: (visited) => console.log('[YearGlass] Pip visit #' + visited),
  });

  try {
    await engine.mount(mount);
  } catch (err) {
    console.error('[YearGlass] mount failed:', err);
  }

  // Original arrival overlay styling & typography
  const intro = document.createElement('div');
  intro.className = 'yearglass-intro';
  intro.style.cssText =
    'position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:1.5rem;text-align:center;padding:2rem;' +
    'background:radial-gradient(circle at center, rgba(16,20,18,0.78), rgba(8,10,8,0.92));' +
    'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#f0ede8;' +
    'font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer;user-select:none;' +
    'transition:opacity 0.8s ease, filter 0.8s ease;';

  intro.innerHTML =
    '<h1 style="font-size:clamp(1.4rem,4.5vw,2.2rem);font-weight:300;letter-spacing:0.04em;color:#f5f2ea;margin:0;max-width:28rem;line-height:1.4;text-shadow:0 4px 20px rgba(0,0,0,0.6);">I was here waiting for you.</h1>' +
    '<p style="font-size:clamp(0.85rem,2.2vw,1.05rem);letter-spacing:0.12em;text-transform:uppercase;color:#bfa06a;margin:0;opacity:0.85;font-weight:600;text-shadow:0 2px 10px rgba(0,0,0,0.5);">tap anywhere to enter your sanctuary</p>';

  mount.appendChild(intro);

  let started = false;
  const dismiss = () => {
    if (started) return;
    started = true;

    // Smooth CSS opacity & blur transition
    intro.style.pointerEvents = 'none';
    intro.style.opacity = '0';
    intro.style.filter = 'blur(10px)';

    // Unmount overlay DOM element entirely after transition
    setTimeout(() => {
      intro.remove();
    }, 850);

    engine.focusDome();
  };

  intro.addEventListener('click', dismiss, { once: true });
  intro.addEventListener('touchstart', dismiss, { passive: true, once: true });

  intro.setAttribute('tabindex', '0');
  intro.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dismiss();
    }
  });

  (window as unknown as { __yearglass?: unknown }).__yearglass = engine;
}

console.log('YearGlass Sanctuary — Standalone Production Engine');
bootSanctuary().catch((e) => {
  console.error('Engine init failed:', e);
});
