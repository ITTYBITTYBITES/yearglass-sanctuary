import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');

describe('YearGlass Standalone Sanctuary Test Suite', () => {
  it('package.json has standalone configuration', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    assert.strictEqual(pkg.name, 'yearglass-sanctuary');
    assert.ok(pkg.dependencies['pixi.js']);
    assert.ok(pkg.dependencies.gsap);
    assert.ok(pkg.dependencies.howler);
  });

  it('vite.config.ts uses relative base path for GitHub Pages', () => {
    const viteConfig = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
    assert.ok(viteConfig.includes("base: './'"));
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
});
