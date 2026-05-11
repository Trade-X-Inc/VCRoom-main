import { useSyncExternalStore } from "react";
function createStore(initial) {
  let state = initial;
  const listeners = /* @__PURE__ */ new Set();
  return {
    get: () => state,
    set: (updater) => {
      state = updater(state);
      listeners.forEach((l) => l());
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    }
  };
}
const profileStore = createStore(null);
const participantsStore = createStore([]);
const qaStore = createStore([]);
const generatedNdaDocsStore = createStore([]);
function useStore(s) {
  return useSyncExternalStore(s.subscribe, s.get, s.get);
}
const useProfile = () => useStore(profileStore);
const useGeneratedNdaDocs = () => useStore(generatedNdaDocsStore);
export {
  useGeneratedNdaDocs as a,
  participantsStore as p,
  qaStore as q,
  useProfile as u
};
