import { createContext } from 'react';
import type { User } from './api';

export type SessionState = { user: User | null; status: 'loading' | 'ready' | 'error'; refresh: () => Promise<void> };
export const SessionContext = createContext<SessionState>({ user: null, status: 'loading', refresh: async () => {} });
