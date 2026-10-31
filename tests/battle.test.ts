import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoDeck } from '../src/domain/demo';
import {
  assertBattle,
  createSession,
  descendants,
  execute,
  shuffled,
  undo,
  visible,
} from '../src/battle/engine';
import { BattleAction, Session, Side, Zone, zones } from '../src/battle/types';
let seed = 1978;
const rng = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
function ready(duo = true) {
  const s = createSession(demoDeck, duo ? demoDeck : null, 'test');
  return execute(s, {
    type: 'setup',
    orders: [
      shuffled(s.state.players[0].zones.deck, rng),
      shuffled(s.state.players[1].zones.deck, rng),
    ],
  }).session;
}
function run(s: Session, action: BattleAction): Session {
  const before = JSON.stringify(s);
  const result = execute(s, action);
  assert.equal(result.error, undefined);
  assert.equal(JSON.stringify(s), before, 'Ação mutou seu estado anterior');
  assertBattle(result.session);
  return result.session;
}
function find(s: Session, category: string, exclude: string[] = []) {
  return Object.keys(s.instances).find(
    (id) =>
      s.instances[id]!.owner === 0 &&
      s.definitions[s.instances[id]!.cardId]!.category === category &&
      !exclude.includes(id),
  )!;
}
test('setup solo e duo conservam 60/120 cópias e definem 7/6/47', () => {
  for (const duo of [false, true]) {
    const s = ready(duo);
    assert.equal(Object.keys(s.instances).length, duo ? 120 : 60);
    for (const side of (duo ? [0, 1] : [0]) as Side[]) {
      const p = s.state.players[side];
      assert.equal(p.zones.hand.length, 7);
      assert.equal(p.zones.prizes.length, 6);
      assert.equal(p.zones.deck.length, 47);
    }
    assertBattle(s);
  }
});
test('embaralhamento é uma permutação determinística, sem modificar entrada', () => {
  const input = Array.from({ length: 60 }, (_, i) => String(i));
  const snapshot = [...input];
  seed = 7;
  const a = shuffled(input, rng);
  seed = 7;
  const b = shuffled(input, rng);
  assert.deepEqual(a, b);
  assert.deepEqual(input, snapshot);
  assert.notDeepEqual(a, input);
  assert.deepEqual([...a].sort(), [...input].sort());
  const s = ready();
  assert.ok(
    execute(s, { type: 'shuffle', side: 0, order: Array(47).fill('duplicate') })
      .error,
  );
});
test('compra e movimento podem ser desfeitos com ordem exata restaurada', () => {
  const s = ready();
  const drawn = run(s, { type: 'draw', side: 0, count: 3 });
  assert.equal(drawn.state.players[0].zones.hand.length, 10);
  assert.deepEqual(undo(drawn).state, s.state);
  const card = drawn.state.players[0].zones.hand[0]!;
  const moved = run(drawn, { type: 'move', id: card, zone: 'discard' });
  assert.deepEqual(undo(moved), drawn);
  const failed = execute(s, { type: 'draw', side: 0, count: 60 });
  assert.equal(failed.session, s);
  assert.ok(failed.error);
});
test('anexar, evoluir, mover pilha e recolher não perdem cartas', () => {
  let s = ready();
  const basic = find(s, 'pokemon');
  const evolution = find(s, 'pokemon', [basic]);
  const energy = find(s, 'energy');
  const tool = find(s, 'trainer');
  s = run(s, { type: 'move', id: basic, zone: 'active' });
  s = run(s, { type: 'attach', id: energy, parent: basic, kind: 'energy' });
  s = run(s, { type: 'attach', id: tool, parent: basic, kind: 'tool' });
  s = run(s, { type: 'damage', id: basic, delta: 80 });
  s = run(s, { type: 'condition', id: basic, condition: 'Envenenado' });
  s = run(s, {
    type: 'attach',
    id: evolution,
    parent: basic,
    kind: 'evolution',
  });
  assert.equal(s.state.marks[evolution]!.damage, 80);
  assert.deepEqual(s.state.marks[evolution]!.conditions, []);
  assert.equal(descendants(s.state, evolution).length, 3);
  const before = s;
  s = run(s, { type: 'move', id: evolution, zone: 'bench' });
  assert.equal(descendants(s.state, evolution).length, 3);
  s = run(s, { type: 'move', id: evolution, zone: 'discard' });
  assert.equal(s.state.players[0].zones.discard.length >= 4, true);
  assert.equal(Object.keys(s.state.links).length, 0);
  s = run(s, { type: 'collect', side: 0 });
  assert.equal(s.state.players[0].zones.deck.length, 60);
  assert.equal(s.state.players[1].zones.deck.length, 47);
  assert.equal(Object.keys(s.instances).length, 120);
  assertBattle(before);
});
test('limites de posições, anexos inválidos e ciclos são recusados atomicamente', () => {
  let s = ready();
  const all = Object.keys(s.instances).filter(
    (id) => s.instances[id]!.owner === 0,
  );
  s = run(s, { type: 'move', id: all[0]!, zone: 'active' });
  assert.equal(
    execute(s, { type: 'move', id: all[1]!, zone: 'active' }).session,
    s,
  );
  for (const id of all.slice(1, 6))
    s = run(s, { type: 'move', id, zone: 'bench' });
  assert.ok(execute(s, { type: 'move', id: all[6]!, zone: 'bench' }).error);
  assert.ok(
    execute(s, {
      type: 'attach',
      id: all[0]!,
      parent: all[0]!,
      kind: 'evolution',
    }).error,
  );
  assert.ok(
    execute(s, {
      type: 'attach',
      id: find(s, 'energy'),
      parent: Object.keys(s.instances).find(
        (id) => s.instances[id]!.owner === 1,
      )!,
      kind: 'energy',
    }).error,
  );
});
test('identidades privadas, busca própria, revelação e estudo são distintos', () => {
  let s = ready();
  const hand = s.state.players[0].zones.hand[0]!;
  const deck = s.state.players[0].zones.deck[0]!;
  const prize = s.state.players[0].zones.prizes[0]!;
  assert.equal(visible(s, hand, 0), true);
  assert.equal(visible(s, hand, 1), false);
  assert.equal(visible(s, deck, 0), false);
  assert.equal(visible(s, deck, 0, true), true);
  assert.equal(visible(s, deck, 1, true), false);
  assert.equal(visible(s, prize, 0), false);
  s = run(s, { type: 'reveal', id: hand });
  assert.equal(visible(s, hand, 1), true);
  s = run(s, { type: 'flip', id: prize });
  assert.equal(visible(s, prize, 1), true);
  s = run(s, { type: 'study', value: true });
  assert.equal(visible(s, deck, 1), true);
  s = undo(s);
  assert.equal(visible(s, deck, 1), false);
});
test('troca de turno libera somente ações e Habilidades de quem inicia', () => {
  let s = ready();
  const first = Object.keys(s.instances).find(
    (id) => s.instances[id]!.owner === 1,
  )!;
  for (const key of ['energy', 'supporter', 'vstar', 'ace'] as const)
    s = run(s, { type: 'used', side: 1, key });
  s = run(s, { type: 'ability', id: first });
  s = run(s, { type: 'damage', id: first, delta: 20 });
  s = run(s, { type: 'turn' });
  assert.equal(s.state.current, 1);
  assert.equal(s.state.players[1].used.energy, false);
  assert.equal(s.state.players[1].used.supporter, false);
  assert.equal(s.state.players[1].used.vstar, true);
  assert.equal(s.state.players[1].used.ace, true);
  assert.equal(s.state.marks[first]!.ability, false);
  assert.equal(s.state.marks[first]!.damage, 20);
});
test('1000 ações variadas preservam todos os identificadores e desfazer restaura o snapshot', () => {
  let s = ready();
  const ids = Object.keys(s.instances);
  const original = [...ids].sort();
  for (let i = 0; i < 1000; i++) {
    const side = (rng() % 2) as Side;
    const id = ids[rng() % ids.length]!;
    const choice = rng() % 5;
    const action: BattleAction =
      choice === 0
        ? { type: 'move', id, zone: zones[rng() % zones.length]! }
        : choice === 1
          ? { type: 'draw', side, count: (rng() % 5) + 1 }
          : choice === 2
            ? {
                type: 'shuffle',
                side,
                order: shuffled(s.state.players[side].zones.deck, rng),
              }
            : choice === 3
              ? { type: 'damage', id, delta: rng() % 2 ? 50 : -10 }
              : { type: 'used', side, key: 'energy' };
    const before = JSON.stringify(s);
    const result = execute(s, action);
    assert.equal(JSON.stringify(s), before);
    if (!result.error) {
      assert.deepEqual(undo(result.session).state, s.state);
      s = result.session;
    } else assert.equal(result.session, s);
    assertBattle(s);
    assert.deepEqual(Object.keys(s.instances).sort(), original);
  }
  assert.equal(s.history.length <= 60, true);
});

test('Banco pode ser ampliado manualmente sem descartar cartas ao tentar reduzi-lo', () => {
  let s = ready(false);
  s = run(s, { type: 'bench-limit', side: 0, limit: 8 });
  const cards = Object.keys(s.instances).slice(0, 6);
  for (const id of cards) s = run(s, { type: 'move', id, zone: 'bench' });
  const result = execute(s, { type: 'bench-limit', side: 0, limit: 5 });
  assert.ok(result.error);
  assert.equal(result.session, s);
  assert.equal(s.state.players[0].zones.bench.length, 6);
  assert.equal(s.state.players[0].benchLimit, 8);
});
