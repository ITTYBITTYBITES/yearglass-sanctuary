/**
 * YearGlass Sanctuary — Room Scene
 *
 * Cozy 3D Wooden Workspace Renderer:
 *   - DESK_TOP_Y = visibleHeight * 0.56 (Top edge where tabletop surface meets wall)
 *   - DESK_FRONT_Y = visibleHeight * 0.90 (Front bevel edge near control drawer)
 *   - DESK_SURFACE_Y = DESK_FRONT_Y - 18 (Official tabletop surface baseline)
 *   - Spacious 3D tabletop surface plane with rich warm oak/walnut gradient & wood grain
 *   - NON-OVERLAPPING PROP LAYOUT: All props (Lamp, Mug, Radio, Dome, Journal, Hourglass, Camera)
 *     are explicitly separated with clean clearance gaps from the central glass dome and each other.
 *   - Grounded contact shadows (rgba(0,0,0,0.38)) under every prop base on the tabletop surface.
 */

export interface RoomState {
  lampOn: boolean;
  night: boolean;
}

export function getDeskSurfaceY(height: number, width?: number): number {
  const visibleHeight = Math.max(100, height - 210);
  const isMobile = width !== undefined ? width <= 600 : true;
  const DESK_FRONT_Y = visibleHeight * (isMobile ? 0.90 : 0.92);
  return DESK_FRONT_Y - 18;
}

export class RoomScene {
  private readonly root: HTMLElement;
  private readonly lamp: HTMLElement;
  private readonly windowFrame: HTMLElement;
  private readonly desk: HTMLElement;
  private readonly shelf: HTMLElement;
  private readonly state: RoomState = { lampOn: true, night: false };
  private disposed = false;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'yearglass-room';
    this.root.style.cssText =
      'position:absolute;inset:0;width:100vw;height:100dvh;pointer-events:none;overflow:hidden;' +
      'background:#f4efea;object-fit:cover;transition:opacity 0.4s ease;z-index:0;';

    // Window
    this.windowFrame = document.createElement('div');
    this.windowFrame.className = 'yearglass-room-window';
    this.windowFrame.style.cssText =
      'position:absolute;top:6%;left:50%;transform:translateX(-50%);width:min(44%, 320px);height:min(30%, 210px);' +
      'border-radius:10px;border:8px solid #6e472b;background:linear-gradient(180deg,#7b628a,#f0a85d,#fce4c6);' +
      'box-shadow:inset 0 0 25px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2);';

    // Left Wooden Shelves
    this.shelf = document.createElement('div');
    this.shelf.className = 'yearglass-room-shelf';
    this.shelf.style.cssText =
      'position:absolute;top:18%;left:3%;width:min(20%, 150px);height:10px;' +
      'background:linear-gradient(180deg,#8b5a2b,#5c3a21);' +
      'border-bottom:2px solid #3d271d;box-shadow:0 6px 16px rgba(0,0,0,0.3);';

    // Warm Wooden Desk Surface
    this.desk = document.createElement('div');
    this.desk.className = 'yearglass-room-desk';
    this.desk.style.cssText =
      'position:absolute;bottom:0;left:0;right:0;width:100%;height:45%;' +
      'background:linear-gradient(180deg,#6e4c2e 0%,#3b2312 100%);' +
      'border-top:4px solid #a67c4e;' +
      'box-shadow:inset 0 4px 20px rgba(0,0,0,0.5), 0 -8px 24px rgba(0,0,0,0.3);';

    // Warm Ambient Lamp
    this.lamp = document.createElement('div');
    this.lamp.className = 'yearglass-room-lamp';
    this.lamp.style.cssText =
      'position:absolute;top:38%;left:18%;width:200px;height:200px;pointer-events:none;' +
      'background:radial-gradient(circle at 50% 50%,rgba(255,225,150,0.55),rgba(255,160,70,0) 70%);' +
      'transition:opacity 0.4s ease;';

