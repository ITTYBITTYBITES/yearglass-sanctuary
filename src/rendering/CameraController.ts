/**
 * YearGlass Sanctuary — Camera Controller
 *
 * Aspect-aware camera scale matrix for portrait mobile and desktop viewports.
 * Aligns camera target offsets directly to room scene center origin (ROOM_SCENE_OFFSET_Y = -0.05).
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
export const PORTRAIT_ROOM_SCALE = 0.20;
export const PORTRAIT_FOCUS_SCALE = 0.50;
export const DESKTOP_ROOM_SCALE = 0.38;
export const DESKTOP_FOCUS_SCALE = 0.85;

export const ROOM_SCENE_OFFSET_Y = -0.05;

export class CameraController {
  private view: CameraView = { zoom: 1.0, offsetX: 0, offsetY: ROOM_SCENE_OFFSET_Y, focusMode: false };
  private target: CameraView = { zoom: 1.0, offsetX: 0, offsetY: ROOM_SCENE_OFFSET_Y, focusMode: false };
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
    this.target.offsetY = ROOM_SCENE_OFFSET_Y;

    this.view.focusMode = false;
    this.view.zoom = 1.0;
    this.view.offsetX = 0;
    this.view.offsetY = ROOM_SCENE_OFFSET_Y;

    this.computeTargets();
  }

  private refreshViewport(): void {
    if (typeof window !== 'undefined') {
      this.viewport.width = window.innerWidth || document.documentElement.clientWidth || 375;
      this.viewport.height = window.innerHeight || document.documentElement.clientHeight || 812;
    }
  }

  get effectiveRoomScale(): number {
    const aspect = this.viewport.width / Math.max(1, this.viewport.height);
    return aspect < 1.0 ? PORTRAIT_ROOM_SCALE : DESKTOP_ROOM_SCALE;
  }

  get targetScaleFactor(): number {
    const aspect = this.viewport.width / Math.max(1, this.viewport.height);
    const isPortrait = aspect < 1.0;

    if (this.isFocused) {
      return isPortrait ? PORTRAIT_FOCUS_SCALE : DESKTOP_FOCUS_SCALE;
    }
    return isPortrait ? PORTRAIT_ROOM_SCALE : DESKTOP_ROOM_SCALE;
  }

  get currentScaleFactor(): number {
    const roomScale = this.viewport.width / Math.max(1, this.viewport.height) < 1.0 ? PORTRAIT_ROOM_SCALE : DESKTOP_ROOM_SCALE;
    return this.view.zoom * roomScale;
  }

  private computeTargets(): void {
    const { width, height } = this.viewport;
    const aspect = width / Math.max(1, height);
    const isMobile = width < MOBILE_BREAKPOINT || aspect < 1.2;

    const roomScale = aspect < 1.0 ? PORTRAIT_ROOM_SCALE : DESKTOP_ROOM_SCALE;
    const focusScale = aspect < 1.0 ? PORTRAIT_FOCUS_SCALE : DESKTOP_FOCUS_SCALE;

    if (this.target.focusMode) {
      this.target.zoom = focusScale / roomScale;
      this.target.offsetX = 0;
      this.target.offsetY = 0;
      return;
    }

    this.target.zoom = 1.0;
    this.target.offsetX = 0;
    this.target.offsetY = isMobile ? -0.03 : ROOM_SCENE_OFFSET_Y;
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

    // Target straight-on room framing origin (centers window, desk & shelf composition)
    this.target.zoom = 1.0;
    this.target.offsetX = 0;
    this.target.offsetY = ROOM_SCENE_OFFSET_Y;

    this.view.zoom = 1.0;
    this.view.offsetX = this.target.offsetX;
    this.view.offsetY = this.target.offsetY;

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
    const isFocused = this.target.focusMode || this.view.focusMode;
    const aspect = this.viewport.width / Math.max(1, this.viewport.height);
    const roomScale = aspect < 1.0 ? PORTRAIT_ROOM_SCALE : DESKTOP_ROOM_SCALE;
    const focusScale = aspect < 1.0 ? PORTRAIT_FOCUS_SCALE : DESKTOP_FOCUS_SCALE;

    if (!isFocused) {
      this.target.focusMode = false;
      this.view.focusMode = false;
      this.target.offsetX = 0;
      this.target.offsetY = ROOM_SCENE_OFFSET_Y;
    }

    const targetZoom = isFocused ? (focusScale / roomScale) : 1.0;
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
