import { AppState, Condition, Deck, Match } from './types';
import { validateSnapshot } from './prizes';

export const newMatch = (): Match => ({
  outside: {}, confirmed: {}, taken: {}, sealed: false, turn: 1,
  slots: Array.from({ length: 6 }, (_, index) => ({ name: index === 0 ? 'Pokémon ativo' : `Banco ${index}`, damage: 0, conditions: [], abilityUsed: false })),
  once: { vstar: false, gx: false, ace: false },
});
export type Action =
  | { type: 'deck'; deck: Deck }
  | { type: 'reset' }
  | { type: 'count'; id: string; field: 'outside' | 'confirmed' | 'taken'; delta: number }
  | { type: 'seal' }
  | { type: 'turn' }
  | { type: 'damage'; index: number; delta: number }
  | { type: 'name'; index: number; name: string }
  | { type: 'clear-slot'; index: number }
  | { type: 'condition'; index: number; condition: Condition }
  | { type: 'ability'; index: number }
  | { type: 'once'; key: keyof Match['once'] };

export function reducer(state: AppState, action: Action): AppState {
  const m = state.match;
  if (action.type === 'deck') return { version: 1, deck: action.deck, match: newMatch() };
  if (action.type === 'reset') return { ...state, match: newMatch() };
  if (action.type === 'count') {
    if (m.sealed && action.field !== 'taken' || !m.sealed && action.field === 'taken') return state;
    const map = { ...m[action.field], [action.id]: (m[action.field][action.id] ?? 0) + action.delta };
    const next = { ...m, [action.field]: map };
    return validateSnapshot(state.deck, next) ? { ...state, match: next } : state;
  }
  if (action.type === 'seal') {
    const next = { ...m, sealed: true };
    return validateSnapshot(state.deck, next) ? { ...state, match: next } : state;
  }
  if (action.type === 'turn') return { ...state, match: { ...m, turn: m.turn + 1, slots: m.slots.map(s => ({ ...s, abilityUsed: false })) } };
  if (action.type === 'once') return { ...state, match: { ...m, once: { ...m.once, [action.key]: !m.once[action.key] } } };
  const slots = m.slots.map((slot, index) => {
    if (index !== action.index) return slot;
    switch (action.type) {
      case 'damage': return { ...slot, damage: Math.min(9990, Math.max(0, slot.damage + action.delta)) };
      case 'name': return { ...slot, name: action.name.slice(0, 40) };
      case 'ability': return { ...slot, abilityUsed: !slot.abilityUsed };
      case 'clear-slot': return { ...slot, damage: 0, conditions: [], abilityUsed: false };
      case 'condition': {
        // Sleep, paralysis and confusion are mutually exclusive. Poison and burn coexist.
        const exclusive: Condition[] = ['Paralisado', 'Adormecido', 'Confuso'];
        const conditions = slot.conditions.includes(action.condition)
          ? slot.conditions.filter(c => c !== action.condition)
          : [...slot.conditions.filter(c => !exclusive.includes(action.condition) || !exclusive.includes(c)), action.condition];
        return { ...slot, conditions };
      }
    }
  });
  return { ...state, match: { ...m, slots } };
}
