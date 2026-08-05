/**
 * YearGlass Sanctuary — Room Scene
 *
 * DOM backdrop representing the cozy workspace environment:
 * desk surface, wooden shelf, window time-of-day gradient, and warm lamp glow.
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
      'position:absolute;inset:0;pointer-events:none;overflow:hidden;background:#0d0d0e;';

    // Window showing time of day / sky
    this.windowFrame = document.createElement('div');
    this.windowFrame.className = 'yearglass-room-window';
    this.windowFrame.style.cssText =
      'position:absolute;top:6%;left:8%;width:28%;height:32%;border-radius:14px;' +
      'border:3px solid #1a1612;background:linear-gradient(160deg,#0f1f38,#1c3358);' +
      'box-shadow:inset 0 0 30px rgba(0,0,0,0.6), 0 0 15px rgba(28,51,88,0.3);';

    // Wooden Shelf
    this.shelf = document.createElement('div');
    this.shelf.className = 'yearglass-room-shelf';
    this.shelf.style.cssText =
      'position:absolute;top:22%;left:0;right:0;height:10px;' +
      'background:linear-gradient(180deg,#241d17,#140e0a);' +
      'border-bottom:1px solid rgba(191,160,106,0.25);box-shadow:0 6px 16px rgba(0,0,0,0.5);';

    // Warm Desk Surface
    this.desk = document.createElement('div');
    this.desk.className = 'yearglass-room-desk';
    this.desk.style.cssText =
      'position:absolute;bottom:0;left:0;right:0;height:36%;' +
      'background:linear-gradient(180deg,#1c1611 0%,#0f0a07 100%);' +
      'border-top:2px solid rgba(191,160,106,0.2);' +
      'box-shadow:inset 0 4px 24px rgba(0,0,0,0.8), 0 -8px 24px rgba(0,0,0,0.4);';

    // Warm Ambient Lamp
    this.lamp = document.createElement('div');
    this.lamp.className = 'yearglass-room-lamp';
    this.lamp.style.cssText =
      'position:absolute;top:10%;right:8%;width:38%;height:48%;pointer-events:none;' +
      'background:radial-gradient(circle at 50% 50%,rgba(255,200,130,0.42),rgba(255,150,60,0.03) 70%,transparent);' +
      'transition:opacity 0.4s ease;';

    this.root.append(this.windowFrame, this.shelf, this.desk, this.lamp);
    container.insertBefore(this.root, container.firstChild);
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
      this.windowFrame.style.background = 'linear-gradient(160deg,#070e1a,#12203a)';
    } else if (hours >= 16.5) { // Sunset
      this.windowFrame.style.background = 'linear-gradient(160deg,#3a1c22,#5c3328)';
    } else { // Daytime
      this.windowFrame.style.background = 'linear-gradient(160deg,#2b4c6f,#4a7ba3)';
    }
  }

  get isNight(): boolean {
    return this.state.night;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.remove();
  }
}
