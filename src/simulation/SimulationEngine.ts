/**
 * YearGlass Sanctuary — Simulation Engine
 *
 * Coordinates WebGL rendering, growth system, Pip AI, soundscape,
 * IndexedDB state persistence, offline catch-up, and UI overlays.
 */

import { AudioEngine } from '../audio/AudioEngine';
import { RenderPipeline } from '../rendering/RenderPipeline';
import { CameraController } from '../rendering/CameraController';
import { RoomScene } from '../rendering/RoomScene';
import { SaveEngine } from '../storage/SaveEngine';
import { MemoryEngine } from './MemoryEngine';
import { GrowthSystem, GrowthEvent } from './GrowthSystem';
import { PipAI } from './PipAI';
import { EnvironmentSystem } from '../world/EnvironmentSystem';
import { UIOverlay } from '../ui/UIOverlay';

const DAY_MS = 90_000;
const ECOSYSTEM_SAVE_KEY = 'ecosystem-growth';
const PIP_SAVE_KEY = 'pip-state';
const USER_SETTINGS_KEY = 'user-settings';

export interface SimulationHooks {
  onMemory?: (message: string) => void;
  onReady?: () => void;
  onPipObserved?: (visited: number) => void;
  onEvolutionMilestone?: (event: GrowthEvent) => void;
}

export class SimulationEngine {
  private readonly audio = new AudioEngine();
  private readonly save = new SaveEngine();
  private readonly memory = new MemoryEngine(this.save);
  private readonly growth = new GrowthSystem();
  private readonly pip = new PipAI();
  private readonly camera = new CameraController();
  private readonly env = new EnvironmentSystem();

  private room: RoomScene | null = null;
  private pipeline: RenderPipeline | null = null;
  private uiOverlay: UIOverlay | null = null;

  private readonly hooks: SimulationHooks;
  private clock = { dayStart: Date.now(), lampOn: true, audioMuted: false };
  private started = false;
  private destroyed = false;

  constructor(hooks: SimulationHooks = {}) {
    this.hooks = hooks;

    this.pip.setOnVisit(() => {
      const visits = this.pip.observation.visited;
      void this.memory.record('creature-visit', 'Pip came to say hello.').then((ev) => {
        this.hooks.onMemory?.(ev.message);
        this.hooks.onPipObserved?.(visits);
      });
      void this.saveState();
    });
  }

  async mount(container: HTMLElement): Promise<void> {
    if (this.started) return;
    this.started = true;

    try {
      await this.save.open();
      await this.memory.init();
      await this.loadEcosystemState();
    } catch (err) {
      console.warn('[YearGlass] storage init warning — continuing in-memory:', err);
    }

    this.seedWorldIfEmpty();
    this.checkOfflineProgression();

    this.room = new RoomScene(container);
    this.room.setLamp(this.clock.lampOn);
    this.room.setTimeOfDay(this.clock.lampOn ? 10.0 : 22.0);

    this.camera.computeDesktop();

    this.pipeline = new RenderPipeline(
      container,
      this.camera,
      (dt) => this.frame(dt),
      (normX, normY) => this.handleDomeTap(normX, normY),
      () => this.exitFocus()
    );

    this.pipeline.start();
    this.audio.installGestureUnlock();

    this.mountUIOverlay(container);

    const firstDay = this.memory.currentDay;
    if (this.memory.allEvents().length === 0) {
      void this.memory
        .record('first-launch', `Day ${firstDay}: The sanctuary began.`)
        .then((ev) => this.hooks.onMemory?.(ev.message));
    }

    window.addEventListener('yg-open-journal', () => {
      this.uiOverlay?.renderJournalModal(this.memory);
    });

    window.addEventListener('yg-open-settings', () => {
      this.uiOverlay?.renderSettingsModal(this.clock.lampOn, this.clock.audioMuted);
    });

    this.hooks.onReady?.();
  }

  private async loadEcosystemState(): Promise<void> {
    const [eco, pipState, settings] = await Promise.all([
      this.save.get<any>(ECOSYSTEM_SAVE_KEY),
      this.save.get<any>(PIP_SAVE_KEY),
      this.save.get<any>(USER_SETTINGS_KEY),
    ]);

    if (eco) this.growth.fromJSON(eco);
    if (pipState) this.pip.fromJSON(pipState);
    if (settings) {
      if (typeof settings.lampOn === 'boolean') this.clock.lampOn = settings.lampOn;
      if (typeof settings.audioMuted === 'boolean') {
        this.clock.audioMuted = settings.audioMuted;
        if (settings.audioMuted) this.audio.stopAmbient();
      }
    }
  }

  private async saveState(): Promise<void> {
    try {
      await Promise.all([
        this.save.put(ECOSYSTEM_SAVE_KEY, this.growth.toJSON()),
        this.save.put(PIP_SAVE_KEY, this.pip.toJSON()),
        this.save.put(USER_SETTINGS_KEY, {
          lampOn: this.clock.lampOn,
          audioMuted: this.clock.audioMuted,
        }),
      ]);
    } catch (err) {
      console.warn('[YearGlass] state save warning:', err);
    }
  }

  private seedWorldIfEmpty(): void {
    if (this.growth.plantCount() === 0) {
      this.growth.addPlant('moss', 0.35, 0.6);
      this.growth.addPlant('fern', 0.55, 0.68);
      this.growth.addPlant('orchid', 0.5, 0.52);
      this.growth.addPlant('vine', 0.68, 0.6);
      void this.saveState();
    }
  }

