/**
 * YearGlass Sanctuary — Render Pipeline
 *
 * Runs requestAnimationFrame loop at 60 FPS while active, reactively throttling
 * down to ~12 FPS after inactivity.
 * Integrates pointer/touch dome hit-testing (`onDomeTap`), background tap exit,
 * and tab visibility event loop restoration (`visibilitychange`).
 */

import { TerrariumScene, DomeHitResult } from './TerrariumScene';
import { CameraController } from './CameraController';

const HIGH_FPS = 1000 / 60;
const IDLE_FPS = 1000 / 12;
const IDLE_THROTTLE_MS = 30_000;

type FrameCallback = (dtSeconds: number) => void;
type DomeTapCallback = (normX: number, normY: number) => void;
type BackgroundTapCallback = () => void;

export class RenderPipeline {
  readonly scene: TerrariumScene;
  readonly camera: CameraController;
  private readonly onFrame: FrameCallback;
  private onDomeTapCallback: DomeTapCallback | null = null;
  private onBackgroundTapCallback: BackgroundTapCallback | null = null;

  private rafId = 0;
  private throttleId = 0;
  private lastFrame = 0;
  private lastInteraction = 0;
  private running = false;
  private disposed = false;
  private idle = false;
  private readonly listeners: Array<() => void> = [];

  constructor(
    container: HTMLElement,
    camera: CameraController,
    onFrame: FrameCallback,
    onDomeTap?: DomeTapCallback,
    onBackgroundTap?: BackgroundTapCallback
  ) {
    this.scene = new TerrariumScene(container);
    this.camera = camera;
    this.onFrame = onFrame;
    if (onDomeTap) this.onDomeTapCallback = onDomeTap;
    if (onBackgroundTap) this.onBackgroundTapCallback = onBackgroundTap;
    this.lastInteraction = performance.now();
  }

  setOnDomeTap(cb: DomeTapCallback): void {
    this.onDomeTapCallback = cb;
  }

  setOnBackgroundTap(cb: BackgroundTapCallback): void {
    this.onBackgroundTapCallback = cb;
  }

  private readonly onPointer = (ev: Event) => {
    this.lastInteraction = performance.now();
    if (this.idle) this.setIdle(false);

    const point = RenderPipeline.eventPoint(ev);
    if (point) this.camera.setPointer(point.x, point.y);
  };

  private readonly onTapOrClick = (ev: Event) => {
    this.lastInteraction = performance.now();
    if (this.idle) this.setIdle(false);

    const point = RenderPipeline.eventPoint(ev);
    if (!point) return;

    const hitResult: DomeHitResult = this.scene.isPointInDome(point.x, point.y);
    if (hitResult.hit) {
      this.scene.triggerRipple(hitResult.normX, hitResult.normY);
      if (this.onDomeTapCallback) {
        this.onDomeTapCallback(hitResult.normX, hitResult.normY);
      }
    } else if (this.camera.isFocused) {
      if (this.onBackgroundTapCallback) {
        this.onBackgroundTapCallback();
      }
    }
  };

  private static eventPoint(ev: Event): { x: number; y: number } | null {
    if (ev instanceof MouseEvent) {
      return { x: ev.clientX, y: ev.clientY };
    }
    if (typeof TouchEvent !== 'undefined' && ev instanceof TouchEvent) {
      if (ev.changedTouches.length > 0) {
        return { x: ev.changedTouches[0].clientX, y: ev.changedTouches[0].clientY };
      }
      if (ev.touches.length > 0) {
        return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      }
    }
    return null;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    const gestureTarget = this.scene.domElement;
    const register = (target: EventTarget, type: string, handler: EventListener, passive = true) => {
      target.addEventListener(type, handler, { passive });
      this.listeners.push(() => target.removeEventListener(type, handler));
    };

    register(gestureTarget, 'pointerdown', this.onPointer as EventListener);
    register(gestureTarget, 'pointermove', this.onPointer as EventListener);
    register(gestureTarget, 'touchstart', this.onPointer as EventListener);
    register(gestureTarget, 'wheel', this.onPointer as EventListener);

    register(gestureTarget, 'click', this.onTapOrClick as EventListener, false);
    register(gestureTarget, 'touchend', this.onTapOrClick as EventListener, false);

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden && this.running) {
        this.wake();
        this.lastFrame = performance.now();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
      this.listeners.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));
    }

    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    if (this.disposed || !this.running) return;

    const idleSince = now - this.lastInteraction;
    if (idleSince > IDLE_THROTTLE_MS && !this.idle) this.setIdle(true);

    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    this.camera.update(dt);
    this.scene.update(dt, this.camera.lightIntensity, this.camera.currentView.zoom);
    this.onFrame(dt);

    const frameMs = this.idle ? IDLE_FPS : HIGH_FPS;
    this.throttleId = window.setTimeout(() => {
      this.throttleId = 0;
      if (this.disposed || !this.running) return;
      this.rafId = requestAnimationFrame(this.tick);
    }, Math.max(0, frameMs - (performance.now() - now)));
  };

  private setIdle(idle: boolean): void {
    this.idle = idle;
    if (idle) {
      this.camera.setReducedQuality(true);
    } else {
      this.camera.setReducedQuality(false);
      this.lastInteraction = performance.now();
    }
  }

  get isIdle(): boolean {
    return this.idle;
  }

  wake(): void {
    this.lastInteraction = performance.now();
    if (this.idle) this.setIdle(false);
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    if (this.throttleId) {
      window.clearTimeout(this.throttleId);
      this.throttleId = 0;
    }
    for (const remove of this.listeners) {
      try {
        remove();
      } catch {
        /* ignore */
      }
    }
    this.listeners.length = 0;
    this.scene.destroy();
  }
}
