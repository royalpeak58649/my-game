import { BUILDINGS } from '../../data/economy/buildings';
import { GOODS, GOOD_IDS } from '../../data/economy/goods';
import { POP_TYPES, POP_TYPE_IDS } from '../../data/economy/pops';
import { IGS, IG_IDS, STANCES } from '../../data/politics/igs';
import { LAWS, LAW_GROUPS, LAW_GROUP_IDS } from '../../data/politics/laws';
import { TECHS } from '../../data/politics/techs';
import {
  buildableBuildings,
  buildingJobs,
  buildingStaffing,
  countryEconomy,
  countryPopulation,
  gdp,
  marketOf,
  stateEconomy,
  totalPopulation,
} from '../../sim/economy/queries';
import { cancelConstruction, queueConstruction, setIncomeTax, setProductionMethod } from '../../sim/economy/commands';
import { cancelEnactment, setGovernment, setResearch, startEnactment } from '../../sim/politics/commands';
import { availableTechs, igMembers, lawOptions, politicsOf } from '../../sim/politics/queries';
import type { BuildingDef, BuildingInstance, GoodId } from '../../sim/economy/types';
import type { CountryPolitics, IgId, LawGroupId, TechCategory } from '../../sim/politics/types';
import type { GameState, StateDef } from '../../sim/types';
import { formatCount, formatDelta, formatMoney, formatPercent } from '../format';
import type { PanelView, Store } from '../store';
import { renderDiplomacyView, renderWarView } from './diplomacyViews';

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

function detailRow(label: string, value: string | Node): HTMLElement {
  const row = el('div', 'detail-row');
  row.append(el('dt', undefined, label));
  const dd = el('dd');
  if (typeof value === 'string') dd.textContent = value;
  else dd.append(value);
  row.append(dd);
  return row;
}

function sectionTitle(text: string): HTMLElement {
  return el('h4', 'section-title', text);
}

/** Small 0..40 bar for standard of living. */
function solBar(sol: number): HTMLElement {
  const wrap = el('span', 'sol');
  const track = el('span', 'bar bar-sol');
  const fill = el('span', 'bar-fill');
  const pct = Math.max(0, Math.min(1, sol / 40));
  fill.style.width = `${(pct * 100).toFixed(1)}%`;
  fill.classList.add(sol >= 20 ? 'is-good' : sol >= 10 ? 'is-mid' : 'is-low');
  track.append(fill);
  wrap.append(track, el('span', 'sol-value', sol.toFixed(1)));
  return wrap;
}

function progressBar(value: number, max: number): HTMLElement {
  const track = el('span', 'bar bar-progress');
  const fill = el('span', 'bar-fill');
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  fill.style.width = `${(pct * 100).toFixed(1)}%`;
  track.append(fill);
  return track;
}

function profitClass(value: number): string {
  return value > 0 ? 'is-positive' : value < 0 ? 'is-negative' : 'is-neutral';
}

