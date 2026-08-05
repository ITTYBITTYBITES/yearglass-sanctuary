/**
 * YearGlass Sanctuary — Terrarium Scene (5-layer depth stack & hit-testing)
 *
 * The terrarium is rendered into a WebGL2 framebuffer or Canvas 2D fallback in five ordered layers:
 *   Layer 5: Glass Highlight & Distortion Filter (refraction/specular/rim)
 *   Layer 4: Foreground Soil Edge & Overhanging Flora
 *   Layer 3: Active Stage (Pip FSM + primary growth nodes)
 *   Layer 2: Background Moss & Secondary Flora
 *   Layer 1: Inner Bioluminescence & Ambient Backlight
 *
 * Integrates the side-profile RoomScene backdrop (wall, window, shelves, desk, props)
 * rendering the terrarium as a clear bell-jar glass cloche resting flat on a wooden tray base on DESK_SURFACE_Y in Room View.
 *
 * Implements hit-testing for terrarium dome and interactive desk props (camera, journal, lamp, mug, radio, window, shelf),
 * and snapshot capture for Photo mode.
 *
 * Implements robust WebGL context loss recovery (`webglcontextrestored`) and
 * Canvas 2D fallback composition.
 */

import { GlassProgram, DEFAULT_GLASS_UNIFORMS, GlassUniforms } from './shaders';
import type { RoomScene } from './RoomScene';
import type { PlantNode } from '../simulation/GrowthSystem';
import type { PipObservation } from '../simulation/PipAI';

export interface SceneSize {
  width: number;
  height: number;
  dpr: number;
}

export const DOME_CURVE = 0.28;

interface LayerSpec {
  key: string;
  depth: number;
  tint: string;
  alpha: number;
}

const LAYERS: LayerSpec[] = [
  { key: 'bioluminescence', depth: 1, tint: '#1e3a34', alpha: 0.08 },
  { key: 'backgroundMoss', depth: 2, tint: '#223c30', alpha: 0.05 },
  { key: 'activeStage', depth: 3, tint: '#2c4a38', alpha: 0.05 },
  { key: 'foregroundSoil', depth: 4, tint: '#3a2f24', alpha: 0.05 },
  { key: 'glass', depth: 5, tint: '#bcd8ee', alpha: 0.08 },
];

export interface DomeHitResult {
  hit: boolean;
  normX: number;
  normY: number;
}

export type SceneHitType = 'dome' | 'camera' | 'journal' | 'lamp' | 'mug' | 'radio' | 'window' | 'shelf' | 'none';

export interface SceneHitResult {
  type: SceneHitType;
  normX: number;
  normY: number;
}

export class TerrariumScene {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly sceneCanvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private gl: WebGL2RenderingContext | null = null;
  private program: GlassProgram | null = null;
  private sceneTexture: WebGLTexture | null = null;
  private quad: WebGLBuffer | null = null;

  private readonly uniforms: GlassUniforms;
  private size: SceneSize = { width: 320, height: 240, dpr: 1 };
  private disposed = false;
  private readonly onResize: () => void;

  private roomScene: RoomScene | null = null;
  private plantNodes: PlantNode[] = [];
  private pipObservation: PipObservation | null = null;
  private soilMoisture = 0.8;
  private cameraZoom = 1.0;
  private isFocused = false;
  private cameraOffsetX = 0;
  private cameraOffsetY = 0;

  setCameraZoom(zoom: number): void {
    this.cameraZoom = zoom;
  }

  setRoomScene(room: RoomScene): void {
    this.roomScene = room;
  }

  setFocusState(isFocused: boolean, offsetX = 0, offsetY = 0): void {
    this.isFocused = isFocused;
    this.cameraOffsetX = offsetX;
    this.cameraOffsetY = offsetY;
  }

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'yearglass-canvas';
    this.canvas.setAttribute('aria-label', 'The glass dome terrarium — a small living world.');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';

