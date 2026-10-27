import { GOODS, GOOD_IDS } from '../../data/economy/goods';
import { IGS } from '../../data/politics/igs';
import { LAWS } from '../../data/politics/laws';
import { TECHS } from '../../data/politics/techs';
import { formatDate } from '../../sim/date';
import {
  alliesOf,
  freeInfluence,
  isGreatPower,
  prestigeOf,
  rankOf,
  subjectsOf,
} from '../../sim/diplomacy/queries';
import {
  countryEconomy,
  countryPopulation,
  gdp,
  marketOf,
} from '../../sim/economy/queries';
import { convoysAvailable, convoyNeed, navyOf } from '../../sim/navy/navy';
import { politicsOf } from '../../sim/politics/queries';
import type { GameState } from '../../sim/types';
import { armyOf, playsOf, warsOf } from '../../sim/war/queries';
import { formatCount, formatDelta, formatMoney, formatPercent } from '../format';
import type { PanelView, Store } from '../store';

type BriefingTone = 'critical' | 'warning' | 'opportunity' | 'stable';

export interface BriefingNotice {
  tone: BriefingTone;
  title: string;
  detail: string;
  view?: PanelView;
}

const TONE_LABEL: Record<BriefingTone, string> = {
  critical: 'Urgent',
  warning: 'Watch',
  opportunity: 'Action',
  stable: 'Clear',
};

const TONE_ORDER: Record<BriefingTone, number> = {
  critical: 0,
  warning: 1,
  opportunity: 2,
  stable: 3,
};

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

function metric(label: string, value: string, detail: string, tone: BriefingTone = 'stable'): HTMLElement {
  const card = el('div', `briefing-metric is-${tone}`);
  card.append(
    el('span', 'briefing-metric-label', label),
    el('strong', 'briefing-metric-value', value),
    el('span', 'briefing-metric-detail', detail),
  );
  return card;
}

function openView(store: Store, tag: string, view: PanelView): void {
  store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: view });
}

/**
 * Produces a compact, deterministic list of conditions that deserve the player's attention.
 * This is UI-only analysis: it never changes or caches simulation state.
 */
