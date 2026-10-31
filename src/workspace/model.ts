import { Deck } from '../domain/types';
import { assertBattle, createSession } from '../battle/engine';
import { Session } from '../battle/types';
import { parseDeck } from '../domain/parser';
export type SavedDeck = Deck & { uid: string; updatedAt: string };
export type CardAsset = {
  uri: string;
  source: 'tcgdex' | 'user';
  savedAt: string;
  apiId?: string;
  url?: string;
  bytes: number;
};
export type Workspace = {
  version: 2;
  decks: SavedDeck[];
  assets: Record<string, CardAsset>;
  session: Session | null;
  settings: { offline: boolean; largeCards: boolean };
};
export function initialWorkspace(legacy: Deck): Workspace {
  return {
    version: 2,
    decks: [
      { ...legacy, uid: 'importado-v1', updatedAt: new Date().toISOString() },
    ],
    assets: {},
    session: null,
    settings: { offline: false, largeCards: false },
  };
}
export function validateWorkspace(raw: unknown): Workspace {
  const w = raw as Workspace;
  if (
    !w ||
    w.version !== 2 ||
    !Array.isArray(w.decks) ||
    !w.assets ||
    !w.settings ||
    typeof w.settings.offline !== 'boolean' ||
    typeof w.settings.largeCards !== 'boolean'
  )
    throw Error('Backup incompatível com esta versão.');
  const ids = new Set<string>();
  const decks = w.decks.map((d) => {
    if (
      typeof d.uid !== 'string' ||
      ids.has(d.uid) ||
      typeof d.raw !== 'string' ||
      typeof d.name !== 'string' ||
      typeof d.updatedAt !== 'string'
    )
      throw Error('Biblioteca de decks inválida.');
    ids.add(d.uid);
    const parsed = parseDeck(d.raw, d.name).deck;
    if (!parsed) throw Error('Há uma lista inválida na biblioteca.');
    return { ...parsed, uid: d.uid, updatedAt: d.updatedAt };
  });
  for (const a of Object.values(w.assets))
    if (
      !a ||
      typeof a.uri !== 'string' ||
      !['tcgdex', 'user'].includes(a.source) ||
      !Number.isFinite(a.bytes) ||
      a.bytes < 1 ||
      typeof a.savedAt !== 'string'
    )
      throw Error('Catálogo local inválido.');
  if (w.session) {
    if (
      !['solo', 'duo'].includes(w.session.mode) ||
      typeof w.session.id !== 'string' ||
      !Array.isArray(w.session.history) ||
      w.session.history.length > 60
    )
      throw Error('Sessão inválida.');
    assertBattle(w.session);
    for (const event of w.session.history) {
      if (typeof event.label !== 'string' || typeof event.at !== 'string')
        throw Error('Histórico inválido.');
      assertBattle({ ...w.session, state: event.before });
    }
  }
  return { ...w, decks };
}
