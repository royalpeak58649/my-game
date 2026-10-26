// Navy view and the naval part of the war view. Pure rendering: every button dispatches a
// command from src/sim/navy/commands.ts through the store. See docs/NAVY.md.

import { cancelInvasion, launchInvasion, setRaidShare } from '../../sim/navy/commands';
import { freeBattalions, invasionTargets } from '../../sim/navy/invasions';
import { convoyNeed, convoysAvailable, navyOf } from '../../sim/navy/navy';
import { seaZone, zoneOfState } from '../../sim/navy/seas';
import type { War } from '../../sim/diplomacy/types';
import type { GameState } from '../../sim/types';
import type { Store } from '../store';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function sectionTitle(text: string): HTMLElement {
  return el('h4', 'section-title', text);
}

function detailRow(label: string, value: string | Node, title?: string): HTMLElement {
  const row = el('div', 'detail-row');
  row.append(el('dt', undefined, label));
  const dd = el('dd');
  if (typeof value === 'string') dd.textContent = value;
  else dd.append(value);
  row.append(dd);
  if (title) row.title = title;
  return row;
}

function button(label: string, onClick: () => void, title?: string): HTMLButtonElement {
  const node = el('button', 'button-secondary button-small', label);
  node.type = 'button';
  if (title) node.title = title;
  node.addEventListener('click', onClick);
  return node;
}

/** 0..1 bar coloured by how full it is. */
function fillBar(value: number, invert = false): HTMLElement {
  const track = el('span', 'bar bar-exhaustion');
  const fill = el('span', 'bar-fill');
  const pct = Math.max(0, Math.min(1, value));
  fill.style.width = `${(pct * 100).toFixed(1)}%`;
  const good = invert ? pct <= 0.3 : pct >= 0.95;
  const mid = invert ? pct <= 0.7 : pct >= 0.6;
  fill.classList.add(good ? 'is-good' : mid ? 'is-mid' : 'is-low');
  track.append(fill);
  return track;
}

/** Sea zone name for an id ("sea_12" → "Bay of Biscay"). */
export function zoneName(id: string): string {
  return seaZone(id)?.name ?? id;
}

function n0(x: number): string {
  return String(Math.round(x));
}

/** Navy panel: fleet, admirals, raid/escort split, convoys and naval facilities. */
export function renderNavyView(container: HTMLElement, state: GameState, store: Store, tag: string | null): void {
  const subject = tag ?? state.player;
  if (!subject || !state.countries[subject]) {
    container.append(el('p', 'muted', 'Select a country to see its navy.'));
    return;
  }
  const editable = state.player === subject;
  const navy = navyOf(state, subject);

  const heading = el('div', 'panel-heading');
  const swatch = el('span', 'swatch swatch-large');
  swatch.style.background = state.countries[subject]?.color ?? '#d9d0b8';
  heading.append(swatch, el('h3', 'panel-name', `${state.countries[subject]?.name ?? subject} Navy`));
  container.append(heading);

  // --- fleet
  container.append(sectionTitle('Fleet'));
  const fleet = el('dl', 'detail-list');
  fleet.append(
    detailRow('Flotillas', navy.flotillas.toFixed(1), 'One flotilla per staffed naval base level.'),
    detailRow('Readiness', `${Math.round(navy.quality * 100)}%`, 'Share of timber and stores the naval bases obtained.'),
  );
  container.append(fleet);
  if (navy.admirals.length > 0) {
    const list = el('ul', 'navy-admirals');
    for (const a of navy.admirals) {
      const li = el('li');
      li.append(el('span', 'ig-name', a.name), el('span', 'muted small', ` skill ${a.skill} · ${a.trait}`));
      list.append(li);
    }
    container.append(list);
  } else {
    container.append(el('p', 'muted small', 'No admirals: build naval bases on the coast to raise a fleet.'));
  }

  // --- orders
  container.append(sectionTitle('Wartime orders'));
  const split = el('div', 'navy-split');
  const raidPct = Math.round(navy.raidShare * 100);
  split.append(el('span', 'navy-split-label', `Raid ${raidPct}% · Escort ${100 - raidPct}%`));
  const range = el('input', 'navy-split-range');
  range.type = 'range';
  range.min = '0';
  range.max = '100';
  range.step = '10';
  range.value = String(raidPct);
  range.disabled = !editable;
  range.title = editable
    ? 'Raiders sink enemy convoys; escorts protect your convoys and invasions.'
    : 'Read-only: you are observing this country.';
  range.addEventListener('change', () => store.set(setRaidShare(store.get(), subject, Number(range.value) / 100)));
  split.append(range);
  container.append(split);
  if (!editable) container.append(el('p', 'muted small', 'The AI sets its own split when at war.'));

  // --- convoys
  container.append(sectionTitle('Convoys'));
  const need = convoyNeed(navy);
  const available = convoysAvailable(navy);
  const convoys = el('dl', 'detail-list');
  convoys.append(
    detailRow('Capacity', n0(navy.convoyCapacity), 'Convoys from staffed ports.'),
    detailRow('Sunk', n0(navy.convoysLost), 'Sunk by enemy raiders; 5% are replaced every week.'),
    detailRow('Overseas states', `${n0(navy.convoyNeedOverseas)} (${navy.overseasStates} states)`, 'States not connected to the capital by land.'),
    detailRow('Sea trade', n0(navy.convoyNeedTrade), 'Imports and exports by sea.'),
    detailRow('Used', `${n0(Math.min(available, need))} / ${n0(available)}`),
  );
  container.append(convoys);
  const supplyRow = el('div', 'war-exhaustion-row');
  supplyRow.append(el('span', 'war-exhaustion-label', 'Supply'), fillBar(navy.supply), el('span', 'war-exhaustion-value', `${Math.round(navy.supply * 100)}%`));
  container.append(supplyRow);
  if (navy.supply < 0.999) {
    container.append(el('p', 'muted small is-negative',
      'Not enough convoys: world-market access is reduced and armies overseas fight weaker. Build ports.'));
  }

  // --- facilities
  container.append(sectionTitle('Naval bases and ports'));
  const table = el('table', 'data-table');
  const thead = el('thead');
  const hr = el('tr');
  for (const label of ['State', 'Naval base', 'Port']) hr.append(el('th', undefined, label));
  thead.append(hr);
  const tbody = el('tbody');
  const rows = Object.keys(state.economy.states).sort()
    .filter((sid) => state.states[sid]?.owner === subject)
    .map((sid) => ({ sid, b: state.economy.states[sid]?.buildings }))
    .filter((r) => (r.b?.naval_base?.level ?? 0) > 0 || (r.b?.port?.level ?? 0) > 0);
  for (const r of rows) {
    const tr = el('tr');
    const name = el('td', 'col-name is-link', state.states[r.sid]?.name ?? r.sid);
    name.title = `On the ${zoneOfStateName(r.sid)}`;
    name.addEventListener('click', () => store.setUi({ selectedStateId: r.sid, selectedCountryTag: null, panelView: 'auto' }));
    tr.append(name, el('td', 'num', String(r.b?.naval_base?.level ?? 0)), el('td', 'num', String(r.b?.port?.level ?? 0)));
    tbody.append(tr);
  }
  table.append(thead, tbody);
  if (rows.length > 0) container.append(table);
  else container.append(el('p', 'muted small', 'None. Naval bases and ports can only be built in coastal states.'));
}

