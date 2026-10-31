import { Deck, Condition } from '../domain/types';
import {
  BattleAction,
  BattleState,
  CardMark,
  Player,
  Session,
  Side,
  Zone,
  zones,
  zoneNames,
} from './types';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const emptyMark = (zone: Zone): CardMark => ({
  damage: 0,
  conditions: [],
  ability: false,
  faceUp: !['deck', 'prizes'].includes(zone),
  revealed: false,
});
const player = (name: string): Player => ({
  name,
  benchLimit: 5,
  zones: Object.fromEntries(
    zones.map((z) => [z, []]),
  ) as unknown as Player['zones'],
  used: {
    energy: false,
    supporter: false,
    vstar: false,
    gx: false,
    ace: false,
  },
});
export const other = (side: Side): Side => (side === 0 ? 1 : 0);
export function createSession(
  a: Deck,
  b: Deck | null,
  id: string,
  makeUID?: () => string,
): Session {
  const session: Session = {
    id,
    mode: b ? 'duo' : 'solo',
    definitions: {},
    instances: {},
    deckNames: [a.name, b?.name ?? 'Sem adversário'],
    history: [],
    state: {
      players: [player('Lado A'), player('Lado B')],
      marks: {},
      links: {},
      current: 0,
      turn: 1,
      study: false,
    },
  };
  [a, b].forEach((deck, n) => {
    if (!deck) return;
    if (deck.cards.reduce((sum, c) => sum + c.quantity, 0) !== 60)
      throw Error('O deck precisa conter 60 cartas.');
    deck.cards.forEach((card, i) => {
      session.definitions[card.id] = copy(card);
      for (let j = 0; j < card.quantity; j++) {
        const uid = makeUID ? makeUID() : `${n}:${i}:${j}`;
        session.instances[uid] = { cardId: card.id, owner: n as Side };
        session.state.players[n as Side].zones.deck.push(uid);
        session.state.marks[uid] = emptyMark('deck');
      }
    });
  });
  assertBattle(session);
  return session;
}
export function rootLocation(
  state: BattleState,
  id: string,
): { side: Side; zone: Zone; index: number } | null {
  for (const side of [0, 1] as Side[])
    for (const zone of zones) {
      const index = state.players[side].zones[zone].indexOf(id);
      if (index >= 0) return { side, zone, index };
    }
  return null;
}
export function descendants(state: BattleState, id: string): string[] {
  const result: string[] = [];
  const visit = (parent: string) => {
    for (const [child, link] of Object.entries(state.links))
      if (link.parent === parent) {
        result.push(child);
        visit(child);
      }
  };
  visit(id);
  return result;
}
export function assertBattle(session: Session): void {
  const { state, instances, definitions } = session;
  if (
    !state ||
    ![0, 1].includes(state.current) ||
    !Number.isInteger(state.turn) ||
    state.turn < 1 ||
    typeof state.study !== 'boolean'
  )
    throw Error('Estado da partida inválido.');
  const counts = [0, 1].map(
    (side) =>
      Object.values(instances).filter((card) => card.owner === side).length,
  );
  if (
    counts[0] !== 60 ||
    counts[1] !== (session.mode === 'duo' ? 60 : 0) ||
    (session.mode === 'solo' && state.current !== 0)
  )
    throw Error(
      'Contagem original da sessão inválida: são necessárias 60 cópias por lado.',
    );
  const seen = new Set<string>();
  const add = (id: string, side: Side) => {
    if (
      seen.has(id) ||
      !instances[id] ||
      instances[id]!.owner !== side ||
      !definitions[instances[id]!.cardId]
    )
      throw Error('Carta duplicada, desconhecida ou no lado incorreto.');
    seen.add(id);
  };
  for (const side of [0, 1] as Side[]) {
    const p = state.players[side];
    if (
      !p ||
      typeof p.name !== 'string' ||
      !p.used ||
      Object.values(p.used).some((value) => typeof value !== 'boolean')
    )
      throw Error('Jogador inválido.');
    for (const z of zones) {
      if (!Array.isArray(p.zones[z])) throw Error('Zona inválida.');
      p.zones[z].forEach((id) => add(id, side));
    }
    if (p.zones.active.length > 1)
      throw Error(
        'Ativo já ocupado. Mova a carta atual antes de colocar outra.',
      );
    if (![5, 8].includes(p.benchLimit ?? 5))
      throw Error('Limite de Banco inválido.');
    if (p.zones.bench.length > (p.benchLimit ?? 5))
      throw Error(
        'Banco cheio. Libere uma posição ou ajuste manualmente o limite.',
      );
    if (p.zones.prizes.length > 6)
      throw Error('Os Prêmios comportam até seis cartas nesta mesa.');
  }
  if (state.players.reduce((n, p) => n + p.zones.stadium.length, 0) > 1)
    throw Error('Já há um Estádio. Mova o anterior antes de substituí-lo.');
  for (const [id, link] of Object.entries(state.links)) {
    const instance = instances[id];
    const parent = instances[link.parent];
    if (
      !instance ||
      !parent ||
      parent.owner !== instance.owner ||
      !['energy', 'tool', 'evolution'].includes(link.kind)
    )
      throw Error('Anexo inválido.');
    add(id, instance.owner);
    const path = new Set([id]);
    let current = link.parent;
    while (state.links[current]) {
      if (path.has(current)) throw Error('Ciclo de anexos.');
      path.add(current);
      current = state.links[current]!.parent;
    }
    if (path.has(current)) throw Error('Ciclo de anexos.');
    const location = rootLocation(state, current);
    if (!location || !['active', 'bench'].includes(location.zone))
      throw Error('Anexos precisam estar em um Pokémon na mesa.');
  }
  if (seen.size !== Object.keys(instances).length)
    throw Error('Uma carta foi perdida na movimentação.');
  for (const id of seen) {
    const mark = state.marks[id];
    if (
      !mark ||
      !Number.isInteger(mark.damage) ||
      mark.damage < 0 ||
      mark.damage > 9990 ||
      typeof mark.faceUp !== 'boolean' ||
      typeof mark.revealed !== 'boolean' ||
      typeof mark.ability !== 'boolean' ||
      !Array.isArray(mark.conditions) ||
      mark.conditions.some(
        (c) =>
          ![
            'Envenenado',
            'Queimado',
            'Adormecido',
            'Paralisado',
            'Confuso',
          ].includes(c),
      )
    )
      throw Error('Marcadores inválidos.');
  }
}
function permutation(before: string[], after: string[]): boolean {
  return (
    before.length === after.length &&
    new Set(after).size === after.length &&
    after.every((id) => before.includes(id))
  );
}
function detach(state: BattleState, id: string) {
  const location = rootLocation(state, id);
  if (location)
    state.players[location.side].zones[location.zone].splice(location.index, 1);
  else if (state.links[id]) delete state.links[id];
  else throw Error('Carta não encontrada na mesa.');
}
export function execute(
  session: Session,
  action: BattleAction,
  at = new Date().toISOString(),
): { session: Session; error?: string } {
  try {
    const next = copy(session.state);
    let label = '';
    const instance = 'id' in action ? session.instances[action.id] : undefined;
    const mark = 'id' in action ? next.marks[action.id] : undefined;
    const name = instance ? session.definitions[instance.cardId]!.name : '';
    if ('id' in action && (!instance || !mark))
      throw Error('Carta não encontrada.');
    switch (action.type) {
      case 'move': {
        const side = instance!.owner;
        const source = rootLocation(next, action.id);
        const destination = next.players[side].zones[action.zone];
        detach(next, action.id);
        const preserve = ['active', 'bench'].includes(action.zone);
        const group = preserve
          ? [action.id]
          : [action.id, ...descendants(next, action.id)];
        if (!preserve)
          group.forEach((id) => {
            delete next.links[id];
            next.marks[id] = emptyMark(action.zone);
          });
        else {
          mark!.revealed = false;
          mark!.faceUp = true;
        }
        if (action.position === 'top') destination.unshift(...group);
        else destination.push(...group);
        label = `${side === 0 ? 'A' : 'B'} moveu ${group.length} carta(s): ${source ? zoneNames[source.zone] : 'pilha'} → ${zoneNames[action.zone]}`;
        break;
      }
      case 'draw': {
        const p = next.players[action.side];
        if (
          !Number.isInteger(action.count) ||
          action.count < 1 ||
          action.count > p.zones.deck.length
        )
          throw Error('Não há cartas suficientes para esta compra.');
        const cards = p.zones.deck.splice(0, action.count);
        p.zones.hand.push(...cards);
        cards.forEach((id) => {
          next.marks[id] = emptyMark('hand');
        });
        label = `${action.side === 0 ? 'A' : 'B'} comprou ${action.count} carta(s)`;
        break;
      }
      case 'shuffle': {
        const p = next.players[action.side];
        if (!permutation(p.zones.deck, action.order))
          throw Error('Embaralhamento inválido.');
        p.zones.deck = [...action.order];
        p.zones.deck.forEach((id) => {
          next.marks[id]!.faceUp = false;
          next.marks[id]!.revealed = false;
        });
        label = `${action.side === 0 ? 'A' : 'B'} embaralhou o baralho`;
        break;
      }
      case 'setup': {
        if (
          session.history.length ||
          Object.values(next.links).length ||
          next.players.some((p) =>
            zones.some((z) => z !== 'deck' && p.zones[z].length),
          )
        )
          throw Error('Reinicie a sessão para preparar outra mão inicial.');
        for (const side of [0, 1] as Side[]) {
          const p = next.players[side];
          if (!permutation(p.zones.deck, action.orders[side]))
            throw Error('Ordem de preparação inválida.');
          if (!p.zones.deck.length) continue;
          p.zones.deck = [...action.orders[side]];
          p.zones.hand = p.zones.deck.splice(0, 7);
          p.zones.prizes = p.zones.deck.splice(0, 6);
          p.zones.hand.forEach((id) => {
            next.marks[id] = emptyMark('hand');
          });
        }
        label = 'Preparação: embaralhar, comprar 7 e separar 6 Prêmios';
        break;
      }
      case 'collect': {
        const side = action.side;
        for (const [id, i] of Object.entries(session.instances))
          if (i.owner === side) {
            delete next.links[id];
            next.marks[id] = emptyMark('deck');
          }
        for (const zone of zones) next.players[side].zones[zone] = [];
        next.players[side].zones.deck = Object.keys(session.instances).filter(
          (id) => session.instances[id]!.owner === side,
        );
        label = `${side === 0 ? 'A' : 'B'} recolheu todas as cartas ao baralho (sem embaralhar)`;
        break;
      }
      case 'attach': {
        const parent = session.instances[action.parent];
        const location = rootLocation(next, action.parent);
        if (
          action.id === action.parent ||
          !parent ||
          parent.owner !== instance!.owner ||
          !location ||
          !['active', 'bench'].includes(location.zone) ||
          descendants(next, action.id).length
        )
          throw Error(
            'Selecione uma carta sem anexos e um Pokémon do mesmo lado na mesa.',
          );
        const card = session.definitions[instance!.cardId]!;
        const host = session.definitions[parent.cardId]!;
        if (
          host.category !== 'pokemon' ||
          (action.kind === 'energy' && card.category !== 'energy') ||
          (action.kind === 'tool' && card.category !== 'trainer') ||
          (action.kind === 'evolution' && card.category !== 'pokemon')
        )
          throw Error('Categorias incompatíveis com este anexo.');
        detach(next, action.id);
        if (action.kind === 'evolution') {
          // Source may have preceded host in the same zone: find its updated position.
          const position = rootLocation(next, action.parent)!;
          next.players[position.side].zones[position.zone][position.index] =
            action.id;
          Object.values(next.links).forEach((link) => {
            if (link.parent === action.parent) link.parent = action.id;
          });
          next.links[action.parent] = { parent: action.id, kind: 'evolution' };
          next.marks[action.id] = {
            ...emptyMark(position.zone),
            damage: next.marks[action.parent]!.damage,
          };
          next.marks[action.parent] = emptyMark(position.zone);
        } else
          next.links[action.id] = { parent: action.parent, kind: action.kind };
        label =
          action.kind === 'evolution'
            ? 'Evolução empilhada manualmente'
            : `Anexo de ${action.kind === 'energy' ? 'Energia' : 'Ferramenta'} adicionado`;
        break;
      }
      case 'damage':
        if (!Number.isInteger(action.delta)) throw Error('Dano inválido.');
        mark!.damage = Math.max(0, Math.min(9990, mark!.damage + action.delta));
        label = 'Marcador de dano ajustado';
        break;
      case 'condition': {
        const exclusive: Condition[] = ['Adormecido', 'Paralisado', 'Confuso'];
        mark!.conditions = mark!.conditions.includes(action.condition)
          ? mark!.conditions.filter((c) => c !== action.condition)
          : [
              ...mark!.conditions.filter(
                (c) =>
                  !exclusive.includes(action.condition) ||
                  !exclusive.includes(c),
              ),
              action.condition,
            ];
        label = `Condição ${action.condition} ajustada`;
        break;
      }
      case 'flip':
        mark!.faceUp = !mark!.faceUp;
        label = 'Carta virada';
        break;
      case 'reveal':
        mark!.revealed = !mark!.revealed;
        label = mark!.revealed
          ? 'Carta revelada aos dois lados'
          : 'Revelação encerrada';
        break;
      case 'ability':
        mark!.ability = !mark!.ability;
        label = 'Uso de Habilidade ajustado';
        break;
      case 'used':
        next.players[action.side].used[action.key] =
          !next.players[action.side].used[action.key];
        label = `Marcador ${action.key} do lado ${action.side === 0 ? 'A' : 'B'} ajustado`;
        break;
      case 'bench-limit':
        if (![5, 8].includes(action.limit))
          throw Error('Limite de Banco inválido.');
        next.players[action.side].benchLimit = action.limit;
        label = `Lado ${action.side === 0 ? 'A' : 'B'} definiu manualmente ${action.limit} posições de Banco`;
        break;
      case 'turn':
        next.current = session.mode === 'solo' ? 0 : other(next.current);
        next.turn++;
        next.players[next.current].used.energy = false;
        next.players[next.current].used.supporter = false;
        Object.entries(session.instances).forEach(([id, card]) => {
          if (card.owner === next.current) next.marks[id]!.ability = false;
        });
        label = `Turno ${next.turn} · lado ${next.current === 0 ? 'A' : 'B'}`;
        break;
      case 'study':
        next.study = action.value;
        label = action.value
          ? 'Estudo: revelar ambos os lados ativado'
          : 'Estudo encerrado: informações ocultas protegidas';
        break;
      case 'note':
        label = action.text.trim().slice(0, 200);
        if (!label) throw Error('Escreva uma anotação.');
        break;
    }
    const result: Session = {
      ...session,
      state: next,
      history: [...session.history, { before: session.state, label, at }].slice(
        -60,
      ),
    };
    assertBattle(result);
    return { session: result };
  } catch (error) {
    return {
      session,
      error: error instanceof Error ? error.message : 'Ação não aplicada.',
    };
  }
}
export function undo(session: Session): Session {
  const event = session.history.at(-1);
  return event
    ? { ...session, state: event.before, history: session.history.slice(0, -1) }
    : session;
}
export function visible(
  session: Session,
  id: string,
  perspective: Side,
  inspect = false,
): boolean {
  const card = session.instances[id];
  const mark = session.state.marks[id];
  if (!card || !mark) return false;
  if (session.state.study || mark.revealed) return true;
  const location = rootLocation(session.state, id);
  if (!location)
    return visible(
      session,
      session.state.links[id]!.parent,
      perspective,
      inspect,
    );
  if (location.zone === 'hand') return card.owner === perspective;
  if (location.zone === 'deck')
    return mark.faceUp || (inspect && card.owner === perspective);
  return mark.faceUp;
}
/** Fisher-Yates with rejection sampling. Inject RNG for deterministic tests. */
export function shuffled<T>(items: T[], uint32: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const range = i + 1;
    const limit = Math.floor(0x100000000 / range) * range;
    let n: number;
    do {
      n = uint32() >>> 0;
    } while (n >= limit);
    const index = n % range;
    [result[i], result[index]] = [result[index]!, result[i]!];
  }
  return result;
}
