/**
 * YearGlass Sanctuary — Room Scene
 *
 * Adaptive dual-mode layout engine:
 *   - Mobile Portrait Mode (height > width):
 *       * Streamlined, touch-optimized portrait layout
 *       * Shorter vertically-framed window in top third
 *       * Thick wooden desk baseline at DESK_SURFACE_Y (height * 0.62)
 *       * Enlarged, high-contrast, touch-friendly interactive targets (>= 44x44px touch bounds)
 *       * Dark cozy night wallpaper (#0F121C) at night, warm cream (#F6F1EC) during day
 *   - Desktop Landscape Mode (height <= width):
 *       * Full 16:9 wide scene with 4-pane window, left shelves with books & succulents,
 *         right wall hanging art frames (strictly clipped), wide mahogany desk & props
 */

export interface RoomState {
  lampOn: boolean;
  night: boolean;
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
      'position:absolute;top:10%;left:50%;transform:translateX(-50%);width:min(42%, 320px);height:min(34%, 230px);' +
      'border-radius:10px;border:8px solid #6e472b;background:linear-gradient(180deg,#7b628a,#f0a85d,#fce4c6);' +
      'box-shadow:inset 0 0 25px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2);';

    // Left Wooden Shelves
    this.shelf = document.createElement('div');
    this.shelf.className = 'yearglass-room-shelf';
    this.shelf.style.cssText =
      'position:absolute;top:26%;left:4%;width:min(24%, 170px);height:10px;' +
      'background:linear-gradient(180deg,#8b5a2b,#5c3a21);' +
      'border-bottom:2px solid #3d271d;box-shadow:0 6px 16px rgba(0,0,0,0.3);';

    // Warm Wooden Desk Surface (Spanning lower third, bottom: 0)
    this.desk = document.createElement('div');
    this.desk.className = 'yearglass-room-desk';
    this.desk.style.cssText =
      'position:absolute;bottom:0;left:0;right:0;width:100%;height:38%;' +
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

    const isPortrait = height > width;
    const isNight = this.state.night;

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

    // Wall wallpaper subtle vertical stripes
    ctx.fillStyle = isNight ? 'rgba(255, 255, 255, 0.03)' : 'rgba(215, 202, 185, 0.18)';
    const stripeW = 28;
    for (let x = 0; x < width; x += stripeW * 2) {
      ctx.fillRect(x, 0, stripeW, height * 0.62);
    }

    // Top ceiling shadow
    const topShadow = ctx.createLinearGradient(0, 0, 0, 40);
    topShadow.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
    topShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(0, 0, width, 40);

    // 2. DESK SURFACE (Anchored at deskY = 62% height)
    const deskY = isPortrait ? height * 0.62 : Math.max(height * 0.65, height - 240);
    const deskH = height - deskY;

    // 3. WINDOW & SHELF POSITIONING (NO OVERLAP!)
    const windowWidth = isPortrait
      ? Math.min(width * 0.52, 220)
      : Math.min(width * 0.42, 340);
    const windowHeight = isPortrait
      ? Math.min(height * 0.26, 170)
      : Math.min(height * 0.34, 240);

    const shelfX = Math.max(10, width * 0.03);
    const shelfW = isPortrait ? Math.min(width * 0.18, 90) : Math.min(width * 0.22, 150);
    const windowX = isPortrait ? Math.max((width - windowWidth) / 2 + 15, shelfX + shelfW + 18) : (width - windowWidth) / 2;
    const windowY = height * 0.08;

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

