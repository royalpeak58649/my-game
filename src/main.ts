import './styles.css';

import worldTopo from './data/world.topo.json';
import statesJson from './data/states.json';
import countriesJson from './data/countries.json';

import { createGameState } from './sim/state';
import { withStartEconomy } from './sim/economy/start';
import { initPolitics } from './sim/politics/init';
import { initDiplomacy } from './sim/diplomacy/init';
import { initMilitary } from './sim/war/init';
import type { CountryDef, StateDef } from './sim/types';
import { Store } from './ui/store';
import { GameClock } from './ui/clock';
import { MapView } from './ui/map/MapView';
import { TopBar } from './ui/panels/TopBar';
import { SidePanel } from './ui/panels/SidePanel';
import { Tooltip } from './ui/Tooltip';
import { StartScreen } from './ui/StartScreen';
import { installKeyboard } from './ui/keyboard';
import { htmlLanguage, saveLanguage, translateText, translateTree } from './ui/i18n';
import { downloadGameSave, parseGameSave } from './ui/saveGame';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app container missing');

const states = statesJson as StateDef[];
const countries = countriesJson as Record<string, CountryDef>;

const store = new Store(
  initMilitary(initDiplomacy(initPolitics(withStartEconomy(createGameState(states, countries, null))))),
);
const clock = new GameClock(store);
// development hook for scripted UI checks (stripped from production builds)
if (import.meta.env.DEV) (window as unknown as { __store?: Store }).__store = store;

app.replaceChildren();
app.classList.add('app-root');

const mapHost = document.createElement('div');
mapHost.className = 'map-host';
app.appendChild(mapHost);

const map = new MapView(store, mapHost, worldTopo);

const loadInput = document.createElement('input');
loadInput.type = 'file';
loadInput.accept = '.json,application/json';
loadInput.hidden = true;
loadInput.setAttribute('aria-label', 'Load Game');
app.appendChild(loadInput);

const saveNotice = document.createElement('div');
saveNotice.className = 'save-notice';
saveNotice.setAttribute('role', 'status');
saveNotice.setAttribute('aria-live', 'polite');
app.appendChild(saveNotice);

let noticeTimer: number | null = null;
const showNotice = (source: string, error = false): void => {
  if (noticeTimer !== null) window.clearTimeout(noticeTimer);
  saveNotice.textContent = translateText(source, store.getUi().language);
  saveNotice.classList.toggle('is-error', error);
  saveNotice.classList.add('is-visible');
  noticeTimer = window.setTimeout(() => {
    saveNotice.classList.remove('is-visible');
    noticeTimer = null;
  }, 3000);
};

let startScreen: StartScreen;

const requestLoad = (): void => {
  loadInput.value = '';
  loadInput.click();
};

loadInput.addEventListener('change', () => {
  const file = loadInput.files?.[0];
  if (!file) return;
  void file.text().then((source) => {
    const next = parseGameSave(source, store.get());
    const capital = next.player ? next.countries[next.player]?.capital : undefined;
    store.setUi({ speed: 0 });
    store.set(next);
    map.reloadGameState();
    store.setUi({
      selectedStateId: capital ?? null,
      selectedCountryTag: next.player,
      hoveredStateId: null,
      panelView: next.player ? 'overview' : 'auto',
    });
    startScreen.hide();
    if (capital) map.focusState(capital);
    showNotice('Game loaded.');
  }).catch((error: unknown) => {
    console.error(error);
    showNotice('Could not load save.', true);
  });
});

const saveCurrentGame = (): void => {
  try {
    downloadGameSave(store.get());
    showNotice('Game saved.');
  } catch (error) {
    console.error(error);
    showNotice('Could not save game.', true);
  }
};

const topBar = new TopBar(store, {
  onPlayerClick: () => {
    const player = store.get().player;
    if (player) store.setUi({ selectedCountryTag: player, selectedStateId: null, panelView: 'overview' });
  },
  onSave: saveCurrentGame,
  onLoad: requestLoad,
});
app.appendChild(topBar.root);

const sidePanel = new SidePanel(store, {
  onFocusState: (stateId) => map.focusState(stateId),
});
app.appendChild(sidePanel.root);

const tooltip = new Tooltip(store, mapHost);

startScreen = new StartScreen(store.get(), {
  language: store.getUi().language,
  onLanguageChange: (language) => store.setUi({ language }),
  onLoad: requestLoad,
  onStart: (tag) => {
    const game = store.get();
    store.set({ ...game, player: tag });
    startScreen.hide();
    if (tag) {
      const capital = game.countries[tag]?.capital;
      if (capital) {
        store.setUi({ selectedStateId: capital, selectedCountryTag: tag });
        map.focusState(capital);
      }
    }
  },
});
app.appendChild(startScreen.root);

const renderLanguage = (): void => {
  const language = store.getUi().language;
  document.documentElement.lang = htmlLanguage(language);
  saveLanguage(language);
  translateTree(app, language);
};
const unsubscribeLanguageGame = store.subscribe(renderLanguage);
const unsubscribeLanguageUi = store.subscribeUi(renderLanguage);
renderLanguage();

const removeKeyboard = installKeyboard(store, {
  onClosePanel: () => sidePanel.close(),
  onPanMap: (screenX, screenY) => map.panBy(screenX, screenY),
});

// Keep the map in sync with simulation updates.
const unsubscribeGame = store.subscribe(() => map.invalidate());

// Expose a tiny debug handle for manual inspection in the console.
Object.assign(window, {
  __game1836: {
    store,
    map,
    dispose: () => {
      unsubscribeGame();
      unsubscribeLanguageGame();
      unsubscribeLanguageUi();
      if (noticeTimer !== null) window.clearTimeout(noticeTimer);
      removeKeyboard();
      tooltip.dispose();
      sidePanel.dispose();
      topBar.dispose();
      map.dispose();
      clock.dispose();
      startScreen.dispose();
      loadInput.remove();
      saveNotice.remove();
    },
  },
});
