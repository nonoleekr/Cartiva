import { useEffect, useState } from 'react';

type State<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string };

// Callers keep the loader stable and key request-owning components by URL/identity.
export function useRemote<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ status: 'ready', data });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Request failed. Please try again.' });
    });
    return () => controller.abort();
  }, [load]);
  return state;
}
