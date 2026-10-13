import { useEffect, useSyncExternalStore } from "react";
import { LocalStore, localMapKey } from "./localStore";
import { trackAction } from "./activity";

let store: LocalStore | undefined;
function getStore() {
  if (!store) store = new LocalStore({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  });
  return store;
}
export function useLocalReflections() {
  const current = getStore();
  const snapshot = useSyncExternalStore(current.subscribe, current.getSnapshot);
  useEffect(() => {
    current.persist();
    trackAction("exercise_started");
    const changed = (event: StorageEvent) => { if (event.key === localMapKey) current.refresh(); };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [current]);
  return { ...snapshot, setReflections: current.update, retrySave: current.persist };
}
