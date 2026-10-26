import type { PanelView, Speed, Store } from './store';

export interface KeyboardOptions {
  onClosePanel: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Opens a politics view for the player's country (no-op for observers). */
function openPlayerView(store: Store, view: PanelView): void {
  const tag = store.get().player;
  if (!tag) return;
  store.setUi({ selectedCountryTag: tag, selectedStateId: null, panelView: view });
}

/** Global keyboard shortcuts: Space pause, 1-5 speed, Esc close, M cycles map mode,
 *  P politics, L laws, T technology, D diplomacy, W war. */
export function installKeyboard(store: Store, options: KeyboardOptions): () => void {
  const handler = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.code === 'Space') {
      event.preventDefault();
      const speed = store.getUi().speed;
      store.setUi({ speed: speed === 0 ? 1 : 0 });
      return;
    }

    if (event.key >= '1' && event.key <= '5') {
      const speed = Number(event.key) as Speed;
      store.setUi({ speed });
      return;
    }

    if (event.key === 'Escape') {
      options.onClosePanel();
      return;
    }

    if (event.key === 'm' || event.key === 'M') {
      const mode = store.getUi().mapMode;
      const order = ['political', 'diplomacy', 'population', 'states'] as const;
      const next = order[(order.indexOf(mode) + 1) % order.length] ?? 'political';
      store.setUi({ mapMode: next });
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'p') {
      openPlayerView(store, 'politics');
      return;
    }
    if (key === 'l') {
      openPlayerView(store, 'laws');
      return;
    }
    if (key === 't') {
      openPlayerView(store, 'technology');
      return;
    }
    if (key === 'd') {
      openPlayerView(store, 'diplomacy');
      return;
    }
    if (key === 'w') {
      openPlayerView(store, 'war');
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
