import { useEffect, useSyncExternalStore } from "react";
import { CloudStore, decodeCloudRow, engineVersion } from "./cloudStore";

let store: CloudStore | undefined;
function getStore() {
  if (!store) store = new CloudStore(window.localStorage, {
    async identify(owner) {
      const { supabase } = await import("./supabase");
      const session = await supabase.auth.getSession();
      if (session.error) throw session.error;
      if (session.data.session) return session.data.session.user.id;
      if (owner) throw new Error("session-lost");
      const result = await supabase.auth.signInAnonymously();
      if (result.error) throw result.error;
      return result.data.user!.id;
    },
    async load() {
      const { supabase } = await import("./supabase");
      const { data, error } = await supabase.from("reflection_maps").select("revision,reflections,engine_version").maybeSingle();
      if (error) throw error;
      return decodeCloudRow(data);
    },
    async save(revision, reflections, output) {
      const { supabase } = await import("./supabase");
      const { data, error } = await supabase.rpc("save_reflection_map", {
        expected_revision: revision, new_reflections: reflections, new_output: output, new_engine_version: engineVersion,
      });
      if (error) throw error;
      return data as number | null;
    },
  });
  return store;
}

export function useCloudReflections() {
  const current = getStore();
  const snapshot = useSyncExternalStore(current.subscribe, current.getSnapshot);
  useEffect(() => {
    current.start();
    const refresh = () => current.retry();
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    const changed = (event: StorageEvent) => { if (event.key === "locus-cloud-map-v1") refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener("storage", changed);
    document.addEventListener("visibilitychange", visible);
    return () => {
      current.stop();
      window.removeEventListener("online", refresh);
      window.removeEventListener("storage", changed);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [current]);
  return { ...snapshot, setReflections: current.update, retrySync: current.retry };
}
