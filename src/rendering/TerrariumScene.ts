/**
 * YearGlass Sanctuary — Terrarium Scene (5-layer depth stack & hit-testing)
 *
 * The terrarium is rendered into a WebGL2 framebuffer in five ordered layers:
 *   Layer 5: Glass Highlight & Distortion Filter (refraction/specular/rim)
 *   Layer 4: Foreground Soil Edge & Overhanging Flora
 *   Layer 3: Active Stage (Pip FSM + primary growth nodes)
 *   Layer 2: Background Moss & Secondary Flora
 *   Layer 1: Inner Bioluminescence & Ambient Backlight
 */

import { GlassProgram, DEFAULT_GLASS_UNIFORMS, GlassUniforms } from './shaders';
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
  { key: 'bioluminescence', depth: 1, tint: '#1e3a34', alpha: 1 },
  { key: 'backgroundMoss', depth: 2, tint: '#223c30', alpha: 1 },
  { key: 'activeStage', depth: 3, tint: '#2c4a38', alpha: 1 },
  { key: 'foregroundSoil', depth: 4, tint: '#3a2f24', alpha: 1 },
  { key: 'glass', depth: 5, tint: '#bcd8ee', alpha: 1 },
];

export interface DomeHitResult {
  hit: boolean;
  normX: number;
  normY: number;
}

export class TerrariumScene {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly sceneCanvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private gl: WebGL2RenderingContext | null;
  private program: GlassProgram | null;
  private readonly sceneTexture: WebGLTexture | null;
  private readonly quad: WebGLBuffer | null;

  private readonly uniforms: GlassUniforms;
  private size: SceneSize = { width: 320, height: 240, dpr: 1 };
  private disposed = false;
  private readonly onResize: () => void;

  private plantNodes: PlantNode[] = [];
  private pipObservation: PipObservation | null = null;
  private soilMoisture = 0.8;

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

    const hasWebGL = typeof window !== 'undefined' && typeof window.WebGLRenderingContext !== 'undefined';
    this.gl = hasWebGL ? (this.canvas.getContext('webgl2') as WebGL2RenderingContext | null) : null;
    this.uniforms = { ...DEFAULT_GLASS_UNIFORMS };

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[YearGlass] WebGL context lost — falling back to Canvas 2D');
      this.gl = null;
      this.program = null;
    }, false);

    this.program = this.gl ? GlassProgram.create(this.gl) : null;
    if (this.gl && this.program) {
      const [sceneTexture, quad] = this.setupGL();
      this.sceneTexture = sceneTexture;
      this.quad = quad;
    } else {
      this.sceneTexture = null;
      this.quad = null;
    }

    this.resize();
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

  isPointInDome(clientX: number, clientY: number): DomeHitResult {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const r = Math.min(rect.width, rect.height) * 0.46;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist <= r * 1.1) {
      return {
        hit: true,
        normX: Math.max(-1, Math.min(1, dx / r)),
        normY: Math.max(-1, Math.min(1, dy / r)),
      };
    }
    return { hit: false, normX: 0, normY: 0 };
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

  update(dt: number, lightIntensity: number): void {
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
    gl.clearColor(0.03, 0.05, 0.04, 1);
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

    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.42;

    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3);
    bg.addColorStop(0, '#12251e');
    bg.addColorStop(0.7, '#081410');
    bg.addColorStop(1, '#030605');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = this.soilMoisture > 0.4 ? '#1f382b' : '#2b3026';
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const d = (0.2 + (i % 5) * 0.12) * r;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      ctx.beginPath();
      ctx.arc(x, y, 3 + (i % 4) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const plant of this.plantNodes) {
      const px = cx + (plant.x - 0.5) * r * 1.2;
      const py = cy + (plant.y - 0.5) * r * 1.2;
      const size = 12 + plant.growth * 28;

      ctx.save();
      ctx.translate(px, py);

      if (plant.species === 'moss') {
        ctx.fillStyle = '#2e5a3c';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (plant.species === 'fern') {
        ctx.strokeStyle = '#3e784f';
        ctx.lineWidth = 3;
        for (let frond = -2; frond <= 2; frond++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(frond * 8, -size * 0.8, frond * 12, -size);
          ctx.stroke();
        }
      } else if (plant.species === 'orchid') {
        ctx.strokeStyle = '#4a8058';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size);
        ctx.stroke();
        if (plant.growth > 0.4) {
          ctx.fillStyle = '#d896a8';
          ctx.beginPath();
          ctx.arc(0, -size, 5 + plant.growth * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (plant.species === 'vine') {
        ctx.strokeStyle = '#295438';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.7, 0, Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.pipObservation) {
      const pipX = cx + (this.pipObservation.x - 0.5) * r * 1.1;
      const pipY = cy + (this.pipObservation.y - 0.5) * r * 1.1;

      ctx.save();
      ctx.translate(pipX, pipY);

      ctx.fillStyle = '#d94336';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(0, -5, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(-2.5, -1, 1.2, 0, Math.PI * 2);
      ctx.arc(2.5, -1, 1.2, 0, Math.PI * 2);
      ctx.arc(0, 3, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.strokeStyle = '#281e15';
    ctx.lineWidth = Math.max(3, r * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(188, 216, 238, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    const spec = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx - r * 0.35, cy - r * 0.35, r * 0.45);
    spec.addColorStop(0, 'rgba(255,255,255,0.22)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(0, 0, width, height);
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
