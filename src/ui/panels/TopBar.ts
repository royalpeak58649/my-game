import { convoyNeed, convoysAvailable, navyOf } from '../../sim/navy/navy';
import { formatDate } from '../../sim/date';
import { countryEconomy } from '../../sim/economy/queries';
import { politicsOf } from '../../sim/politics/queries';
import { isGreatPower, rankOf } from '../../sim/diplomacy/queries';
import { playsOf, warsOf } from '../../sim/war/queries';
import { TECHS } from '../../data/politics/techs';
import { formatDelta, formatMoney } from '../format';
import { addLanguageOptions, type Language } from '../i18n';
import type { PanelView, Speed, Store } from '../store';

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

export interface TopBarOptions {
  onPlayerClick: () => void;
  onSave: () => void;
  onLoad: () => void;
}

/** Top bar: player identity, date, economy readouts, panel shortcuts and speed controls. */
export class TopBar {
  readonly root: HTMLElement;
  private readonly store: Store;
  private readonly swatch: HTMLElement;
  private readonly playerName: HTMLElement;
  private readonly languageSelect: HTMLSelectElement;
  private readonly dateLabel: HTMLElement;
  private readonly treasurySlot: HTMLElement;
  private readonly treasuryValue: HTMLElement;
  private readonly netValue: HTMLElement;
  private readonly marketButton: HTMLButtonElement;
  private readonly constructionButton: HTMLButtonElement;
  private readonly legitimacyButton: HTMLButtonElement;
  private readonly researchButton: HTMLButtonElement;
  private readonly prestigeButton: HTMLButtonElement;
  private readonly warPill: HTMLButtonElement;
  private readonly crisisPill: HTMLButtonElement;
  private readonly navyButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly pips: HTMLButtonElement[] = [];
  private readonly unsubscribers: (() => void)[] = [];

