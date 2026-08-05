/**
 * YearGlass Sanctuary — Camera Controller
 *
 * Aspect-aware camera matrix calculation normalized for high-DPI (Retina) viewports.
 * Uses logical CSS dimensions exclusively (`clientWidth`/`innerHeight`) so DPR 2x/3x screens
 * never scale the camera by 2x/3x.
 * On portrait mobile (375x812, aspect < 1.0), ROOM_VIEW_SCALE produces a dome radius
 * that occupies <= 25-28% of CSS viewport height in Room View.
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

export const ROOM_VIEW_SCALE = 0.35;
export const FOCUS_VIEW_SCALE = 1.8;

export class CameraController {
  private view: CameraView = { zoom: 1.0, offsetX: 0, offsetY: 0, focusMode: false };
  private target: CameraView = { zoom: 1.0, offsetX: 0, offsetY: 0, focusMode: false };
  private light = IDLE_LIGHT;
  private reduced = false;
  private disposed = false;
  private readonly onResize: () => void;

  private viewport: { width: number; height: number } = {
    width: typeof window !== 'undefined' ? (window.innerWidth || document.documentElement.clientWidth || 375) : 375,
    height: typeof window !== 'undefined' ? (window.innerHeight || document.documentElement.clientHeight || 812) : 812,
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
    if (typeof window !== 'undefined') {
      this.viewport.width = window.innerWidth || document.documentElement.clientWidth || 375;
      this.viewport.height = window.innerHeight || document.documentElement.clientHeight || 812;
    }
  }

  get effectiveRoomScale(): number {
    const cssWidth = this.viewport.width;
    const cssHeight = this.viewport.height;
    const aspect = cssWidth / Math.max(1, cssHeight);
    const portraitFactor = aspect < 1.0 ? Math.max(0.35, aspect * 0.55) : 1.0;
    return ROOM_VIEW_SCALE * portraitFactor;
  }

  private computeTargets(): void {
    const { width, height } = this.viewport;
    const aspect = width / Math.max(1, height);
    const isMobile = width < MOBILE_BREAKPOINT || aspect < 1.2;
    const roomScale = this.effectiveRoomScale;

    if (this.target.focusMode) {
      this.target.zoom = isMobile ? (FOCUS_VIEW_SCALE / roomScale) * 1.05 : (FOCUS_VIEW_SCALE / roomScale);
      this.target.offsetX = 0;
      this.target.offsetY = 0;
      return;
    }

    if (isMobile) {
      this.target.zoom = 1.0;
      this.target.offsetX = 0;
      this.target.offsetY = -0.03;
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

  get currentScaleFactor(): number {
    return this.view.zoom * this.effectiveRoomScale;
  }

  update(dt: number): void {
    const isFocused = this.target.focusMode || this.view.focusMode;

    if (!isFocused) {
      this.target.focusMode = false;
      this.view.focusMode = false;
      this.target.offsetX = 0;
      this.target.offsetY = 0;
    }

    const roomScale = this.effectiveRoomScale;
    const targetZoom = isFocused ? (FOCUS_VIEW_SCALE / roomScale) : 1.0;
    const k = Math.min(1, dt * 8.0);

    this.view.zoom += (targetZoom - this.view.zoom) * k;
    this.view.offsetX += (this.target.offsetX - this.view.offsetX) * k;
    this.view.offsetY += (this.target.offsetY - this.view.offsetY) * k;
    this.view.focusMode = isFocused;
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
