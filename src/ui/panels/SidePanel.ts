import { BUILDINGS } from '../../data/economy/buildings';
import { GOODS, GOOD_IDS } from '../../data/economy/goods';
import { POP_TYPES, POP_TYPE_IDS } from '../../data/economy/pops';
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
import type { BuildingDef, BuildingInstance, GoodId, PopTypeId } from '../../sim/economy/types';
import type { GameState, StateDef } from '../../sim/types';
import { formatCount, formatDelta, formatMoney, formatPercent } from '../format';
import type { PanelView, Store } from '../store';

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
    const options = buildableBuildings(game, tag, state.id);
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
      button.disabled = atCap;
      if (atCap) button.title = 'At capacity';
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
    actions.append(marketButton, constructionButton);
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

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.root.remove();
  }
}
