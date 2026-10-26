import type { GameState } from '../sim/types';

export type MapMode = 'political' | 'population' | 'states' | 'diplomacy';

/** Which view the side panel shows. */
export type PanelView =
  | 'auto'
  | 'market'
  | 'construction'
  | 'politics'
  | 'laws'
  | 'technology'
  | 'diplomacy'
  | 'war';

/** Speed 0 = paused, 1..5 = weekly tick speeds. */
export type Speed = 0 | 1 | 2 | 3 | 4 | 5;

/** UI-only state, kept apart from the simulation state. */
export interface UiState {
  selectedStateId: string | null;
  selectedCountryTag: string | null;
  hoveredStateId: string | null;
  mapMode: MapMode;
  speed: Speed;
  /** 'auto' follows the selection (state → state view, country → country view). */
  panelView: PanelView;
}

export type Listener<T> = (value: T) => void;

function createUiState(): UiState {
  return {
    selectedStateId: null,
    selectedCountryTag: null,
    hoveredStateId: null,
    mapMode: 'political',
    speed: 0,
    panelView: 'auto',
  };
}

/**
 * Tiny observable store: holds the immutable simulation state plus a small
 * amount of UI-only state, each with its own subscription list.
 */
export class Store {
  private game: GameState;
  private ui: UiState = createUiState();
  private gameListeners = new Set<Listener<GameState>>();
  private uiListeners = new Set<Listener<UiState>>();

  constructor(initial: GameState) {
    this.game = initial;
  }

  get(): GameState {
    return this.game;
  }

  set(next: GameState): void {
    if (next === this.game) return;
    this.game = next;
    for (const fn of [...this.gameListeners]) fn(this.game);
  }

  subscribe(fn: Listener<GameState>): () => void {
    this.gameListeners.add(fn);
    return () => {
      this.gameListeners.delete(fn);
    };
  }

  getUi(): UiState {
    return this.ui;
  }

  /** Shallow-merges a patch into the UI state and notifies UI subscribers. */
  setUi(patch: Partial<UiState>): void {
    let changed = false;
    for (const key of Object.keys(patch) as (keyof UiState)[]) {
      const value = patch[key];
      if (value !== undefined && this.ui[key] !== value) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.ui = { ...this.ui, ...patch };
    for (const fn of [...this.uiListeners]) fn(this.ui);
  }

  subscribeUi(fn: Listener<UiState>): () => void {
    this.uiListeners.add(fn);
    return () => {
      this.uiListeners.delete(fn);
    };
  }
}
