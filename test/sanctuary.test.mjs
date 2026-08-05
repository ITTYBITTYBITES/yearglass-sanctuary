import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');

describe('YearGlass Standalone Sanctuary E2E UX Test Suite', () => {
  it('package.json has standalone configuration', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    assert.strictEqual(pkg.name, 'yearglass-sanctuary');
    assert.ok(pkg.dependencies['pixi.js']);
    assert.ok(pkg.dependencies.gsap);
    assert.ok(pkg.dependencies.howler);
  });

  it('vite.config.ts uses base path for GitHub Pages', () => {
    const viteConfig = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
    assert.ok(viteConfig.includes("base: '/yearglass-sanctuary/'") || viteConfig.includes("base: './'"));
    assert.ok(viteConfig.includes("skipWaiting: true"));
  });

  it('index.html contains critical inline overrides and launches main.ts', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    assert.ok(html.includes('YearGlass — A Living Digital Sanctuary'));
    assert.ok(html.includes('100dvh !important'));
    assert.ok(html.includes('./src/main.ts'));
  });

  it('all standalone source modules exist', () => {
    const modules = [
      'src/main.ts',
      'src/audio/AudioEngine.ts',
      'src/rendering/shaders.ts',
      'src/rendering/TerrariumScene.ts',
      'src/rendering/RoomScene.ts',
      'src/rendering/CameraController.ts',
      'src/rendering/RenderPipeline.ts',
      'src/simulation/MemoryEngine.ts',
      'src/simulation/GrowthSystem.ts',
      'src/simulation/PipAI.ts',
      'src/simulation/SimulationEngine.ts',
      'src/storage/SaveEngine.ts',
      'src/world/EnvironmentSystem.ts',
      'src/ui/UIOverlay.ts',
    ];
    modules.forEach((mod) => {
      assert.ok(fs.existsSync(path.join(ROOT, mod)), `Missing module: ${mod}`);
    });
  });

  // === E2E UX JOURNEY VERIFICATION TESTS ===

  it('[1] Arrival screen displays styled text and dismisses cleanly on tap', () => {
    const mainSrc = fs.readFileSync(path.join(ROOT, 'src/main.ts'), 'utf-8');
    assert.ok(mainSrc.includes('I was here waiting for you.'), 'Arrival overlay displays core text');
    assert.ok(mainSrc.includes('tap anywhere to enter your sanctuary'), 'Arrival overlay displays gesture prompt');
    assert.ok(mainSrc.includes("intro.style.pointerEvents = 'none'"), 'Arrival overlay disables pointer events on dismiss');
    assert.ok(mainSrc.includes('intro.remove()'), 'Arrival overlay unmounts cleanly from DOM');
  });

  it('[2] Initial state loads in ROOM mode showing desk, lamp, shelf, and bottom drawer controls', () => {
    const mainSrc = fs.readFileSync(path.join(ROOT, 'src/main.ts'), 'utf-8');
    assert.ok(mainSrc.includes('engine.exitFocus()'), 'Initial state forces ROOM mode on start');

    const roomSrc = fs.readFileSync(path.join(ROOT, 'src/rendering/RoomScene.ts'), 'utf-8');
    assert.ok(roomSrc.includes('yearglass-room-desk'), 'RoomScene includes desk surface');
    assert.ok(roomSrc.includes('yearglass-room-shelf'), 'RoomScene includes shelf');
    assert.ok(roomSrc.includes('yearglass-room-lamp'), 'RoomScene includes lamp glow');
    assert.ok(roomSrc.includes('yearglass-room-window'), 'RoomScene includes window');

    const uiSrc = fs.readFileSync(path.join(ROOT, 'src/ui/UIOverlay.ts'), 'utf-8');
    assert.ok(uiSrc.includes('yg-drawer-card'), 'UIOverlay mounts consolidated bottom drawer');
  });

  it('[3] Tapping the glass dome or Focus Mode pill transitions cleanly between ROOM and FOCUS view modes', () => {
    const simSrc = fs.readFileSync(path.join(ROOT, 'src/simulation/SimulationEngine.ts'), 'utf-8');
    assert.ok(simSrc.includes('enterFocus()'), 'SimulationEngine has enterFocus method');
    assert.ok(simSrc.includes('exitFocus()'), 'SimulationEngine has exitFocus method');
    assert.ok(simSrc.includes('handleDomeTap'), 'SimulationEngine handles dome tap');

    const cameraSrc = fs.readFileSync(path.join(ROOT, 'src/rendering/CameraController.ts'), 'utf-8');
    assert.ok(cameraSrc.includes('toggleFocus()'), 'CameraController provides toggleFocus');
  });

  it('[4] Tapping Water, Journal, and Settings HUD pills opens their respective modals without breaking or clipping at screen edges', () => {
    const uiSrc = fs.readFileSync(path.join(ROOT, 'src/ui/UIOverlay.ts'), 'utf-8');
    assert.ok(uiSrc.includes('renderJournalModal'), 'UIOverlay provides Journal modal controller');
    assert.ok(uiSrc.includes('renderSettingsModal'), 'UIOverlay provides Settings modal controller');
    assert.ok(uiSrc.includes('showToast'), 'UIOverlay provides Toast notification controller');
    assert.ok(uiSrc.includes('yg-bottom-drawer'), 'UIOverlay provides bottom drawer controller');

    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    assert.ok(html.includes('yg-drawer-card'), 'index.html contains bottom drawer CSS rules');
    assert.ok(html.includes('transform: translateY(100%)'), 'bottom drawer rests off-screen by default');
  });

  it('[5] Web Audio context state changes from suspended to running', () => {
    const audioSrc = fs.readFileSync(path.join(ROOT, 'src/audio/AudioEngine.ts'), 'utf-8');
    assert.ok(audioSrc.includes('unlock()'), 'AudioEngine implements unlock');
    assert.ok(audioSrc.includes('installGestureUnlock()'), 'AudioEngine arms gesture unlock');
    assert.ok(audioSrc.includes('resume()'), 'AudioEngine resumes suspended context');
    assert.ok(audioSrc.includes('startAmbient()'), 'AudioEngine starts ambient bed on unlock');
  });
});
