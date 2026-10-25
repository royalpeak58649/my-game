import { formatDate } from '../../sim/date';
import { countryEconomy } from '../../sim/economy/queries';
import { formatDelta, formatMoney } from '../format';
import type { Speed, Store } from '../store';

const SPEEDS: Exclude<Speed, 0>[] = [1, 2, 3, 4, 5];

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

/** Top bar: player identity, date, economy readouts, panel shortcuts and speed controls. */
export class TopBar {
  readonly root: HTMLElement;
  private readonly store: Store;
  private readonly swatch: HTMLElement;
  private readonly playerName: HTMLElement;
  private readonly dateLabel: HTMLElement;
  private readonly treasurySlot: HTMLElement;
  private readonly treasuryValue: HTMLElement;
  private readonly netValue: HTMLElement;
  private readonly marketButton: HTMLButtonElement;
  private readonly constructionButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly pips: HTMLButtonElement[] = [];
  private readonly unsubscribers: (() => void)[] = [];

  constructor(store: Store, onPlayerClick: () => void) {
    this.store = store;
    this.root = el('header', 'topbar');

    const left = el('div', 'topbar-left');
    const playerButton = el('button', 'player-chip');
    playerButton.type = 'button';
    playerButton.title = 'Open country panel';
    this.swatch = el('span', 'swatch');
    this.playerName = el('span', 'player-name', '—');
    playerButton.append(this.swatch, this.playerName);
    playerButton.addEventListener('click', onPlayerClick);
    left.append(playerButton);

    const center = el('div', 'topbar-center');
    this.dateLabel = el('div', 'date-label', '1 January 1836');
    center.append(this.dateLabel);

    const right = el('div', 'topbar-right');
    const stats = el('div', 'topbar-stats');

    this.treasurySlot = el('span', 'stat-slot stat-treasury');
    this.treasuryValue = el('span', 'stat-value', '—');
    this.netValue = el('span', 'stat-delta', '');
    this.treasurySlot.append(this.treasuryValue, this.netValue);

    this.marketButton = el('button', 'stat-slot stat-button', 'Market');
    this.marketButton.type = 'button';
    this.marketButton.title = 'Open the market panel';
    this.marketButton.addEventListener('click', () => this.openView('market'));

    this.constructionButton = el('button', 'stat-slot stat-button', 'Construction');
    this.constructionButton.type = 'button';
    this.constructionButton.title = 'Open the construction panel';
    this.constructionButton.addEventListener('click', () => this.openView('construction'));

    stats.append(this.treasurySlot, this.marketButton, this.constructionButton);

    const controls = el('div', 'speed-controls');
    this.pauseButton = el('button', 'speed-pause');
    this.pauseButton.type = 'button';
    this.pauseButton.title = 'Pause / resume (Space)';
    this.pauseButton.addEventListener('click', () => {
      const speed = this.store.getUi().speed;
      this.store.setUi({ speed: speed === 0 ? 1 : 0 });
    });
    controls.append(this.pauseButton);

    for (const speed of SPEEDS) {
      const pip = el('button', 'speed-pip');
      pip.type = 'button';
      pip.title = `Speed ${speed} (${speed})`;
      pip.dataset['speed'] = String(speed);
      pip.addEventListener('click', () => this.store.setUi({ speed }));
      this.pips.push(pip);
      controls.append(pip);
    }

    right.append(stats, controls);
    this.root.append(left, center, right);

    this.unsubscribers.push(
      store.subscribe(() => this.render()),
      store.subscribeUi(() => this.render()),
    );
    this.render();
  }

  /** Opens the side panel on an economy view for the player's country. */
  private openView(view: 'market' | 'construction'): void {
    const tag = this.store.get().player;
    if (!tag) return;
    this.store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: view });
  }

  private render(): void {
    const game = this.store.get();
    const ui = this.store.getUi();
    this.dateLabel.textContent = formatDate(game.date);

    const player = game.player ? game.countries[game.player] : undefined;
    if (player) {
      this.swatch.style.background = player.color;
      this.swatch.classList.remove('is-empty');
      this.playerName.textContent = player.name;
    } else {
      this.swatch.style.background = 'transparent';
      this.swatch.classList.add('is-empty');
      this.playerName.textContent = 'Observer';
    }

    this.renderEconomy(game.player);

    this.pauseButton.classList.toggle('is-paused', ui.speed === 0);
    this.pauseButton.textContent = ui.speed === 0 ? '▶' : '❚❚';
    for (const pip of this.pips) {
      const speed = Number(pip.dataset['speed']);
      pip.classList.toggle('is-active', ui.speed !== 0 && speed <= ui.speed);
    }
  }

  private renderEconomy(tag: string | null): void {
    const game = this.store.get();
    const economy = tag ? countryEconomy(game, tag) : undefined;
    const isPlayer = tag !== null && economy !== undefined;

    this.marketButton.hidden = !isPlayer;
    this.constructionButton.hidden = !isPlayer;

    if (!economy) {
      this.treasurySlot.hidden = true;
      this.treasuryValue.textContent = '—';
      this.netValue.textContent = '';
      this.netValue.className = 'stat-delta';
      this.treasurySlot.removeAttribute('title');
      this.constructionButton.textContent = 'Construction';
      return;
    }

    this.treasurySlot.hidden = false;
    const net = economy.lastIncome - economy.lastExpenses;
    this.treasuryValue.textContent = formatMoney(economy.treasury);
    this.netValue.textContent = formatDelta(net);
    this.netValue.className = `stat-delta ${net >= 0 ? 'is-positive' : 'is-negative'}`;
    this.treasurySlot.title =
      `Treasury ${formatMoney(economy.treasury)}\n` +
      `Income ${formatDelta(economy.lastIncome)} / week\n` +
      `Expenses ${formatDelta(-economy.lastExpenses)} / week\n` +
      `Net ${formatDelta(net)} / week`;

    this.constructionButton.textContent = `Construction ${Math.round(economy.constructionPoints)}/wk`;
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.root.remove();
  }
}
