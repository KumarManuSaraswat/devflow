import { useCallback, useEffect, useRef, useState } from "react";
import { resourceCache } from "../utils/resourceCache";

// A single cancellable request at a time. Pause hidden/offline tabs and back off on errors.
// load/merge must be stable callbacks. Key the consuming component when changing its scope.
export default function usePollingResource(load, { interval = 10000, merge, cacheKey } = {}) {
  const [data, setData] = useState(() => cacheKey ? resourceCache.read(cacheKey) : null);
  const [error, setError] = useState(() => navigator.onLine ? null : { message: "You're offline. Reconnect to load updates.", denied: false });
  const value = useRef(data);
  const active = useRef(false);
  const request = useRef(null);
  const mutate = useCallback(update => {
    value.current = typeof update === "function" ? update(value.current) : update;
    if (cacheKey) resourceCache.write(cacheKey, value.current);
    setData(value.current);
  }, [cacheKey]);
  const refresh = useCallback(async () => {
    if (!active.current) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const ticket = resourceCache.ticket();
    try {
      const incoming = await load(controller.signal, value.current);
      if (controller.signal.aborted || !active.current) return;
      // A mutation or account transition occurred while this read was in flight.
      if (ticket !== resourceCache.ticket()) return { hasMore: true };
      mutate(current => merge ? merge(current, incoming) : incoming);
      setError(null);
      return incoming;
    } catch (err) {
      if (!controller.signal.aborted && active.current) {
        const denied = [401, 403, 404].includes(err.response?.status);
        if (denied) mutate(null);
        setError({ message: err.response?.data?.message || "Unable to sync updates. Check your connection and try again.", denied });
      }
    }
  }, [load, merge, mutate]);
  useEffect(() => {
    active.current = true;
    let timer;
    let disposed = false;
    let cycleVersion = 0;
    const cycle = async () => {
      const version = ++cycleVersion;
      clearTimeout(timer);
      if (document.hidden || !navigator.onLine) return;
      const result = await refresh();
      if (!disposed && version === cycleVersion) timer = window.setTimeout(cycle, result?.hasMore ? 300 : result ? interval : 30000);
    };
    const resume = () => {
      clearTimeout(timer);
      if (document.hidden || !navigator.onLine) {
        cycleVersion++;
        request.current?.abort();
        if (!navigator.onLine) setError({ message: "You're offline. Messages will sync when you reconnect.", denied: false });
      }
      else void cycle();
    };
    void cycle();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    return () => {
      disposed = true;
      active.current = false;
      clearTimeout(timer);
      request.current?.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
    };
  }, [refresh, interval]);
  return { data, error, refresh, mutate };
}
