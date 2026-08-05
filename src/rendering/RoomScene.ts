/**
 * YearGlass Sanctuary — Room Scene
 *
 * DOM & Canvas side-profile backdrop representing the cozy workspace environment:
 * desk surface, wooden shelf with decor, centered sky window, and warm lamp glow.
 * Provides both DOM elements and Canvas 2D draw routines for seamless composition
 * behind the terrarium dome in both Room View and Focus Mode.
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
      'background:#f3efe6;object-fit:cover;transition:opacity 0.4s ease;z-index:0;';

    // Window centered behind desk
    this.windowFrame = document.createElement('div');
    this.windowFrame.className = 'yearglass-room-window';
    this.windowFrame.style.cssText =
      'position:absolute;top:10%;left:50%;transform:translateX(-50%);width:min(38%, 280px);height:min(32%, 220px);' +
      'border-radius:12px;border:8px solid #3d271d;background:linear-gradient(180deg,#4a90e2,#e0f7fa);' +
      'box-shadow:inset 0 0 25px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.25);';

    // Left Wooden Shelves
    this.shelf = document.createElement('div');
    this.shelf.className = 'yearglass-room-shelf';
    this.shelf.style.cssText =
      'position:absolute;top:28%;left:5%;width:min(26%, 180px);height:10px;' +
      'background:linear-gradient(180deg,#7a4b2a,#4a2e1a);' +
      'border-bottom:2px solid #3d271d;box-shadow:0 6px 16px rgba(0,0,0,0.35);';

    // Warm Wooden Desk Surface (Spanning lower third, bottom: 0)
    this.desk = document.createElement('div');
    this.desk.className = 'yearglass-room-desk';
    this.desk.style.cssText =
      'position:absolute;bottom:0;left:0;right:0;width:100%;height:33%;' +
      'background:linear-gradient(180deg,#5c3a21 0%,#23120b 100%);' +
      'border-top:3px solid #a06e3b;' +
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

    // Unmask room scene fully in Room View, gently soften in Focus Mode
    this.root.style.opacity = isFocused ? '0.40' : '1.0';
  }

  setLamp(on: boolean): void {
    this.state.lampOn = on;
    this.lamp.style.opacity = on ? '1' : '0.15';
  }

  setTimeOfDay(hours: number): void {
    const night = hours < 6.5 || hours >= 19.5;
    this.state.night = night;

    if (night) {
      this.windowFrame.style.background = 'linear-gradient(180deg,#070e1a,#1a2c4d)';
    } else if (hours >= 16.5) {
      this.windowFrame.style.background = 'linear-gradient(180deg,#3a1c22,#8f4e3b)';
    } else {
      this.windowFrame.style.background = 'linear-gradient(180deg,#4a90e2,#e0f7fa)';
    }
  }

  get isNight(): boolean {
    return this.state.night;
  }

  /**
   * Draw the complete side-profile room scene graph onto a 2D canvas context.
   *
   * Includes:
   *  - Wall Background: Cream/beige vertical wallpaper gradient (#F3EFE6) with stripes
   *  - Window: Centered blue sky gradient window with frame, pane grids & sun/moon glow
   *  - Shelves & Decor: Left wooden shelves with stacked books and potted plants
   *  - Desk Surface: Warm wooden tabletop spanning lower third (deskY ~ 67% height)
   *  - Lamp: Left desk lamp with shade and warm radial/beam light glow
   *  - Focus Mode Dimming: Softens background when isFocused is true
   */
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, isFocused: boolean): void {
    if (this.disposed) return;
    ctx.save();

    // Helper for cross-environment rounded rectangles
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

    // 1. WALL BACKGROUND (Cream/beige vertical wallpaper gradient #F3EFE6)
    const wallGrad = ctx.createLinearGradient(0, 0, 0, height);
    wallGrad.addColorStop(0, '#F7F4EB');
    wallGrad.addColorStop(0.5, '#F3EFE6');
    wallGrad.addColorStop(1, '#E8E2D5');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height);

    // Wallpaper subtle vertical stripes
    ctx.fillStyle = 'rgba(215, 205, 190, 0.18)';
    const stripeWidth = 24;
    for (let x = 0; x < width; x += stripeWidth * 2) {
      ctx.fillRect(x, 0, stripeWidth, height * 0.67);
    }

    // Top ceiling ambient shadow
    const topShadow = ctx.createLinearGradient(0, 0, 0, 45);
    topShadow.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
    topShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(0, 0, width, 45);

    // 2. WINDOW (Centered blue sky gradient window behind desk with frame & pane grids)
    const windowWidth = Math.min(width * 0.38, 280);
    const windowHeight = Math.min(height * 0.32, 220);
    const windowX = (width - windowWidth) / 2;
    const windowY = height * 0.10;

    // Window outer wooden frame
    ctx.fillStyle = '#3D271D';
    ctx.beginPath();
    drawRectRounded(ctx, windowX - 8, windowY - 8, windowWidth + 16, windowHeight + 16, 12);
    ctx.fill();

    // Window frame inner bevel
    ctx.fillStyle = '#2A1B0E';
    ctx.beginPath();
    drawRectRounded(ctx, windowX - 3, windowY - 3, windowWidth + 6, windowHeight + 6, 8);
    ctx.fill();

    // Sky gradient inside window
    const skyGrad = ctx.createLinearGradient(0, windowY, 0, windowY + windowHeight);
    if (this.state.night) {
      skyGrad.addColorStop(0, '#070E1A');
      skyGrad.addColorStop(0.6, '#12203A');
      skyGrad.addColorStop(1, '#1A2C4D');
    } else {
      skyGrad.addColorStop(0, '#4A90E2');
      skyGrad.addColorStop(0.5, '#87CEEB');
      skyGrad.addColorStop(1, '#E0F7FA');
    }
    ctx.fillStyle = skyGrad;
    ctx.beginPath();
    drawRectRounded(ctx, windowX, windowY, windowWidth, windowHeight, 6);
    ctx.fill();

    // Sun / Moon Glow inside window
    if (!this.state.night) {
      const sunX = windowX + windowWidth * 0.72;
      const sunY = windowY + windowHeight * 0.32;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 55);
      sunGlow.addColorStop(0, 'rgba(255, 253, 220, 0.95)');
      sunGlow.addColorStop(0.35, 'rgba(255, 235, 170, 0.55)');
      sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const moonX = windowX + windowWidth * 0.75;
      const moonY = windowY + windowHeight * 0.28;
      ctx.fillStyle = '#E8F0F8';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Window Glass Pane Grids (Muntins)
    ctx.strokeStyle = '#3D271D';
    ctx.lineWidth = 4;
    // Vertical center bar
    ctx.beginPath();
    ctx.moveTo(windowX + windowWidth / 2, windowY);
    ctx.lineTo(windowX + windowWidth / 2, windowY + windowHeight);
    ctx.stroke();
    // Horizontal crossbar
    ctx.beginPath();
    ctx.moveTo(windowX, windowY + windowHeight / 2);
    ctx.lineTo(windowX + windowWidth, windowY + windowHeight / 2);
    ctx.stroke();

    // Glass sheen reflection overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.moveTo(windowX, windowY);
    ctx.lineTo(windowX + windowWidth * 0.42, windowY);
    ctx.lineTo(windowX, windowY + windowHeight * 0.62);
    ctx.closePath();
    ctx.fill();

    // 3. SHELVES & DECOR (Left Wooden Shelves with Books & Plants)
    const shelfX = Math.max(16, width * 0.05);
    const shelfWidth = Math.min(width * 0.25, 180);
    const shelf1Y = height * 0.26;
    const shelf2Y = height * 0.44;

    const drawPlank = (sx: number, sy: number, sw: number) => {
      ctx.fillStyle = '#7A4B2A';
      ctx.fillRect(sx, sy, sw, 3);
      ctx.fillStyle = '#4A2E1A';
      ctx.fillRect(sx, sy + 3, sw, 8);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(sx, sy + 11, sw + 4, 6);
    };

    // Upper Shelf 1
    drawPlank(shelfX, shelf1Y, shelfWidth);

    // Books on Upper Shelf
    const bookColors = ['#A83232', '#2E6B40', '#2D4A8A', '#D4A338'];
    let bx = shelfX + 12;
    for (let i = 0; i < bookColors.length; i++) {
      const bw = 8 + (i % 2) * 3;
      const bh = 20 + (i % 3) * 6;
      ctx.fillStyle = bookColors[i];
      ctx.fillRect(bx, shelf1Y - bh, bw, bh);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(bx + 2, shelf1Y - bh + 3, bw - 4, 2);
      bx += bw + 2;
    }

    // Small Potted Plant on Upper Shelf
    const potX = shelfX + shelfWidth - 28;
    const potY = shelf1Y;
    ctx.fillStyle = '#C86446';
    ctx.beginPath();
    ctx.moveTo(potX - 8, potY - 14);
    ctx.lineTo(potX + 8, potY - 14);
    ctx.lineTo(potX + 6, potY);
    ctx.lineTo(potX - 6, potY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#D87456';
    ctx.fillRect(potX - 9, potY - 16, 18, 3);

    ctx.fillStyle = '#438A58';
    ctx.beginPath();
    ctx.arc(potX - 4, potY - 20, 6, 0, Math.PI * 2);
    ctx.arc(potX + 4, potY - 22, 7, 0, Math.PI * 2);
    ctx.arc(potX, potY - 25, 8, 0, Math.PI * 2);
    ctx.fill();

    // Lower Shelf 2
    drawPlank(shelfX, shelf2Y, shelfWidth);

    // Tilted book & second plant on Lower Shelf
    ctx.save();
    ctx.translate(shelfX + 18, shelf2Y);
    ctx.rotate(-0.18);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, -24, 10, 24);
    ctx.restore();

    const pot2X = shelfX + shelfWidth - 40;
    ctx.fillStyle = '#5C6B73';
    ctx.fillRect(pot2X - 7, shelf2Y - 12, 14, 12);
    ctx.fillStyle = '#529C6B';
    ctx.beginPath();
    ctx.arc(pot2X, shelf2Y - 18, 9, 0, Math.PI * 2);
    ctx.fill();

    // 4. DESK SURFACE (Warm wooden tabletop spanning lower third, bottom: 0)
    const deskY = height * 0.67;
    const deskHeight = height - deskY;

    // Tabletop top edge highlight line
    ctx.fillStyle = '#A06E3B';
    ctx.fillRect(0, deskY - 3, width, 3);

    // Tabletop rich wood gradient
    const deskGrad = ctx.createLinearGradient(0, deskY, 0, height);
    deskGrad.addColorStop(0, '#5C3A21');
    deskGrad.addColorStop(0.3, '#432616');
    deskGrad.addColorStop(1, '#23120B');
    ctx.fillStyle = deskGrad;
    ctx.fillRect(0, deskY, width, deskHeight);

    // Wood grain lines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let gy = deskY + 10; gy < height; gy += 14) {
      ctx.fillRect(0, gy, width, 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let gy = deskY + 4; gy < height; gy += 20) {
      ctx.fillRect(0, gy, width, 1);
    }

    // Tabletop front lip shadow
    const lipGrad = ctx.createLinearGradient(0, deskY, 0, deskY + 12);
    lipGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    lipGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lipGrad;
    ctx.fillRect(0, deskY, width, 12);

    // 5. LAMP (Desk lamp on left emitting warm radial light glow)
    const lampX = Math.max(30, width * 0.18);
    const lampBaseY = deskY;
    const lampHeight = height * 0.28;
    const lampTopY = lampBaseY - lampHeight;

    // Lamp desk shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(lampX, lampBaseY, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lamp Base
    ctx.fillStyle = '#2A2018';
    ctx.beginPath();
    ctx.ellipse(lampX, lampBaseY - 3, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4A3B2C';
    ctx.fillRect(lampX - 16, lampBaseY - 6, 32, 3);

    // Lamp Arched Stem
    ctx.strokeStyle = '#3A2E20';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lampX, lampBaseY - 6);
    ctx.quadraticCurveTo(lampX - 15, lampBaseY - lampHeight * 0.5, lampX + 15, lampTopY + 12);
    ctx.stroke();

    // Lamp Shade
    const shadeX = lampX + 18;
    const shadeY = lampTopY + 12;
    ctx.fillStyle = '#3A2E20';
    ctx.beginPath();
    ctx.moveTo(shadeX - 12, shadeY);
    ctx.lineTo(shadeX + 16, shadeY - 10);
    ctx.lineTo(shadeX + 22, shadeY + 12);
    ctx.lineTo(shadeX - 18, shadeY + 12);
    ctx.closePath();
    ctx.fill();

    // Lamp Warm Radial Light Glow
    if (this.state.lampOn) {
      const glowX = shadeX + 2;
      const glowY = shadeY + 12;
      const glowRadius = Math.max(width, height) * 0.45;

      // Cone beam of light towards desk
      ctx.save();
      const lightBeam = ctx.createLinearGradient(glowX, glowY, glowX + 40, deskY);
      lightBeam.addColorStop(0, 'rgba(255, 225, 150, 0.48)');
      lightBeam.addColorStop(0.5, 'rgba(255, 200, 110, 0.25)');
      lightBeam.addColorStop(1, 'rgba(255, 180, 80, 0.05)');
      ctx.fillStyle = lightBeam;

      ctx.beginPath();
      ctx.moveTo(glowX - 15, glowY);
      ctx.lineTo(glowX + 20, glowY);
      ctx.lineTo(glowX + width * 0.45, deskY);
      ctx.lineTo(glowX - width * 0.15, deskY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Soft radial bloom
      const radialGlow = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, glowRadius);
      radialGlow.addColorStop(0, 'rgba(255, 230, 160, 0.55)');
      radialGlow.addColorStop(0.3, 'rgba(255, 190, 100, 0.25)');
      radialGlow.addColorStop(0.7, 'rgba(255, 160, 70, 0.08)');
      radialGlow.addColorStop(1, 'rgba(255, 140, 50, 0)');
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(glowX, glowY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. FOCUS MODE DIMMING OVERLAY
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
