import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoDeck } from '../src/domain/demo';
import { initialWorkspace, validateWorkspace } from '../src/workspace/model';
import {
  readWorkspace,
  WORKSPACE_KEY,
  workspaceWriter,
} from '../src/workspace/repository';
import { createSession, execute } from '../src/battle/engine';
test('migração copia o deck antigo sem apagar ou sobrescrever sua chave', async () => {
  const map = new Map([
    [
      '@prizecheck/state/v1',
      JSON.stringify({ deck: demoDeck, match: { turn: 8 } }),
    ],
  ]);
  const original = map.get('@prizecheck/state/v1');
  const adapter = {
    getItem: async (key: string) => map.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      map.set(key, value);
    },
  };
  const w = await readWorkspace(adapter, demoDeck);
  assert.deepEqual(w.decks[0]!.cards, demoDeck.cards);
  await workspaceWriter(adapter).write(w);
  assert.equal(map.get('@prizecheck/state/v1'), original);
  assert.ok(map.get(WORKSPACE_KEY));
});
test('biblioteca, imagens, cartas, histórico e ordem sobrevivem à serialização e retomada', () => {
  const w = initialWorkspace(demoDeck);
  let s = createSession(demoDeck, demoDeck, 'persistent');
  s = execute(s, { type: 'draw', side: 0, count: 7 }).session;
  s = execute(s, {
    type: 'move',
    id: s.state.players[0].zones.hand[0]!,
    zone: 'active',
  }).session;
  w.session = s;
  w.assets[demoDeck.cards[0]!.id] = {
    uri: 'native:test.webp',
    source: 'tcgdex',
    bytes: 10,
    savedAt: '2026-10-31',
    apiId: 'sv06-128',
  };
  assert.deepEqual(validateWorkspace(JSON.parse(JSON.stringify(w))), w);
  w.decks[0] = { ...w.decks[0]!, name: 'Deck editado' };
  assert.equal(w.session.deckNames[0], demoDeck.name);
});
test('dados corrompidos não são sobrescritos durante leitura', async () => {
  let writes = 0;
  const raw = '{broken';
  await assert.rejects(() =>
    readWorkspace(
      {
        getItem: async () => raw,
        setItem: async () => {
          writes++;
        },
      },
      demoDeck,
    ),
  );
  assert.equal(writes, 0);
  const w = initialWorkspace(demoDeck);
  w.session = createSession(demoDeck, null, 'bad');
  w.session.state.players[0].zones.hand.push(
    w.session.state.players[0].zones.deck[0]!,
  );
  assert.throws(() => validateWorkspace(w), /duplicada/);
});
test('fila de persistência impede gravação antiga de ultrapassar a mais recente', async () => {
  const order: string[] = [];
  let value = '';
  const writer = workspaceWriter({
    getItem: async () => value,
    setItem: async (_, raw) => {
      await new Promise((r) => setTimeout(r, 5));
      value = raw;
      order.push(JSON.parse(raw).decks[0].name);
    },
  });
  const a = initialWorkspace(demoDeck);
  const b = { ...a, decks: [{ ...a.decks[0]!, name: 'Último' }] };
  await Promise.all([writer.write(a), writer.write(b)]);
  await writer.flush();
  assert.deepEqual(order, [demoDeck.name, 'Último']);
  assert.equal(JSON.parse(value).decks[0].name, 'Último');
});

test('catálogo resolve número normalizado sem misturar galeria ou impressão ambígua', async () => {
  const { exactPrinting } = await import('../src/catalog/identity');
  const prints = [
    { localId: '040', id: 'swsh9-040' },
    { localId: 'TG01', id: 'swsh9tg-TG01' },
  ];
  assert.equal(exactPrinting(prints, '40')?.id, 'swsh9-040');
  assert.equal(exactPrinting(prints, 'TG1')?.id, 'swsh9tg-TG01');
  assert.equal(
    exactPrinting([...prints, { localId: '40', id: 'other-40' }], '40'),
    undefined,
  );
  assert.equal(exactPrinting(prints, '58'), undefined);
});
