import type { Speed, Store } from './store';

export interface KeyboardOptions {
  onClosePanel: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Global keyboard shortcuts: Space pause, 1-5 speed, Esc close, M map mode. */
export function installKeyboard(store: Store, options: KeyboardOptions): () => void {
  const handler = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return;

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
      store.setUi({ mapMode: mode === 'political' ? 'states' : 'political' });
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
