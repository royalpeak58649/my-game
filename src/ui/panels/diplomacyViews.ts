// Diplomacy and war views for the side panel. Pure rendering: every button
// dispatches a command from src/sim/diplomacy/commands.ts or src/sim/war/commands.ts
// through the store. See docs/WAR.md for the rules behind the numbers shown here.

import {
  breakAlliance,
  proposeAlliance,
  setImproving,
  setRival,
} from '../../sim/diplomacy/commands';
import {
  allianceAcceptance,
  alliesOf,
  isGreatPower,
  overlordOf,
  rankOf,
  relationsOf,
  subjectsOf,
} from '../../sim/diplomacy/queries';
import { pairKey } from '../../sim/diplomacy/pair';
import {
  armyOf,
  armyStrength,
  isAtWar,
  playSideStrength,
  playsOf,
  possibleWarGoals,
  sideOf,
  warsOf,
} from '../../sim/war/queries';
import { backDown, capitulate, joinPlay, offerWhitePeace, setMobilized, startPlay } from '../../sim/war/commands';
import type { DiplomaticPlay, PlaySide, War, WarGoal, WarSide } from '../../sim/diplomacy/types';
import type { GameState } from '../../sim/types';
import { formatCount } from '../format';
import { invasionSection, zoneName } from './navyViews';
import type { Store } from '../store';

const MINUS = '\u2212';
const MAX_PLAY_GOALS = 3;

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

