import React, { createContext, Dispatch, useContext, useEffect, useReducer, useState } from 'react';
import { AppState } from '../domain/types';
import { Action, newMatch, reducer } from '../domain/match';
import { demoDeck } from '../domain/demo';
import { loadState, saveState } from './storage';

const initial: AppState = { version: 1, deck: demoDeck, match: newMatch() };
type InternalAction = Action | { type: 'hydrate'; state: AppState };
const Context = createContext<{ state: AppState; dispatch: Dispatch<Action>; ready: boolean; storageError: string | null } | null>(null);
export function Store({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer((s: AppState, a: InternalAction) => a.type === 'hydrate' ? a.state : reducer(s, a), initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(true);
  useEffect(() => {
    let active = true;
    loadState().then(saved => { if (active && saved) dispatch({ type: 'hydrate', state: saved }); })
      .catch(() => { if (active) { setStorageError('Não foi possível recuperar a sessão. Os dados anteriores foram preservados; esta sessão será temporária.'); setCanSave(false); } })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready || !canSave) return;
    saveState(state).then(() => setStorageError(null)).catch(() => setStorageError('Falha ao salvar no aparelho. Mantenha o app aberto para preservar esta sessão.'));
  }, [state, ready, canSave]);
  return <Context.Provider value={{ state, dispatch, ready, storageError }}>{children}</Context.Provider>;
}
export function useStore() { const value = useContext(Context); if (!value) throw new Error('Store ausente.'); return value; }
