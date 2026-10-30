import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoDeck, demoList } from '../src/domain/demo';
import { parseDeck } from '../src/domain/parser';
import { analyzePrizes, validateSnapshot } from '../src/domain/prizes';
import { newMatch, reducer } from '../src/domain/match';
import { AppState } from '../src/domain/types';

const initial = (): AppState => ({ version: 1, deck: demoDeck, match: newMatch() });

test('TCG Live: categorias, coleções, número e total', () => {
  const result = parseDeck(demoList.replace(/\n/g, '\r\n'), '  Deck  ');
  assert.deepEqual(result.errors, []);
  assert.equal(result.deck?.name, 'Deck');
  assert.equal(result.deck?.cards.reduce((n, c) => n + c.quantity, 0), 60);
  assert.equal(result.deck?.cards[0]?.set, 'TWM');
  assert.equal(result.deck?.cards[0]?.number, '128');
});
test('Limitless: cabeçalhos com parênteses, bullets e x', () => {
  const raw = '** Pokémon (4) **\n* 4x Pikachu SVI 25\n** Trainers (48) **\n48 Test Trainer\n** Energy (8) **\n8 Basic {L} Energy SVE 4';
  assert.equal(parseDeck(raw, '').deck?.cards.length, 3);
});
test('mesma carta em linhas repetidas é agregada; impressões distintas são preservadas', () => {
  const raw = 'Pokémon: 4\n2 Pikachu SVI 25\n1 Pikachu SVI 25\n1 Pikachu MEW 25\nTrainer: 48\n48 Test\nEnergy: 8\n8 Lightning Energy';
  const cards = parseDeck(raw, '').deck!.cards;
  assert.equal(cards[0]?.quantity, 3);
  assert.equal(cards[1]?.quantity, 1);
  assert.notEqual(cards[0]?.id, cards[1]?.id);
});
test('não ignora silenciosamente linhas inválidas nem aceita total diferente de 60', () => {
  assert.ok(parseDeck(`${demoList}\nlinha desconhecida`, '').errors.length);
  assert.ok(parseDeck('Pokémon: 1\n1 Pikachu', '').errors.some(e => e.includes('60')));
  assert.ok(parseDeck('4 Pikachu\n56 Energy', '').errors.length);
});
test('zero observações não confirma cartas e não assume uma probabilidade uniforme', () => {
  const result = analyzePrizes(demoDeck, newMatch());
  assert.equal(result.exact, false);
  assert.ok(result.rows.every(c => c.min === 0 && c.max === Math.min(c.quantity, 6)));
});
function completeSnapshot() {
  const match = newMatch();
  for (const c of demoDeck.cards) match.outside[c.id] = c.quantity;
  // Missing four Dreepy and two Drakloak, with 54 remaining outside prizes.
  match.outside[demoDeck.cards[0]!.id] = 0;
  match.outside[demoDeck.cards[1]!.id] = 2;
  return { version: 1 as const, deck: demoDeck, match };
}
test('54 cópias distintas fora dos Prêmios confirmam exatamente seis', () => {
  const state = completeSnapshot();
  const result = analyzePrizes(state.deck, state.match);
  assert.equal(result.totalOutside, 54);
  assert.equal(result.exact, true);
  assert.ok(result.rows.every(c => c.min === c.max));
  assert.equal(result.rows.reduce((n, c) => n + c.min, 0), 6);
  assert.equal(validateSnapshot(state.deck, state.match), true);
});
test('recusa a 55ª observação, confirmação conflitante e quantidade negativa', () => {
  const state = completeSnapshot();
  const id = state.deck.cards[0]!.id;
  assert.equal(reducer(state, { type: 'count', id, field: 'outside', delta: 1 }), state);
  assert.equal(reducer(initial(), { type: 'count', id, field: 'outside', delta: -1 }).match.outside[id], undefined);
  const full = { ...initial(), match: { ...newMatch(), outside: { [id]: 4 } } };
  assert.equal(reducer(full, { type: 'count', id, field: 'confirmed', delta: 1 }), full);
});
test('seis identificações diretas bastam sem supor que outras cartas foram vistas', () => {
  const state = initial();
  state.match.confirmed[state.deck.cards[0]!.id] = 4;
  state.match.confirmed[state.deck.cards[1]!.id] = 2;
  const analysis = analyzePrizes(state.deck, state.match);
  assert.ok(analysis.exact);
  assert.ok(analysis.rows.every(c => c.min === c.max));
  assert.equal(validateSnapshot(state.deck, state.match), true);
});
test('mapa finalizado bloqueia observações e limita Prêmios retirados', () => {
  const state = reducer(completeSnapshot(), { type: 'seal' });
  const id = state.deck.cards[0]!.id;
  assert.ok(state.match.sealed);
  assert.equal(reducer(state, { type: 'count', id, field: 'outside', delta: 1 }), state);
  const next = reducer(state, { type: 'count', id, field: 'taken', delta: 4 });
  assert.equal(next.match.taken[id], 4);
  assert.equal(reducer(next, { type: 'count', id, field: 'taken', delta: 1 }), next);
  assert.equal(reducer(initial(), { type: 'seal' }).match.sealed, false);
});
test('passar turno libera Habilidades e preserva os recursos de partida e dano', () => {
  let state = initial();
  state = reducer(state, { type: 'ability', index: 0 });
  state = reducer(state, { type: 'once', key: 'vstar' });
  state = reducer(state, { type: 'damage', index: 0, delta: 100 });
  state = reducer(state, { type: 'turn' });
  assert.equal(state.match.turn, 2);
  assert.equal(state.match.slots[0]?.abilityUsed, false);
  assert.equal(state.match.once.vstar, true);
  assert.equal(state.match.slots[0]?.damage, 100);
});
test('condições mutuamente exclusivas e coexistência de veneno e queimadura', () => {
  let state = initial();
  for (const condition of ['Envenenado', 'Queimado', 'Adormecido', 'Paralisado'] as const) state = reducer(state, { type: 'condition', index: 0, condition });
  assert.deepEqual(state.match.slots[0]?.conditions, ['Envenenado', 'Queimado', 'Paralisado']);
  state = reducer(state, { type: 'damage', index: 0, delta: -100 });
  assert.equal(state.match.slots[0]?.damage, 0);
  state = reducer(state, { type: 'reset' });
  assert.equal(state.deck, demoDeck);
  assert.deepEqual(state.match, newMatch());
});
test('intervalos cobrem todos os arranjos possíveis em uma lista pequena de tipos', () => {
  // 50 cards known outside, 10 missing distributed 4/3/3; two directly confirmed in first type.
  const deck = { name: 'Synthetic', raw: '', cards: [
    { id: 'a', name: 'A', quantity: 24, category: 'pokemon' as const },
    { id: 'b', name: 'B', quantity: 23, category: 'trainer' as const },
    { id: 'c', name: 'C', quantity: 13, category: 'energy' as const },
  ] };
  const match = { ...newMatch(), outside: { a: 20, b: 20, c: 10 }, confirmed: { a: 2 } };
  const possible: number[][] = [];
  for (let a = 2; a <= 4; a++) for (let b = 0; b <= 3; b++) for (let c = 0; c <= 3; c++) if (a + b + c === 6) possible.push([a, b, c]);
  const result = analyzePrizes(deck, match);
  result.rows.forEach((row, i) => {
    assert.equal(row.min, Math.min(...possible.map(p => p[i]!)));
    assert.equal(row.max, Math.max(...possible.map(p => p[i]!)));
  });
});
