/**
 * YearGlass Sanctuary — UI Overlay System
 *
 * Consolidates all HUD controls and actions into a visible bottom drawer.
 * Provides direct, bidirectional View: Room / View: Focus controls, Journal modal,
 * Settings modal, Camera Snapshot Photo modal, and Desk Radio Station modal.
 */

import type { GrowthEvent } from '../simulation/GrowthSystem';
import type { MemoryEngine } from '../simulation/MemoryEngine';

export interface UIOverlayCallbacks {
  isFocused: () => boolean;
  onEnterFocus: () => void;
  onExitFocus: () => void;
  onToggleFocus: () => boolean;
  onWater: () => string;
  onToggleLamp: () => boolean;
  onToggleAudio: () => boolean;
  onResetData: () => void;
  onAddJournal: (note: string) => void;
  onButtonTap?: () => void;
}

export class UIOverlay {
  private uiContainer: HTMLElement | null = null;
  private bottomDrawer: HTMLElement | null = null;
  private viewToggleBtn: HTMLButtonElement | null = null;
  private activeModal: HTMLElement | null = null;
  private activeToast: HTMLElement | null = null;
  private toastTimeout = 0;
  private isFocused = false;
  private callbacks: UIOverlayCallbacks;

  constructor(callbacks: UIOverlayCallbacks) {
    this.callbacks = callbacks;
  }

  mount(container: HTMLElement, day: number, moisture: number): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'yearglass-ui-overlay';
    this.uiContainer.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:9999;' +
      'display:flex;flex-direction:column;justify-content:flex-end;padding:0;';

    // Bottom Container for Toasts & Dialogue Cards
    const bottomSlot = document.createElement('div');
    bottomSlot.id = 'yg-bottom-slot';
    bottomSlot.style.cssText =
      'display:flex;flex-direction:column;align-items:center;gap:0.75rem;width:100%;' +
      'margin-bottom:5.5rem;pointer-events:none;z-index:9999;';

    // Visible Bottom Control Drawer
    this.mountBottomDrawer(container, day, moisture);

