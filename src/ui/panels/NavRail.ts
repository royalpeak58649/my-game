import type { MapMode, PanelView, Store } from '../store';

interface RailItem {
  view: Exclude<PanelView, 'auto' | 'market' | 'construction'>;
  glyph: string;
  label: string;
  title: string;
}

const DOMESTIC_ITEMS: readonly RailItem[] = [
  { view: 'overview', glyph: 'O', label: 'Overview', title: 'National strategic briefing (O)' },
  { view: 'politics', glyph: 'P', label: 'Politics', title: 'Interest groups, government and legitimacy (P)' },
  { view: 'laws', glyph: 'L', label: 'Laws', title: 'Laws and enactments (L)' },
  { view: 'technology', glyph: 'T', label: 'Technology', title: 'Research and technologies (T)' },
];

const POWER_ITEMS: readonly RailItem[] = [
  { view: 'diplomacy', glyph: 'D', label: 'Diplomacy', title: 'Open the diplomacy panel (Shift+D)' },
  { view: 'war', glyph: 'W', label: 'War', title: 'Open the war panel (Shift+W)' },
  { view: 'navy', glyph: 'N', label: 'Navy', title: 'Open the navy panel (N)' },
];

const MAP_MODES: readonly MapMode[] = ['political', 'diplomacy', 'population', 'states'];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Persistent one-click navigation mirroring the global panel shortcuts. */
export class NavRail {
  readonly root: HTMLElement;
  private readonly store: Store;
  private readonly panelButtons = new Map<PanelView, HTMLButtonElement>();
  private readonly mapButton: HTMLButtonElement;
  private readonly unsubscribers: (() => void)[] = [];

  constructor(store: Store) {
    this.store = store;
    this.root = el('nav', 'nav-rail');
    this.root.setAttribute('aria-label', 'Main navigation');

    this.root.append(this.createGroup(DOMESTIC_ITEMS), this.createGroup(POWER_ITEMS));

    const mapGroup = el('div', 'nav-rail-group nav-rail-map-group');
    this.mapButton = this.createButton('M', 'Map mode', 'Cycle map mode (M)');
    this.mapButton.classList.add('is-map-mode');
    this.mapButton.addEventListener('click', () => this.cycleMapMode());
    mapGroup.append(this.mapButton);
    this.root.append(mapGroup);

    this.unsubscribers.push(
      store.subscribe(() => this.render()),
      store.subscribeUi(() => this.render()),
    );
    this.render();
  }

  private createGroup(items: readonly RailItem[]): HTMLElement {
    const group = el('div', 'nav-rail-group');
    for (const item of items) {
      const button = this.createButton(item.glyph, item.label, item.title);
      button.addEventListener('click', () => this.openView(item.view));
      this.panelButtons.set(item.view, button);
      group.append(button);
    }
    return group;
  }

  private createButton(glyph: string, label: string, title: string): HTMLButtonElement {
    const button = el('button', 'nav-rail-button');
    button.type = 'button';
    button.title = title;
    button.setAttribute('aria-label', title);
    button.append(el('span', 'nav-rail-glyph', glyph), el('span', 'nav-rail-label', label));
    return button;
  }

  private openView(view: RailItem['view']): void {
    const player = this.store.get().player;
    if (!player) return;
    this.store.setUi({ selectedCountryTag: player, selectedStateId: null, panelView: view });
  }

  private cycleMapMode(): void {
    const current = this.store.getUi().mapMode;
    const next = MAP_MODES[(MAP_MODES.indexOf(current) + 1) % MAP_MODES.length] ?? 'political';
    this.store.setUi({ mapMode: next });
  }

  private render(): void {
    const game = this.store.get();
    const ui = this.store.getUi();
    for (const [view, button] of this.panelButtons) {
      button.disabled = game.player === null;
      button.classList.toggle('is-active', ui.panelView === view && ui.selectedCountryTag === game.player);
    }
    this.mapButton.dataset['mode'] = ui.mapMode;
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers.length = 0;
    this.root.remove();
  }
}
