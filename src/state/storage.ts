import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../domain/types';
import { parseDeck } from '../domain/parser';
import { validateSnapshot } from '../domain/prizes';
const KEY = '@prizecheck/state/v1';
export async function loadState(): Promise<AppState | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  const s = JSON.parse(raw) as AppState;
  // Rebuild card identity from the original list, then validate the entire session.
  if (s.version !== 1 || typeof s.deck?.raw !== 'string' || typeof s.deck.name !== 'string') throw new Error('Dados incompatíveis.');
  const deck = parseDeck(s.deck.raw, s.deck.name).deck;
  const m = s.match;
  if (!deck || !m || !m.outside || !m.confirmed || !m.taken || typeof m.sealed !== 'boolean'
    || !Number.isInteger(m.turn) || m.turn < 1 || !Array.isArray(m.slots) || m.slots.length !== 6
    || !m.once || Object.values(m.once).length !== 3 || !['vstar', 'gx', 'ace'].every(k => typeof m.once[k as keyof typeof m.once] === 'boolean')
    || m.slots.some(slot => !slot || typeof slot.name !== 'string' || slot.name.length > 40 || !Number.isInteger(slot.damage) || slot.damage < 0 || slot.damage > 9990
      || typeof slot.abilityUsed !== 'boolean' || !Array.isArray(slot.conditions)
      || slot.conditions.some(c => !['Envenenado', 'Queimado', 'Paralisado', 'Adormecido', 'Confuso'].includes(c)))
    || !validateSnapshot(deck, m)) throw new Error('Os dados salvos não passaram na validação.');
  return { ...s, deck };
}
// Serialize writes so an older operation cannot overwrite a more recent action.
let pending = Promise.resolve();
export function saveState(state: AppState) {
  const task = pending.catch(() => {}).then(() => AsyncStorage.setItem(KEY, JSON.stringify(state)));
  pending = task;
  return task;
}
