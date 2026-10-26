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

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app container missing');

const states = statesJson as StateDef[];
const countries = countriesJson as Record<string, CountryDef>;

const store = new Store(
  initMilitary(initDiplomacy(initPolitics(withStartEconomy(createGameState(states, countries, null))))),
);
const clock = new GameClock(store);

app.replaceChildren();
app.classList.add('app-root');

const mapHost = document.createElement('div');
mapHost.className = 'map-host';
app.appendChild(mapHost);

const map = new MapView(store, mapHost, worldTopo);

const topBar = new TopBar(store, () => {
  const player = store.get().player;
  if (player) store.setUi({ selectedCountryTag: player, selectedStateId: null });
});
app.appendChild(topBar.root);

const sidePanel = new SidePanel(store, {
  onFocusState: (stateId) => map.focusState(stateId),
});
app.appendChild(sidePanel.root);

const tooltip = new Tooltip(store, mapHost);

const startScreen = new StartScreen(store.get(), {
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

const removeKeyboard = installKeyboard(store, {
  onClosePanel: () => sidePanel.close(),
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
      removeKeyboard();
      tooltip.dispose();
      sidePanel.dispose();
      topBar.dispose();
      map.dispose();
      clock.dispose();
      startScreen.dispose();
    },
  },
});