function sectionTitle(text: string): HTMLElement {
  return el('h4', 'section-title', text);
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

/** Signed number with a true minus sign: 3 → "+3", −2 → "−2", 0 → "0". */
function formatSigned(value: number, digits = 0): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : MINUS}${Math.abs(rounded).toFixed(digits)}`;
}

function countryName(game: GameState, tag: string): string {
  return game.countries[tag]?.name ?? tag;
}

function countryColor(game: GameState, tag: string): string {
  return game.countries[tag]?.color ?? '#d9d0b8';
}

function prestigeOf(game: GameState, tag: string): number {
  return game.diplomacy.countries[tag]?.prestige ?? 0;
}

/** Colored dot + country name. */
function countryLabel(game: GameState, tag: string): HTMLElement {
  const wrap = el('span', 'ig-label');
  const dot = el('span', 'ig-dot');
  dot.style.background = countryColor(game, tag);
  wrap.append(dot, el('span', 'ig-name', countryName(game, tag)));
  return wrap;
}

/** −100..100 relations bar, centered on zero. */
function relationsBar(value: number): HTMLElement {
  const clamped = Math.max(-100, Math.min(100, value));
  const track = el('span', 'bar bar-relations');
  const fill = el('span', `bar-fill ${clamped > 0 ? 'is-positive' : clamped < 0 ? 'is-negative' : 'is-neutral'}`);
  const half = Math.abs(clamped) / 200;
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

/** −100..100 war score bar, centered on zero (positive favours the attackers). */
function warScoreBar(score: number): HTMLElement {
  const clamped = Math.max(-100, Math.min(100, score));
  const track = el('span', 'bar bar-warscore');
  const fill = el('span', `bar-fill ${clamped >= 0 ? 'is-attacker' : 'is-defender'}`);
  const half = Math.abs(clamped) / 200;
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

/** 0..100 exhaustion bar. */
function exhaustionBar(value: number): HTMLElement {
  const track = el('span', 'bar bar-exhaustion');
  const fill = el('span', 'bar-fill');
  const pct = Math.max(0, Math.min(1, value / 100));
  fill.style.width = `${(pct * 100).toFixed(1)}%`;
  fill.classList.add(value >= 70 ? 'is-low' : value >= 40 ? 'is-mid' : 'is-good');
  track.append(fill);
  return track;
}

function chip(text: string, tone: string, title?: string): HTMLElement {
  const node = el('span', `dip-chip ${tone}`, text);
  if (title) node.title = title;
  return node;
}

function button(label: string, onClick: () => void, title?: string): HTMLButtonElement {
  const node = el('button', 'button-secondary button-small', label);
  node.type = 'button';
  if (title) node.title = title;
  node.addEventListener('click', onClick);
  return node;
}

function goalLabel(game: GameState, goal: WarGoal): string {
  if (goal.kind === 'humiliate') return 'Humiliate';
  if (goal.kind === 'make_subject') return 'Make subject';
  const stateName = goal.stateId ? (game.states[goal.stateId]?.name ?? goal.stateId) : '?';
  return `Take ${stateName}`;
}

function goalDescription(game: GameState, goal: WarGoal): string {
  if (goal.kind === 'humiliate') {
    return `${countryName(game, goal.holder)} humiliates ${countryName(game, goal.target)} (prestige).`;
  }
  if (goal.kind === 'make_subject') {
    return `${countryName(game, goal.target)} becomes a subject of ${countryName(game, goal.holder)}.`;
  }
  const stateName = goal.stateId ? (game.states[goal.stateId]?.name ?? goal.stateId) : '?';
  return `${countryName(game, goal.holder)} annexes ${stateName} from ${countryName(game, goal.target)}.`;
}

function goalKey(goal: WarGoal): string {
  return `${goal.kind}:${goal.holder}:${goal.target}:${goal.stateId ?? ''}`;
}

function sideLabel(side: WarSide): string {
  return side === 'attackers' ? 'Attackers' : 'Defenders';
}

function playSideLabel(side: PlaySide): string {
  return side === 'initiator' ? 'Initiator' : 'Target';
}

function playLeader(play: DiplomaticPlay, side: PlaySide): string {
  return side === 'initiator' ? play.initiator : play.target;
}

function playSideTags(play: DiplomaticPlay, side: PlaySide): string[] {
  return [playLeader(play, side), ...play.supporters[side]];
}

function warSideTags(war: War, side: WarSide): string[] {
  return side === 'attackers' ? war.attackers : war.defenders;
}

function warLeader(war: War, side: WarSide): string | null {
  return warSideTags(war, side)[0] ?? null;
}

function truceWeeks(game: GameState, a: string, b: string): number {
  return game.diplomacy.truces[pairKey(a, b)] ?? 0;
}

function isRival(game: GameState, tag: string, target: string): boolean {
  return game.diplomacy.countries[tag]?.rivals.includes(target) ?? false;
}

function isImproving(game: GameState, tag: string, target: string): boolean {
  return game.diplomacy.countries[tag]?.improving.includes(target) ?? false;
}

function isAllied(game: GameState, a: string, b: string): boolean {
  return alliesOf(game, a).includes(b);
}

function playOf(game: GameState, tag: string): DiplomaticPlay | undefined {
  return playsOf(game, tag)[0];
}

function strengthLabel(value: number): string {
  return value.toFixed(1);
}

// ---------------------------------------------------------------- diplomacy

/** Diplomacy view: foreign country dossier, or the player's own diplomatic situation. */
export function renderDiplomacyView(
  container: HTMLElement,
  state: GameState,
  store: Store,
  tag: string | null,
  selected: string | null,
): void {
  const player = state.player;
  const target = selected ?? tag ?? player;
  if (!target || !state.countries[target]) {
    container.append(el('p', 'muted', 'Select a country to see its diplomacy.'));
    return;
  }

  if (player && target === player) {
    renderOwnDiplomacy(container, state, store, player);
    return;
  }
  renderForeignDiplomacy(container, state, store, target, player);
}

function renderForeignDiplomacy(
  container: HTMLElement,
  state: GameState,
  store: Store,
  target: string,
  player: string | null,
): void {
  const heading = el('div', 'panel-heading');
  const swatch = el('span', 'swatch swatch-large');
  swatch.style.background = countryColor(state, target);
  heading.append(swatch, el('h3', 'panel-name', countryName(state, target)));
  container.append(heading);

  const rows = el('dl', 'detail-list');
  rows.append(detailRow('Prestige', `${Math.round(prestigeOf(state, target))} · #${rankOf(state, target)}`));
  rows.append(detailRow('Army', `${formatCount(armyOf(state, target)?.battalions ?? 0)} battalions`));
  if (player) {
    rows.append(detailRow('Their army strength', strengthLabel(armyStrength(state, target))));
    rows.append(detailRow('Your army strength', strengthLabel(armyStrength(state, player))));
  }
  container.append(rows);

  if (!player) {
    container.append(el('p', 'muted small readonly-note', 'Read-only: you are observing this country.'));
    return;
  }

  // --- relations
  const relations = relationsOf(state, player, target);
  const relationsBlock = el('div', 'relations-block');
  const relationsHead = el('div', 'relations-head');
  relationsHead.append(el('span', 'relations-label', 'Relations'));
  const tone = relations > 20 ? 'is-positive' : relations < -20 ? 'is-negative' : 'is-neutral';
  relationsHead.append(el('span', `relations-value ${tone}`, formatSigned(relations)));
  relationsBlock.append(relationsHead, relationsBar(relations));
  container.append(relationsBlock);

  // --- status chips
  const chips = el('div', 'dip-chips');
  const allied = isAllied(state, player, target);
  const rival = isRival(state, player, target);
  const rivalBack = isRival(state, target, player);
  const overlord = overlordOf(state, target);
  const playerOverlord = overlordOf(state, player);
  const atWar = isAtWar(state, player, target);
  const truce = truceWeeks(state, player, target);
  const greatPower = isGreatPower(state, target);

  if (allied) chips.append(chip('Ally', 'is-ally', 'You are allied.'));
  if (rival) chips.append(chip('Rival', 'is-rival', 'You consider them a rival.'));
  if (rivalBack) chips.append(chip('Rival of you', 'is-rival', 'They consider you a rival.'));
  if (overlord) chips.append(chip(`Subject of ${countryName(state, overlord)}`, 'is-subject'));
  if (playerOverlord === target) chips.append(chip('Your overlord', 'is-overlord'));
  if (atWar) chips.append(chip('At war', 'is-war', 'You are at war with this country.'));
  if (truce > 0) chips.append(chip(`Truce ${truce}w`, 'is-truce', `${truce} weeks of truce left.`));
  if (greatPower) chips.append(chip('Great Power', 'is-gp', 'One of the great powers of the world.'));
  if (chips.childElementCount === 0) chips.append(el('span', 'muted small', 'No formal ties.'));
  container.append(chips);

  // --- actions
  container.append(sectionTitle('Actions'));
  const actions = el('div', 'dip-actions');

  const improving = isImproving(state, player, target);
  const improveButton = button(
    improving ? 'Stop improving relations' : 'Improve relations',
    () => store.set(setImproving(store.get(), player, target, !improving)),
    improving ? 'Stop spending influence on this country.' : 'Spend 1 influence per week to raise relations.',
  );
  improveButton.classList.toggle('is-active', improving);
  actions.append(improveButton);

  const acceptance = allianceAcceptance(state, player, target);
  const proposeButton = button(
    'Propose alliance',
    () => store.set(proposeAlliance(store.get(), player, target)),
    acceptance.accepts ? 'They are likely to accept.' : acceptance.reasons.join('\n'),
  );
  proposeButton.disabled = !acceptance.accepts || allied;
  if (allied) proposeButton.title = 'You are already allied.';
  actions.append(proposeButton);

  if (allied) {
    actions.append(
      button('Break alliance', () => store.set(breakAlliance(store.get(), player, target)), 'Relations −20.'),
    );
  }

  actions.append(
    button(
      rival ? 'Remove rival' : 'Declare rival',
      () => store.set(setRival(store.get(), player, target, !rival)),
      rival ? 'Stop treating them as a rival.' : 'At most 3 rivals; breaks any alliance with them.',
    ),
  );
  container.append(actions);

  if (!acceptance.accepts && !allied) {
    const reasons = el('ul', 'dip-reasons');
    for (const reason of acceptance.reasons) reasons.append(el('li', undefined, reason));
    container.append(reasons);
  }

  // --- diplomatic play
  renderPlayLauncher(container, state, store, player, target);
}

