import uniqueId from 'lodash/uniqueId';
import { create } from 'zustand';

type Hook = (event: any, mark: string) => boolean;

interface Watcher {
  id: string;
  hook: Hook;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
}

interface SubscriptionState {
  watchers: {
    [path: string]: Watcher[];
  };
  track: (path: string, hook: Hook) => Promise<void>;
  remove: (path: string, id: string) => void;
}

const useSubscriptionState = create<SubscriptionState>((set, get) => ({
  watchers: {},
  track: (path, hook) =>
    new Promise((resolve, reject) => {
      set((draft) => {
        draft.watchers[path] = [
          ...(draft.watchers[path] || []),
          {
            id: uniqueId(),
            hook,
            resolve,
            reject,
          },
        ];
        return draft;
      });
    }),
  remove: (path, id) => {
    set((draft) => {
      draft.watchers[path] = (draft.watchers[path] || []).filter(
        (w) => w.id === id
      );
      return draft;
    });
  },
}));

export default useSubscriptionState;
