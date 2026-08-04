/**
 * YearGlass Sanctuary — UI Overlay System
 *
 * Decoupled high-contrast UI overlay HUD and modal management.
 */

import type { GrowthEvent } from '../simulation/GrowthSystem';
import type { MemoryEngine } from '../simulation/MemoryEngine';

export interface UIOverlayCallbacks {
  onToggleFocus: () => boolean;
  onWater: () => string;
  onToggleLamp: () => boolean;
  onToggleAudio: () => boolean;
  onResetData: () => void;
  onAddJournal: (note: string) => void;
}

export class UIOverlay {
  private uiContainer: HTMLElement | null = null;
  private activeModal: HTMLElement | null = null;
  private activeToast: HTMLElement | null = null;
  private toastTimeout = 0;
  private callbacks: UIOverlayCallbacks;

  constructor(callbacks: UIOverlayCallbacks) {
    this.callbacks = callbacks;
  }

  mount(container: HTMLElement, day: number, moisture: number): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'yearglass-ui-overlay';
    this.uiContainer.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:30;' +
      'display:flex;flex-direction:column;justify-content:space-between;padding:1rem;';

    const topBar = document.createElement('div');
    topBar.className = 'yearglass-top-bar';
    topBar.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;width:100%;pointer-events:auto;';

    const statusBadge = document.createElement('button');
    statusBadge.id = 'yg-status-badge';
    statusBadge.className = 'yg-btn-badge';
    statusBadge.setAttribute('aria-label', 'Sanctuary status: Day and soil moisture');
    statusBadge.style.cssText =
      'display:inline-flex;align-items:center;gap:0.5rem;padding:0.5rem 0.9rem;' +
      'background:#fdfbf7;color:#1a1a1a;border:1px solid rgba(191,160,106,0.5);' +
      'border-radius:999px;font-size:0.88rem;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,0.35);' +
      'cursor:pointer;transition:transform 0.15s ease;';

    statusBadge.innerHTML = `<span>☀️ Day ${day}</span> · <span>💧 ${Math.round(moisture * 100)}% Soil</span>`;

    const actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';

    const createHeaderBtn = (label: string, icon: string, onClick: () => void) => {
      const btn = document.createElement('button');
      btn.className = 'yg-hud-btn';
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.innerHTML = `${icon} <span class="yg-btn-label">${label}</span>`;
      btn.style.cssText =
        'display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 0.85rem;' +
        'background:#fdfbf7;color:#1a1a1a;border:1px solid rgba(191,160,106,0.5);' +
        'border-radius:999px;font-size:0.85rem;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,0.35);' +
        'cursor:pointer;user-select:none;touch-action:manipulation;min-height:44px;';

      btn.addEventListener('click', onClick);
      return btn;
    };

    const focusBtn = createHeaderBtn('Focus Mode', '🔍', () => {
      const isFocused = this.callbacks.onToggleFocus();
      this.showToast(isFocused ? '🔍 Focus Mode Active' : '🖼️ Room View', isFocused ? 'Close-up terrarium inspection mode.' : 'Framed workspace desktop mode.');
    });

    const waterBtn = createHeaderBtn('Water', '💧', () => {
      const msg = this.callbacks.onWater();
      this.showToast('💧 Terrarium Care', msg);
    });

    const journalBtn = createHeaderBtn('Journal', '📖', () => this.openJournalSignal());
    const settingsBtn = createHeaderBtn('Settings', '⚙️', () => this.openSettingsSignal());

    actionRow.append(focusBtn, waterBtn, journalBtn, settingsBtn);
    topBar.append(statusBadge, actionRow);

    const bottomSlot = document.createElement('div');
    bottomSlot.id = 'yg-bottom-slot';
    bottomSlot.style.cssText =
      'display:flex;flex-direction:column;align-items:center;gap:0.75rem;width:100%;pointer-events:none;';