function renderPlayLauncher(
  container: HTMLElement,
  state: GameState,
  store: Store,
  player: string,
  target: string,
): void {
  const goals = possibleWarGoals(state, player, target);
  const existing = playOf(state, player);
  const atWar = isAtWar(state, player, target);
  const truce = truceWeeks(state, player, target);

  container.append(sectionTitle('Diplomatic play'));
  if (goals.length === 0) {
    container.append(el('p', 'muted small', 'No war goals are possible against this country.'));
    return;
  }
  if (existing) {
    container.append(
      el('p', 'muted small', `You are already in a play against ${countryName(state, existing.target)}.`),
    );
    return;
  }
  if (atWar) {
    container.append(el('p', 'muted small', 'You are at war with this country.'));
    return;
  }
  if (truce > 0) {
    container.append(el('p', 'muted small', `A truce with this country lasts ${truce} more weeks.`));
    return;
  }

  const toggle = button('Diplomatic play…', () => {
    form.hidden = !form.hidden;
  }, 'Choose up to three war goals and start a play.');
  toggle.classList.add('dip-play-toggle');
  container.append(toggle);

  const form = el('div', 'dip-play-form');
  form.hidden = true;

  const chosen = new Set<string>();
  const list = el('div', 'dip-goal-list');
  const startButton = button('Start play', () => {
    const picked = goals.filter((goal) => chosen.has(goalKey(goal)));
    if (picked.length === 0) return;
    store.set(startPlay(store.get(), player, target, picked));
  }, 'Start a diplomatic play; it resolves in a few weeks.');
  startButton.disabled = true;

  const refresh = (): void => {
    startButton.disabled = chosen.size === 0;
    startButton.title =
      chosen.size === 0
        ? 'Pick at least one war goal.'
        : `Start a play with ${chosen.size} goal${chosen.size === 1 ? '' : 's'}.`;
  };

  for (const goal of goals) {
    const key = goalKey(goal);
    const row = el('label', 'dip-goal');
    const input = el('input', 'ig-checkbox');
    input.type = 'checkbox';
    input.addEventListener('change', () => {
      if (input.checked) {
        if (chosen.size >= MAX_PLAY_GOALS) {
          input.checked = false;
          return;
        }
        chosen.add(key);
      } else {
        chosen.delete(key);
      }
      refresh();
    });
    const text = el('span', 'dip-goal-label', goalLabel(state, goal));
    text.title = goalDescription(state, goal);
    row.append(input, text);
    list.append(row);
  }

  form.append(list, el('p', 'muted small', `Up to ${MAX_PLAY_GOALS} goals.`), startButton);
  refresh();
  container.append(form);
}