    for (const layer of LAYERS) {
      const div = document.createElement('div');
      div.className = `yearglass-layer yearglass-layer-${layer.key}`;
      div.dataset.depth = String(layer.depth);
      div.style.cssText =
        'position:absolute;inset:0;pointer-events:none;' +
        `background:${layer.tint};opacity:${layer.alpha};mix-blend-mode:soft-light;`;
      container.appendChild(div);
    }

    container.appendChild(this.canvas);

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);

    this.sceneCanvas = document.createElement('canvas');
    this.ctx = this.sceneCanvas.getContext('2d');

    this.uniforms = { ...DEFAULT_GLASS_UNIFORMS };

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[YearGlass] WebGL context lost — switching to Canvas2D fallback');
      this.gl = null;
      this.program = null;
      this.sceneTexture = null;
      this.quad = null;
    }, false);

    this.canvas.addEventListener('webglcontextrestored', (e) => {
      e.preventDefault();
      console.log('[YearGlass] WebGL context restored — rebuilding program & buffers');
      this.initWebGL();
    }, false);

    this.initWebGL();
    this.resize();
  }

  private initWebGL(): void {
    const hasWebGL = typeof window !== 'undefined' && typeof window.WebGLRenderingContext !== 'undefined';
    this.gl = hasWebGL ? (this.canvas.getContext('webgl2') as WebGL2RenderingContext | null) : null;
    this.program = this.gl ? GlassProgram.create(this.gl) : null;

    if (this.gl && this.program) {
      const [texture, quad] = this.setupGL();
      this.sceneTexture = texture;
      this.quad = quad;
    } else {
      this.sceneTexture = null;
      this.quad = null;
    }
  }

  private setupGL(): [WebGLTexture, WebGLBuffer] {
    const gl = this.gl as WebGL2RenderingContext;
    const texture = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const quad = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.checkGLError('setupGL');
    return [texture, quad];
  }

  resize(): void {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth || 1);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight || 1);
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    this.size = { width, height, dpr };
    const pw = Math.round(width * dpr);
    const ph = Math.round(height * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    if (this.sceneCanvas.width !== pw || this.sceneCanvas.height !== ph) {
      this.sceneCanvas.width = pw;
      this.sceneCanvas.height = ph;
    }
    this.uniforms.uResolution = [width, height];
  }

  captureSnapshot(): string {
    this.render();
    return this.canvas.toDataURL('image/png');
  }

  isPointInDome(clientX: number, clientY: number): DomeHitResult {
    const res = this.hitTestScene(clientX, clientY);
    return {
      hit: res.type === 'dome',
      normX: res.normX,
      normY: res.normY,
    };
  }

  hitTestScene(clientX: number, clientY: number): SceneHitResult {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const cssWidth = rect.width;
    const cssHeight = rect.height;
    const visibleHeight = Math.max(100, cssHeight - 210);
    const DESK_SURFACE_Y = visibleHeight * 0.72;

    const cx = cssWidth / 2;
    const isMobile = cssWidth <= 600;

    const clocheW = Math.min(cssWidth * (isMobile ? 0.36 : 0.38), 240);
    const clocheH = clocheW * 0.68;

    const roomCy = DESK_SURFACE_Y - clocheH / 2;
    const focusCy = visibleHeight * 0.45;
    const focusProgress = Math.min(1.0, Math.max(0.0, ((this.cameraZoom || 1.0) - 1.0) / 0.65));

    const domeCx = cx + this.cameraOffsetX * cssWidth;
    const domeCy = roomCy + (focusCy - roomCy) * focusProgress + this.cameraOffsetY * cssHeight;
    const domeRadius = (clocheW * 0.58) + (Math.min(cssWidth, visibleHeight) * 0.40 - clocheW * 0.58) * focusProgress;

    // 1. Check Glass Terrarium Dome
    const dx = x - domeCx;
    const dy = y - domeCy;
    if (Math.hypot(dx, dy) <= domeRadius * 1.18) {
      return {
        type: 'dome',
        normX: Math.max(-1, Math.min(1, dx / domeRadius)),
        normY: Math.max(-1, Math.min(1, dy / domeRadius)),
      };
    }

    // Interactive desk props active in Room View (when not zoomed into Focus Mode)
    if (!this.isFocused && focusProgress < 0.2) {
      const minPadding = isMobile ? 45 : 60;
      const lampX = Math.max(18, cssWidth * 0.08);
      const mugX = Math.max(lampX + minPadding, cx - clocheW * 0.76);
      const radioX = Math.max(mugX + minPadding, cx - clocheW * 0.48);

      const journalX = Math.min(cx + clocheW * 0.48, cssWidth * 0.62);
      const hgX = journalX + minPadding;
      const camX = Math.min(cssWidth - 25, hgX + minPadding);

      // 2. Vintage Camera (Far Right Corner)
      if (Math.abs(x - camX) < 32 * (isMobile ? 1.2 : 1.0) && Math.abs(y - (DESK_SURFACE_Y + 6)) < 28) {
        return { type: 'camera', normX: 0, normY: 0 };
      }

      // 3. Journal & Hourglass (Right of Dome)
      if (x >= journalX - 10 && x <= hgX + 25 && Math.abs(y - (DESK_SURFACE_Y + 2)) < 30) {
        return { type: 'journal', normX: 0, normY: 0 };
      }

      // 4. Coffee Mug (Left of Dome)
      if (Math.abs(x - mugX) < 26 * (isMobile ? 1.2 : 1.0) && Math.abs(y - (DESK_SURFACE_Y + 4)) < 28) {
        return { type: 'mug', normX: 0, normY: 0 };
      }

      // 5. Retro Radio (Left of Dome)
      if (Math.abs(x - radioX) < 28 * (isMobile ? 1.2 : 1.0) && Math.abs(y - (DESK_SURFACE_Y + 2)) < 28) {
        return { type: 'radio', normX: 0, normY: 0 };
      }

      // 6. Workspace Lamp (Far Left)
      if (Math.abs(x - lampX) < 35 && y >= DESK_SURFACE_Y - cssHeight * 0.25 && y <= DESK_SURFACE_Y + 30) {
        return { type: 'lamp', normX: 0, normY: 0 };
      }

      // 7. Window (Centered Wall)
      const windowW = isMobile ? Math.min(cssWidth * 0.52, 220) : Math.min(cssWidth * 0.42, 340);
      const windowH = isMobile ? Math.min(visibleHeight * 0.32, 170) : Math.min(visibleHeight * 0.38, 240);
      const shelfX = Math.max(10, cssWidth * 0.03);
      const shelfW = isMobile ? Math.min(cssWidth * 0.18, 90) : Math.min(cssWidth * 0.22, 150);
      const windowX = Math.max((cssWidth - windowW) / 2, shelfX + shelfW + 18);
      const windowY = Math.max(16, visibleHeight * 0.08);

      if (x >= windowX && x <= windowX + windowW && y >= windowY && y <= windowY + windowH) {
        return { type: 'window', normX: 0, normY: 0 };
      }

      // 8. Shelves (Left Wall)
      if (x >= shelfX - 10 && x <= shelfX + shelfW + 10 && y >= visibleHeight * 0.18 && y <= visibleHeight * 0.45) {
        return { type: 'shelf', normX: 0, normY: 0 };
      }
    }

    return { type: 'none', normX: 0, normY: 0 };
  }

  triggerRipple(normX: number, normY: number): void {
    this.uniforms.uTapPos = [normX, normY];
    this.uniforms.uTapPulse = 1.0;
  }

  setSimulationData(plants: PlantNode[], pip: PipObservation | null, moisture: number): void {
    this.plantNodes = plants;
    this.pipObservation = pip;
    this.soilMoisture = moisture;
  }

  update(dt: number, lightIntensity: number, zoom = 1.0): void {
    this.cameraZoom = zoom;
    this.uniforms.uTime += dt;
    this.uniforms.uLightIntensity = lightIntensity;
    if (this.uniforms.uTapPulse > 0) {
      this.uniforms.uTapPulse = Math.max(0, this.uniforms.uTapPulse - dt * 2.2);
    }
    this.render();
  }

  render(): void {
    if (this.disposed) return;
    const { width, height } = this.size;

    if (this.gl && this.program && this.sceneTexture && this.quad) {
      this.renderWebGL(width, height);
      return;
    }

    this.renderFallback(width, height);
  }

  private renderWebGL(width: number, height: number): void {
    const gl = this.gl as WebGL2RenderingContext;
    const program = this.program as GlassProgram;

    this.paintScene2D(width, height);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.sceneCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    program.use();
    program.setUniform('uResolution', [width, height]);
    program.setUniform('uTime', this.uniforms.uTime);
    program.setUniform('uLightDir', this.uniforms.uLightDir);
    program.setUniform('uLightIntensity', this.uniforms.uLightIntensity);
    program.setUniform('uSpecular', this.uniforms.uSpecular);
    program.setUniform('uRimColor', this.uniforms.uRimColor);
    program.setUniform('uRimIntensity', this.uniforms.uRimIntensity);
    program.setUniform('uRefraction', this.uniforms.uRefraction);
    program.setUniform('uBrightness', this.uniforms.uBrightness);
    program.setUniform('uCurve', DOME_CURVE);
    program.setUniform('uTapPos', this.uniforms.uTapPos);
    program.setUniform('uTapPulse', this.uniforms.uTapPulse);
    program.setSceneTexture(0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const loc = program.attribLocations.aPos;
    if (loc !== -1) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    this.checkGLError('renderWebGL');
  }

  private checkGLError(op: string): void {
    if (!this.gl) return;
    const err = this.gl.getError();
    if (err !== this.gl.NO_ERROR && import.meta.env?.DEV) {
      console.error(`[YearGlass] WebGL error during ${op}: 0x${err.toString(16)}`);
    }
  }

  private renderFallback(width: number, height: number): void {
    if (!this.ctx) return;
    this.paintScene2D(width, height);
    const out = this.canvas.getContext('2d');
    if (out) {
      out.clearRect(0, 0, this.canvas.width, this.canvas.height);
      out.drawImage(this.sceneCanvas, 0, 0);
    }
  }

  private paintScene2D(width: number, height: number): void {
    const ctx = this.ctx as CanvasRenderingContext2D;
    ctx.setTransform(this.size.dpr, 0, 0, this.size.dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const cssWidth = this.container.clientWidth || window.innerWidth || width;
    const cssHeight = this.container.clientHeight || window.innerHeight || height;

    const visibleHeight = Math.max(100, cssHeight - 210);
    const DESK_SURFACE_Y = visibleHeight * 0.72;

    const activeFocus = this.isFocused || this.cameraZoom > 1.25;

    // Layer 0: Side-Profile Room Backdrop (Wall, Window, Shelves, Desk, Props)
    if (this.roomScene) {
      this.roomScene.draw(ctx, cssWidth, cssHeight, activeFocus);
    } else {
      ctx.fillStyle = '#F4EFEA';
      ctx.fillRect(0, 0, cssWidth, cssHeight);
    }

    if (!activeFocus) {
      // === ROOM VIEW: Clear Bell Jar Glass Cloche resting flat on Wooden Tray Base ===
      const cx = cssWidth / 2 + this.cameraOffsetX * cssWidth;
      const trayY = DESK_SURFACE_Y + 2 + this.cameraOffsetY * cssHeight; // Sits flat on DESK_SURFACE_Y
      const isMobile = cssWidth <= 600;
      const domeW = Math.min(cssWidth * (isMobile ? 0.36 : 0.38), 240);
      const domeH = domeW * 0.68;
      const domeTopY = trayY - domeH;

      // 1. Wooden Saucer / Tray Base flat on Desk Surface
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, trayY + 4, domeW * 0.52, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden Saucer Rim
      ctx.fillStyle = '#3D271D';
      ctx.beginPath();
      ctx.ellipse(cx, trayY, domeW * 0.50, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5C3A21';
      ctx.beginPath();
      ctx.ellipse(cx, trayY - 2, domeW * 0.48, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Cloche Soil Bed & Luminous Bioluminescence
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - domeW * 0.46, trayY - 2);
      ctx.lineTo(cx - domeW * 0.46, trayY - domeH * 0.55);
      ctx.bezierCurveTo(
        cx - domeW * 0.46, domeTopY,
        cx + domeW * 0.46, domeTopY,
        cx + domeW * 0.46, trayY - domeH * 0.55
      );
      ctx.lineTo(cx + domeW * 0.46, trayY - 2);
      ctx.closePath();
      ctx.clip();

      // Transparent/luminous atmosphere inside cloche (plants crisp & visible)
      const bg = ctx.createRadialGradient(cx, trayY - domeH * 0.4, 0, cx, trayY - domeH * 0.4, domeW * 0.6);
      bg.addColorStop(0, 'rgba(28, 62, 50, 0.72)');
      bg.addColorStop(0.7, 'rgba(18, 40, 32, 0.65)');
      bg.addColorStop(1, 'rgba(5, 12, 8, 0.78)');
      ctx.fillStyle = bg;
      ctx.fillRect(cx - domeW, domeTopY - 10, domeW * 2, domeH + 20);

      // Soil bed inside cloche
      ctx.fillStyle = this.soilMoisture > 0.4 ? '#284a37' : '#33382c';
      ctx.beginPath();
      ctx.ellipse(cx, trayY - 4, domeW * 0.44, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Plants inside Cloche
      for (const plant of this.plantNodes) {
        const px = cx + (plant.x - 0.5) * domeW * 0.76;
        const py = trayY - 8 - plant.y * domeH * 0.5;
        const pSize = 10 + plant.growth * 22;

        ctx.save();
        ctx.translate(px, py);

        if (plant.species === 'moss') {
          ctx.fillStyle = '#3a7a50';
          ctx.beginPath();
          ctx.arc(0, 0, pSize * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else if (plant.species === 'fern') {
          ctx.strokeStyle = '#438a58';
          ctx.lineWidth = 2.5;
          for (let frond = -2; frond <= 2; frond++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(frond * 7, -pSize * 0.8, frond * 12, -pSize * 1.0);
            ctx.stroke();
          }
        } else if (plant.species === 'orchid') {
          ctx.strokeStyle = '#4e8d5e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -pSize);
          ctx.stroke();
          if (plant.growth > 0.35) {
            ctx.fillStyle = '#e6a2b8';
            ctx.beginPath();
            ctx.arc(0, -pSize, 5 + plant.growth * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (plant.species === 'vine') {
          ctx.strokeStyle = '#326243';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, pSize * 0.7, 0, Math.PI * 1.5);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Pip the Ladybug inside Cloche
      if (this.pipObservation) {
        const pipX = cx + (this.pipObservation.x - 0.5) * domeW * 0.68;
        const pipY = trayY - 10 - this.pipObservation.y * domeH * 0.45;

        ctx.save();
        ctx.translate(pipX, pipY);
        ctx.fillStyle = '#e24838';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(0, -4.5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // end clip

      // 3. Cloche Glass Shell Reflection & Outlines
      ctx.strokeStyle = 'rgba(188, 216, 238, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - domeW * 0.46, trayY - 2);
      ctx.lineTo(cx - domeW * 0.46, trayY - domeH * 0.55);
      ctx.bezierCurveTo(
        cx - domeW * 0.46, domeTopY,
        cx + domeW * 0.46, domeTopY,
        cx + domeW * 0.46, trayY - domeH * 0.55
      );
      ctx.lineTo(cx + domeW * 0.46, trayY - 2);
      ctx.stroke();

      // Glass Specular Curve Highlight along Left Arch
      const specGrad = ctx.createLinearGradient(cx - domeW * 0.40, domeTopY, cx - domeW * 0.18, trayY);
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
      ctx.strokeStyle = specGrad;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx - domeW * 0.40, trayY - domeH * 0.2);
      ctx.lineTo(cx - domeW * 0.40, trayY - domeH * 0.55);
      ctx.bezierCurveTo(
        cx - domeW * 0.40, domeTopY + 10,
        cx - domeW * 0.18, domeTopY + 5,
        cx - domeW * 0.08, domeTopY + 8
      );
      ctx.stroke();
    } else {
      // === FOCUS MODE: Full Screen Close-up Inspect Dome ===
      const cx = cssWidth / 2 + this.cameraOffsetX * cssWidth;
      const cy = visibleHeight * 0.45 + this.cameraOffsetY * cssHeight;
      const r = Math.min(cssWidth, visibleHeight) * 0.40 * (this.cameraZoom || 1.0);

      // Layer 1: Bioluminescent Ambient Backlight inside dome
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bg.addColorStop(0, '#1c3e32');
      bg.addColorStop(0.7, '#122820');
      bg.addColorStop(1, 'rgba(5, 12, 8, 0.92)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Layer 2: Background Moss & Soil Bed
      ctx.fillStyle = this.soilMoisture > 0.4 ? '#284a37' : '#33382c';
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const d = (0.18 + (i % 6) * 0.11) * r;
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d;
        ctx.beginPath();
        ctx.arc(x, y, 3.5 + (i % 5) * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 3: Flora & Plants
      for (const plant of this.plantNodes) {
        const px = cx + (plant.x - 0.5) * r * 1.2;
        const py = cy + (plant.y - 0.5) * r * 1.2;
        const size = 12 + plant.growth * 28;

        ctx.save();
        ctx.translate(px, py);

        if (plant.species === 'moss') {
          ctx.fillStyle = '#3a7a50';
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#529c6b';
          ctx.beginPath();
          ctx.arc(-size * 0.2, -size * 0.2, size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else if (plant.species === 'fern') {
          ctx.strokeStyle = '#438a58';
          ctx.lineWidth = 3;
          for (let frond = -2; frond <= 2; frond++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(frond * 9, -size * 0.85, frond * 14, -size * 1.1);
            ctx.stroke();
          }
        } else if (plant.species === 'orchid') {
          ctx.strokeStyle = '#4e8d5e';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -size);
          ctx.stroke();
          if (plant.growth > 0.35) {
            ctx.fillStyle = '#e6a2b8';
            ctx.beginPath();
            ctx.arc(0, -size, 6 + plant.growth * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f4c0d0';
            ctx.beginPath();
            ctx.arc(0, -size, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (plant.species === 'vine') {
          ctx.strokeStyle = '#326243';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.75, 0, Math.PI * 1.6);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Layer 4: Pip the Ladybug
      if (this.pipObservation) {
        const pipX = cx + (this.pipObservation.x - 0.5) * r * 1.1;
        const pipY = cy + (this.pipObservation.y - 0.5) * r * 1.1;

        ctx.save();
        ctx.translate(pipX, pipY);

        ctx.fillStyle = '#e24838';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(0, -5.5, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1.5, -6.5, 0.8, 0, Math.PI * 2);
        ctx.arc(1.5, -6.5, 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(-3, -1, 1.3, 0, Math.PI * 2);
        ctx.arc(3, -1, 1.3, 0, Math.PI * 2);
        ctx.arc(0, 3.2, 1.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Layer 5: Glass Rim & Specular Gradient
      ctx.strokeStyle = '#2d2218';
      ctx.lineWidth = Math.max(3, r * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(188, 216, 238, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      const spec = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx - r * 0.35, cy - r * 0.35, r * 0.45);
      spec.addColorStop(0, 'rgba(255,255,255,0.28)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.fillRect(0, 0, width, height);
    }
  }

  get domElement(): HTMLCanvasElement {
    return this.canvas;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    if (this.gl && this.program) {
      this.program.destroy();
      if (this.sceneTexture) this.gl.deleteTexture(this.sceneTexture);
      if (this.quad) this.gl.deleteBuffer(this.quad);
    }
    this.canvas.remove();
    this.container.querySelectorAll('.yearglass-layer').forEach((el) => el.remove());
  }
}