    this.root.append(this.windowFrame, this.shelf, this.desk, this.lamp);
    container.insertBefore(this.root, container.firstChild);
  }

  update(_dt: number, hours: number, lampOn: boolean, isFocused: boolean): void {
    if (this.disposed) return;

    this.setLamp(lampOn);
    this.setTimeOfDay(hours);

    this.root.style.opacity = isFocused ? '0.35' : '1.0';
  }

  setLamp(on: boolean): void {
    this.state.lampOn = on;
    this.lamp.style.opacity = on ? '1' : '0.15';
  }

  setTimeOfDay(hours: number): void {
    const night = hours < 6.5 || hours >= 19.5;
    this.state.night = night;

    this.root.classList.toggle('night', night);
    if (night) {
      this.root.style.background = '#0f121c';
      this.windowFrame.style.background = 'linear-gradient(180deg,#070e1a,#12203a)';
    } else if (hours >= 16.5) {
      this.root.style.background = '#f4efea';
      this.windowFrame.style.background = 'linear-gradient(180deg,#5a3d5e,#d47a52,#f9c89b)';
    } else {
      this.root.style.background = '#f4efea';
      this.windowFrame.style.background = 'linear-gradient(180deg,#4a90e2,#87ceeb,#e0f7fa)';
    }
  }

  get isNight(): boolean {
    return this.state.night;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, isFocused: boolean): void {
    if (this.disposed) return;
    ctx.save();

    const isPortrait = height > width || width <= 600;
    const isNight = this.state.night;

    const visibleHeight = Math.max(100, height - 210);

    // 3D Desk Geometry Constants
    const DESK_TOP_Y = visibleHeight * (isPortrait ? 0.56 : 0.58);
    const DESK_FRONT_Y = visibleHeight * (isPortrait ? 0.90 : 0.92);
    const DESK_DEPTH = DESK_FRONT_Y - DESK_TOP_Y;
    const DESK_SURFACE_Y = DESK_FRONT_Y - 18; // Official surface line where dome & props rest

    const drawRectRounded = (
      c: CanvasRenderingContext2D,
      rx: number,
      ry: number,
      rw: number,
      rh: number,
      radius: number
    ) => {
      if (typeof c.roundRect === 'function') {
        c.roundRect(rx, ry, rw, rh, radius);
      } else {
        c.rect(rx, ry, rw, rh);
      }
    };

    // 1. WALL BACKGROUND (Dark charcoal/navy at night, warm cream during day)
    const wallGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (isNight) {
      wallGrad.addColorStop(0, '#0F121C');
      wallGrad.addColorStop(0.6, '#141826');
      wallGrad.addColorStop(1, '#0C0E18');
    } else {
      wallGrad.addColorStop(0, '#F6F1EC');
      wallGrad.addColorStop(0.6, '#EFE8DA');
      wallGrad.addColorStop(1, '#E2D8C5');
    }
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height);

    // Wall wallpaper subtle vertical stripes down to DESK_TOP_Y
    ctx.fillStyle = isNight ? 'rgba(255, 255, 255, 0.03)' : 'rgba(215, 202, 185, 0.18)';
    const stripeW = 28;
    for (let x = 0; x < width; x += stripeW * 2) {
      ctx.fillRect(x, 0, stripeW, DESK_TOP_Y);
    }

    // Top ceiling shadow
    const topShadow = ctx.createLinearGradient(0, 0, 0, 40);
    topShadow.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
    topShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(0, 0, width, 40);

    // 2. WINDOW & SHELF POSITIONING (NO OVERLAP)
    const windowWidth = isPortrait
      ? Math.min(width * 0.52, 220)
      : Math.min(width * 0.42, 340);
    const windowHeight = isPortrait
      ? Math.min(visibleHeight * 0.30, 160)
      : Math.min(visibleHeight * 0.36, 230);

    const shelfX = Math.max(10, width * 0.03);
    const shelfW = isPortrait ? Math.min(width * 0.18, 85) : Math.min(width * 0.22, 150);
    const windowX = Math.max((width - windowWidth) / 2, shelfX + shelfW + 18);
    const windowY = Math.max(12, visibleHeight * 0.06);

    // Window Outer Wooden Frame
    ctx.fillStyle = isNight ? '#4D301B' : '#6E472B';
    ctx.beginPath();
    drawRectRounded(ctx, windowX - 8, windowY - 8, windowWidth + 16, windowHeight + 16, 10);
    ctx.fill();

    // Window Inner Bevel
    ctx.fillStyle = '#2D1B0E';
    ctx.beginPath();
    drawRectRounded(ctx, windowX - 3, windowY - 3, windowWidth + 6, windowHeight + 6, 6);
    ctx.fill();

    // Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, windowY, 0, windowY + windowHeight);
    if (isNight) {
      skyGrad.addColorStop(0, '#070E1A');
      skyGrad.addColorStop(0.6, '#12203A');
      skyGrad.addColorStop(1, '#1A2C4D');
    } else {
      skyGrad.addColorStop(0, '#7B628A');
      skyGrad.addColorStop(0.5, '#F0A85D');
      skyGrad.addColorStop(1, '#FCE4C6');
    }
    ctx.fillStyle = skyGrad;
    ctx.beginPath();
    drawRectRounded(ctx, windowX, windowY, windowWidth, windowHeight, 4);
    ctx.fill();

    // Clouds or Moon
    if (!isNight) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      const cloudPuffs = [
        { x: windowX + windowWidth * 0.25, y: windowY + windowHeight * 0.28, r: 16 },
        { x: windowX + windowWidth * 0.32, y: windowY + windowHeight * 0.25, r: 22 },
        { x: windowX + windowWidth * 0.72, y: windowY + windowHeight * 0.38, r: 18 },
        { x: windowX + windowWidth * 0.82, y: windowY + windowHeight * 0.36, r: 24 },
      ];
      for (const p of cloudPuffs) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#F0F4F8';
      ctx.beginPath();
      ctx.arc(windowX + windowWidth * 0.8, windowY + windowHeight * 0.25, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#12203A';
      ctx.beginPath();
      ctx.arc(windowX + windowWidth * 0.76, windowY + windowHeight * 0.23, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Window Pane Grids (Muntins)
    ctx.strokeStyle = isNight ? '#4D301B' : '#6E472B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(windowX + windowWidth / 2, windowY);
    ctx.lineTo(windowX + windowWidth / 2, windowY + windowHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(windowX, windowY + windowHeight / 2);
    ctx.lineTo(windowX + windowWidth, windowY + windowHeight / 2);
    ctx.stroke();

    // Glass sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.beginPath();
    ctx.moveTo(windowX, windowY);
    ctx.lineTo(windowX + windowWidth * 0.45, windowY);
    ctx.lineTo(windowX, windowY + windowHeight * 0.60);
    ctx.closePath();
    ctx.fill();

    // 3. LEFT WALL FLOATING SHELVES & DECOR
    const shelf1Y = visibleHeight * 0.16;
    const shelf2Y = visibleHeight * 0.32;

    const drawPlank = (sx: number, sy: number, sw: number) => {
      ctx.fillStyle = '#8B5A2B';
      ctx.fillRect(sx, sy, sw, 3);
      ctx.fillStyle = '#5C3A21';
      ctx.fillRect(sx, sy + 3, sw, 7);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fillRect(sx, sy + 10, sw + 4, 5);
    };

    // Upper Shelf 1
    drawPlank(shelfX, shelf1Y, shelfW);

    // Books on Upper Shelf 1
    const books = [
      { color: '#A83232', w: 6, h: 18 },
      { color: '#D4A338', w: 8, h: 22 },
      { color: '#2E6B40', w: 7, h: 16 },
      { color: '#4A6B82', w: 9, h: 24 },
    ];
    let bx = shelfX + 8;
    for (const b of books) {
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, shelf1Y - b.h, b.w, b.h);
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(bx + 1, shelf1Y - b.h + 3, b.w - 2, 2);
      bx += b.w + 2;
    }

    // Succulent Pot on Shelf 1
    const potX = shelfX + shelfW - 22;
    const potY = shelf1Y;
    ctx.fillStyle = '#C86D51';
    ctx.beginPath();
    ctx.moveTo(potX - 8, potY - 14);
    ctx.lineTo(potX + 8, potY - 14);
    ctx.lineTo(potX + 6, potY);
    ctx.lineTo(potX - 6, potY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4A7C59';
    ctx.beginPath();
    ctx.arc(potX - 3, potY - 18, 5, 0, Math.PI * 2);
    ctx.arc(potX + 3, potY - 18, 5, 0, Math.PI * 2);
    ctx.arc(potX, potY - 22, 6, 0, Math.PI * 2);
    ctx.fill();

    // Lower Shelf 2
    drawPlank(shelfX, shelf2Y, shelfW);

    // Small Jar on Shelf 2
    const jarX = shelfX + 16;
    const jarY = shelf2Y;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
    ctx.fillRect(jarX - 7, jarY - 16, 14, 16);
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(jarX - 8, jarY - 19, 16, 3);
    ctx.fillStyle = '#D4A338';
    ctx.beginPath();
    ctx.arc(jarX, jarY - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // 4. RIGHT WALL HANGING ART FRAMES (Strictly Clipped with ctx.clip())
    if (width > 500) {
      const art1W = Math.min(width * 0.18, 120);
      const art1H = art1W * 0.75;
      const art1X = width - art1W - Math.max(16, width * 0.04);
      const art1Y = visibleHeight * 0.14;

      ctx.fillStyle = isNight ? '#4D301B' : '#6E472B';
      ctx.fillRect(art1X - 6, art1Y - 6, art1W + 12, art1H + 12);

      ctx.fillStyle = '#FDFBF7';
      ctx.fillRect(art1X, art1Y, art1W, art1H);

      // Clipped Landscape Painting
      ctx.save();
      ctx.beginPath();
      ctx.rect(art1X + 4, art1Y + 4, art1W - 8, art1H - 8);
      ctx.clip();

      const artSky = ctx.createLinearGradient(0, art1Y, 0, art1Y + art1H);
      artSky.addColorStop(0, '#87CEEB');
      artSky.addColorStop(1, '#E0F7FA');
      ctx.fillStyle = artSky;
      ctx.fillRect(art1X, art1Y, art1W, art1H);

      ctx.fillStyle = '#E8985E';
      ctx.beginPath();
      ctx.arc(art1X + art1W * 0.5, art1Y + art1H * 0.55, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4A7C59';
      ctx.beginPath();
      ctx.moveTo(art1X, art1Y + art1H);
      ctx.lineTo(art1X + art1W * 0.45, art1Y + art1H * 0.48);
      ctx.lineTo(art1X + art1W, art1Y + art1H);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Lower Small Frame 2
      if (width > 700) {
        const art2W = art1W * 0.70;
        const art2H = art2W * 0.85;
        const art2X = art1X + art1W * 0.15;
        const art2Y = art1Y + art1H + 22;

        ctx.fillStyle = '#6E472B';
        ctx.fillRect(art2X - 4, art2Y - 4, art2W + 8, art2H + 8);
        ctx.fillStyle = '#FDFBF7';
        ctx.fillRect(art2X, art2Y, art2W, art2H);
        ctx.fillStyle = '#E2D8C5';
        ctx.fillRect(art2X + 5, art2Y + 5, art2W - 10, art2H - 10);
      }
    }

    // 5. REAL 3D WOODEN DESK STRUCTURE (Deep Surface Plane + Crisp Front Bevel + Under-Shadow)
    // A. Wall Contact Shadow Line along DESK_TOP_Y
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fillRect(0, DESK_TOP_Y - 2, width, 3);

    // B. Spacious Top Surface Depth Plane (DESK_TOP_Y to DESK_FRONT_Y)
    const topSurfaceGrad = ctx.createLinearGradient(0, DESK_TOP_Y, 0, DESK_FRONT_Y);
    if (isNight) {
      topSurfaceGrad.addColorStop(0, '#3D2516');
      topSurfaceGrad.addColorStop(0.5, '#2D180C');
      topSurfaceGrad.addColorStop(1, '#201007');
    } else {
      topSurfaceGrad.addColorStop(0, '#7C5232');
      topSurfaceGrad.addColorStop(0.5, '#5C3A21');
      topSurfaceGrad.addColorStop(1, '#4A2E19');
    }
    ctx.fillStyle = topSurfaceGrad;
    ctx.fillRect(0, DESK_TOP_Y, width, DESK_DEPTH);

    // Wood Grain Texture Lines on Tabletop Surface
    ctx.fillStyle = isNight ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.12)';
    for (let gy = DESK_TOP_Y + 12; gy < DESK_FRONT_Y - 4; gy += 16) {
      ctx.fillRect(0, gy, width, 1.5);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let gy = DESK_TOP_Y + 6; gy < DESK_FRONT_Y - 4; gy += 24) {
      ctx.fillRect(0, gy, width, 1);
    }

    // C. Crisp 3D Front Bevel Edge (Lighter Highlight Border directly along DESK_FRONT_Y)
    ctx.fillStyle = isNight ? '#5C3A21' : '#A67C4E';
    ctx.fillRect(0, DESK_FRONT_Y - 3, width, 4);

    // D. Front Face Trim Band (DESK_FRONT_Y down to height)
    const frontFaceGrad = ctx.createLinearGradient(0, DESK_FRONT_Y, 0, height);
    if (isNight) {
      frontFaceGrad.addColorStop(0, '#26140A');
      frontFaceGrad.addColorStop(0.3, '#1A0B05');
      frontFaceGrad.addColorStop(1, '#0C0502');
    } else {
      frontFaceGrad.addColorStop(0, '#4A2E19');
      frontFaceGrad.addColorStop(0.3, '#301C0E');
      frontFaceGrad.addColorStop(1, '#1E0F07');
    }
    ctx.fillStyle = frontFaceGrad;
    ctx.fillRect(0, DESK_FRONT_Y + 1, width, height - DESK_FRONT_Y - 1);

    // E. Desk Under-Shadow beneath Front Bevel Trim Band
    const underShadowGrad = ctx.createLinearGradient(0, DESK_FRONT_Y + 1, 0, DESK_FRONT_Y + 20);
    underShadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
    underShadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = underShadowGrad;
    ctx.fillRect(0, DESK_FRONT_Y + 1, width, 19);

    // 6. NON-OVERLAPPING DESK PROPS GROUNDED ON DESK_SURFACE_Y
    const cx = width / 2;
    const propScale = isPortrait ? 1.4 : 1.0;
    const clocheW = Math.min(width * (isPortrait ? 0.34 : 0.28), 200);

    // Dome Boundaries (with Saucer Rim Clearance)
    const domeLeft = cx - clocheW * 0.50 - 12;
    const domeRight = cx + clocheW * 0.50 + 12;

    // Helper for prop base contact shadows
    const drawContactShadow = (sx: number, sy: number, sw: number, sh = 5) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, sw, sh, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    // A. Small Workspace Lamp (Far Left)
    const lampX = Math.max(16, width * 0.06);
    const lampBaseY = DESK_SURFACE_Y;
    const lampH = Math.min(visibleHeight * 0.20, 120);
    const lampTopY = lampBaseY - lampH;

    drawContactShadow(lampX, lampBaseY + 2, 18 * propScale, 5);

    ctx.fillStyle = '#3A2E20';
    ctx.beginPath();
    ctx.ellipse(lampX, lampBaseY - 2, 12 * propScale, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4D3D2A';
    ctx.lineWidth = 3.5 * propScale;
    ctx.beginPath();
    ctx.moveTo(lampX, lampBaseY - 4);
    ctx.quadraticCurveTo(lampX - 10, lampBaseY - lampH * 0.5, lampX + 10, lampTopY + 8);
    ctx.stroke();

    const shadeX = lampX + 12;
    const shadeY = lampTopY + 8;
    ctx.fillStyle = '#E2B144';
    ctx.beginPath();
    ctx.moveTo(shadeX - 8, shadeY);
    ctx.lineTo(shadeX + 10, shadeY - 6);
    ctx.lineTo(shadeX + 15, shadeY + 8);
    ctx.lineTo(shadeX - 12, shadeY + 8);
    ctx.closePath();
    ctx.fill();

    if (this.state.lampOn) {
      const glowX = shadeX + 2;
      const glowY = shadeY + 8;

      ctx.save();
      const lightBeam = ctx.createLinearGradient(glowX, glowY, glowX + 30, DESK_SURFACE_Y);
      lightBeam.addColorStop(0, 'rgba(255, 235, 160, 0.65)');
      lightBeam.addColorStop(0.6, 'rgba(255, 200, 110, 0.30)');
      lightBeam.addColorStop(1, 'rgba(255, 180, 80, 0.05)');
      ctx.fillStyle = lightBeam;

      ctx.beginPath();
      ctx.moveTo(glowX - 10, glowY);
      ctx.lineTo(glowX + 14, glowY);
      ctx.lineTo(glowX + width * 0.30, DESK_SURFACE_Y + 10);
      ctx.lineTo(glowX - width * 0.10, DESK_SURFACE_Y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // B. Retro Wooden Desk Radio (Left of Dome, Safely Outside Dome Rim)
    const radioX = Math.min(domeLeft - 22, isPortrait ? width * 0.28 : cx - clocheW * 0.60);
    const radioW = 32 * propScale;
    const radioH = 20 * propScale;
    const radioY = DESK_SURFACE_Y - radioH;

    drawContactShadow(radioX, DESK_SURFACE_Y + 2, radioW * 0.6, 5);

    ctx.fillStyle = '#5C3A21';
    ctx.beginPath();
    drawRectRounded(ctx, radioX - radioW / 2, radioY, radioW, radioH, 4);
    ctx.fill();

    ctx.fillStyle = '#8B6B38';
    ctx.fillRect(radioX - radioW / 2 + 4, radioY + 4, radioW * 0.5, radioH - 8);
    ctx.fillStyle = '#3A2010';
    for (let sl = radioY + 6; sl < radioY + radioH - 6; sl += 3) {
      ctx.fillRect(radioX - radioW / 2 + 5, sl, radioW * 0.5 - 2, 1);
    }

    ctx.fillStyle = '#D4A338';
    ctx.beginPath();
    ctx.arc(radioX + radioW * 0.25, radioY + 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(radioX + radioW * 0.25, radioY + 13, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(radioX - 5, radioY);
    ctx.lineTo(radioX - 10, radioY - 12);
    ctx.stroke();

    // C. Warm Coffee Mug (Between Lamp & Radio, Zero Overlap)
    const mugX = Math.max(lampX + 32, (lampX + radioX) / 2);
    const mugW = 16 * propScale;
    const mugH = 18 * propScale;
    const mugY = DESK_SURFACE_Y - mugH;

    drawContactShadow(mugX, DESK_SURFACE_Y + 2, mugW * 0.65, 4.5);

    ctx.fillStyle = '#D98880';
    ctx.beginPath();
    drawRectRounded(ctx, mugX - mugW / 2, mugY, mugW, mugH, 3);
    ctx.fill();

    ctx.strokeStyle = '#D98880';
    ctx.lineWidth = 2.2 * propScale;
    ctx.beginPath();
    ctx.arc(mugX - mugW / 2 - 2, mugY + mugH / 2, 4.0 * propScale, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();

    ctx.fillStyle = '#4A2A18';
    ctx.beginPath();
    ctx.ellipse(mugX, mugY + 2, mugW / 2 - 1, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mugX - 2, mugY - 2);
    ctx.quadraticCurveTo(mugX - 5, mugY - 8, mugX - 2, mugY - 14);
    ctx.moveTo(mugX + 3, mugY - 2);
    ctx.quadraticCurveTo(mugX + 6, mugY - 9, mugX + 3, mugY - 16);
    ctx.stroke();

    // D. Open Leather-Bound Journal & Pencil (Right of Dome, Safely Outside Dome Rim)
    const journalX = Math.max(domeRight + 18, isPortrait ? width * 0.70 : cx + clocheW * 0.60);
    const journalW = 36 * propScale;
    const journalH = journalW * 0.65;
    const journalY = DESK_SURFACE_Y - journalH + 4;

    drawContactShadow(journalX + journalW / 2, DESK_SURFACE_Y + 2, journalW * 0.55, 5);

    ctx.fillStyle = '#5C3A21';
    ctx.fillRect(journalX - 3, journalY - 2, journalW + 6, journalH + 4);

    ctx.fillStyle = '#FDFBF7';
    ctx.fillRect(journalX, journalY, journalW, journalH);

    ctx.strokeStyle = '#D4C5B2';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(journalX + journalW / 2, journalY);
    ctx.lineTo(journalX + journalW / 2, journalY + journalH);
    ctx.stroke();

    ctx.fillStyle = 'rgba(180, 165, 150, 0.35)';
    for (let ly = journalY + 5; ly < journalY + journalH - 4; ly += 5) {
      ctx.fillRect(journalX + 3, ly, journalW / 2 - 6, 1);
      ctx.fillRect(journalX + journalW / 2 + 3, ly, journalW / 2 - 6, 1);
    }

    const penX = journalX + journalW + 2;
    const penY = journalY + journalH - 4;
    ctx.save();
    ctx.translate(penX, penY);
    ctx.rotate(0.35);
    ctx.fillStyle = '#D4A338';
    ctx.fillRect(0, 0, 16, 2.2);
    ctx.fillStyle = '#2B2B2B';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(19, 1.1);
    ctx.lineTo(16, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // E. Vintage Camera (Far Right Corner)
    const camX = Math.min(width - 20, isPortrait ? width * 0.92 : width - 35);
    const camW = 28 * propScale;
    const camH = 18 * propScale;
    const camY = DESK_SURFACE_Y - camH + 4;

    drawContactShadow(camX, DESK_SURFACE_Y + 2, camW * 0.6, 5);

    ctx.fillStyle = '#2A2A2A';
    ctx.beginPath();
    drawRectRounded(ctx, camX - camW / 2, camY, camW, camH, 3);
    ctx.fill();

    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(camX - camW / 2, camY, camW, 3.5);

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(camX, camY + camH * 0.55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(camX - 2, camY + camH * 0.55 - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // F. Wooden Hourglass Timer (Between Journal & Camera, Zero Overlap)
    const hgX = (journalX + journalW + camX - camW / 2) / 2;
    const hgW = 14 * propScale;
    const hgH = 22 * propScale;
    const hgY = DESK_SURFACE_Y - hgH;

    drawContactShadow(hgX, DESK_SURFACE_Y + 2, hgW * 0.6, 4.5);

    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(hgX - hgW / 2, hgY - 2, hgW, 3);
    ctx.fillRect(hgX - hgW / 2, hgY + hgH - 1, hgW, 3);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hgX - hgW / 2 + 2, hgY + 1);
    ctx.lineTo(hgX - 2, hgY + hgH / 2);
    ctx.lineTo(hgX - hgW / 2 + 2, hgY + hgH - 1);
    ctx.moveTo(hgX + hgW / 2 - 2, hgY + 1);
    ctx.lineTo(hgX + 2, hgY + hgH / 2);
    ctx.lineTo(hgX + hgW / 2 - 2, hgY + hgH - 1);
    ctx.stroke();

    ctx.fillStyle = '#D4A338';
    ctx.beginPath();
    ctx.arc(hgX, hgY + hgH - 4, 3.5, Math.PI, Math.PI * 2);
    ctx.fill();

    // 7. FOCUS MODE DIMMING OVERLAY
    if (isFocused) {
      ctx.fillStyle = 'rgba(13, 13, 14, 0.65)';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.remove();
  }
}