    this.uiContainer.append(topBar, bottomSlot);
    container.appendChild(this.uiContainer);
  }

  private openJournalSignal() {
    const event = new CustomEvent('yg-open-journal');
    window.dispatchEvent(event);
  }

  private openSettingsSignal() {
    const event = new CustomEvent('yg-open-settings');
    window.dispatchEvent(event);
  }

  updateStatus(day: number, moisture: number): void {
    const badge = document.getElementById('yg-status-badge');
    if (!badge) return;
    badge.innerHTML = `<span>☀️ Day ${day}</span> · <span>💧 ${Math.round(moisture * 100)}% Soil</span>`;
  }

  showDialogueCard(title: string, message: string): void {
    const slot = document.getElementById('yg-bottom-slot');
    if (!slot) return;

    const card = document.createElement('div');
    card.className = 'yg-dialogue-card';
    card.style.cssText =
      'pointer-events:auto;max-width:32rem;width:calc(100% - 2rem);padding:1rem 1.25rem;' +
      'background:#fdfbf7;color:#1a1a1a;border:1px solid rgba(191,160,106,0.5);' +
      'border-radius:1rem;box-shadow:0 20px 50px rgba(0,0,0,0.45);' +
      'font-family:system-ui,-apple-system,sans-serif;line-height:1.5;';

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;">
        <h4 style="margin:0;font-size:1rem;font-weight:800;color:#111111;">${title}</h4>
        <button class="yg-close-btn" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:#333;padding:0.2rem 0.4rem;min-height:36px;" aria-label="Close">✕</button>
      </div>
      <p style="margin:0;font-size:0.92rem;color:#222222;font-weight:500;">${message}</p>
    `;

    card.querySelector('.yg-close-btn')?.addEventListener('click', () => card.remove());

    slot.querySelectorAll('.yg-dialogue-card').forEach((el) => el.remove());
    slot.appendChild(card);

    setTimeout(() => {
      if (card.parentNode) card.remove();
    }, 8000);
  }

  showEvolutionPopup(event: GrowthEvent): void {
    const slot = document.getElementById('yg-bottom-slot');
    if (!slot) return;

    const popup = document.createElement('div');
    popup.className = 'yg-evolution-popup';
    popup.style.cssText =
      'pointer-events:auto;max-width:30rem;width:calc(100% - 2rem);padding:1.1rem 1.35rem;' +
      'background:linear-gradient(180deg, #fefdf9 0%, #f7f2ea 100%);color:#1a1a1a;' +
      'border:2px solid #bfa06a;border-radius:1.1rem;box-shadow:0 20px 50px rgba(0,0,0,0.45);' +
      'text-align:left;line-height:1.55;';

    popup.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
        <span style="font-size:1.3rem;">🌿</span>
        <span style="font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#8a6a2a;">Ecosystem Evolution</span>
      </div>
      <h3 style="margin:0 0 0.4rem;font-size:1.15rem;font-weight:800;color:#111111;">${event.stageName}</h3>
      <p style="margin:0 0 0.75rem;font-size:0.92rem;color:#222222;">${event.message}</p>
      <div style="display:flex;justify-content:flex-end;">
        <button class="yg-ack-btn" style="padding:0.45rem 1rem;background:#2e3f57;color:#fff;border:none;border-radius:999px;font-size:0.82rem;font-weight:700;cursor:pointer;min-height:38px;">Celebrate Growth</button>
      </div>
    `;

    popup.querySelector('.yg-ack-btn')?.addEventListener('click', () => popup.remove());

    slot.querySelectorAll('.yg-evolution-popup').forEach((el) => el.remove());
    slot.appendChild(popup);
  }

  showToast(title: string, text: string): void {
    const slot = document.getElementById('yg-bottom-slot');
    if (!slot) return;

    if (this.activeToast) this.activeToast.remove();
    window.clearTimeout(this.toastTimeout);

    const toast = document.createElement('div');
    toast.className = 'yg-toast';
    toast.style.cssText =
      'pointer-events:auto;padding:0.7rem 1.1rem;background:#fdfbf7;color:#1a1a1a;' +
      'border:1px solid rgba(191,160,106,0.5);border-radius:999px;' +
      'box-shadow:0 10px 28px rgba(0,0,0,0.3);font-size:0.88rem;font-weight:600;';
    toast.innerHTML = `<strong>${title}</strong> — ${text}`;

    this.activeToast = toast;
    slot.appendChild(toast);

    this.toastTimeout = window.setTimeout(() => {
      if (this.activeToast === toast) {
        toast.remove();
        this.activeToast = null;
      }
    }, 4500);
  }

  renderJournalModal(memory: MemoryEngine): void {
    if (this.activeModal) this.activeModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'yg-modal-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:50;background:rgba(10,12,10,0.72);' +
      'backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1.5rem;';

    const modal = document.createElement('div');
    modal.className = 'yg-modal-card';
    modal.style.cssText =
      'max-width:34rem;width:100%;max-height:80vh;display:flex;flex-direction:column;' +
      'background:#fdfbf7;color:#1a1a1a;border:1px solid rgba(191,160,106,0.5);' +
      'border-radius:1.2rem;box-shadow:0 24px 60px rgba(0,0,0,0.5);overflow:hidden;';

    const summaryText = memory.summarize();
    const events = memory.recent(15);

    modal.innerHTML = `
      <div style="padding:1.25rem;border-bottom:1px solid rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:space-between;background:#f7f2ea;">
        <div>
          <h3 style="margin:0;font-size:1.2rem;font-weight:800;color:#111111;">Sanctuary Journal & Memories</h3>
          <p style="margin:0.2rem 0 0;font-size:0.82rem;color:#555;">${summaryText}</p>
        </div>
        <button class="yg-modal-close" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#333;padding:0.3rem 0.6rem;" aria-label="Close modal">✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:1.25rem;display:flex;flex-direction:column;gap:0.75rem;">
        <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
          <input type="text" id="yg-journal-input" placeholder="Write a note in your sanctuary log..." style="flex:1;padding:0.6rem 0.9rem;border:1px solid #ccc;border-radius:0.5rem;font-size:0.9rem;color:#1a1a1a;background:#fff;" />
          <button id="yg-journal-submit" style="padding:0.6rem 1rem;background:#2e3f57;color:#fff;border:none;border-radius:0.5rem;font-weight:700;cursor:pointer;">Record</button>
        </div>
        <div id="yg-journal-list" style="display:flex;flex-direction:column;gap:0.6rem;">
          ${events.map(e => `
            <div style="padding:0.75rem;background:#f5efe6;border-left:3px solid #bfa06a;border-radius:0.4rem;font-size:0.88rem;color:#1a1a1a;">
              <div style="font-size:0.75rem;font-weight:700;color:#7a6020;margin-bottom:0.2rem;">Day ${e.day} · ${new Date(e.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
              <div>${e.message}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.activeModal = overlay;

    modal.querySelector('.yg-modal-close')?.addEventListener('click', () => {
      overlay.remove();
      this.activeModal = null;
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        this.activeModal = null;
      }
    });

    const submitBtn = modal.querySelector('#yg-journal-submit');
    const input = modal.querySelector('#yg-journal-input') as HTMLInputElement;

    const handleRecord = () => {
      const val = input.value.trim();
      if (val) {
        this.callbacks.onAddJournal(val);
        input.value = '';
        this.renderJournalModal(memory);
        this.showToast('📖 Journal Entry Saved', val);
      }
    };

    submitBtn?.addEventListener('click', handleRecord);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleRecord();
    });
  }

  renderSettingsModal(lampOn: boolean, audioMuted: boolean): void {
    if (this.activeModal) this.activeModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'yg-modal-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:50;background:rgba(10,12,10,0.72);' +
      'backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1.5rem;';

    const modal = document.createElement('div');
    modal.className = 'yg-modal-card';
    modal.style.cssText =
      'max-width:28rem;width:100%;padding:1.5rem;' +
      'background:#fdfbf7;color:#1a1a1a;border:1px solid rgba(191,160,106,0.5);' +
      'border-radius:1.2rem;box-shadow:0 24px 60px rgba(0,0,0,0.5);';

    modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
        <h3 style="margin:0;font-size:1.2rem;font-weight:800;color:#111111;">Sanctuary Settings</h3>
        <button class="yg-modal-close" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#333;" aria-label="Close modal">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:#f5efe6;border-radius:0.6rem;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">Workspace Lamp</div>
            <div style="font-size:0.8rem;color:#555;">Toggle room lighting</div>
          </div>
          <button id="yg-toggle-lamp" style="padding:0.5rem 1rem;background:#2e3f57;color:#fff;border:none;border-radius:999px;font-weight:700;cursor:pointer;">${lampOn ? 'Turn Off' : 'Turn On'}</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:#f5efe6;border-radius:0.6rem;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">Ambient Audio</div>
            <div style="font-size:0.8rem;color:#555;">Toggle soundscape</div>
          </div>
          <button id="yg-toggle-audio" style="padding:0.5rem 1rem;background:#2e3f57;color:#fff;border:none;border-radius:999px;font-weight:700;cursor:pointer;">${audioMuted ? 'Unmute' : 'Mute'}</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:#f5efe6;border-radius:0.6rem;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;color:#b91c1c;">Reset Sanctuary</div>
            <div style="font-size:0.8rem;color:#555;">Clear local progress</div>
          </div>
          <button id="yg-reset-data" style="padding:0.5rem 1rem;background:#b91c1c;color:#fff;border:none;border-radius:999px;font-weight:700;cursor:pointer;">Reset</button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.activeModal = overlay;

    modal.querySelector('.yg-modal-close')?.addEventListener('click', () => {
      overlay.remove();
      this.activeModal = null;
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        this.activeModal = null;
      }
    });

    modal.querySelector('#yg-toggle-lamp')?.addEventListener('click', () => {
      const nextLamp = this.callbacks.onToggleLamp();
      this.renderSettingsModal(nextLamp, audioMuted);
    });

    modal.querySelector('#yg-toggle-audio')?.addEventListener('click', () => {
      const nextAudio = this.callbacks.onToggleAudio();
      this.renderSettingsModal(lampOn, nextAudio);
    });

    modal.querySelector('#yg-reset-data')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset your sanctuary data?')) {
        this.callbacks.onResetData();
      }
    });
  }

  destroy(): void {
    window.clearTimeout(this.toastTimeout);
    this.uiContainer?.remove();
    this.activeModal?.remove();
  }
}
