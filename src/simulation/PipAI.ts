/**
 * YearGlass Sanctuary — Pip AI
 *
 * Creature companion AI for Pip the ladybug.
 */

export type PipState = 'wandering' | 'resting' | 'curious' | 'hidden';

export interface PipObservation {
  x: number;
  y: number;
  state: PipState;
  visited: number;
}

export class PipAI {
  private state: PipState = 'wandering';
  private x = 0.5;
  private y = 0.5;
  private wanderTarget = { x: 0.5, y: 0.5 };
  private stateTimer = 0;
  private visited = 0;
  private presence = false;
  private onVisit: (() => void) | null = null;

  constructor() {
    this.pickWanderTarget();
  }

  setOnVisit(cb: () => void): void {
    this.onVisit = cb;
  }

  setPresence(present: boolean): void {
    this.presence = present;
  }

  reactToTap(normX: number, normY: number): string {
    this.state = 'curious';
    this.stateTimer = 3.5;
    this.wanderTarget = {
      x: Math.max(0.18, Math.min(0.82, 0.5 + normX * 0.35)),
      y: Math.max(0.18, Math.min(0.82, 0.5 + normY * 0.35)),
    };
    this.visited += 1;
    if (this.onVisit) this.onVisit();

    const reactions = [
      "Pip scuttles over to inspect where you tapped the glass.",
      "The ladybug pauses, turning curious antennae toward your tap.",
      "Pip gives a tiny jump of delight and settles near the orchid.",
      "Pip watches you closely through the curved glass.",
      "Pip scampers across a moss leaf to stay near your hand."
    ];
    return reactions[Math.floor(Math.random() * reactions.length)];
  }

  update(dt: number): void {
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) this.transition();

    const speed = this.presence || this.state === 'curious' ? 0.38 : 0.18;
    const dx = this.wanderTarget.x - this.x;
    const dy = this.wanderTarget.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.01) {
      this.pickWanderTarget();
    } else {
      const step = Math.min(dist, speed * dt);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  private transition(): void {
    const roll = Math.random();
    if (this.presence && roll < 0.45) {
      this.state = 'curious';
      this.stateTimer = 2.5 + Math.random() * 2;
    } else if (roll < 0.75) {
      this.state = 'resting';
      this.stateTimer = 3.5 + Math.random() * 4;
    } else {
      this.state = 'wandering';
      this.stateTimer = 2.5 + Math.random() * 3;
      this.pickWanderTarget();
    }
    if (this.state === 'curious' && this.onVisit) {
      this.onVisit();
    }
  }

  private pickWanderTarget(): void {
    this.wanderTarget = { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6 };
  }

  hide(): void {
    this.state = 'hidden';
    this.stateTimer = 4;
  }

  get observation(): PipObservation {
    return { x: this.x, y: this.y, state: this.state, visited: this.visited };
  }

  toJSON(): Record<string, unknown> {
    return {
      visited: this.visited,
      x: this.x,
      y: this.y,
      state: this.state,
    };
  }

  fromJSON(data: Partial<PipObservation>): void {
    if (typeof data.visited === 'number') this.visited = data.visited;
    if (typeof data.x === 'number') this.x = data.x;
    if (typeof data.y === 'number') this.y = data.y;
    if (data.state) this.state = data.state;
  }
}
