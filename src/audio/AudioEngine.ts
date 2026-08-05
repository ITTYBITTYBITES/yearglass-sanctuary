/**
 * YearGlass Sanctuary — Procedural Web Audio Engine
 *
 * Fully procedural ambient soundscape using Web Audio API:
 *   - Rain: filtered noise through dynamic LFO bandpass
 *   - Birdsong: procedural FM chirps
 *   - Ambient hum: low sine drone + harmonic detune
 *   - Dome shimmer: rising arpeggio
 *
 * First-gesture unlock satisfies browser autoplay policies across Chrome,
 * Firefox, Safari, and Android. Graceful fallback if Web Audio is unsupported.
 */

export type YearglassSound = 'rain' | 'bird' | 'hum' | 'shimmer';

interface ActiveNode {
  stop: () => void;
  disconnect: () => void;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private started = false;
  private disposed = false;
  private birdTimer = 0;
  private readonly active: ActiveNode[] = [];
  private readonly unlockHandlers: Array<() => void> = [];

  async unlock(): Promise<boolean> {
    if (this.disposed) return false;
    if (this.ctx && this.ctx.state === 'running') return true;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      if (!this.ctx) {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.6;
        this.master.connect(this.ctx.destination);
        this.buildNoiseBuffer();
      }
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return true;
    } catch {
      return false;
    }
  }

  installGestureUnlock(): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const targets = ['pointerdown', 'touchstart', 'keydown'] as const;
    for (const type of targets) {
      const handler = () => {
        if (this.disposed) return;
        void this.unlock().then((ok) => {
          if (ok) {
            this.startAmbient();
            this.removeGestureUnlock();
          }
        });
      };
      window.addEventListener(type, handler, { once: true, passive: true });
      this.unlockHandlers.push(() => window.removeEventListener(type, handler));
    }
    return () => this.removeGestureUnlock();
  }

  removeGestureUnlock(): void {
    for (const remove of this.unlockHandlers.splice(0)) {
      try {
        remove();
      } catch {
        /* ignore */
      }
    }
  }

  startAmbient(): void {
    if (this.started || !this.ctx || !this.master) return;
    this.started = true;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0;
    this.ambientGain.connect(this.master);

    this.startRain(this.ambientGain);
    this.startHum(this.ambientGain);
    this.ambientGain.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 3);
    this.scheduleBirds();
  }

  stopAmbient(): void {
    if (!this.ctx) return;
    this.started = false;
    this.clearBirdTimer();
    const gain = this.ambientGain;
    if (gain) {
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
      window.setTimeout(() => {
        for (const node of this.active.splice(0)) {
          try {
            node.stop();
            node.disconnect();
          } catch {
            /* ignore */
          }
        }
      }, 900);
    }
    this.ambientGain = null;
  }

  private clearBirdTimer(): void {
    if (this.birdTimer) {
      window.clearTimeout(this.birdTimer);
      this.birdTimer = 0;
    }
  }

  private buildNoiseBuffer(): void {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * 2);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    this.noiseBuffer = buffer;
  }

  private startRain(dest: AudioNode): void {
    const ctx = this.ctx as AudioContext;
    if (!this.noiseBuffer) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900;
    band.Q.value = 0.6;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(band.frequency);

    const wet = ctx.createGain();
    wet.gain.value = 0.4;

    source.connect(band);
    band.connect(wet);
    wet.connect(dest);
    source.start();
    lfo.start();

    this.active.push({
      stop: () => {
        try {
          source.stop();
          lfo.stop();
        } catch {
          /* ignore */
        }
      },
      disconnect: () => {
        source.disconnect();
        lfo.disconnect();
      },
    });
  }

  private startHum(dest: AudioNode): void {
    const ctx = this.ctx as AudioContext;
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 82.5;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    o1.connect(g);
    o2.connect(g);
    g.connect(dest);
    o1.start();
    o2.start();

    this.active.push({
      stop: () => {
        try {
          o1.stop();
          o2.stop();
        } catch {
          /* ignore */
        }
      },
      disconnect: () => {
        o1.disconnect();
        o2.disconnect();
        g.disconnect();
      },
    });
  }

  private scheduleBirds(): void {
    this.clearBirdTimer();
    const chirp = () => {
      if (this.disposed || !this.ctx || !this.master) return;
      this.playChirp(0.35 + Math.random() * 0.3);
    };
    const loop = () => {
      if (this.disposed || !this.ctx || !this.started) return;
      const delay = 4000 + Math.random() * 7000;
      this.birdTimer = window.setTimeout(() => {
        if (this.disposed) return;
        this.birdTimer = 0;
        chirp();
        loop();
      }, delay);
    };
    loop();
  }

  private playChirp(vol: number): void {
    const ctx = this.ctx as AudioContext;
    const t0 = ctx.currentTime;
    const dur = 0.12 + Math.random() * 0.08;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const carrier = 2000 + Math.random() * 1600;
    osc.frequency.setValueAtTime(carrier, t0);
    osc.frequency.exponentialRampToValueAtTime(carrier * (0.85 + Math.random() * 0.3), t0 + dur);

    const mod = ctx.createOscillator();
    mod.frequency.value = 40 + Math.random() * 60;
    const modGain = ctx.createGain();
    modGain.gain.value = carrier * 0.5;
    mod.connect(modGain);
    modGain.connect(osc.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(this.master as GainNode);
    osc.start(t0);
    mod.start(t0);
    osc.stop(t0 + dur + 0.02);
    mod.stop(t0 + dur + 0.02);
  }

  playShimmer(): void {
    const ctx = this.ctx as AudioContext;
    if (!ctx || ctx.state !== 'running') return;
    const base = 523.25;
    const steps = [0, 4, 7, 12, 16];
    steps.forEach((st, i) => {
      const t0 = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = base * Math.pow(2, st / 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      osc.connect(g);
      g.connect(this.master as GainNode);
      osc.start(t0);
      osc.stop(t0 + 1);
    });
  }

  playWaterDrop(): void {
    const ctx = this.ctx as AudioContext;
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t0);
    osc.frequency.exponentialRampToValueAtTime(320, t0 + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    osc.connect(g);
    g.connect(this.master as GainNode);
    osc.start(t0);
    osc.stop(t0 + 0.15);
  }

  playButtonTap(): void {
    const ctx = this.ctx as AudioContext;
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, t0);
    osc.frequency.exponentialRampToValueAtTime(240, t0 + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    osc.connect(g);
    g.connect(this.master as GainNode);
    osc.start(t0);
    osc.stop(t0 + 0.05);
  }

  play(sound: YearglassSound): void {
    if (!this.ctx) return;
    if (sound === 'shimmer') {
      this.playShimmer();
    } else if (sound === 'hum') {
      this.playWaterDrop();
    }
  }

  destroy(): void {
    this.disposed = true;
    this.clearBirdTimer();
    this.removeGestureUnlock();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    for (const node of this.active.splice(0)) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.ctx = null;
    this.master = null;
    this.ambientGain = null;
    this.started = false;
  }
}
