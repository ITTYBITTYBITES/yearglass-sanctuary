/**
 * YearGlass Sanctuary — Memory Engine
 *
 * Event-sourced log tracking sanctuary memories, journal entries,
 * ecosystem evolution, creature visits, and anniversaries.
 */

import { SaveEngine } from '../storage/SaveEngine';

export type MemoryEventType =
  | 'first-launch'
  | 'creature-visit'
  | 'growth-milestone'
  | 'journal'
  | 'weather-change'
  | 'focus-complete'
  | 'care-water';

export interface MemoryEvent {
  id: string;
  type: MemoryEventType;
  at: number;
  day: number;
  message: string;
  meta?: Record<string, unknown>;
}

const LOG_KEY = 'memory-log';
const STATE_KEY = 'memory-state';

interface MemoryState {
  day: number;
  lastSave: number;
}

export class MemoryEngine {
  private readonly events: MemoryEvent[] = [];
  private readonly save: SaveEngine;
  private state: MemoryState = { day: 1, lastSave: Date.now() };
  private ready = false;

  constructor(save: SaveEngine) {
    this.save = save;
  }

  async init(): Promise<void> {
    const [log, state] = await Promise.all([
      this.save.get<MemoryEvent[]>(LOG_KEY),
      this.save.get<MemoryState>(STATE_KEY),
    ]);
    if (Array.isArray(log)) this.events.push(...log);
    if (state && typeof state.day === 'number') this.state = { ...this.state, ...state };
    this.ready = true;
  }

  async record(
    type: MemoryEventType,
    message: string,
    meta?: Record<string, unknown>
  ): Promise<MemoryEvent> {
    const event: MemoryEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      at: Date.now(),
      day: this.state.day,
      message,
      meta,
    };
    this.events.push(event);
    this.state.lastSave = Date.now();
    await this.save.put(LOG_KEY, this.events);
    await this.save.put(STATE_KEY, this.state);
    return event;
  }

  async addJournalEntry(note: string): Promise<MemoryEvent> {
    return this.record('journal', note);
  }

  async advanceDay(count = 1): Promise<void> {
    this.state.day += count;
    this.state.lastSave = Date.now();
    await this.save.put(STATE_KEY, this.state);
  }

  get currentDay(): number {
    return this.state.day;
  }

  get lastSaveTimestamp(): number {
    return this.state.lastSave;
  }

  get isReady(): boolean {
    return this.ready;
  }

  allEvents(): MemoryEvent[] {
    return [...this.events];
  }

  eventsByType(type: MemoryEventType): MemoryEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  recent(count = 10): MemoryEvent[] {
    return this.events.slice(-count).reverse();
  }

  summarize(): string {
    const total = this.events.length;
    const creatures = this.eventsByType('creature-visit').length;
    const milestones = this.eventsByType('growth-milestone').length;
    const journals = this.eventsByType('journal').length;
    const parts = [
      `Day ${this.state.day} Sanctuary`,
      `${total} memor${total === 1 ? 'y' : 'ies'}`,
      `${milestones} milestone${milestones === 1 ? '' : 's'}`,
    ];
    if (creatures > 0) parts.push(`${creatures} creature visit${creatures === 1 ? '' : 's'}`);
    if (journals > 0) parts.push(`${journals} journal note${journals === 1 ? '' : 's'}`);
    return parts.join(' · ');
  }

  replay(callback: (event: MemoryEvent) => void): void {
    for (const event of this.events) {
      callback(event);
    }
  }

  async clear(): Promise<void> {
    this.events.length = 0;
    this.state = { day: 1, lastSave: Date.now() };
    await this.save.put(LOG_KEY, this.events);
    await this.save.put(STATE_KEY, this.state);
  }
}