  private checkOfflineProgression(): void {
    const lastSave = this.memory.lastSaveTimestamp;
    if (!lastSave) return;

    const elapsedMs = Date.now() - lastSave;
    const elapsedDays = Math.floor(elapsedMs / DAY_MS);

    if (elapsedDays >= 1) {
      const daysToAdvance = Math.min(7, elapsedDays);
      let totalMilestones: GrowthEvent[] = [];

      for (let i = 0; i < daysToAdvance; i++) {
        const milestones = this.growth.tickDay();
        totalMilestones.push(...milestones);
      }

      void this.memory.advanceDay(daysToAdvance);
      const currentDay = this.memory.currentDay;
      const offlineMsg = `Welcome back! ${daysToAdvance} day${daysToAdvance === 1 ? '' : 's'} passed in quiet growth. Day ${currentDay}.`;
      void this.memory.record('journal', offlineMsg);

      setTimeout(() => {
        this.uiOverlay?.showToast('🌿 Sanctuary Reflection', offlineMsg);
        if (totalMilestones.length > 0) {
          const firstM = totalMilestones[0];
          this.uiOverlay?.showEvolutionPopup(firstM);
        }
      }, 800);

      void this.saveState();
    }
  }

  private readonly frame = (dt: number): void => {
    if (this.destroyed) return;

    this.pip.setPresence(true);
    this.pip.update(dt);
    this.env.update(dt);
    this.room?.update(dt, this.env.currentHours, this.clock.lampOn, this.camera.currentView.focusMode);

    if (this.pipeline) {
      this.pipeline.scene.setSimulationData(
        this.growth.allPlants(),
        this.pip.observation,
        this.growth.moisture
      );
    }

    const elapsed = Date.now() - this.clock.dayStart;
    if (elapsed >= DAY_MS) {
      this.clock.dayStart = Date.now();
      void this.advanceDay();
    }
  };

  private async advanceDay(): Promise<void> {
    const milestones = this.growth.tickDay();
    for (const m of milestones) {
      await this.memory.record(
        'growth-milestone',
        m.message,
        { species: m.species, stage: m.stageName, growth: m.growth }
      );
      this.hooks.onEvolutionMilestone?.(m);
      this.uiOverlay?.showEvolutionPopup(m);
    }

    const day = this.memory.currentDay;
    const dayMsg = `The sanctuary enters day ${day + 1}.`;
    this.hooks.onMemory?.(dayMsg);
    this.uiOverlay?.showToast('🌅 New Sanctuary Day', `Day ${day + 1} has arrived.`);
    await this.memory.advanceDay();
    await this.saveState();
    this.uiOverlay?.updateStatus(this.memory.currentDay, this.growth.moisture);
  }

  private handleDomeTap(normX: number, normY: number): void {
    this.audio.play('shimmer');
    this.pipeline?.wake();

    const pipMsg = this.pip.reactToTap(normX, normY);
    const moisturePct = Math.round(this.growth.moisture * 100);

    void this.memory.record('creature-visit', pipMsg);
    this.hooks.onPipObserved?.(this.pip.observation.visited);

    if (!this.camera.currentView.focusMode) {
      this.camera.focusOnDome();
    }

    this.uiOverlay?.showDialogueCard('The ladybug watches...', `${pipMsg} Soil moisture is at ${moisturePct}%.`);
    void this.saveState();
  }

  private mountUIOverlay(container: HTMLElement): void {
    this.uiOverlay = new UIOverlay({
      isFocused: () => this.isFocused(),
      onEnterFocus: () => this.enterFocus(),
      onExitFocus: () => this.exitFocus(),
      onButtonTap: () => this.audio.playButtonTap(),
      onToggleFocus: () => {
        const isFocused = this.camera.toggleFocus();
        this.uiOverlay?.setFocusState(isFocused);
        return isFocused;
      },
      onWater: () => {
        const msg = this.growth.waterPlants(0.3);
        this.audio.play('shimmer');
        void this.memory.record('care-water', msg);
        this.uiOverlay?.updateStatus(this.memory.currentDay, this.growth.moisture);
        void this.saveState();
        return msg;
      },
      onToggleLamp: () => {
        this.setLamp(!this.clock.lampOn);
        return this.clock.lampOn;
      },
      onToggleAudio: () => {
        this.clock.audioMuted = !this.clock.audioMuted;
        if (this.clock.audioMuted) {
          this.audio.stopAmbient();
        } else {
          this.audio.startAmbient();
        }
        void this.saveState();
        return this.clock.audioMuted;
      },
      onResetData: async () => {
        await this.memory.clear();
        await this.save.clear();
        location.reload();
      },
      onAddJournal: (note) => {
        void this.memory.addJournalEntry(note);
      },
    });

    this.uiOverlay.mount(container, this.memory.currentDay, this.growth.moisture);
  }

  isFocused(): boolean {
    return this.camera.isFocused;
  }

  enterFocus(): void {
    this.camera.focusOnDome();
    this.uiOverlay?.setFocusState(true);
    this.pipeline?.wake();
    this.audio.play('shimmer');
  }

  focusDome(): void {
    this.enterFocus();
  }

  exitFocus(): void {
    this.camera.exitFocus();
    this.uiOverlay?.setFocusState(false);
  }

  getMemorySummary(): string {
    return this.memory.summarize();
  }

  getPip(): { x: number; y: number; state: string; visited: number } {
    return { ...this.pip.observation, state: this.pip.observation.state };
  }

  getDay(): number {
    return this.memory.currentDay;
  }

  setLamp(on: boolean): void {
    this.clock.lampOn = on;
    this.room?.setLamp(on);
    void this.saveState();
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.audio.destroy();
    this.pipeline?.destroy();
    this.room?.destroy();
    this.camera.destroy();
    this.uiOverlay?.destroy();
    this.save.close();
  }
}
