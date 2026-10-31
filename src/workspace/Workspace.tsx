import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useStore } from '../state/Store';
import { createSession, execute, shuffled, undo } from '../battle/engine';
import { BattleAction, Session } from '../battle/types';
import {
  CardAsset,
  initialWorkspace,
  SavedDeck,
  Workspace as WorkspaceData,
} from './model';
import { readWorkspace, workspaceWriter } from './repository';

type State = { data: WorkspaceData; error: string | null };
type Action =
  | { type: 'hydrate'; data: WorkspaceData }
  | { type: 'deck'; deck: SavedDeck }
  | { type: 'delete'; uid: string }
  | { type: 'asset'; id: string; asset: CardAsset }
  | { type: 'setting'; key: keyof WorkspaceData['settings']; value: boolean }
  | { type: 'session'; session: Session }
  | { type: 'battle'; action: BattleAction }
  | { type: 'undo' }
  | { type: 'error'; error: string | null };
function reduce(state: State, action: Action): State {
  const data = state.data;
  if (action.type === 'error') return { ...state, error: action.error };
  if (action.type === 'hydrate') return { data: action.data, error: null };
  if (action.type === 'battle' && data.session) {
    const result = execute(data.session, action.action);
    return {
      data: { ...data, session: result.session },
      error: result.error ?? null,
    };
  }
  if (action.type === 'undo' && data.session)
    return { data: { ...data, session: undo(data.session) }, error: null };
  if (action.type === 'deck')
    return {
      data: {
        ...data,
        decks: [
          action.deck,
          ...data.decks.filter((d) => d.uid !== action.deck.uid),
        ],
      },
      error: null,
    };
  if (action.type === 'delete')
    return {
      data: { ...data, decks: data.decks.filter((d) => d.uid !== action.uid) },
      error: null,
    };
  if (action.type === 'asset')
    return {
      data: { ...data, assets: { ...data.assets, [action.id]: action.asset } },
      error: null,
    };
  if (action.type === 'session')
    return { data: { ...data, session: action.session }, error: null };
  if (action.type === 'setting')
    return {
      data: {
        ...data,
        settings: { ...data.settings, [action.key]: action.value },
      },
      error: null,
    };
  return state;
}
const writer = workspaceWriter(AsyncStorage);
export const random32 = () => {
  const bytes = Crypto.getRandomBytes(4);
  return (
    (bytes[0]! * 0x1000000 +
      (bytes[1]! << 16) +
      (bytes[2]! << 8) +
      bytes[3]!) >>>
    0
  );
};
type Value = State & {
  ready: boolean;
  saveStatus: string;
  dispatch: React.Dispatch<Action>;
  start: (a: SavedDeck, b: SavedDeck | null) => void;
};
const Context = createContext<Value | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const legacy = useStore();
  const [state, dispatch] = useReducer(reduce, {
    data: initialWorkspace(legacy.state.deck),
    error: null,
  });
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Carregando…');
  const [readOnly, setReadOnly] = useState(false);
  useEffect(() => {
    if (!legacy.ready) return;
    let live = true;
    readWorkspace(AsyncStorage, legacy.state.deck)
      .then((data) => {
        if (live) dispatch({ type: 'hydrate', data });
      })
      .catch(() => {
        if (live) {
          setReadOnly(true);
          dispatch({
            type: 'error',
            error:
              'Não foi possível ler os dados salvos. Eles foram preservados. Esta sessão será temporária; exporte um backup antes de sair.',
          });
        }
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [legacy.ready]);
  useEffect(() => {
    if (!ready || readOnly) return;
    let current = true;
    setSaveStatus('Salvando…');
    writer
      .write(state.data)
      .then(() => {
        if (current) setSaveStatus('Salvo neste aparelho');
      })
      .catch(() => {
        if (current) setSaveStatus('Falha ao salvar · exporte um backup');
      });
    return () => {
      current = false;
    };
  }, [state.data, ready, readOnly]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status !== 'active') writer.flush().catch(() => {});
    });
    return () => sub.remove();
  }, []);
  const value = useMemo<Value>(
    () => ({
      ...state,
      ready,
      saveStatus: readOnly ? 'Sessão temporária' : saveStatus,
      dispatch,
      start(a, b) {
        try {
          const session = createSession(a, b, Crypto.randomUUID(), () =>
            Crypto.randomUUID(),
          );
          const result = execute(session, {
            type: 'setup',
            orders: [
              shuffled(session.state.players[0].zones.deck, random32),
              shuffled(session.state.players[1].zones.deck, random32),
            ],
          });
          if (result.error) throw Error(result.error);
          dispatch({ type: 'session', session: result.session });
        } catch (error) {
          dispatch({
            type: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Não foi possível iniciar.',
          });
        }
      },
    }),
    [state, ready, saveStatus, readOnly],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw Error('Workspace ausente.');
  return value;
}