export function briefingNotices(state: GameState, tag: string): BriefingNotice[] {
  const notices: BriefingNotice[] = [];
  const economy = countryEconomy(state, tag);
  const market = marketOf(state, tag);
  const politics = politicsOf(state, tag);
  const army = armyOf(state, tag);
  const navy = navyOf(state, tag);
  const wars = warsOf(state, tag);
  const plays = playsOf(state, tag);

  if (economy) {
    const net = economy.lastIncome - economy.lastExpenses;
    if (net < 0) {
      const runway = economy.treasury > 0 ? economy.treasury / -net : 0;
      notices.push({
        tone: economy.treasury < 0 || runway < 12 ? 'critical' : 'warning',
        title: 'The treasury is shrinking',
        detail: runway > 0
          ? `${formatDelta(net)} per week leaves roughly ${Math.floor(runway)} weeks of reserves.`
          : `${formatDelta(net)} per week while the treasury is already below zero.`,
        view: 'auto',
      });
    }

    if (economy.queue.length === 0 && economy.constructionPoints > 0.5) {
      notices.push({
        tone: 'opportunity',
        title: 'Construction capacity is idle',
        detail: `${economy.constructionPoints.toFixed(1)} construction points per week are available for a new project.`,
        view: 'construction',
      });
    }
  }

  if (market) {
    const shortages = GOOD_IDS
      .filter((id) => market.demand[id] > 0.5 && market.buyFill[id] < 0.85)
      .sort((a, b) => market.buyFill[a] - market.buyFill[b] || a.localeCompare(b));
    if (shortages.length > 0) {
      const goods = shortages.slice(0, 3).map((id) => (
        `${GOODS[id].name} ${Math.round(market.buyFill[id] * 100)}%`
      ));
      notices.push({
        tone: shortages.some((id) => market.buyFill[id] < 0.6) ? 'critical' : 'warning',
        title: 'Market shortages are constraining buyers',
        detail: `${goods.join(', ')} demand met${shortages.length > 3 ? `, plus ${shortages.length - 3} more` : ''}.`,
        view: 'market',
      });
    }
  }

  if (politics) {
    if (politics.legitimacy < 50) {
      notices.push({
        tone: politics.legitimacy < 25 ? 'critical' : 'warning',
        title: 'Government legitimacy is weak',
        detail: `Legitimacy is ${Math.round(politics.legitimacy)}/100, slowing effective government.`,
        view: 'politics',
      });
    }

    if (!politics.researching) {
      notices.push({
        tone: 'opportunity',
        title: 'No technology is being researched',
        detail: `${politics.researchPoints.toFixed(1)} research points per week are waiting for a project.`,
        view: 'technology',
      });
    }

    const angry = Object.entries(politics.igs)
      .filter(([, ig]) => ig.approval <= -5 && ig.clout >= 0.05)
      .sort((a, b) => b[1].clout - a[1].clout || a[0].localeCompare(b[0]));
    if (angry.length > 0) {
      notices.push({
        tone: angry.some(([, ig]) => ig.clout >= 0.2) ? 'critical' : 'warning',
        title: 'Influential groups are angry',
        detail: angry.slice(0, 3).map(([id, ig]) => (
          `${IGS[id as keyof typeof IGS].name} ${Math.round(ig.clout * 100)}% clout`
        )).join(', '),
        view: 'politics',
      });
    }

    const radical = politics.movements
      .filter((movement) => movement.radicalism >= 50)
      .sort((a, b) => b.radicalism - a.radicalism || a.law.localeCompare(b.law));
    const movement = radical[0];
    if (movement) {
      notices.push({
        tone: movement.radicalism >= 75 ? 'critical' : 'warning',
        title: 'A political movement is radicalising',
        detail: `${IGS[movement.ig].name} demand ${LAWS[movement.law]?.name ?? movement.law} at ${Math.round(movement.radicalism)} radicalism.`,
        view: 'laws',
      });
    }
  }

  if (wars.length > 0) {
    if (army && !army.mobilized) {
      notices.push({
        tone: 'critical',
        title: 'The country is at war with an unmobilised army',
        detail: `${wars.length} active war${wars.length === 1 ? '' : 's'} require immediate military attention.`,
        view: 'war',
      });
    } else {
      const fronts = wars.reduce((total, war) => total + war.fronts.length, 0);
      notices.push({
        tone: 'warning',
        title: 'War is in progress',
        detail: `${wars.length} war${wars.length === 1 ? '' : 's'} and ${fronts} active land front${fronts === 1 ? '' : 's'}.`,
        view: 'war',
      });
    }
  }

  if (plays.length > 0) {
    const soonest = Math.min(...plays.map((play) => play.weeksLeft));
    notices.push({
      tone: soonest <= 4 ? 'critical' : 'warning',
      title: 'A diplomatic crisis is developing',
      detail: `${plays.length} diplomatic play${plays.length === 1 ? '' : 's'}; the nearest resolution is in ${soonest} week${soonest === 1 ? '' : 's'}.`,
      view: 'diplomacy',
    });
  }

  if (army && army.battalions > 0 && army.equipment < 0.75) {
    notices.push({
      tone: army.equipment < 0.5 ? 'critical' : 'warning',
      title: 'The army lacks equipment',
      detail: `${Math.round(army.equipment * 100)}% equipment coverage across ${Math.round(army.battalions)} battalions.`,
      view: 'war',
    });
  }

  if (navy.supply < 0.95) {
    notices.push({
      tone: navy.supply < 0.7 ? 'critical' : 'warning',
      title: 'Convoy capacity is insufficient',
      detail: `${Math.round(convoysAvailable(navy))} convoys are available for ${Math.round(convoyNeed(navy))} needed; supply is ${Math.round(navy.supply * 100)}%.`,
      view: 'navy',
    });
  }

  const diplomacy = state.diplomacy.countries[tag];
  const free = freeInfluence(state, tag);
  if (diplomacy && diplomacy.influence > 0 && free / diplomacy.influence >= 0.5 && diplomacy.improving.length === 0) {
    notices.push({
      tone: 'opportunity',
      title: 'Diplomatic influence is available',
      detail: `${free.toFixed(1)} of ${diplomacy.influence.toFixed(1)} influence can support alliances or improved relations.`,
      view: 'diplomacy',
    });
  }

  if (notices.length === 0) {
    notices.push({
      tone: 'stable',
      title: 'No urgent national issue detected',
      detail: 'Finances, politics, markets and military logistics are within the briefing thresholds.',
    });
  }

  return notices.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || a.title.localeCompare(b.title));
}

