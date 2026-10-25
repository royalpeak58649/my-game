import type { GameState, StateDef } from '../../sim/types';
import type { Store } from '../store';

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

function formatArea(km2: number): string {
  return `${Math.round(km2).toLocaleString('en-US')} km²`;
}

export interface SidePanelOptions {
  onFocusState: (stateId: string) => void;
}

/** Right-hand detail panel for a selected state or country. */
export class SidePanel {
  readonly root: HTMLElement;
  private readonly store: Store;
  private readonly options: SidePanelOptions;
  private readonly body: HTMLElement;
  private readonly title: HTMLElement;
  private readonly unsubscribers: (() => void)[] = [];

  constructor(store: Store, options: SidePanelOptions) {
    this.store = store;
    this.options = options;

    this.root = el('aside', 'side-panel');
    this.root.setAttribute('aria-hidden', 'true');

    const header = el('div', 'side-panel-header');
    this.title = el('h2', 'side-panel-title', 'Details');
    const close = el('button', 'icon-button', '×');
    close.type = 'button';
    close.title = 'Close (Esc)';
    close.addEventListener('click', () => this.close());
    header.append(this.title, close);

    this.body = el('div', 'side-panel-body');
    this.root.append(header, this.body);

    this.unsubscribers.push(
      store.subscribe(() => this.render()),
      store.subscribeUi(() => this.render()),
    );
    this.render();
  }

  close(): void {
    this.store.setUi({ selectedStateId: null, selectedCountryTag: null });
  }

  private render(): void {
    const ui = this.store.getUi();
    const game = this.store.get();
    const state = ui.selectedStateId ? game.states[ui.selectedStateId] : undefined;
    const country = ui.selectedCountryTag ? game.countries[ui.selectedCountryTag] : undefined;

    const open = Boolean(state || country);
    this.root.classList.toggle('is-open', open);
    this.root.setAttribute('aria-hidden', open ? 'false' : 'true');

    this.body.replaceChildren();
    if (state) {
      this.title.textContent = 'State';
      this.renderState(game, state);
    } else if (country) {
      this.title.textContent = 'Country';
      this.renderCountry(game, country.tag);
    } else {
      this.title.textContent = 'Details';
    }
  }

  private renderState(game: GameState, state: StateDef): void {
    const heading = el('div', 'panel-heading');
    heading.append(el('h3', 'panel-name', state.name));
    this.body.append(heading);

    const rows = el('dl', 'detail-list');

    const ownerRow = el('div', 'detail-row');
    ownerRow.append(el('dt', undefined, 'Owner'));
    const ownerValue = el('dd');
    if (state.owner === null) {
      ownerValue.append(el('span', 'muted', 'Decentralized lands'));
    } else {
      const country = game.countries[state.owner];
      const link = el('button', 'link-button');
      link.type = 'button';
      const swatch = el('span', 'swatch swatch-small');
      swatch.style.background = country?.color ?? '#d9d0b8';
      link.append(swatch, el('span', undefined, country?.name ?? state.owner));
      link.addEventListener('click', () => {
        this.store.setUi({ selectedCountryTag: state.owner, selectedStateId: null });
      });
      ownerValue.append(link);
    }
    ownerRow.append(ownerValue);

    const areaRow = el('div', 'detail-row');
    areaRow.append(el('dt', undefined, 'Area'), el('dd', undefined, formatArea(state.area)));

    const regionRow = el('div', 'detail-row');
    regionRow.append(el('dt', undefined, 'Modern region'), el('dd', undefined, state.adm0));

    rows.append(ownerRow, areaRow, regionRow);
    this.body.append(rows);

    const placeholder = el('section', 'panel-placeholder');
    placeholder.append(
      el('h4', undefined, 'Population · Buildings'),
      el('p', 'muted', 'coming soon'),
    );
    this.body.append(placeholder);
  }

  private renderCountry(game: GameState, tag: string): void {
    const country = game.countries[tag];
    if (!country) return;

    const heading = el('div', 'panel-heading');
    const swatch = el('span', 'swatch swatch-large');
    swatch.style.background = country.color;
    heading.append(swatch, el('h3', 'panel-name', country.name));
    this.body.append(heading);

    const states = Object.values(game.states).filter((s) => s.owner === tag);
    const totalArea = states.reduce((sum, s) => sum + s.area, 0);

    const rows = el('dl', 'detail-list');

    const capitalRow = el('div', 'detail-row');
    capitalRow.append(el('dt', undefined, 'Capital'));
    const capitalValue = el('dd');
    const capital = game.states[country.capital];
    if (capital) {
      const link = el('button', 'link-button', capital.name);
      link.type = 'button';
      link.addEventListener('click', () => {
        this.store.setUi({ selectedStateId: capital.id, selectedCountryTag: tag });
        this.options.onFocusState(capital.id);
      });
      capitalValue.append(link);
    } else {
      capitalValue.append(el('span', 'muted', '—'));
    }
    capitalRow.append(capitalValue);

    const statesRow = el('div', 'detail-row');
    statesRow.append(el('dt', undefined, 'States'), el('dd', undefined, String(states.length)));

    const areaRow = el('div', 'detail-row');
    areaRow.append(el('dt', undefined, 'Total area'), el('dd', undefined, formatArea(totalArea)));

    rows.append(capitalRow, statesRow, areaRow);
    this.body.append(rows);

    const placeholder = el('section', 'panel-placeholder');
    placeholder.append(
      el('h4', undefined, 'Population · Buildings'),
      el('p', 'muted', 'coming soon'),
    );
    this.body.append(placeholder);
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.root.remove();
  }
}