/** Signed number with a true minus sign: 3 → "+3", −2 → "−2", 0 → "0". */
function formatSigned(value: number, digits = 0): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : '\u2212'}${Math.abs(rounded).toFixed(digits)}`;
}

/** Approval label: angry at −5 or below, content at +5 or above. */
function approvalLabel(approval: number): string {
  if (approval <= -5) return 'Angry';
  if (approval >= 5) return 'Content';
  return 'Neutral';
}

function approvalTone(approval: number): string {
  if (approval <= -5) return 'is-negative';
  if (approval >= 5) return 'is-positive';
  return 'is-neutral';
}

function legitimacyTone(legitimacy: number): string {
  return legitimacy < 25 ? 'is-low' : legitimacy < 50 ? 'is-mid' : 'is-good';
}

/** Small colored dot for an interest group. */
function igDot(ig: IgId): HTMLElement {
  const dot = el('span', 'ig-dot');
  dot.style.background = IGS[ig].color;
  return dot;
}

/** Colored dot + name for an interest group. */
function igLabel(ig: IgId): HTMLElement {
  const wrap = el('span', 'ig-label');
  wrap.append(igDot(ig), el('span', 'ig-name', IGS[ig].name));
  return wrap;
}

/** 0..1 bar with a tone class. */
function ratioBar(value: number, tone: string): HTMLElement {
  const track = el('span', 'bar bar-ratio');
  const fill = el('span', `bar-fill ${tone}`);
  const pct = Math.max(0, Math.min(1, value));
  fill.style.width = `${(pct * 100).toFixed(1)}%`;
  track.append(fill);
  return track;
}

/** −10..+10 approval bar, centered on zero. */
function approvalBar(approval: number): HTMLElement {
  const clamped = Math.max(-10, Math.min(10, approval));
  const track = el('span', 'bar bar-approval');
  const fill = el('span', `bar-fill ${approvalTone(approval)}`);
  const half = Math.abs(clamped) / 20;
  if (clamped >= 0) {
    fill.style.left = '50%';
    fill.style.width = `${(half * 100).toFixed(1)}%`;
  } else {
    fill.style.left = `${(50 - half * 100).toFixed(1)}%`;
    fill.style.width = `${(half * 100).toFixed(1)}%`;
  }
  track.append(el('span', 'bar-mid'), fill);
  return track;
}

/** Tiny colored dots showing each interest group's stance to a law. */
function stanceDots(lawId: string): HTMLElement {
  const wrap = el('span', 'stance-dots');
  const lines: string[] = [];
  for (const ig of IG_IDS) {
    const stance = STANCES[ig][lawId] ?? 0;
    if (stance === 0) continue;
    const dot = el('span', `stance-dot ${stance > 0 ? 'is-for' : 'is-against'}`);
    dot.style.background = IGS[ig].color;
    dot.title = `${IGS[ig].name}: ${formatSigned(stance)}`;
    wrap.append(dot);
    lines.push(`${IGS[ig].name} ${formatSigned(stance)}`);
  }
  if (lines.length === 0) {
    wrap.append(el('span', 'muted small', '—'));
    wrap.title = 'No interest group has a strong opinion.';
  } else {
    wrap.title = lines.join('\n');
  }
  return wrap;
}

type MarketSortKey = 'name' | 'price' | 'ratio' | 'supply' | 'demand';

interface MarketSort {
  key: MarketSortKey;
  desc: boolean;
}

export interface SidePanelOptions {
  onFocusState: (stateId: string) => void;
}

/** Right-hand detail panel for a selected state or country, plus market and construction views. */
export class SidePanel {
  readonly root: HTMLElement;
  private readonly store: Store;
  private readonly options: SidePanelOptions;
  private readonly body: HTMLElement;
  private readonly title: HTMLElement;
  private readonly unsubscribers: (() => void)[] = [];
  private marketSort: MarketSort = { key: 'name', desc: false };
  /** Signature of the last rendered view, to skip redundant rebuilds. */
  private lastSignature = '';

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
    this.store.setUi({ selectedStateId: null, selectedCountryTag: null, panelView: 'auto' });
  }

  /** Dispatches a pure economy command through the store. */
  private dispatch(next: GameState): void {
    this.store.set(next);
  }

  private render(): void {
    const ui = this.store.getUi();
    const game = this.store.get();
    const state = ui.selectedStateId ? game.states[ui.selectedStateId] : undefined;
    const country = ui.selectedCountryTag ? game.countries[ui.selectedCountryTag] : undefined;

    const open = Boolean(state || country);
    this.root.classList.toggle('is-open', open);
    this.root.setAttribute('aria-hidden', open ? 'false' : 'true');

    // Never rebuild the DOM while the panel is hidden.
    if (!open) {
      this.lastSignature = '';
      return;
    }

    const view: PanelView = ui.panelView;
    const signature = [
      view,
      state?.id ?? '',
      country?.tag ?? '',
      game.player ?? '',
      game.tickCount,
      view === 'market' ? `${this.marketSort.key}:${this.marketSort.desc ? 1 : 0}` : '',
      view === 'politics' || view === 'laws' || view === 'technology' ? JSON.stringify(game.politics) : '',
      view === 'diplomacy' ? JSON.stringify(game.diplomacy) : '',
      view === 'war' ? JSON.stringify(game.military) : '',
    ].join('|');
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    const scrollTop = this.body.scrollTop;
    this.body.replaceChildren();

    if (view === 'market') {
      this.title.textContent = 'Market';
      this.renderMarket(game, country?.tag ?? game.player);
    } else if (view === 'construction') {
      this.title.textContent = 'Construction';
      this.renderConstruction(game, country?.tag ?? game.player);
    } else if (view === 'politics') {
      this.title.textContent = 'Politics';
      this.renderPolitics(game, country?.tag ?? game.player);
    } else if (view === 'laws') {
      this.title.textContent = 'Laws';
      this.renderLaws(game, country?.tag ?? game.player);
    } else if (view === 'technology') {
      this.title.textContent = 'Technology';
      this.renderTechnology(game, country?.tag ?? game.player);
    } else if (view === 'diplomacy') {
      this.title.textContent = 'Diplomacy';
      renderDiplomacyView(this.body, game, this.store, country?.tag ?? game.player, ui.selectedCountryTag);
    } else if (view === 'war') {
      this.title.textContent = 'War';
      renderWarView(this.body, game, this.store, country?.tag ?? game.player);
    } else if (state) {
      this.title.textContent = 'State';
      this.renderState(game, state);
    } else if (country) {
      this.title.textContent = 'Country';
      this.renderCountry(game, country.tag);
    } else {
      this.title.textContent = 'Details';
    }

    this.body.scrollTop = scrollTop;
  }

  // ------------------------------------------------------------------ state

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
        this.store.setUi({ selectedCountryTag: state.owner, selectedStateId: null, panelView: 'auto' });
      });
      ownerValue.append(link);
    }
    ownerRow.append(ownerValue);

    rows.append(ownerRow);
    rows.append(detailRow('Area', formatArea(state.area)));
    rows.append(detailRow('Modern region', state.adm0));
    rows.append(detailRow('Population', formatCount(totalPopulation(game, state.id))));
    this.body.append(rows);

    if (state.owner === null) {
      const placeholder = el('section', 'panel-placeholder');
      placeholder.append(el('h4', undefined, 'No organised economy'), el('p', 'muted', 'These lands have no market, buildings or pops.'));
      this.body.append(placeholder);
      return;
    }

    const economy = stateEconomy(game, state.id);
    if (!economy) {
      const placeholder = el('section', 'panel-placeholder');
      placeholder.append(el('h4', undefined, 'No organised economy'), el('p', 'muted', 'No economic data for this state.'));
      this.body.append(placeholder);
      return;
    }

    const isPlayer = game.player !== null && state.owner === game.player;

    // --- pops
    this.body.append(sectionTitle('Pops'));
    const popTable = el('table', 'data-table');
    const popHead = el('thead');
    const popHeadRow = el('tr');
    for (const [label, cls] of [
      ['Type', 'col-name'],
      ['Count', 'num'],
      ['Standard of living', 'col-sol'],
    ] as const) {
      popHeadRow.append(el('th', cls, label));
    }
    popHead.append(popHeadRow);
    const popBody = el('tbody');
    for (const type of POP_TYPE_IDS) {
      const count = economy.pops[type] ?? 0;
      if (count <= 0) continue;
      const tr = el('tr');
      tr.append(el('td', 'col-name', POP_TYPES[type].name));
      tr.append(el('td', 'num', formatCount(count)));
      const solCell = el('td', 'col-sol');
      solCell.append(solBar(economy.sol[type] ?? 0));
      tr.append(solCell);
      popBody.append(tr);
    }
    popTable.append(popHead, popBody);
    this.body.append(popTable);

    // --- buildings
    this.body.append(sectionTitle('Buildings'));
    const buildingIds = Object.keys(economy.buildings).filter((id) => (economy.buildings[id]?.level ?? 0) > 0);
    if (buildingIds.length === 0) {
      this.body.append(el('p', 'muted small', 'No buildings.'));
    } else {
      const table = el('table', 'data-table');
      const head = el('thead');
      const headRow = el('tr');
      for (const [label, cls] of [
        ['Building', 'col-name'],
        ['Lvl', 'num'],
        ['Staff', 'num'],
        ['Profit', 'num'],
      ] as const) {
        headRow.append(el('th', cls, label));
      }
      head.append(headRow);
      const tbody = el('tbody');
      for (const id of buildingIds) {
        const inst = economy.buildings[id];
        const def = BUILDINGS[id];
        if (!inst || !def) continue;
        this.appendBuildingRows(tbody, inst, def, isPlayer);
      }
      table.append(head, tbody);
      this.body.append(table);
    }

    // --- build
    if (isPlayer) {
      this.body.append(sectionTitle('Build'));
      this.renderBuildSection(game, state, state.owner);
    }
  }

  private appendBuildingRows(tbody: HTMLElement, inst: BuildingInstance, def: BuildingDef, editable: boolean): void {
    const tr = el('tr');
    tr.append(el('td', 'col-name', def.name));
    tr.append(el('td', 'num', String(inst.level)));

    const staffing = buildingStaffing(inst, def);
    const jobs = buildingJobs(def, inst);
    const staffCell = el('td', 'num');
    staffCell.append(el('span', 'staffing', formatPercent(staffing)));
    staffCell.title = `${Math.round(staffing * jobs)} of ${jobs} jobs filled`;
    tr.append(staffCell);

    const profitCell = el('td', `num ${profitClass(inst.lastProfit)}`);
    profitCell.textContent = formatDelta(inst.lastProfit);
    profitCell.title = `Revenue ${formatMoney(inst.lastRevenue)} · Costs ${formatMoney(inst.lastCosts)}`;
    tr.append(profitCell);

    const methodRow = el('tr', 'method-row');
    const methodCell = el('td');
    methodCell.colSpan = 4;
    if (editable && def.methods.length > 1) {
      const select = el('select', 'method-select');
      select.setAttribute('aria-label', `${def.name} production method`);
      for (const method of def.methods) {
        const option = el('option', undefined, method.name);
        option.value = method.id;
        option.selected = method.id === inst.method;
        select.append(option);
      }
      select.addEventListener('change', () => {
        this.dispatch(setProductionMethod(this.store.get(), inst.id, def.id, select.value));
      });
      methodCell.append(select);
    } else {
      const method = def.methods.find((m) => m.id === inst.method) ?? def.methods[0];
      methodCell.append(el('span', 'muted small', method?.name ?? inst.method));
    }
    methodRow.append(methodCell);

    tbody.append(tr, methodRow);
  }

  private renderBuildSection(game: GameState, state: StateDef, tag: string): void {
    // hide buildings the state has no resource for at all (cap 0 and nothing built)
    const options = buildableBuildings(game, tag, state.id).filter((o) => o.cap === null || o.cap > 0 || o.current > 0);
    if (options.length === 0) {
      this.body.append(el('p', 'muted small', 'Nothing can be built here.'));
      return;
    }
    const table = el('table', 'data-table');
    const head = el('thead');
    const headRow = el('tr');
    for (const [label, cls] of [
      ['Building', 'col-name'],
      ['Cost', 'num'],
      ['Levels', 'num'],
      ['', 'col-action'],
    ] as const) {
      headRow.append(el('th', cls, label));
    }
    head.append(headRow);
    const tbody = el('tbody');
    for (const option of options) {
      const tr = el('tr');
      tr.append(el('td', 'col-name', option.def.name));
      tr.append(el('td', 'num', String(option.def.cost)));

      const levels = el('td', 'num');
      levels.textContent = option.cap === null ? String(option.current) : `${option.current}/${option.cap}`;
      if (option.queued > 0) levels.append(el('span', 'queued', ` +${option.queued}`));
      tr.append(levels);

      const action = el('td', 'col-action');
      const atCap = option.cap !== null && option.current + option.queued >= option.cap;
      const button = el('button', 'button-small', 'Build');
      button.type = 'button';
      button.disabled = atCap || option.lockedBy !== null;
      if (atCap) button.title = 'At capacity';
      else if (option.lockedBy) button.title = `Requires ${TECHS[option.lockedBy]?.name ?? option.lockedBy}`;
      else button.title = `Queue one level (${option.def.cost} construction points)`;
      button.addEventListener('click', () => {
        this.dispatch(queueConstruction(this.store.get(), tag, state.id, option.def.id));
      });
      action.append(button);
      tr.append(action);
      tbody.append(tr);
    }
    table.append(head, tbody);
    this.body.append(table);
  }

  // ---------------------------------------------------------------- country

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
        this.store.setUi({ selectedStateId: capital.id, selectedCountryTag: tag, panelView: 'auto' });
        this.options.onFocusState(capital.id);
      });
      capitalValue.append(link);
    } else {
      capitalValue.append(el('span', 'muted', '—'));
    }
    capitalRow.append(capitalValue);

    rows.append(capitalRow);
    rows.append(detailRow('States', String(states.length)));
    rows.append(detailRow('Total area', formatArea(totalArea)));
    rows.append(detailRow('Population', formatCount(countryPopulation(game, tag))));

    const economy = countryEconomy(game, tag);
    if (economy) {
      rows.append(detailRow('GDP', `${formatMoney(gdp(game, tag))} / wk`));
      rows.append(detailRow('Treasury', formatMoney(economy.treasury)));

      const net = economy.lastIncome - economy.lastExpenses;
      const incomeValue = el('span', 'value-group');
      incomeValue.append(el('span', 'is-positive', formatDelta(economy.lastIncome)));
      incomeValue.append(el('span', 'muted', ' / '));
      incomeValue.append(el('span', 'is-negative', formatDelta(-economy.lastExpenses)));
      incomeValue.append(el('span', `net ${profitClass(net)}`, ` (${formatDelta(net)})`));
      rows.append(detailRow('Income / expenses', incomeValue));
    }
    this.body.append(rows);

    if (!economy) {
      const placeholder = el('section', 'panel-placeholder');
      placeholder.append(el('h4', undefined, 'No organised economy'), el('p', 'muted', 'No economic data for this country.'));
      this.body.append(placeholder);
      return;
    }

    if (game.player === tag) {
      this.body.append(sectionTitle('Income tax'));
      const slider = el('div', 'slider-row');
      const input = el('input', 'slider');
      input.type = 'range';
      input.min = '0';
      input.max = '50';
      input.step = '1';
      input.value = String(Math.round(economy.incomeTaxRate * 100));
      input.setAttribute('aria-label', 'Income tax rate');
      const readout = el('span', 'slider-value', formatPercent(economy.incomeTaxRate));
      input.addEventListener('input', () => {
        readout.textContent = formatPercent(Number(input.value) / 100);
      });
      input.addEventListener('change', () => {
        this.dispatch(setIncomeTax(this.store.get(), tag, Number(input.value) / 100));
      });
      slider.append(input, readout);
      this.body.append(slider);
      this.body.append(el('p', 'muted small', 'Taxed on wages and dividends; peasants pay nothing.'));
    }

    const actions = el('div', 'panel-actions');
    const marketButton = el('button', 'button-secondary button-small', 'Market');
    marketButton.type = 'button';
    marketButton.addEventListener('click', () => {
      this.store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: 'market' });
    });
    const constructionButton = el('button', 'button-secondary button-small', 'Construction');
    constructionButton.type = 'button';
    constructionButton.addEventListener('click', () => {
      this.store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: 'construction' });
    });
    const politicsButton = el('button', 'button-secondary button-small', 'Politics');
    politicsButton.type = 'button';
    politicsButton.title = 'Interest groups, government and legitimacy (P)';
    politicsButton.addEventListener('click', () => {
      this.store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: 'politics' });
    });
    const lawsButton = el('button', 'button-secondary button-small', 'Laws');
    lawsButton.type = 'button';
    lawsButton.title = 'Laws and enactments (L)';
    lawsButton.addEventListener('click', () => {
      this.store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: 'laws' });
    });
    const techButton = el('button', 'button-secondary button-small', 'Technology');
    techButton.type = 'button';
    techButton.title = 'Research and technologies (T)';
    techButton.addEventListener('click', () => {
      this.store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: 'technology' });
    });
    actions.append(marketButton, constructionButton, politicsButton, lawsButton, techButton);
    this.body.append(actions);
  }

  // ----------------------------------------------------------------- market

  private renderMarket(game: GameState, tag: string | null): void {
    const country = tag ? game.countries[tag] : undefined;
    if (!tag || !country) {
      this.body.append(el('p', 'muted', 'Select a country to see its market.'));
      return;
    }

    const heading = el('div', 'panel-heading');
    const swatch = el('span', 'swatch swatch-large');
    swatch.style.background = country.color;
    heading.append(swatch, el('h3', 'panel-name', `${country.name} Market`));
    this.body.append(heading);

    const market = marketOf(game, tag);
    if (!market) {
      this.body.append(el('p', 'muted', 'No market data.'));
      return;
    }

    const rows: { id: GoodId; name: string; price: number; ratio: number; supply: number; demand: number }[] =
      GOOD_IDS.map((id) => {
        const def = GOODS[id];
        const price = market.prices[id] ?? def.basePrice;
        return {
          id,
          name: def.name,
          price,
          ratio: def.basePrice > 0 ? price / def.basePrice : 1,
          supply: market.supply[id] ?? 0,
          demand: market.demand[id] ?? 0,
        };
      });

    const sort = this.marketSort;
    rows.sort((a, b) => {
      let cmp: number;
      switch (sort.key) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'price':
          cmp = a.price - b.price;
          break;
        case 'ratio':
          cmp = a.ratio - b.ratio;
          break;
        case 'supply':
          cmp = a.supply - b.supply;
          break;
        case 'demand':
          cmp = a.demand - b.demand;
          break;
      }
      if (cmp === 0) cmp = a.name.localeCompare(b.name);
      return sort.desc ? -cmp : cmp;
    });

    const table = el('table', 'data-table market-table');
    const thead = el('thead');
    const headRow = el('tr');
    const columns: { key: MarketSortKey; label: string; cls: string }[] = [
      { key: 'name', label: 'Good', cls: 'col-name' },
      { key: 'price', label: 'Price', cls: 'num' },
      { key: 'ratio', label: '% base', cls: 'num' },
      { key: 'supply', label: 'Supply', cls: 'num' },
      { key: 'demand', label: 'Demand', cls: 'num' },
    ];
    for (const column of columns) {
      const th = el('th', column.cls);
      const button = el('button', 'sort-button', column.label);
      button.type = 'button';
      if (sort.key === column.key) {
        th.classList.add('is-sorted');
        button.append(el('span', 'sort-arrow', sort.desc ? '▾' : '▴'));
      }
      button.addEventListener('click', () => {
        this.marketSort =
          this.marketSort.key === column.key
            ? { key: column.key, desc: !this.marketSort.desc }
            : { key: column.key, desc: column.key !== 'name' };
        this.render();
      });
      th.append(button);
      headRow.append(th);
    }
    thead.append(headRow);

    const tbody = el('tbody');
    for (const row of rows) {
      const tr = el('tr');
      tr.append(el('td', 'col-name', row.name));
      tr.append(el('td', 'num', formatMoney(row.price)));
      const ratioCell = el('td', 'num');
      const ratioClass = row.ratio < 0.8 ? 'is-cheap' : row.ratio > 1.2 ? 'is-dear' : 'is-neutral';
      ratioCell.append(el('span', ratioClass, formatPercent(row.ratio)));
      tr.append(ratioCell);
      tr.append(el('td', 'num', formatCount(row.supply)));
      tr.append(el('td', 'num', formatCount(row.demand)));
      tbody.append(tr);
    }
    table.append(thead, tbody);
    this.body.append(table);
  }

  // ----------------------------------------------------------- construction

  private renderConstruction(game: GameState, tag: string | null): void {
    const country = tag ? game.countries[tag] : undefined;
    if (!tag || !country) {
      this.body.append(el('p', 'muted', 'Select a country to see its construction queue.'));
      return;
    }

    const heading = el('div', 'panel-heading');
    const swatch = el('span', 'swatch swatch-large');
    swatch.style.background = country.color;
    heading.append(swatch, el('h3', 'panel-name', `${country.name} Construction`));
    this.body.append(heading);

    const economy = countryEconomy(game, tag);
    if (!economy) {
      this.body.append(el('p', 'muted', 'No construction data.'));
      return;
    }

    const rows = el('dl', 'detail-list');
    rows.append(detailRow('Points per week', String(Math.round(economy.constructionPoints))));
    rows.append(detailRow('Queued projects', String(economy.queue.length)));
    this.body.append(rows);

    if (economy.queue.length === 0) {
      this.body.append(el('p', 'muted small', 'Nothing under construction. Open a state to queue buildings.'));
      return;
    }

    const list = el('ul', 'queue-list');
    economy.queue.forEach((item, index) => {
      const def = BUILDINGS[item.buildingId];
      const state = game.states[item.stateId];
      const cost = def?.cost ?? 0;

      const li = el('li', 'queue-item');
      const info = el('div', 'queue-info');
      info.append(el('div', 'queue-name', def?.name ?? item.buildingId));
      info.append(el('div', 'queue-state muted small', state?.name ?? item.stateId));

      const progress = el('div', 'queue-progress');
      progress.append(progressBar(item.progress, cost));
      progress.append(el('span', 'queue-points', `${Math.round(item.progress)}/${cost}`));

      const cancel = el('button', 'icon-button icon-button-small', '×');
      cancel.type = 'button';
      cancel.title = 'Cancel project';
      cancel.addEventListener('click', () => {
        this.dispatch(cancelConstruction(this.store.get(), tag, index));
      });

      li.append(info, progress, cancel);
      list.append(li);
    });
    this.body.append(list);
  }

  // --------------------------------------------------------------- politics

  /** Heading shared by the politics views: country swatch, name and a read-only note. */
  private politicsHeading(game: GameState, tag: string, suffix: string): boolean {
    const country = game.countries[tag];
    if (!country) {
      this.body.append(el('p', 'muted', 'Select a country to see its politics.'));
      return false;
    }
    const heading = el('div', 'panel-heading');
    const swatch = el('span', 'swatch swatch-large');
    swatch.style.background = country.color;
    heading.append(swatch, el('h3', 'panel-name', `${country.name} ${suffix}`));
    this.body.append(heading);

    if (game.player !== tag) {
      this.body.append(el('p', 'muted small readonly-note', 'Read-only: you are observing this country.'));
    }
    return true;
  }

  private renderPolitics(game: GameState, tag: string | null): void {
    if (!tag) {
      this.body.append(el('p', 'muted', 'Select a country to see its politics.'));
      return;
    }
    if (!this.politicsHeading(game, tag, 'Politics')) return;

    const politics = politicsOf(game, tag);
    if (!politics) {
      this.body.append(el('p', 'muted', 'No political data for this country.'));
      return;
    }
    const editable = game.player === tag;

    // --- legitimacy
    const legitimacy = Math.round(politics.legitimacy);
    const legitimacyBlock = el('div', 'legitimacy-block');
    const legitimacyHead = el('div', 'legitimacy-head');
    legitimacyHead.append(el('span', 'legitimacy-label', 'Legitimacy'));
    legitimacyHead.append(el('span', `legitimacy-value ${legitimacyTone(legitimacy)}`, String(legitimacy)));
    legitimacyBlock.append(legitimacyHead);
    legitimacyBlock.append(ratioBar(politics.legitimacy / 100, legitimacyTone(legitimacy)));
    this.body.append(legitimacyBlock);

    // --- government
    this.body.append(sectionTitle('Government'));
    const chips = el('div', 'ig-chips');
    if (politics.government.length === 0) {
      chips.append(el('span', 'muted small', 'No interest group in government.'));
    }
    for (const ig of politics.government) {
      const chip = el('span', 'ig-chip');
      chip.style.borderColor = IGS[ig].color;
      chip.append(igDot(ig), el('span', undefined, IGS[ig].name));
      chip.title = IGS[ig].description;
      chips.append(chip);
    }
    this.body.append(chips);

    // --- interest groups
    this.body.append(sectionTitle('Interest groups'));
    const table = el('table', 'data-table ig-table');
    const thead = el('thead');
    const headRow = el('tr');
    for (const [label, cls] of [
      ['Group', 'col-name'],
      ['Clout', 'col-clout'],
      ['Approval', 'col-approval'],
      ['In gov.', 'col-gov'],
    ] as const) {
      headRow.append(el('th', cls, label));
    }
    thead.append(headRow);
    const tbody = el('tbody');

    const inGovernment = new Set<IgId>(politics.government);
    for (const ig of IG_IDS) {
      const state = politics.igs[ig];
      const tr = el('tr');

      const nameCell = el('td', 'col-name');
      const label = igLabel(ig);
      label.title = `${IGS[ig].description}\nMembers: ${formatCount(igMembers(game, tag, ig))}`;
      nameCell.append(label);
      tr.append(nameCell);

      const cloutCell = el('td', 'col-clout');
      const cloutWrap = el('span', 'clout-cell');
      cloutWrap.append(ratioBar(state.clout, 'is-brass'), el('span', 'clout-value', formatPercent(state.clout)));
      cloutCell.append(cloutWrap);
      tr.append(cloutCell);

      const approvalCell = el('td', 'col-approval');
      const approvalWrap = el('span', 'approval-cell');
      approvalWrap.append(approvalBar(state.approval));
      approvalWrap.append(el('span', `approval-value ${approvalTone(state.approval)}`, formatSigned(state.approval, 1)));
      approvalWrap.append(el('span', `approval-label ${approvalTone(state.approval)}`, approvalLabel(state.approval)));
      approvalCell.append(approvalWrap);
      tr.append(approvalCell);

      const govCell = el('td', 'col-gov');
      const checkbox = el('input', 'ig-checkbox');
      checkbox.type = 'checkbox';
      checkbox.checked = inGovernment.has(ig);
      checkbox.setAttribute('aria-label', `${IGS[ig].name} in government`);
      const next = inGovernment.has(ig)
        ? politics.government.filter((id) => id !== ig)
        : [...politics.government, ig];
      const blocked = next.length === 0 || next.length > 4;
      checkbox.disabled = !editable || blocked;
      if (!editable) checkbox.title = 'Read-only: you are observing this country.';
      else if (blocked) checkbox.title = 'A government needs between 1 and 4 interest groups.';
      else checkbox.title = inGovernment.has(ig) ? 'Remove from government' : 'Add to government';
      checkbox.addEventListener('change', () => {
        this.dispatch(setGovernment(this.store.get(), tag, next));
      });
      govCell.append(checkbox);
      tr.append(govCell);

      tbody.append(tr);
    }
    table.append(thead, tbody);
    this.body.append(table);

    // --- movements
    this.body.append(sectionTitle('Movements'));
    if (politics.movements.length === 0) {
      this.body.append(el('p', 'muted small', 'No organised movements.'));
    } else {
      const list = el('ul', 'movement-list');
      for (const movement of politics.movements) {
        const li = el('li', 'movement-item');
        const head = el('div', 'movement-head');
        head.append(igLabel(movement.ig));
        head.append(el('span', 'movement-law', LAWS[movement.law]?.name ?? movement.law));
        li.append(head);

        const radical = el('div', 'movement-radicalism');
        const tone = movement.radicalism >= 75 ? 'is-negative' : movement.radicalism >= 40 ? 'is-mid' : 'is-good';
        radical.append(ratioBar(movement.radicalism / 100, tone));
        radical.append(el('span', 'movement-value', `${Math.round(movement.radicalism)}`));
        li.append(radical);
        list.append(li);
      }
      this.body.append(list);
    }
  }

  // ------------------------------------------------------------------- laws

  private renderLaws(game: GameState, tag: string | null): void {
    if (!tag) {
      this.body.append(el('p', 'muted', 'Select a country to see its laws.'));
      return;
    }
    if (!this.politicsHeading(game, tag, 'Laws')) return;

    const politics = politicsOf(game, tag);
    if (!politics) {
      this.body.append(el('p', 'muted', 'No political data for this country.'));
      return;
    }
    const editable = game.player === tag;

    for (const group of LAW_GROUP_IDS) {
      this.body.append(sectionTitle(LAW_GROUPS[group].name));
      const options = lawOptions(game, tag, group);
      const list = el('ul', 'law-list');
      for (const option of options) {
        list.append(this.lawRow(game, tag, politics, group, option, editable));
      }
      this.body.append(list);
    }
  }

  private lawRow(
    game: GameState,
    tag: string,
    politics: CountryPolitics,
    group: LawGroupId,
    option: { law: { id: string; name: string; description: string }; inForce: boolean; allowed: boolean; reason?: string; support: number },
    editable: boolean,
  ): HTMLElement {
    const law = option.law;
    const enacting = politics.enacting !== null && politics.enacting.law === law.id;
    const li = el('li', 'law-row');
    if (option.inForce) li.classList.add('is-in-force');
    if (enacting) li.classList.add('is-enacting');

    const head = el('div', 'law-head');
    head.append(el('span', 'law-name', law.name));
    head.append(stanceDots(law.id));
    li.append(head);
    li.append(el('div', 'law-desc muted small', law.description));

    const foot = el('div', 'law-foot');

    const status = el('div', 'law-status');
    if (option.inForce) {
      status.append(el('span', 'law-badge is-in-force', 'In force'));
    } else if (enacting && politics.enacting) {
      status.append(el('span', 'law-badge is-enacting', 'Being enacted'));
      const progress = el('span', 'law-progress');
      progress.append(progressBar(politics.enacting.progress, 1));
      progress.append(el('span', 'law-progress-value', formatPercent(politics.enacting.progress)));
      status.append(progress);
    } else if (option.allowed) {
      status.append(el('span', 'law-badge is-allowed', 'Allowed'));
    } else {
      const badge = el('span', 'law-badge is-locked', 'Locked');
      badge.title = option.reason ?? 'Not available.';
      status.append(badge);
      if (option.reason) status.append(el('span', 'law-reason muted small', option.reason));
    }
    foot.append(status);

    const support = el('span', 'law-support');
    support.append(el('span', 'law-support-label muted small', 'Support'));
    support.append(
      el(
        'span',
        `law-support-value ${option.support > 0 ? 'is-positive' : option.support < 0 ? 'is-negative' : 'is-neutral'}`,
        formatSigned(option.support, 2),
      ),
    );
    support.title = 'Clout-weighted support for this law (government groups count double).';
    foot.append(support);

    const action = el('div', 'law-action');
    if (enacting) {
      const cancel = el('button', 'button-small', 'Cancel');
      cancel.type = 'button';
      cancel.disabled = !editable;
      cancel.title = editable ? 'Cancel this enactment' : 'Read-only: you are observing this country.';
      cancel.addEventListener('click', () => {
        this.dispatch(cancelEnactment(this.store.get(), tag));
      });
      action.append(cancel);
    } else if (!option.inForce) {
      const enact = el('button', 'button-small', 'Enact');
      enact.type = 'button';
      const blocked = !editable || !option.allowed || politics.enacting !== null;
      enact.disabled = blocked;
      if (!editable) enact.title = 'Read-only: you are observing this country.';
      else if (politics.enacting !== null) enact.title = 'Another law is already being enacted.';
      else if (!option.allowed) enact.title = option.reason ?? 'Not available.';
      else enact.title = `Begin enacting ${law.name}`;
      enact.addEventListener('click', () => {
        this.dispatch(startEnactment(this.store.get(), tag, law.id));
      });
      action.append(enact);
    }
    foot.append(action);

    li.append(foot);
    // `group` is kept for symmetry with lawOptions; the row itself needs no group id.
    void group;
    void game;
    return li;
  }

  // ------------------------------------------------------------- technology

  private renderTechnology(game: GameState, tag: string | null): void {
    if (!tag) {
      this.body.append(el('p', 'muted', 'Select a country to see its technology.'));
      return;
    }
    if (!this.politicsHeading(game, tag, 'Technology')) return;

    const politics = politicsOf(game, tag);
    if (!politics) {
      this.body.append(el('p', 'muted', 'No political data for this country.'));
      return;
    }
    const editable = game.player === tag;

    const rows = el('dl', 'detail-list');
    rows.append(detailRow('Research points', `${politics.researchPoints.toFixed(1)} / week`));
    const researching = politics.researching ? TECHS[politics.researching] : undefined;
    if (researching) {
      const progress = el('span', 'tech-researching');
      progress.append(progressBar(politics.researchProgress, researching.cost));
      progress.append(
        el('span', 'tech-progress-value', `${Math.round(politics.researchProgress)}/${researching.cost}`),
      );
      rows.append(detailRow('Researching', progress));
    } else {
      rows.append(detailRow('Researching', 'Nothing'));
    }
    rows.append(detailRow('Known technologies', String(politics.techs.length)));
    this.body.append(rows);

    const options = availableTechs(game, tag);
    const columns = el('div', 'tech-columns');
    const categories: { id: TechCategory; name: string }[] = [
      { id: 'production', name: 'Production' },
      { id: 'society', name: 'Society' },
      { id: 'military', name: 'Military' },
    ];
    for (const category of categories) {
      const column = el('div', 'tech-column');
      column.append(el('h4', 'tech-column-title', category.name));
      for (const option of options) {
        if (option.tech.category !== category.id) continue;
        column.append(this.techCard(game, tag, politics, option, editable));
      }
      columns.append(column);
    }
    this.body.append(columns);
  }

  private techCard(
    game: GameState,
    tag: string,
    politics: CountryPolitics,
    option: { tech: { id: string; name: string; cost: number; requires: string[]; description: string }; known: boolean; available: boolean; researching: boolean },
    editable: boolean,
  ): HTMLElement {
    const tech = option.tech;
    const card = el('div', 'tech-card');
    if (option.known) card.classList.add('is-known');
    if (option.researching) card.classList.add('is-researching');

    const head = el('div', 'tech-head');
    head.append(el('span', 'tech-name', tech.name));
    head.append(el('span', 'tech-cost', `${tech.cost}`));
    card.append(head);

    if (tech.requires.length > 0) {
      const requires = tech.requires.map((id) => TECHS[id]?.name ?? id).join(', ');
      card.append(el('div', 'tech-requires muted small', `Requires: ${requires}`));
    }
    card.append(el('div', 'tech-desc muted small', tech.description));

    const foot = el('div', 'tech-foot');
    if (option.known) {
      foot.append(el('span', 'tech-badge is-known', 'Known'));
    } else if (option.researching) {
      const progress = el('span', 'tech-progress');
      progress.append(progressBar(politics.researchProgress, tech.cost));
      progress.append(
        el('span', 'tech-progress-value', `${Math.round(politics.researchProgress)}/${tech.cost}`),
      );
      foot.append(el('span', 'tech-badge is-researching', 'Researching'), progress);
    } else if (option.available) {
      foot.append(el('span', 'tech-badge is-available', 'Available'));
      const button = el('button', 'button-small', 'Research');
      button.type = 'button';
      button.disabled = !editable;
      button.title = editable ? `Research ${tech.name}` : 'Read-only: you are observing this country.';
      button.addEventListener('click', () => {
        this.dispatch(setResearch(this.store.get(), tag, tech.id));
      });
      foot.append(button);
    } else {
      const badge = el('span', 'tech-badge is-locked', 'Locked');
      badge.title = 'Prerequisites are not known yet.';
      foot.append(badge);
    }
    card.append(foot);
    void game;
    return card;
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.root.remove();
  }
}