function zoneOfStateName(stateId: string): string {
  const z = zoneOfState(stateId);
  return z ? zoneName(z) : '—';
}

/** Naval section of a war card: invasions at sea and the invasion planner. */
export function invasionSection(state: GameState, store: Store, subject: string, war: War): HTMLElement {
  const wrap = el('div', 'navy-war');
  wrap.append(sectionTitle('Naval invasions'));
  const editable = state.player === subject;

  const atSea = state.military.invasions.filter((i) => i.warId === war.id);
  if (atSea.length > 0) {
    const table = el('table', 'data-table');
    const thead = el('thead');
    const hr = el('tr');
    for (const label of ['Country', 'Target', 'Bn', 'Weeks', '']) hr.append(el('th', undefined, label));
    thead.append(hr);
    const tbody = el('tbody');
    for (const inv of atSea) {
      const tr = el('tr');
      tr.append(
        el('td', 'col-name', state.countries[inv.tag]?.name ?? inv.tag),
        el('td', 'col-name', `${state.states[inv.target]?.name ?? inv.target} (${zoneName(inv.zone)})`),
        el('td', 'num', n0(inv.battalions)),
        el('td', 'num', String(inv.weeksLeft)),
      );
      const cell = el('td');
      if (editable && inv.tag === subject) cell.append(button('Recall', () => store.set(cancelInvasion(store.get(), subject, inv.id)), 'Bring the troops home.'));
      tr.append(cell);
      tbody.append(tr);
    }
    table.append(thead, tbody);
    wrap.append(table);
  }

  if (!editable) {
    if (atSea.length === 0) wrap.append(el('p', 'muted small', 'No troops at sea.'));
    return wrap;
  }
  if (atSea.some((i) => i.tag === subject)) return wrap;

  const targets = invasionTargets(state, subject, war.id).slice(0, 40);
  if (targets.length === 0) {
    wrap.append(el('p', 'muted small', navyOf(state, subject).flotillas < 1
      ? 'You need a fleet to land troops overseas.'
      : 'No enemy coastal state can be reached by sea.'));
    return wrap;
  }
  const free = freeBattalions(state, subject);
  const form = el('div', 'invasion-form');
  const select = el('select', 'invasion-target');
  for (const t of targets) {
    const opt = el('option', undefined, `${state.states[t.stateId]?.name ?? t.stateId} (${t.weeks} wk)`);
    opt.value = t.stateId;
    select.append(opt);
  }
  const info = el('p', 'muted small invasion-info');
  const describe = (): void => {
    const t = targets.find((x) => x.stateId === select.value);
    if (!t) return;
    const superior = t.escort >= t.enemyFleet;
    info.textContent = `${zoneName(t.zone)} · ${Math.round(t.km).toLocaleString()} km · fleet ${n0(t.escort)} vs ${n0(t.enemyFleet)}`
      + `${superior ? '' : ' (outgunned)'} · garrison ${n0(t.garrison)}`;
  };
  select.addEventListener('change', describe);
  describe();
  const share = el('select', 'invasion-share');
  for (const pct of [25, 50, 75]) {
    const opt = el('option', undefined, `${pct}% · ${n0((free * pct) / 100)} bn`);
    opt.value = String(pct);
    share.append(opt);
  }
  share.value = '50';
  const launch = button('Launch invasion', () => {
    const now = store.get();
    store.set(launchInvasion(now, subject, war.id, select.value, (freeBattalions(now, subject) * Number(share.value)) / 100));
  }, 'Embark troops; the fleet escorts them and must beat any enemy fleet before they can land.');
  launch.disabled = free < 1;
  form.append(select, info, share, launch);
  wrap.append(form);
  wrap.append(el('p', 'muted small', 'Escort = your fleet not assigned to raiding. Landings fight at 70% strength.'));
  return wrap;
}
