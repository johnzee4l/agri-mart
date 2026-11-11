import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

/* GET a contract path and expose { data, error, loading, reload }.
   Pass null to skip the request. Aborts on unmount or when the path changes.
   Reads only real endpoints: no mock data (member plan, Phase 1). */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }

    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));

    api
      .get(path, { signal: controller.signal })
      .then((payload) => setState({ data: payload, error: null, loading: false }))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ data: null, error, loading: false });
      });

    return () => controller.abort();
  }, [path, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, reload };
}
