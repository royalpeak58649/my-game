import type { GameState } from '../sim/types';

export interface StartScreenOptions {
  onStart: (tag: string | null) => void;
}

interface CountryEntry {
  tag: string;
  name: string;
  color: string;
  states: number;
  area: number;
}

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

/** Full-screen country picker shown before the game starts. */
export class StartScreen {
  readonly root: HTMLElement;
  private readonly options: StartScreenOptions;
  private readonly list: HTMLElement;
  private readonly search: HTMLInputElement;
  private readonly entries: CountryEntry[];

  constructor(game: GameState, options: StartScreenOptions) {
    this.options = options;
    this.entries = this.collectEntries(game);

    this.root = el('div', 'start-screen');

    const card = el('div', 'start-card');
    const title = el('h1', 'start-title', '1836');
    const subtitle = el(
      'p',
      'start-subtitle',
      'A world on the edge of steam and empire. Choose the nation you will guide.',
    );

    this.search = el('input', 'start-search');
    this.search.type = 'search';
    this.search.placeholder = 'Search countries…';
    this.search.setAttribute('aria-label', 'Search countries');
    this.search.addEventListener('input', () => this.renderList());

    this.list = el('div', 'start-list');
    this.list.setAttribute('role', 'list');

    const footer = el('div', 'start-footer');
    const observe = el('button', 'button-secondary', 'Observe');
    observe.type = 'button';
    observe.addEventListener('click', () => this.options.onStart(null));
    footer.append(observe);

    card.append(title, subtitle, this.search, this.list, footer);
    this.root.append(card);

    this.renderList();
  }

  private collectEntries(game: GameState): CountryEntry[] {
    const totals = new Map<string, { states: number; area: number }>();
    for (const state of Object.values(game.states)) {
      if (state.owner === null) continue;
      const entry = totals.get(state.owner) ?? { states: 0, area: 0 };
      entry.states += 1;
      entry.area += state.area;
      totals.set(state.owner, entry);
    }
    const entries: CountryEntry[] = [];
    for (const country of Object.values(game.countries)) {
      const total = totals.get(country.tag);
      if (!total) continue;
      entries.push({
        tag: country.tag,
        name: country.name,
        color: country.color,
        states: total.states,
        area: total.area,
      });
    }
    entries.sort((a, b) => b.area - a.area || a.name.localeCompare(b.name));
    return entries;
  }

  private renderList(): void {
    const query = this.search.value.trim().toLowerCase();
    const filtered = query
      ? this.entries.filter((e) => e.name.toLowerCase().includes(query) || e.tag.toLowerCase() === query)
      : this.entries;

    this.list.replaceChildren();
    if (filtered.length === 0) {
      this.list.append(el('p', 'muted start-empty', 'No countries match that search.'));
      return;
    }

    for (const entry of filtered) {
      const row = el('button', 'start-row');
      row.type = 'button';
      row.setAttribute('role', 'listitem');
      const swatch = el('span', 'swatch');
      swatch.style.background = entry.color;
      const name = el('span', 'start-row-name', entry.name);
      const count = el('span', 'start-row-count', `${entry.states} states`);
      row.append(swatch, name, count);
      row.addEventListener('click', () => this.options.onStart(entry.tag));
      this.list.append(row);
    }
  }

  show(): void {
    this.root.classList.remove('is-hidden');
  }

  hide(): void {
    this.root.classList.add('is-hidden');
  }

  dispose(): void {
    this.root.remove();
  }
}