function renderOwnDiplomacy(container: HTMLElement, state: GameState, store: Store, player: string): void {
  const heading = el('div', 'panel-heading');
  const swatch = el('span', 'swatch swatch-large');
  swatch.style.background = countryColor(state, player);
  heading.append(swatch, el('h3', 'panel-name', `${countryName(state, player)} Diplomacy`));
  container.append(heading);

  const diplomacy = state.diplomacy.countries[player];
  const rows = el('dl', 'detail-list');
  rows.append(detailRow('Prestige', `${Math.round(prestigeOf(state, player))} · #${rankOf(state, player)}`));
  if (diplomacy) {
    rows.append(detailRow('Influence', `${diplomacy.influenceUsed} / ${diplomacy.influence} used`));
  }
  rows.append(detailRow('Army strength', strengthLabel(armyStrength(state, player))));
  container.append(rows);

  if (diplomacy) {
    const influenceBlock = el('div', 'influence-block');
    const influenceHead = el('div', 'relations-head');
    influenceHead.append(el('span', 'relations-label', 'Influence'));
    influenceHead.append(
      el('span', 'relations-value', `${diplomacy.influenceUsed} / ${diplomacy.influence}`),
    );
    influenceBlock.append(influenceHead);
    const track = el('span', 'bar bar-ratio');
    const fill = el('span', 'bar-fill is-brass');
    const pct = diplomacy.influence > 0 ? Math.min(1, diplomacy.influenceUsed / diplomacy.influence) : 0;
    fill.style.width = `${(pct * 100).toFixed(1)}%`;
    track.append(fill);
    influenceBlock.append(track);
    container.append(influenceBlock);
  }

  const allies = alliesOf(state, player);
  const subjects = subjectsOf(state, player);
  const rivals = diplomacy?.rivals ?? [];
  const improving = diplomacy?.improving ?? [];
  const overlord = overlordOf(state, player);

  container.append(sectionTitle('Allies'));
  container.append(countryChipList(state, store, allies, 'No allies.'));

  container.append(sectionTitle('Subjects'));
  container.append(countryChipList(state, store, subjects, 'No subjects.'));

  container.append(sectionTitle('Rivals'));
  container.append(countryChipList(state, store, rivals, 'No rivals declared.'));

  container.append(sectionTitle('Improving relations'));
  container.append(countryChipList(state, store, improving, 'Not improving relations with anyone.'));

  if (overlord) {
    container.append(sectionTitle('Overlord'));
    container.append(countryChipList(state, store, [overlord], '—'));
  }

  // --- active plays
  const plays = playsOf(state, player);
  container.append(sectionTitle('Diplomatic plays'));
  if (plays.length === 0) {
    container.append(el('p', 'muted small', 'No diplomatic play is under way.'));
  }
  for (const play of plays) container.append(playCard(state, store, player, play));

  // --- wars
  const wars = warsOf(state, player);
  container.append(sectionTitle('Wars'));
  if (wars.length === 0) {
    container.append(el('p', 'muted small', 'You are at peace.'));
  }
  for (const war of wars) {
    const row = el('div', 'dip-war-row');
    row.append(el('span', 'dip-war-name', war.name));
    row.append(
      button('Open war', () => store.setUi({ selectedCountryTag: player, selectedStateId: null, panelView: 'war' }), 'Open the war view (Shift+W).'),
    );
    container.append(row);
  }
}

