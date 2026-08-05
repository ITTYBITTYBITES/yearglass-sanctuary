/**
 * YearGlass Sanctuary — Camera Controller
 *
 * Hardcoded default initial state to ROOM view mode (`zoom = 1.0`, `isFocused = false`).
 * Smoothly interpolates camera zoom between ROOM and FOCUS modes upon explicit interaction.
 */

export interface CameraView {
  zoom: number;
  offsetX: number;
  offsetY: number;
  focusMode: boolean;
}

const MOBILE_BREAKPOINT = 768;
const IDLE_LIGHT = 0.35;
const ACTIVE_LIGHT = 0.95;

export class CameraController {
  private view: CameraView = { zoom: 1.0, offsetX: 0, offsetY: 0, focusMode: false };
  private target: CameraView = { zoom: 1.0, offsetX: 0, offsetY: 0, focusMode: false };
  private light = IDLE_LIGHT;
  private reduced = false;
  private disposed = false;
  private readonly onResize: () => void;

  private viewport: { width: number; height: number } = {
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  };

  constructor() {
    this.stripPersistentState();
    this.refreshViewport();
    this.resetToRoomMode();

    this.onResize = () => {
      this.refreshViewport();
      this.computeTargets();
    };
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('orientationchange', this.onResize, { passive: true });
  }

  private stripPersistentState(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('cameraScale');
      localStorage.removeItem('viewMode');
      localStorage.removeItem('focus');
      localStorage.removeItem('isFocused');
    }
  }

  resetToRoomMode(): void {
    this.target.focusMode = false;
    this.target.zoom = 1.0;
    this.target.offsetX = 0;
    this.target.offsetY = 0;

    this.view.focusMode = false;
    this.view.zoom = 1.0;
    this.view.offsetX = 0;
    this.view.offsetY = 0;

    this.computeTargets();
  }

  private refreshViewport(): void {
    if (typeof window !== 'undefined' && window.visualViewport) {
      this.viewport.width = window.visualViewport.width || window.innerWidth;
      this.viewport.height = window.visualViewport.height || window.innerHeight;
    } else if (typeof window !== 'undefined') {
      this.viewport.width = window.innerWidth;
      this.viewport.height = window.innerHeight;
    }
  }

  private computeTargets(): void {
    const { width, height } = this.viewport;
    const aspect = width / Math.max(1, height);
    const isMobile = width < MOBILE_BREAKPOINT || aspect < 1.2;

    if (this.target.focusMode) {
      this.target.zoom = isMobile ? 1.75 : 1.65;
      this.target.offsetX = 0;
      this.target.offsetY = 0;
      return;
    }

    if (isMobile) {
      this.target.zoom = Math.max(1.0, Math.min(1.2, 1.1 / aspect));
      this.target.offsetX = 0;
      this.target.offsetY = -0.04;
    } else {
      this.target.zoom = 1.0;
      this.target.offsetX = 0;
      this.target.offsetY = -0.05;
    }
  }

  computeDesktop(): void {
    this.refreshViewport();
    this.computeTargets();
  }

  focusOnDome(): void {
    this.target.focusMode = true;
    this.view.focusMode = true;
    this.computeTargets();
  }

  enterFocus(): void {
    this.focusOnDome();
  }

  exitFocus(): void {
    this.target.focusMode = false;
    this.view.focusMode = false;
    this.target.zoom = 1.0;
    this.view.zoom = 1.0;
    this.target.offsetX = 0;
    this.target.offsetY = 0;
    this.view.offsetX = 0;
    this.view.offsetY = 0;
    this.computeTargets();
  }

  toggleFocus(): boolean {
    if (this.target.focusMode || this.view.focusMode) {
      this.exitFocus();
      return false;
    } else {
      this.enterFocus();
      return true;
    }
  }

  get isFocused(): boolean {
    return this.target.focusMode || this.view.focusMode;
  }

  update(dt: number): void {
    const k = Math.min(1, dt * 5.0);
    this.view.zoom += (this.target.zoom - this.view.zoom) * k;
    this.view.offsetX += (this.target.offsetX - this.view.offsetX) * k;
    this.view.offsetY += (this.target.offsetY - this.view.offsetY) * k;
    this.view.focusMode = this.target.focusMode;
  }

  setPointer(x: number, y: number): void {
    const dx = x / Math.max(1, this.viewport.width) - 0.5;
    const dy = y / Math.max(1, this.viewport.height) - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.light += (ACTIVE_LIGHT * Math.max(0, 1 - dist * 2) - this.light) * 0.25;
    this.light = Math.max(IDLE_LIGHT, Math.min(ACTIVE_LIGHT, this.light));
  }

  setReducedQuality(reduced: boolean): void {
    this.reduced = reduced;
  }

  get isReduced(): boolean {
    return this.reduced;
  }

  get lightIntensity(): number {
    return this.reduced ? IDLE_LIGHT * 0.7 : this.light;
  }

  get currentView(): CameraView {
    return this.view;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
  }
}