    // 4. LEFT WALL FLOATING SHELVES & DECOR (NO OVERLAP WITH WINDOW!)
    const shelf1Y = height * 0.22;
    const shelf2Y = height * 0.40;

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
      { color: '#2D4A8A', w: 8, h: 20 },
      { color: '#C86446', w: 6, h: 15 },
    ];
    let bx = shelfX + 5;
    for (const b of books) {
      if (bx + b.w > shelfX + shelfW - 16) break;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, shelf1Y - b.h, b.w, b.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(bx + 2, shelf1Y - b.h + 3, b.w - 4, 2);
      bx += b.w + 2;
    }

    // Small Potted Succulent on Upper Shelf
    const potX = shelfX + shelfW - 18;
    ctx.fillStyle = '#C86446';
    ctx.beginPath();
    ctx.moveTo(potX - 5, shelf1Y - 10);
    ctx.lineTo(potX + 5, shelf1Y - 10);
    ctx.lineTo(potX + 4, shelf1Y);
    ctx.lineTo(potX - 4, shelf1Y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#529C6B';
    ctx.beginPath();
    ctx.arc(potX, shelf1Y - 14, 5, 0, Math.PI * 2);
    ctx.fill();

    // Lower Shelf 2
    drawPlank(shelfX, shelf2Y, shelfW);

    // Two small potted plants on Lower Shelf
    const pot2aX = shelfX + 14;
    ctx.fillStyle = '#A06E3B';
    ctx.fillRect(pot2aX - 4, shelf2Y - 8, 8, 8);
    ctx.fillStyle = '#438A58';
    ctx.beginPath();
    ctx.arc(pot2aX, shelf2Y - 11, 5, 0, Math.PI * 2);
    ctx.fill();

    const pot2bX = shelfX + shelfW - 22;
    ctx.fillStyle = '#5C6B73';
    ctx.fillRect(pot2bX - 5, shelf2Y - 10, 10, 10);
    ctx.fillStyle = '#326243';
    ctx.beginPath();
    ctx.arc(pot2bX, shelf2Y - 14, 6, 0, Math.PI * 2);
    ctx.fill();

    // 5. RIGHT WALL HANGING FRAMED ARTWORK (Strictly Clipped)
    const art1X = Math.min(width * 0.78, windowX + windowWidth + 14);
    const art1Y = height * 0.16;
    const art1W = Math.min(width * (isPortrait ? 0.11 : 0.10), 65);
    const art1H = art1W * 0.75;

    if (art1X + art1W < width - 6) {
      ctx.fillStyle = '#6E472B';
      ctx.fillRect(art1X - 4, art1Y - 4, art1W + 8, art1H + 8);
      ctx.save();
      ctx.beginPath();
      ctx.rect(art1X, art1Y, art1W, art1H);
      ctx.clip(); // Clip so landscape hill never leaks outside frame!

      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(art1X, art1Y, art1W, art1H);
      ctx.fillStyle = '#82A352';
      ctx.beginPath();
      ctx.arc(art1X + art1W * 0.5, art1Y + art1H * 1.2, art1W * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFD15C';
      ctx.beginPath();
      ctx.arc(art1X + art1W * 0.7, art1Y + art1H * 0.35, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const art2X = art1X + art1W + 12;
      const art2Y = art1Y;
      const art2W = Math.min(width * 0.08, 50);
      const art2H = art2W * 1.15;

      if (art2X + art2W < width - 6) {
        ctx.fillStyle = '#6E472B';
        ctx.fillRect(art2X - 4, art2Y - 4, art2W + 8, art2H + 8);
        ctx.fillStyle = '#FDFBF7';
        ctx.fillRect(art2X, art2Y, art2W, art2H);
        ctx.fillStyle = '#E2D8C5';
        ctx.fillRect(art2X + 5, art2Y + 5, art2W - 10, art2H - 15);
      }
    }

    // 6. DESK SURFACE (Wood tabletop with front bevel edge & wood grain gradient)
    ctx.fillStyle = isNight ? '#6E4C2E' : '#A67C4E';
    ctx.fillRect(0, deskY - 4, width, 4);

    const deskGrad = ctx.createLinearGradient(0, deskY, 0, height);
    if (isNight) {
      deskGrad.addColorStop(0, '#3A2314');
      deskGrad.addColorStop(0.3, '#26160B');
      deskGrad.addColorStop(1, '#120B05');
    } else {
      deskGrad.addColorStop(0, '#6E4C2E');
      deskGrad.addColorStop(0.3, '#4A301A');
      deskGrad.addColorStop(1, '#2B1A0D');
    }
    ctx.fillStyle = deskGrad;
    ctx.fillRect(0, deskY, width, deskH);

    // Wood grain texture seams
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let gy = deskY + 12; gy < height; gy += 16) {
      ctx.fillRect(0, gy, width, 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let gy = deskY + 6; gy < height; gy += 22) {
      ctx.fillRect(0, gy, width, 1);
    }

    // Front lip bevel shadow
    const lipGrad = ctx.createLinearGradient(0, deskY, 0, deskY + 16);
    lipGrad.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
    lipGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lipGrad;
    ctx.fillRect(0, deskY, width, 16);

    // 7. ENLARGED 2.2X HIGH-CONTRAST DESK PROPS ON MOBILE (Cleanly Separated)
    const cx = width / 2;
    const propScale = isPortrait ? 1.8 : 1.0;
    const clocheW = Math.min(width * (isPortrait ? 0.48 : 0.38), 260);

    // A. Small Desk Lamp (Far Left)
    const lampX = Math.max(16, width * 0.08);
    const lampBaseY = deskY + 2;
    const lampH = height * (isPortrait ? 0.18 : 0.22);
    const lampTopY = lampBaseY - lampH;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(lampX, lampBaseY, 18 * propScale, 5 * propScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3A2E20';
    ctx.beginPath();
    ctx.ellipse(lampX, lampBaseY - 2, 14 * propScale, 4 * propScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4D3D2A';
    ctx.lineWidth = 4 * propScale;
    ctx.beginPath();
    ctx.moveTo(lampX, lampBaseY - 4);
    ctx.quadraticCurveTo(lampX - 12, lampBaseY - lampH * 0.5, lampX + 12, lampTopY + 10);
    ctx.stroke();

    const shadeX = lampX + 14;
    const shadeY = lampTopY + 10;
    ctx.fillStyle = '#E2B144';
    ctx.beginPath();
    ctx.moveTo(shadeX - 10, shadeY);
    ctx.lineTo(shadeX + 12, shadeY - 8);
    ctx.lineTo(shadeX + 18, shadeY + 10);
    ctx.lineTo(shadeX - 14, shadeY + 10);
    ctx.closePath();
    ctx.fill();

    if (this.state.lampOn) {
      const glowX = shadeX + 2;
      const glowY = shadeY + 10;

      ctx.save();
      const lightBeam = ctx.createLinearGradient(glowX, glowY, glowX + 35, deskY);
      lightBeam.addColorStop(0, 'rgba(255, 235, 160, 0.65)');
      lightBeam.addColorStop(0.6, 'rgba(255, 200, 110, 0.30)');
      lightBeam.addColorStop(1, 'rgba(255, 180, 80, 0.05)');
      ctx.fillStyle = lightBeam;

      ctx.beginPath();
      ctx.moveTo(glowX - 12, glowY);
      ctx.lineTo(glowX + 16, glowY);
      ctx.lineTo(glowX + width * 0.35, deskY + 10);
      ctx.lineTo(glowX - width * 0.12, deskY + 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // B. Warm Coffee Mug (Left of Dome, Clear Gap from Lamp & Radio)
    const mugX = Math.max(lampX + 36, cx - clocheW * 0.72);
    const mugY = deskY + 4;
    const mugW = 16 * propScale;
    const mugH = 18 * propScale;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(mugX, mugY + mugH, 11 * propScale, 4 * propScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D98880';
    ctx.beginPath();
    drawRectRounded(ctx, mugX - mugW / 2, mugY, mugW, mugH, 3);
    ctx.fill();

    ctx.strokeStyle = '#D98880';
    ctx.lineWidth = 2.5 * propScale;
    ctx.beginPath();
    ctx.arc(mugX - mugW / 2 - 2, mugY + mugH / 2, 4.5 * propScale, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();

    ctx.fillStyle = '#4A2A18';
    ctx.beginPath();
    ctx.ellipse(mugX, mugY + 2, mugW / 2 - 1, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mugX - 2, mugY - 2);
    ctx.quadraticCurveTo(mugX - 5, mugY - 8, mugX - 2, mugY - 14);
    ctx.moveTo(mugX + 3, mugY - 2);
    ctx.quadraticCurveTo(mugX + 6, mugY - 9, mugX + 3, mugY - 16);
    ctx.stroke();

    // C. Retro Wooden Desk Radio (Enlarged 2.2x, Clear Gap from Mug)
    const radioX = Math.max(mugX + 32, cx - clocheW * 0.48);
    const radioY = deskY + 2;
    const radioW = 34 * (isPortrait ? 1.3 : 1.0);
    const radioH = 22 * (isPortrait ? 1.2 : 1.0);

    if (radioX - radioW / 2 > mugX + 12 && radioX + radioW / 2 < cx - clocheW * 0.25) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
      ctx.fillRect(radioX - radioW / 2, radioY + radioH - 2, radioW, 4);

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
      ctx.arc(radioX + radioW * 0.25, radioY + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.arc(radioX + radioW * 0.25, radioY + 15, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#C0C0C0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(radioX - 6, radioY);
      ctx.lineTo(radioX - 12, radioY - 14);
      ctx.stroke();
    }

    // D. Open Leather-Bound Journal & Pencil (Right of Dome)
    const journalX = Math.min(cx + clocheW * 0.48, width * 0.62);
    const journalY = deskY + 2;
    const journalW = isPortrait ? Math.min(width * 0.20, 80) : Math.min(width * 0.15, 85);
    const journalH = journalW * 0.68;

    if (journalX + journalW < width - 28) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
      ctx.fillRect(journalX - 2, journalY + 2, journalW + 4, journalH + 4);

      ctx.fillStyle = '#5C3A21';
      ctx.fillRect(journalX - 4, journalY - 2, journalW + 8, journalH + 4);

      ctx.fillStyle = '#FDFBF7';
      ctx.fillRect(journalX, journalY, journalW, journalH);

      ctx.strokeStyle = '#D4C5B2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(journalX + journalW / 2, journalY);
      ctx.lineTo(journalX + journalW / 2, journalY + journalH);
      ctx.stroke();

      ctx.fillStyle = 'rgba(180, 165, 150, 0.35)';
      for (let ly = journalY + 5; ly < journalY + journalH - 4; ly += 5) {
        ctx.fillRect(journalX + 4, ly, journalW / 2 - 8, 1);
        ctx.fillRect(journalX + journalW / 2 + 4, ly, journalW / 2 - 8, 1);
      }

      const penX = journalX + journalW + 3;
      const penY = journalY + journalH - 5;
      ctx.save();
      ctx.translate(penX, penY);
      ctx.rotate(0.35);
      ctx.fillStyle = '#D4A338';
      ctx.fillRect(0, 0, 18, 2.5);
      ctx.fillStyle = '#2B2B2B';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(21, 1.2);
      ctx.lineTo(18, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // E. Wooden Hourglass Timer (Next to Journal, Explicit Gap)
    const hgX = journalX + journalW + (isPortrait ? 14 : 18);
    const hgY = deskY + 2;
    const hgW = isPortrait ? 16 : 14;
    const hgH = isPortrait ? 26 : 24;

    if (hgX + hgW < width - 18) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(hgX, hgY + hgH, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

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
      ctx.arc(hgX, hgY + hgH - 4, 4, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // F. Vintage Camera (Far Right Corner, Explicit Margin Gap)
    const camX = Math.min(width - 20, hgX + (isPortrait ? 24 : 30));
    const camY = deskY + 6;
    const camW = isPortrait ? 30 : 26;
    const camH = isPortrait ? 20 : 17;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
    ctx.fillRect(camX - camW / 2, camY + camH - 2, camW, 4);

    ctx.fillStyle = '#2A2A2A';
    ctx.beginPath();
    drawRectRounded(ctx, camX - camW / 2, camY, camW, camH, 3);
    ctx.fill();

    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(camX - camW / 2, camY, camW, 4);

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(camX, camY + camH * 0.55, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(camX - 2, camY + camH * 0.55 - 2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 8. FOCUS MODE DIMMING OVERLAY
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