function countryChipList(
  state: GameState,
  store: Store,
  tags: string[],
  emptyText: string,
): HTMLElement {
  const wrap = el('div', 'dip-chips');
  if (tags.length === 0) {
    wrap.append(el('span', 'muted small', emptyText));
    return wrap;
  }
  for (const tag of tags) {
    const node = el('button', 'dip-country-chip');
    node.type = 'button';
    node.title = `Open ${countryName(state, tag)}`;
    node.append(countryLabel(state, tag));
    node.addEventListener('click', () => {
      store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: 'diplomacy' });
    });
    wrap.append(node);
  }
  return wrap;
}

function playCard(state: GameState, store: Store, player: string, play: DiplomaticPlay): HTMLElement {
  const card = el('div', 'play-card');
  const head = el('div', 'play-head');
  head.append(
    el(
      'span',
      'play-title',
      `${countryName(state, play.initiator)} vs ${countryName(state, play.target)}`,
    ),
  );
  head.append(el('span', 'play-weeks', `${play.weeksLeft}w left`));
  card.append(head);

  const goals = el('div', 'play-goals');
  for (const goal of play.goals) {
    const node = el('span', 'dip-chip is-goal', goalLabel(state, goal));
    node.title = goalDescription(state, goal);
    goals.append(node);
  }
  card.append(goals);

  const sides: PlaySide[] = ['initiator', 'target'];
  for (const side of sides) {
    const row = el('div', 'play-side');
    const leader = playLeader(play, side);
    const supporters = play.supporters[side];
    const names = [countryName(state, leader), ...supporters.map((t) => countryName(state, t))];
    row.append(el('span', 'play-side-name', `${playSideLabel(side)}: ${names.join(', ')}`));
    row.append(el('span', 'play-side-strength', strengthLabel(playSideStrength(state, play, side))));
    card.append(row);
  }

  const actions = el('div', 'dip-actions');
  const isLeader = playLeader(play, 'initiator') === player || playLeader(play, 'target') === player;
  const onSide = playSideTags(play, 'initiator').includes(player) || playSideTags(play, 'target').includes(player);

  if (isLeader) {
    actions.append(
      button('Back down', () => store.set(backDown(store.get(), player, play.id)), 'Concede the play; a truce follows.'),
    );
  } else if (!onSide) {
    for (const side of sides) {
      actions.append(
        button(
          `Join ${playSideLabel(side).toLowerCase()}`,
          () => store.set(joinPlay(store.get(), player, play.id, side)),
          `Support ${countryName(state, playLeader(play, side))}.`,
        ),
      );
    }
  }
  if (actions.childElementCount > 0) card.append(actions);
  return card;
}

