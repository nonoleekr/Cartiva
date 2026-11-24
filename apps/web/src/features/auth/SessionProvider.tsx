import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchIdentity } from './api';
import type { User } from './api';
import { SessionContext } from './SessionContext';
import type { SessionState } from './SessionContext';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionState['status']>('loading');
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const requestId = ++revision.current;
    try { const next = await fetchIdentity(); if (requestId === revision.current) { setUser(next); setStatus('ready'); } }
    catch { if (requestId === revision.current) { setUser(null); setStatus('error'); } }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++revision.current;
    void fetchIdentity(controller.signal).then((next) => { if (requestId === revision.current) { setUser(next); setStatus('ready'); } }).catch(() => {
      if (!controller.signal.aborted && requestId === revision.current) { setUser(null); setStatus('error'); }
    });
    const update = () => { void refresh(); };
    window.addEventListener('focus', update);
    return () => { controller.abort(); window.removeEventListener('focus', update); };
  }, [refresh]);

  return <SessionContext value={{ user, status, refresh }}>{children}</SessionContext>;
}