  constructor(store: Store, options: TopBarOptions) {
    this.store = store;
    this.root = el('header', 'topbar');

    const left = el('div', 'topbar-left');
    const playerButton = el('button', 'player-chip');
    playerButton.type = 'button';
    playerButton.title = 'Open national briefing (O)';
    this.swatch = el('span', 'swatch');
    this.playerName = el('span', 'player-name', '—');
    playerButton.append(this.swatch, this.playerName);
    playerButton.addEventListener('click', options.onPlayerClick);

    this.languageSelect = el('select', 'language-select');
    this.languageSelect.title = 'Language';
    this.languageSelect.setAttribute('aria-label', 'Language');
    addLanguageOptions(this.languageSelect);
    this.languageSelect.value = store.getUi().language;
    this.languageSelect.addEventListener('change', () => {
      store.setUi({ language: this.languageSelect.value as Language });
    });
    const fileActions = el('div', 'topbar-file-actions');
    const saveButton = el('button', 'topbar-file-button', 'Save');
    saveButton.type = 'button';
    saveButton.title = 'Save the current game';
    saveButton.addEventListener('click', options.onSave);
    const loadButton = el('button', 'topbar-file-button', 'Load');
    loadButton.type = 'button';
    loadButton.title = 'Load a saved game';
    loadButton.addEventListener('click', options.onLoad);
    fileActions.append(saveButton, loadButton);
    left.append(playerButton, this.languageSelect, fileActions);

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

    this.legitimacyButton = el('button', 'stat-slot stat-button stat-legitimacy', 'Legitimacy —');
    this.legitimacyButton.type = 'button';
    this.legitimacyButton.title = 'Open the politics panel (P)';
    this.legitimacyButton.addEventListener('click', () => this.openView('politics'));

    this.researchButton = el('button', 'stat-slot stat-button stat-research', 'Research: none');
    this.researchButton.type = 'button';
    this.researchButton.title = 'Open the technology panel (T)';
    this.researchButton.addEventListener('click', () => this.openView('technology'));

    stats.append(
      this.treasurySlot,
      this.marketButton,
      this.constructionButton,
      this.legitimacyButton,
      this.researchButton,
    );

    this.prestigeButton = el('button', 'stat-slot stat-button stat-prestige', 'Prestige —');
    this.prestigeButton.type = 'button';
    this.prestigeButton.title = 'Open the diplomacy panel (Shift+D)';
    this.prestigeButton.addEventListener('click', () => this.openView('diplomacy'));

    this.warPill = el('button', 'stat-slot stat-button stat-war', 'At war');
    this.warPill.type = 'button';
    this.warPill.title = 'Open the war panel (Shift+W)';
    this.warPill.addEventListener('click', () => this.openView('war'));

    this.crisisPill = el('button', 'stat-slot stat-button stat-crisis', 'Crisis');
    this.crisisPill.type = 'button';
    this.crisisPill.title = 'Open the diplomacy panel (Shift+D)';
    this.crisisPill.addEventListener('click', () => this.openView('diplomacy'));

    this.navyButton = el('button', 'stat-slot stat-button stat-navy', 'Convoys —');
    this.navyButton.type = 'button';
    this.navyButton.title = 'Open the navy panel (N)';
    this.navyButton.addEventListener('click', () => this.openView('navy'));

    stats.append(this.prestigeButton, this.navyButton, this.warPill, this.crisisPill);

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
  private openView(view: PanelView): void {
    const tag = this.store.get().player;
    if (!tag) return;
    this.store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: view });
  }

  private render(): void {
    const game = this.store.get();
    const ui = this.store.getUi();
    this.languageSelect.value = ui.language;
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
    this.renderPolitics(game.player);
    this.renderDiplomacy(game.player);

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

  /** Legitimacy and research pills; hidden for observers. */
  private renderPolitics(tag: string | null): void {
    const game = this.store.get();
    const politics = tag ? politicsOf(game, tag) : undefined;

    this.legitimacyButton.hidden = !politics;
    this.researchButton.hidden = !politics;
    if (!politics) {
      this.legitimacyButton.className = 'stat-slot stat-button stat-legitimacy';
      this.researchButton.className = 'stat-slot stat-button stat-research';
      return;
    }

    const legitimacy = Math.round(politics.legitimacy);
    this.legitimacyButton.textContent = `Legitimacy ${legitimacy}`;
    const tone = legitimacy < 25 ? 'is-low' : legitimacy < 50 ? 'is-mid' : 'is-good';
    this.legitimacyButton.className = `stat-slot stat-button stat-legitimacy ${tone}`;
    this.legitimacyButton.title =
      `Legitimacy ${legitimacy}/100\n` +
      `Government: ${politics.government.length} interest group${politics.government.length === 1 ? '' : 's'}\n` +
      'Open the politics panel (P)';

    const researching = politics.researching ? TECHS[politics.researching] : undefined;
    if (researching) {
      const pct = researching.cost > 0 ? Math.min(1, politics.researchProgress / researching.cost) : 1;
      this.researchButton.textContent = `Research: ${researching.name} ${Math.round(pct * 100)}%`;
      this.researchButton.className = 'stat-slot stat-button stat-research is-active';
      this.researchButton.title =
        `${researching.name}\n` +
        `${Math.round(politics.researchProgress)} / ${researching.cost} points\n` +
        `${politics.researchPoints.toFixed(1)} points per week\n` +
        'Open the technology panel (T)';
    } else {
      this.researchButton.textContent = 'Research: none';
      this.researchButton.className = 'stat-slot stat-button stat-research is-idle';
      this.researchButton.title = 'No technology is being researched. Open the technology panel (T)';
    }
  }

  /** Prestige, war and crisis pills; hidden for observers. */
  private renderDiplomacy(tag: string | null): void {
    const game = this.store.get();
    const country = tag ? game.countries[tag] : undefined;
    const diplomacy = tag ? game.diplomacy.countries[tag] : undefined;

    this.prestigeButton.hidden = !country;
    this.navyButton.hidden = !country;
    this.warPill.hidden = !country;
    this.crisisPill.hidden = !country;
    if (!tag || !country) {
      this.prestigeButton.className = 'stat-slot stat-button stat-prestige';
      this.warPill.className = 'stat-slot stat-button stat-war';
      this.crisisPill.className = 'stat-slot stat-button stat-crisis';
      return;
    }

    const prestige = Math.round(diplomacy?.prestige ?? 0);
    const rank = rankOf(game, tag);
    const greatPower = isGreatPower(game, tag);
    this.prestigeButton.textContent = `Prestige ${prestige} · #${rank}`;
    this.prestigeButton.className = `stat-slot stat-button stat-prestige${greatPower ? ' is-gp' : ''}`;
    this.prestigeButton.title =
      `Prestige ${prestige}\n` +
      `Rank #${rank}${greatPower ? ' — Great Power' : ''}\n` +
      'Open the diplomacy panel (Shift+D)';

    const navy = navyOf(game, tag);
    const need = convoyNeed(navy);
    const available = convoysAvailable(navy);
    this.navyButton.textContent = `⚓ ${Math.round(navy.flotillas)} · Convoys ${Math.round(Math.min(need, available))}/${Math.round(available)}`;
    this.navyButton.className = `stat-slot stat-button stat-navy${navy.supply < 0.999 ? ' is-low' : ''}`;
    this.navyButton.title =
      `Flotillas ${navy.flotillas.toFixed(1)}\n` +
      `Convoys ${available.toFixed(0)} available, ${need.toFixed(0)} needed (supply ${Math.round(navy.supply * 100)}%)\n` +
      'Open the navy panel (N)';

    const wars = warsOf(game, tag);
    this.warPill.hidden = wars.length === 0;
    this.warPill.textContent = wars.length === 1 ? 'At war' : `At war (${wars.length})`;
    this.warPill.title =
      `${wars.map((war) => war.name).join('\n')}\n` +
      'Open the war panel (Shift+W)';

    const plays = playsOf(game, tag);
    this.crisisPill.hidden = plays.length === 0;
    this.crisisPill.textContent = 'Crisis';
    this.crisisPill.title =
      plays
        .map((play) => {
          const other = play.initiator === tag ? play.target : play.initiator;
          return `Diplomatic play against ${game.countries[other]?.name ?? other} — ${play.weeksLeft} weeks left`;
        })
        .join('\n') + '\nOpen the diplomacy panel (Shift+D)';
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.root.remove();
  }
}