    this.uiContainer.append(bottomSlot);
    container.appendChild(this.uiContainer);
  }

  private mountBottomDrawer(container: HTMLElement, day: number, moisture: number): void {
    this.bottomDrawer = document.createElement('div');
    this.bottomDrawer.id = 'yg-bottom-drawer';
    this.bottomDrawer.className = 'yg-drawer-card';
    this.bottomDrawer.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:9999;pointer-events:auto !important;opacity:1;' +
      'padding:0.75rem 1.25rem max(1rem, env(safe-area-inset-bottom));' +
      'background:#fdfbf7;color:#1a1a1a;border-top:2px solid #bfa06a;' +
      'border-radius:1.2rem 1.2rem 0 0;box-shadow:0 -12px 36px rgba(0,0,0,0.45);' +
      'transform:translateY(0);transition:transform 0.35s cubic-bezier(0.2,0.8,0.2,1);';

    this.bottomDrawer.innerHTML = `
      <div id="yg-drawer-handle" style="display:flex;align-items:center;justify-content:space-between;padding-bottom:0.6rem;user-select:none;touch-action:manipulation;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="width:28px;height:4px;background:#bfa06a;border-radius:999px;opacity:0.8;"></span>
          <span id="yg-drawer-status" style="font-size:0.88rem;font-weight:700;color:#1a1a1a;">☀️ Day ${day} · 💧 ${Math.round(moisture * 100)}% Soil</span>
        </div>
        <span style="font-size:0.78rem;font-weight:800;color:#8a6a2a;text-transform:uppercase;letter-spacing:0.08em;">Sanctuary Controls</span>
      </div>
      <div id="yg-drawer-content" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:0.6rem;padding-top:0.4rem;">
        <button id="yg-drawer-view-toggle" style="padding:0.65rem 0.8rem;background:#f5efe6;border:1px solid #bfa06a;border-radius:0.75rem;color:#1a1a1a;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:0.4rem;justify-content:center;font-size:0.85rem;min-height:42px;">🔍 View: Focus</button>
        <button id="yg-drawer-water" style="padding:0.65rem 0.8rem;background:#f5efe6;border:1px solid #bfa06a;border-radius:0.75rem;color:#1a1a1a;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:0.4rem;justify-content:center;font-size:0.85rem;min-height:42px;">💧 Water Plant</button>
        <button id="yg-drawer-journal" style="padding:0.65rem 0.8rem;background:#f5efe6;border:1px solid #bfa06a;border-radius:0.75rem;color:#1a1a1a;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:0.4rem;justify-content:center;font-size:0.85rem;min-height:42px;">📖 Journal</button>
        <button id="yg-drawer-settings" style="padding:0.65rem 0.8rem;background:#f5efe6;border:1px solid #bfa06a;border-radius:0.75rem;color:#1a1a1a;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:0.4rem;justify-content:center;font-size:0.85rem;min-height:42px;">⚙️ Settings</button>
      </div>
    `;

    this.viewToggleBtn = this.bottomDrawer.querySelector('#yg-drawer-view-toggle') as HTMLButtonElement;
    this.updateViewToggleLabel();

    this.viewToggleBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.callbacks.onButtonTap?.();

      if (this.callbacks.isFocused()) {
        this.callbacks.onExitFocus();
        this.setFocusState(false);
        this.showToast('🖼️ Room View', 'Full room desktop view.');
      } else {
        this.callbacks.onEnterFocus();
        this.setFocusState(true);
        this.showToast('🔍 Focus Mode', 'Close-up terrarium inspection mode.');
      }
    });

    this.bottomDrawer.querySelector('#yg-drawer-water')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.callbacks.onButtonTap?.();
      const msg = this.callbacks.onWater();
      this.showToast('💧 Terrarium Care', msg);
    });

    this.bottomDrawer.querySelector('#yg-drawer-journal')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.callbacks.onButtonTap?.();
      this.openJournalSignal();
    });

    this.bottomDrawer.querySelector('#yg-drawer-settings')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.callbacks.onButtonTap?.();
      this.openSettingsSignal();
    });

    (document.body || container).appendChild(this.bottomDrawer);
  }

  private openJournalSignal() {
    const event = new CustomEvent('yg-open-journal');
    window.dispatchEvent(event);
  }

  private openSettingsSignal() {
    const event = new CustomEvent('yg-open-settings');
    window.dispatchEvent(event);
  }

  setFocusState(isFocused: boolean): void {
    this.isFocused = isFocused;
    this.updateViewToggleLabel();
  }

  private updateViewToggleLabel(): void {
    if (this.viewToggleBtn) {
      this.viewToggleBtn.innerHTML = this.isFocused ? '🖼️ View: Room' : '🔍 View: Focus';
    }
  }

  updateStatus(day: number, moisture: number): void {
    const status = document.getElementById('yg-drawer-status');
    if (status) {
      status.innerHTML = `☀️ Day ${day} · 💧 ${Math.round(moisture * 100)}% Soil`;
    }
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
      'font-family:system-ui,-apple-system,sans-serif;line-height:1.5;z-index:9999;';

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;">
        <h4 style="margin:0;font-size:1rem;font-weight:800;color:#111111;">${title}</h4>
        <button class="yg-close-btn" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:#333;padding:0.2rem 0.4rem;min-height:36px;" aria-label="Close">✕</button>
      </div>
      <p style="margin:0;font-size:0.92rem;color:#222222;font-weight:500;">${message}</p>
    `;

    card.querySelector('.yg-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      card.remove();
    });

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
      'text-align:left;line-height:1.55;z-index:9999;';

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

    popup.querySelector('.yg-ack-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.remove();
    });

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
      'box-shadow:0 10px 28px rgba(0,0,0,0.3);font-size:0.88rem;font-weight:600;z-index:9999;';
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

  renderCameraModal(dataUrl: string): void {
    if (this.activeModal) this.activeModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'yg-modal-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(10,12,10,0.82);' +
      'backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1.5rem;pointer-events:auto;';

    const modal = document.createElement('div');
    modal.className = 'yg-modal-card';
    modal.style.cssText =
      'max-width:32rem;width:100%;padding:1.25rem;' +
      'background:#fdfbf7;color:#1a1a1a;border:1px solid rgba(191,160,106,0.6);' +
      'border-radius:1.2rem;box-shadow:0 24px 60px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:1rem;pointer-events:auto;';

    modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,0.1);padding-bottom:0.75rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="font-size:1.4rem;">📷</span>
          <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:#111111;">Sanctuary Snapshot</h3>
        </div>
        <button class="yg-modal-close" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#333;padding:0.2rem 0.5rem;" aria-label="Close">✕</button>
      </div>
      <div style="width:100%;border-radius:0.8rem;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.25);background:#0d0d0e;text-align:center;">
        <img src="${dataUrl}" alt="Sanctuary Snapshot" style="width:100%;height:auto;max-height:50vh;object-fit:contain;display:block;" />
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;padding-top:0.25rem;">
        <span style="font-size:0.82rem;color:#666;font-weight:600;">Captured from your living sanctuary</span>
        <div style="display:flex;gap:0.5rem;">
          <a href="${dataUrl}" download="yearglass-sanctuary-snapshot.png" style="padding:0.6rem 1.1rem;background:#2e3f57;color:#fff;border-radius:999px;font-weight:700;text-decoration:none;font-size:0.85rem;display:inline-flex;align-items:center;gap:0.4rem;min-height:38px;">📸 Download Photo</a>
          <button class="yg-modal-close-btn" style="padding:0.6rem 1rem;background:#e5dfd3;color:#1a1a1a;border:none;border-radius:999px;font-weight:700;cursor:pointer;font-size:0.85rem;min-height:38px;">Keep</button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.activeModal = overlay;

    const closeHandler = (e: Event) => {
      e.stopPropagation();
      overlay.remove();
      this.activeModal = null;
    };

    modal.querySelector('.yg-modal-close')?.addEventListener('click', closeHandler);
    modal.querySelector('.yg-modal-close-btn')?.addEventListener('click', closeHandler);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        this.activeModal = null;
      }
    });
  }

  renderRadioModal(): void {
    if (this.activeModal) this.activeModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'yg-modal-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(10,12,10,0.78);' +
      'backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1.5rem;pointer-events:auto;';

    const modal = document.createElement('div');
    modal.className = 'yg-modal-card';
    modal.style.cssText =
      'max-width:28rem;width:100%;padding:1.35rem;' +
      'background:#fdfbf7;color:#1a1a1a;border:1px solid rgba(191,160,106,0.5);' +
      'border-radius:1.2rem;box-shadow:0 24px 60px rgba(0,0,0,0.5);pointer-events:auto;';

    modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;border-bottom:1px solid rgba(0,0,0,0.1);padding-bottom:0.6rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="font-size:1.3rem;">📻</span>
          <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:#111111;">Desk Radio Stations</h3>
        </div>
        <button class="yg-modal-close" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#333;padding:0.2rem 0.5rem;" aria-label="Close modal">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        <p style="margin:0;font-size:0.88rem;color:#444;font-weight:500;">Select an ambient station for your sanctuary environment:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-block:0.5rem;">
          <button class="yg-radio-chan" data-channel="rain" style="padding:0.75rem;background:#f5efe6;border:1px solid #bfa06a;border-radius:0.6rem;font-weight:700;cursor:pointer;text-align:left;color:#1a1a1a;">🌧️ Rain & Storm</button>
          <button class="yg-radio-chan" data-channel="forest" style="padding:0.75rem;background:#f5efe6;border:1px solid #bfa06a;border-radius:0.6rem;font-weight:700;cursor:pointer;text-align:left;color:#1a1a1a;">🌲 Quiet Forest</button>
          <button class="yg-radio-chan" data-channel="lofi" style="padding:0.75rem;background:#f5efe6;border:1px solid #bfa06a;border-radius:0.6rem;font-weight:700;cursor:pointer;text-align:left;color:#1a1a1a;">🎧 Lo-Fi Ambient</button>
          <button class="yg-radio-chan" data-channel="crickets" style="padding:0.75rem;background:#f5efe6;border:1px solid #bfa06a;border-radius:0.6rem;font-weight:700;cursor:pointer;text-align:left;color:#1a1a1a;">🌙 Night Crickets</button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.activeModal = overlay;

    modal.querySelector('.yg-modal-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.remove();
      this.activeModal = null;
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        this.activeModal = null;
      }
    });

    modal.querySelectorAll('.yg-radio-chan').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chan = (btn as HTMLElement).dataset.channel;
        const names: Record<string, string> = {
          rain: 'Rain & Storm',
          forest: 'Quiet Forest',
          lofi: 'Lo-Fi Ambient',
          crickets: 'Night Crickets',
        };
        this.showToast('📻 Radio Station Changed', `Playing: ${names[chan || ''] || 'Ambient'}`);
        overlay.remove();
        this.activeModal = null;
      });
    });
  }

  renderJournalModal(memory: MemoryEngine): void {
    if (this.activeModal) this.activeModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'yg-modal-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(10,12,10,0.72);' +
      'backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1.5rem;pointer-events:auto;';

    const modal = document.createElement('div');
    modal.className = 'yg-modal-card';
    modal.style.cssText =
      'max-width:34rem;width:100%;max-height:80vh;display:flex;flex-direction:column;' +
      'background:#fdfbf7;color:#1a1a1a;border:1px solid rgba(191,160,106,0.5);' +
      'border-radius:1.2rem;box-shadow:0 24px 60px rgba(0,0,0,0.5);overflow:hidden;pointer-events:auto;';

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

    modal.querySelector('.yg-modal-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
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

    const handleRecord = (e: Event) => {
      e.stopPropagation();
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
      if (e.key === 'Enter') handleRecord(e);
    });
  }

  renderSettingsModal(lampOn: boolean, audioMuted: boolean): void {
    if (this.activeModal) this.activeModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'yg-modal-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(10,12,10,0.72);' +
      'backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1.5rem;pointer-events:auto;';

    const modal = document.createElement('div');
    modal.className = 'yg-modal-card';
    modal.style.cssText =
      'max-width:28rem;width:100%;padding:1.5rem;' +
      'background:#fdfbf7;color:#1a1a1a;border:1px solid rgba(191,160,106,0.5);' +
      'border-radius:1.2rem;box-shadow:0 24px 60px rgba(0,0,0,0.5);pointer-events:auto;';

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

    modal.querySelector('.yg-modal-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.remove();
      this.activeModal = null;
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        this.activeModal = null;
      }
    });

    modal.querySelector('#yg-toggle-lamp')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const nextLamp = this.callbacks.onToggleLamp();
      this.renderSettingsModal(nextLamp, audioMuted);
    });

    modal.querySelector('#yg-toggle-audio')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const nextAudio = this.callbacks.onToggleAudio();
      this.renderSettingsModal(lampOn, nextAudio);
    });

    modal.querySelector('#yg-reset-data')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to reset your sanctuary data?')) {
        this.callbacks.onResetData();
      }
    });
  }

  destroy(): void {
    window.clearTimeout(this.toastTimeout);
    this.uiContainer?.remove();
    this.bottomDrawer?.remove();
    this.activeModal?.remove();
  }
}
