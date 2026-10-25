import type { Store } from './store';

/** Cursor-following tooltip showing the hovered state and its owner. */
export class Tooltip {
  readonly root: HTMLElement;
  private readonly store: Store;
  private readonly host: HTMLElement;
  private readonly unsubscribers: (() => void)[] = [];
  private pointerX = 0;
  private pointerY = 0;
  private visible = false;

  constructor(store: Store, host: HTMLElement) {
    this.store = store;
    this.host = host;
    this.root = document.createElement('div');
    this.root.className = 'tooltip';
    this.root.setAttribute('aria-hidden', 'true');
    host.appendChild(this.root);

    host.addEventListener('pointermove', this.handlePointerMove);
    host.addEventListener('pointerleave', this.handlePointerLeave);

    this.unsubscribers.push(store.subscribeUi(() => this.render()));
    this.render();
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    if (this.visible) this.position();
  };

  private readonly handlePointerLeave = (): void => {
    this.root.classList.remove('is-visible');
    this.visible = false;
  };

  private position(): void {
    const offset = 16;
    const rect = this.root.getBoundingClientRect();
    let x = this.pointerX + offset;
    let y = this.pointerY + offset;
    if (x + rect.width > window.innerWidth - 8) x = this.pointerX - rect.width - offset;
    if (y + rect.height > window.innerHeight - 8) y = this.pointerY - rect.height - offset;
    this.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  private render(): void {
    const ui = this.store.getUi();
    const game = this.store.get();
    const state = ui.hoveredStateId ? game.states[ui.hoveredStateId] : undefined;

    if (!state) {
      this.root.classList.remove('is-visible');
      this.root.setAttribute('aria-hidden', 'true');
      this.visible = false;
      return;
    }

    const ownerName =
      state.owner === null ? 'Decentralized lands' : (game.countries[state.owner]?.name ?? state.owner);

    this.root.replaceChildren();
    const name = document.createElement('div');
    name.className = 'tooltip-name';
    name.textContent = state.name;
    const owner = document.createElement('div');
    owner.className = 'tooltip-owner';
    owner.textContent = ownerName;
    this.root.append(name, owner);

    this.root.classList.add('is-visible');
    this.root.setAttribute('aria-hidden', 'false');
    this.visible = true;
    this.position();
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.host.removeEventListener('pointermove', this.handlePointerMove);
    this.host.removeEventListener('pointerleave', this.handlePointerLeave);
    this.root.remove();
  }
}