// ---------------------------------------------------------------------- war

/** War view: every war the player (or the selected country) takes part in. */
export function renderWarView(container: HTMLElement, state: GameState, store: Store, tag: string | null): void {
  const player = state.player;
  const subject = tag ?? player;
  if (!subject || !state.countries[subject]) {
    container.append(el('p', 'muted', 'Select a country to see its wars.'));
    return;
  }

  const heading = el('div', 'panel-heading');
  const swatch = el('span', 'swatch swatch-large');
  swatch.style.background = countryColor(state, subject);
  heading.append(swatch, el('h3', 'panel-name', `${countryName(state, subject)} Wars`));
  container.append(heading);

  const wars = warsOf(state, subject);
  if (wars.length === 0) {
    container.append(el('p', 'muted', 'This country is at peace.'));
    return;
  }

  for (const war of wars) container.append(warCard(state, store, subject, war));
}

function warCard(state: GameState, store: Store, subject: string, war: War): HTMLElement {
  const card = el('div', 'war-card');

  const head = el('div', 'war-head');
  head.append(el('h4', 'war-name', war.name));
  const ownSide = sideOf(war, subject);
  if (ownSide) head.append(el('span', 'dip-chip is-war', sideLabel(ownSide)));
  card.append(head);

  // --- sides
  const sides = el('div', 'war-sides');
  for (const side of ['attackers', 'defenders'] as WarSide[]) {
    const row = el('div', 'war-side');
    row.append(el('span', 'war-side-label', sideLabel(side)));
    const tags = warSideTags(war, side);
    row.append(el('span', 'war-side-tags', tags.map((t) => countryName(state, t)).join(', ')));
    sides.append(row);
  }
  card.append(sides);

  // --- war score
  const scoreBlock = el('div', 'war-score-block');
  const scoreHead = el('div', 'relations-head');
  scoreHead.append(el('span', 'relations-label', 'War score'));
  scoreHead.append(el('span', 'relations-value', formatSigned(war.warScore)));
  scoreBlock.append(scoreHead, warScoreBar(war.warScore));
  scoreBlock.append(el('p', 'muted small', 'Positive favours the attackers.'));
  card.append(scoreBlock);

  // --- exhaustion
  const exhaustion = el('div', 'war-exhaustion');
  for (const side of ['attackers', 'defenders'] as WarSide[]) {
    const row = el('div', 'war-exhaustion-row');
    row.append(el('span', 'war-exhaustion-label', `${sideLabel(side)} exhaustion`));
    row.append(exhaustionBar(war.exhaustion[side]));
    row.append(el('span', 'war-exhaustion-value', String(Math.round(war.exhaustion[side]))));
    exhaustion.append(row);
  }
  card.append(exhaustion);

  // --- goals
  const goals = el('div', 'play-goals');
  for (const goal of war.goals) {
    const node = el('span', 'dip-chip is-goal', goalLabel(state, goal));
    node.title = goalDescription(state, goal);
    goals.append(node);
  }
  if (goals.childElementCount === 0) goals.append(el('span', 'muted small', 'No war goals.'));
  card.append(goals);

  // --- mobilisation
  const army = armyOf(state, subject) ?? { battalions: 0, mobilized: false, equipment: 1, generals: [] };
  const actions = el('div', 'dip-actions');
  const mobilizeButton = button(
    army.mobilized ? 'Demobilise' : 'Mobilise',
    () => store.set(setMobilized(store.get(), subject, !army.mobilized)),
    army.mobilized ? 'Send the conscripts home.' : 'Call up conscripts (more battalions, higher upkeep).',
  );
  mobilizeButton.classList.toggle('is-active', army.mobilized);
  actions.append(mobilizeButton);
  card.append(actions);

  // --- fronts
  card.append(sectionTitle('Fronts'));
  const fronts = war.fronts.filter((front) => front.attacker === subject || front.defender === subject);
  const shownFronts = fronts.length > 0 ? fronts : war.fronts;
  if (shownFronts.length === 0) {
    card.append(el('p', 'muted small', 'No fronts: the armies do not share a border. Land troops from the sea to open one.'));
  } else {
    const table = el('table', 'data-table war-fronts');
    const thead = el('thead');
    const headRow = el('tr');
    for (const label of ['Front', 'Att.', 'Def.', 'Generals']) headRow.append(el('th', undefined, label));
    thead.append(headRow);
    const tbody = el('tbody');
    for (const front of shownFronts) {
      const row = el('tr');
      row.append(el('td', 'col-name', front.id));
      row.append(el('td', 'num', String(Math.round(front.attackerBattalions))));
      row.append(el('td', 'num', String(Math.round(front.defenderBattalions))));
      const generals = [front.attackerGeneral ?? '—', front.defenderGeneral ?? '—'].join(' / ');
      row.append(el('td', 'col-generals', generals));
      tbody.append(row);
    }
    table.append(thead, tbody);
    card.append(table);
  }

  card.append(invasionSection(state, store, subject, war));

  // --- battles
  card.append(sectionTitle('Last battles'));
  if (war.battles.length === 0) {
    card.append(el('p', 'muted small', 'No battles yet.'));
  } else {
    const table = el('table', 'data-table war-battles');
    const thead = el('thead');
    const headRow = el('tr');
    for (const label of ['Tick', 'Front', 'Result', 'State']) headRow.append(el('th', undefined, label));
    thead.append(headRow);
    const tbody = el('tbody');
    for (const battle of war.battles.slice(0, 6)) {
      const row = el('tr');
      row.append(el('td', 'num', String(battle.tick)));
      const where = battle.kind === 'naval' ? `⚓ ${zoneName(battle.front)}` : battle.kind === 'landing' ? `Landing · ${zoneName(battle.front)}` : battle.front;
      row.append(el('td', 'col-name', where));
      const won = battle.won ? 'Won' : 'Lost';
      const cell = el('td', `battle-result ${battle.won ? 'is-positive' : 'is-negative'}`, `${battle.attackingSide === 'attackers' ? 'Att.' : 'Def.'} ${won.toLowerCase()}`);
      cell.title = `${sideLabel(battle.attackingSide)} attacked and ${won.toLowerCase()} (losses ${battle.attackerLosses.toFixed(1)} / ${battle.defenderLosses.toFixed(1)} bn)`;
      row.append(cell);
      const stateName = battle.stateId ? (state.states[battle.stateId]?.name ?? battle.stateId) : '—';
      row.append(el('td', 'col-name', stateName));
      tbody.append(row);
    }
    table.append(thead, tbody);
    card.append(table);
  }

  // --- peace
  const isLeader = ownSide !== null && warLeader(war, ownSide) === subject;
  const peace = el('div', 'dip-actions');
  const whitePeace = button(
    'Offer white peace',
    () => store.set(offerWhitePeace(store.get(), subject, war.id)),
    isLeader ? 'End the war with no gains for either side.' : 'Only the leader of your side can negotiate.',
  );
  whitePeace.disabled = !isLeader;
  const capitulateButton = button(
    'Capitulate',
    () => store.set(capitulate(store.get(), subject, war.id)),
    isLeader ? 'Accept the enemy war goals.' : 'Only the leader of your side can capitulate.',
  );
  capitulateButton.disabled = !isLeader;
  capitulateButton.classList.add('is-danger');
  peace.append(whitePeace, capitulateButton);
  card.append(peace);

  return card;
}