/** Renders the national summary and links every finding to an existing detailed panel. */
export function renderBriefingView(body: HTMLElement, state: GameState, store: Store, tag: string | null): void {
  const country = tag ? state.countries[tag] : undefined;
  if (!tag || !country) {
    body.append(el('p', 'muted', 'Select a country to open its strategic briefing.'));
    return;
  }

  const economy = countryEconomy(state, tag);
  const politics = politicsOf(state, tag);
  const army = armyOf(state, tag);
  const navy = navyOf(state, tag);
  const rank = rankOf(state, tag);
  const prestige = prestigeOf(state, tag);
  const net = economy ? economy.lastIncome - economy.lastExpenses : 0;

  const hero = el('div', 'briefing-hero');
  const swatch = el('span', 'swatch swatch-large');
  swatch.style.background = country.color;
  const heroCopy = el('div', 'briefing-hero-copy');
  heroCopy.append(
    el('span', 'briefing-eyebrow', `${formatDate(state.date)} intelligence summary`),
    el('h3', 'panel-name', country.name),
  );
  hero.append(swatch, heroCopy);
  body.append(hero);

  const metrics = el('div', 'briefing-metrics');
  metrics.append(
    metric('Population', formatCount(countryPopulation(state, tag)), `${formatMoney(gdp(state, tag))} GDP per week`),
    metric(
      'Treasury',
      economy ? formatMoney(economy.treasury) : '—',
      economy ? `${formatDelta(net)} per week` : 'No organised economy',
      economy && net < 0 ? 'warning' : 'stable',
    ),
    metric(
      'Government',
      politics ? `${Math.round(politics.legitimacy)} legitimacy` : '—',
      politics?.researching ? `Researching ${TECHS[politics.researching]?.name ?? politics.researching}` : 'No active research',
      politics && politics.legitimacy < 50 ? 'warning' : 'stable',
    ),
    metric(
      'World standing',
      rank > 0 ? `#${rank}${isGreatPower(state, tag) ? ' Great Power' : ''}` : 'Unranked',
      `${Math.round(prestige)} prestige`,
    ),
    metric(
      'Army',
      army ? `${Math.round(army.battalions)} battalions` : 'No standing army',
      army ? `${formatPercent(army.equipment)} equipped${army.mobilized ? ' · mobilised' : ''}` : 'No military command',
      army && army.equipment < 0.75 ? 'warning' : 'stable',
    ),
    metric(
      'Sea power',
      `${Math.round(navy.flotillas)} flotillas`,
      `${Math.round(convoysAvailable(navy))}/${Math.round(convoyNeed(navy))} available / needed convoys`,
      navy.supply < 0.95 ? 'warning' : 'stable',
    ),
  );
  body.append(metrics);

  const currentNotices = briefingNotices(state, tag);
  const heading = el('div', 'briefing-section-head');
  heading.append(
    el('h4', 'section-title', 'Strategic signals'),
    el('span', 'briefing-count', String(currentNotices.length)),
  );
  body.append(heading);

  const notices = el('div', 'briefing-notices');
  for (const notice of currentNotices) {
    const card = el('article', `briefing-notice is-${notice.tone}`);
    const head = el('div', 'briefing-notice-head');
    head.append(
      el('span', 'briefing-badge', TONE_LABEL[notice.tone]),
      el('h5', 'briefing-notice-title', notice.title),
    );
    card.append(head, el('p', 'briefing-notice-detail', notice.detail));
    const destination = notice.view;
    if (destination && destination !== 'overview') {
      const button = el('button', 'button-small briefing-open', 'Open');
      button.type = 'button';
      button.addEventListener('click', () => openView(store, tag, destination));
      card.append(button);
    }
    notices.append(card);
  }
  body.append(notices);

  body.append(el('h4', 'section-title', 'National position'));
  const position = el('div', 'briefing-position');
  position.append(
    el('span', undefined, `${alliesOf(state, tag).length} allies`),
    el('span', undefined, `${subjectsOf(state, tag).length} subjects`),
    el('span', undefined, `${warsOf(state, tag).length} wars`),
    el('span', undefined, `${playsOf(state, tag).length} crises`),
  );
  body.append(position);

  const actions = el('div', 'briefing-actions');
  const destinations: [string, PanelView][] = [
    ['Market', 'market'],
    ['Construction', 'construction'],
    ['Politics', 'politics'],
    ['Laws', 'laws'],
    ['Technology', 'technology'],
    ['Diplomacy', 'diplomacy'],
    ['War', 'war'],
    ['Navy', 'navy'],
  ];
  for (const [label, view] of destinations) {
    const button = el('button', 'button-secondary button-small', label);
    button.type = 'button';
    button.addEventListener('click', () => openView(store, tag, view));
    actions.append(button);
  }
  body.append(actions);
}
