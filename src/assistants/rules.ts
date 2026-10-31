import { Session, Side, BattleState, Zone } from "../battle/types";
import { Rules, Rule, Attack, Energy, AssistStep } from "./types";
import { printingKey } from "./profiles";
export const opponent = (side: Side): Side => (side === 0 ? 1 : 0);
export const ruleFor = (
  s: Session,
  id: string,
  rules: Rules,
): Rule | undefined => {
  const instance = s.instances[id];
  const card = instance && s.definitions[instance.cardId];
  return card ? rules[printingKey(card)] : undefined;
};
export const board = (s: Session, side: Side) => [
  ...s.state.players[side].zones.active,
  ...s.state.players[side].zones.bench,
];
export function attached(s: Session, id: string): string[] {
  return Object.keys(s.state.links).filter(
    (child) => s.state.links[child]!.parent === id,
  );
}
export function canPay(s: Session, id: string, attack: Attack, rules: Rules) {
  const energy = attached(s, id)
    .filter((child) => s.state.links[child]!.kind === "energy")
    .map((child) => ruleFor(s, child, rules)?.energy)
    .filter(Boolean) as Energy[];
  for (const cost of attack.cost.filter((c) => c !== "Colorless")) {
    const index = energy.indexOf(cost);
    if (index < 0) return false;
    energy.splice(index, 1);
  }
  return energy.length >= attack.cost.filter((c) => c === "Colorless").length;
}
export function damageAmount(
  s: Session,
  attacker: string,
  target: string,
  attack: Attack,
  rules: Rules,
) {
  const a = ruleFor(s, attacker, rules);
  const d = ruleFor(s, target, rules);
  let damage = attack.damage;
  if (
    s.state.players[s.instances[target]!.owner].zones.active.includes(target)
  ) {
    if (d?.weakness === a?.type) damage *= 2;
    if (d?.resistance === a?.type) damage = Math.max(0, damage - 30);
  }
  return damage;
}
export function cardValue(s: Session, id: string, rules: Rules) {
  const r = ruleFor(s, id, rules);
  if (!r) return 0;
  if (
    r.kind === "pokemon" &&
    r.stage &&
    board(s, s.instances[id]!.owner).some(
      (uid) => ruleFor(s, uid, rules)?.name === r.from,
    )
  )
    return 65;
  if (
    r.kind === "energy" &&
    !s.state.players[s.instances[id]!.owner].zones.hand.some(
      (uid) => ruleFor(s, uid, rules)?.energy === r.energy,
    )
  )
    return 40;
  if (r.kind === "pokemon")
    return (
      (r.stage === 0 ? 14 : 12) +
      (r.attacks?.length ?? 0) * 3 +
      (r.ability ? 12 : 0) +
      (r.name === "Dreepy" ? 8 : 0)
    );
  if (r.kind === "energy") return 16;
  return r.effect ? 18 : 3;
}
const firstTurn = (s: Session) =>
  s.mode === "solo" ? s.state.turn === 1 : s.state.turn <= 2;
const main = (s: Session) =>
  (s.state.training ??= {
    bot: false,
    started: false,
    drawnAt: [0, 0],
    attackedAt: [0, 0],
    checkup: false,
  });
function take(s: Session, id: string) {
  for (const p of s.state.players)
    for (const cards of Object.values(p.zones)) {
      const i = cards.indexOf(id);
      if (i >= 0) {
        cards.splice(i, 1);
        return;
      }
    }
  if (s.state.links[id]) {
    delete s.state.links[id];
    return;
  }
  throw Error("Carta ausente.");
}
function place(s: Session, id: string, zone: Zone, reveal = false) {
  take(s, id);
  s.state.players[s.instances[id]!.owner].zones[zone].push(id);
  s.state.marks[id] = {
    damage: 0,
    conditions: [],
    ability: false,
    faceUp: !["deck", "prizes"].includes(zone),
    revealed: reveal,
    ...(["active", "bench"].includes(zone)
      ? { enteredTurn: s.state.turn }
      : {}),
  };
}
function shuffleDeck(s: Session, side: Side, rng: () => number) {
  const d = s.state.players[side].zones.deck;
  for (let i = d.length - 1; i > 0; i--) {
    const limit = Math.floor(0x100000000 / (i + 1)) * (i + 1);
    let n;
    do {
      n = rng() >>> 0;
    } while (n >= limit);
    const j = n % (i + 1);
    [d[i], d[j]] = [d[j]!, d[i]!];
  }
}
function draw(s: Session, side: Side, count: number) {
  for (let i = 0; i < count; i++) {
    const id = s.state.players[side].zones.deck[0];
    if (!id) break;
    place(s, id, "hand");
  }
}
function searchBasics(
  s: Session,
  side: Side,
  rules: Rules,
  max: number,
  hp = 999,
) {
  const p = s.state.players[side];
  const available = p.zones.deck
    .filter((id) => {
      const r = ruleFor(s, id, rules);
      return r?.kind === "pokemon" && r.stage === 0 && (r.hp ?? 999) <= hp;
    })
    .sort((a, b) => cardValue(s, b, rules) - cardValue(s, a, rules));
  for (const id of available.slice(
    0,
    Math.min(max, (p.benchLimit ?? 5) - p.zones.bench.length),
  ))
    place(s, id, "bench");
}
function evolve(
  s: Session,
  id: string,
  target: string,
  rules: Rules,
  candy = false,
) {
  const r = ruleFor(s, id, rules),
    base = ruleFor(s, target, rules);
  const side = s.instances[id]!.owner;
  const p = s.state.players[side];
  if (
    !p.zones.hand.includes(id) ||
    !board(s, side).includes(target) ||
    r?.kind !== "pokemon" ||
    base?.kind !== "pokemon" ||
    firstTurn(s) ||
    (s.state.marks[target]!.enteredTurn ?? s.state.turn) >= s.state.turn
  )
    throw Error("Evolução indisponível: confira estágio e turno de entrada.");
  if (
    candy
      ? r.stage !== 2 || r.basic !== base.name || base.stage !== 0
      : r.from !== base.name || r.stage !== (base.stage ?? 0) + 1
  )
    throw Error("Cadeia de evolução incompatível.");
  take(s, id);
  const z = p.zones.active.includes(target) ? p.zones.active : p.zones.bench;
  z[z.indexOf(target)] = id;
  Object.values(s.state.links).forEach((link) => {
    if (link.parent === target) link.parent = id;
  });
  s.state.links[target] = { parent: id, kind: "evolution" };
  s.state.marks[id] = {
    ...s.state.marks[id]!,
    damage: s.state.marks[target]!.damage,
    conditions: [],
    ability: false,
    faceUp: true,
    revealed: false,
    enteredTurn: s.state.turn,
  };
  s.state.marks[target]!.damage = 0;
}
function knockout(s: Session, target: string, winner: Side, rules: Rules) {
  const r = ruleFor(s, target, rules);
  if (!r?.hp || s.state.marks[target]!.damage < r.hp) return;
  const descendants = (id: string): string[] =>
    attached(s, id).flatMap((child) => [child, ...descendants(child)]);
  const all = [target, ...descendants(target)];
  for (const id of all) place(s, id, "discard");
  for (let i = 0; i < (r.prizes ?? 1); i++) {
    const prize = s.state.players[winner].zones.prizes[0];
    if (prize) place(s, prize, "hand");
  }
  const defeated = opponent(winner);
  if (
    main(s).started &&
    (!s.state.players[winner].zones.prizes.length || !board(s, defeated).length)
  )
    main(s).winner = winner;
  // The robot chooses its own promotion. The human always chooses manually.
  if (
    defeated === 1 &&
    main(s).bot &&
    !s.state.players[1].zones.active.length &&
    s.state.players[1].zones.bench.length
  ) {
    const choice = [...s.state.players[1].zones.bench].sort(
      (a, b) => cardValue(s, b, rules) - cardValue(s, a, rules),
    )[0]!;
    take(s, choice);
    s.state.players[1].zones.active.push(choice);
  }
}
export function applyAssist(
  s: Session,
  step: AssistStep,
  rules: Rules,
  rng: () => number,
): string {
  const side = step.side,
    p = s.state.players[side],
    q = s.state.players[opponent(side)],
    t = main(s);
  if (step.kind === "bot-off") {
    t.bot = false;
    return "Robô desativado: mesa manual mantida";
  }
  if (step.kind === "checkup") {
    t.checkup = false;
    return "Checkup confirmado manualmente";
  }
  if (t.winner !== undefined)
    throw Error("Treino encerrado. Inicie outra mesa para continuar.");
  if (step.kind === "begin") {
    if (
      !s.state.players[0].zones.active.length ||
      !s.state.players[1].zones.active.length
    )
      throw Error("Escolha um Básico no Ativo de cada lado antes de começar.");
    for (const player of s.state.players) {
      const r = ruleFor(s, player.zones.active[0]!, rules);
      if (r?.stage !== 0)
        throw Error("O Ativo inicial precisa de perfil de Pokémon Básico.");
    }
    t.started = true;
    return "Partida assistida iniciada · jogador A começa";
  }
  if (s.state.current !== side) throw Error("Aguarde o turno deste lado.");
  if (t.checkup)
    throw Error("Resolva o Checkup manual e confirme antes de continuar.");
  if (step.kind === "draw-turn") {
    if (t.drawnAt[side] === s.state.turn)
      throw Error("A compra deste turno já foi feita.");
    t.drawnAt[side] = s.state.turn;
    if (!p.zones.deck.length) {
      t.winner = opponent(side);
      return "Derrota por não poder comprar no início do turno";
    }
    draw(s, side, 1);
    return `Lado ${side === 0 ? "A" : "B"} comprou a carta do turno`;
  }
  if (step.kind === "pass") {
    if (!p.zones.active.length || !q.zones.active.length)
      throw Error("Resolva a promoção do Ativo antes de passar o turno.");
    t.checkup = s.state.players.some((player) =>
      player.zones.active.some(
        (id) => s.state.marks[id]!.conditions.length > 0,
      ),
    );
    s.state.current = s.mode === "solo" ? side : opponent(side);
    s.state.turn++;
    const next = s.state.players[s.state.current];
    next.used.energy = false;
    next.used.supporter = false;
    board(s, s.state.current).forEach((id) => {
      s.state.marks[id]!.ability = false;
    });
    return t.checkup
      ? "Turno encerrado · Checkup pendente de resolução manual"
      : `Turno ${s.state.turn} · lado ${s.state.current === 0 ? "A" : "B"}`;
  }
  if (t.attackedAt[side] === s.state.turn)
    throw Error("O ataque encerrou as ações deste turno. Passe o turno.");
  if (!("id" in step)) throw Error("Ação inválida.");
  const id = step.id;
  const r = ruleFor(s, id, rules);
  if (!r || s.instances[id]?.owner !== side)
    throw Error("Carta sem perfil compatível com este lado.");
  if (step.kind === "bench" || step.kind === "promote") {
    if (!p.zones.hand.includes(id) && !p.zones.bench.includes(id))
      throw Error("Pokémon indisponível.");
    if (r.kind !== "pokemon" || (p.zones.hand.includes(id) && r.stage !== 0))
      throw Error("É necessário um Básico para entrar da mão.");
    if (step.kind === "promote" && p.zones.active.length)
      throw Error("Ativo ocupado.");
    if (step.kind === "bench" && p.zones.bench.length >= (p.benchLimit ?? 5))
      throw Error("Banco cheio.");
    const existing = p.zones.bench.includes(id)
      ? { ...s.state.marks[id]! }
      : null;
    place(s, id, step.kind === "bench" ? "bench" : "active");
    if (existing) s.state.marks[id] = existing;
    return step.kind === "bench"
      ? "Básico colocado no Banco"
      : "Pokémon promovido ao Ativo";
  }
  if (step.kind === "energy") {
    if (
      r.kind !== "energy" ||
      !p.zones.hand.includes(id) ||
      !step.target ||
      !board(s, side).includes(step.target) ||
      p.used.energy
    )
      throw Error("Ligação de Energia indisponível.");
    take(s, id);
    s.state.links[id] = { parent: step.target, kind: "energy" };
    p.used.energy = true;
    return "Energia ligada · ação do turno marcada";
  }
  if (step.kind === "retreat") {
    const costs = attached(s, id).filter(
      (uid) =>
        s.state.links[uid]!.kind === "energy" &&
        ruleFor(s, uid, rules)?.kind === "energy",
    );
    if (
      !p.zones.active.includes(id) ||
      !step.target ||
      !p.zones.bench.includes(step.target) ||
      r.retreat === undefined ||
      (t.retreatAt?.[side] ?? 0) === s.state.turn ||
      costs.length < r.retreat ||
      s.state.marks[id]!.conditions.some((c) =>
        ["Adormecido", "Paralisado"].includes(c),
      )
    )
      throw Error("Recuo indisponível.");
    if (
      s.state.players.some((player) => player.zones.stadium.length) ||
      attached(s, id).some((uid) => s.state.links[uid]!.kind === "tool")
    )
      throw Error("Modificadores de recuo exigem resolução manual.");
    costs.slice(0, r.retreat).forEach((uid) => place(s, uid, "discard"));
    const index = p.zones.bench.indexOf(step.target);
    p.zones.bench[index] = id;
    p.zones.active[0] = step.target;
    s.state.marks[id]!.conditions = [];
    t.retreatAt ??= [0, 0];
    t.retreatAt[side] = s.state.turn;
    return "Recuo realizado e custo descartado";
  }
  if (step.kind === "evolve") {
    if (!step.target) throw Error("Escolha o Pokémon anterior.");
    evolve(s, id, step.target, rules);
    return "Evolução realizada";
  }
  if (step.kind === "ability") {
    if (
      !board(s, side).includes(id) ||
      s.state.marks[id]!.ability ||
      !r.ability
    )
      throw Error("Habilidade indisponível.");
    if (
      r.ability === "quick-search" &&
      board(s, side).some(
        (other) =>
          ruleFor(s, other, rules)?.ability === "quick-search" &&
          s.state.marks[other]!.ability,
      )
    )
      throw Error("Quick Search já utilizada neste turno.");
    s.state.marks[id]!.ability = true;
    if (r.ability === "recon") {
      const top = p.zones.deck
        .slice(0, 2)
        .sort((a, b) => cardValue(s, b, rules) - cardValue(s, a, rules));
      if (!top.length) throw Error("Baralho vazio.");
      place(s, top[0]!, "hand");
      if (top[1]) {
        take(s, top[1]);
        p.zones.deck.push(top[1]);
      }
    } else {
      const best = [...p.zones.deck].sort(
        (a, b) => cardValue(s, b, rules) - cardValue(s, a, rules),
      )[0];
      if (!best) throw Error("Baralho vazio.");
      place(s, best, "hand");
      shuffleDeck(s, side, rng);
    }
    return "Habilidade de busca resolvida · escolha mantida privada";
  }
  if (step.kind === "trainer") {
    if (!p.zones.hand.includes(id) || !r.effect)
      throw Error("Treinador não suportado.");
    if (
      r.kind === "supporter" &&
      (p.used.supporter || (side === 0 && s.state.turn === 1))
    )
      throw Error("Apoiador indisponível neste turno.");
    if (
      ["nest", "poffin"].includes(r.effect) &&
      p.zones.bench.length >= (p.benchLimit ?? 5)
    )
      throw Error("Banco cheio.");
    const otherCards = p.zones.hand.filter((card) => card !== id);
    if (r.effect === "ultra" && otherCards.length < 2)
      throw Error("Ultra Ball precisa de duas outras cartas para descartar.");
    if (r.effect === "candy") {
      if (!step.target) throw Error("Escolha o Básico para Rare Candy.");
      const candidate = p.zones.hand.find((card) => {
        const q = ruleFor(s, card, rules);
        return (
          q?.stage === 2 && q.basic === ruleFor(s, step.target!, rules)?.name
        );
      });
      if (!candidate) throw Error("Não há Estágio 2 compatível na mão.");
      evolve(s, candidate, step.target, rules, true);
    }
    place(s, id, "discard");
    if (r.kind === "supporter") p.used.supporter = true;
    if (r.effect === "nest" || r.effect === "poffin") {
      searchBasics(
        s,
        side,
        rules,
        r.effect === "poffin" ? 2 : 1,
        r.effect === "poffin" ? 70 : 999,
      );
      shuffleDeck(s, side, rng);
    }
    if (r.effect === "ultra") {
      otherCards
        .sort((a, b) => cardValue(s, a, rules) - cardValue(s, b, rules))
        .slice(0, 2)
        .forEach((card) => place(s, card, "discard"));
      const best = p.zones.deck
        .filter((card) => ruleFor(s, card, rules)?.kind === "pokemon")
        .sort((a, b) => cardValue(s, b, rules) - cardValue(s, a, rules))[0];
      if (best) place(s, best, "hand", true);
      shuffleDeck(s, side, rng);
    }
    if (r.effect === "draw3") draw(s, side, 3);
    if (r.effect === "research") {
      [...p.zones.hand].forEach((card) => place(s, card, "discard"));
      draw(s, side, 7);
    }
    if (r.effect === "iono")
      for (const who of [0, 1] as Side[]) {
        const player = s.state.players[who];
        const cards = [...player.zones.hand];
        for (let i = cards.length - 1; i > 0; i--) {
          const limit = Math.floor(0x100000000 / (i + 1)) * (i + 1);
          let value;
          do {
            value = rng() >>> 0;
          } while (value >= limit);
          const j = value % (i + 1);
          [cards[i], cards[j]] = [cards[j]!, cards[i]!];
        }
        cards.forEach((card) => place(s, card, "deck"));
        draw(s, who, player.zones.prizes.length);
      }
    if (r.effect === "arven") {
      for (const kind of ["item", "tool"]) {
        const card = p.zones.deck
          .filter((uid) => ruleFor(s, uid, rules)?.kind === kind)
          .sort((a, b) => cardValue(s, b, rules) - cardValue(s, a, rules))[0];
        if (card) place(s, card, "hand", true);
      }
      shuffleDeck(s, side, rng);
    }
    return `Treinador ${s.definitions[s.instances[id]!.cardId]!.name} resolvido`;
  }
  if (step.kind === "attack") {
    if (
      !p.zones.active.includes(id) ||
      (side === 0 && s.state.turn === 1) ||
      t.attackedAt[side] === s.state.turn
    )
      throw Error("Ataque indisponível neste turno.");
    if (
      s.state.marks[id]!.conditions.some((c) =>
        ["Adormecido", "Paralisado", "Confuso"].includes(c),
      )
    )
      throw Error(
        "Resolva manualmente a condição que impede ou altera o ataque.",
      );
    const a = r.attacks?.[step.attack];
    if (!a || !canPay(s, id, a, rules))
      throw Error("Custo do ataque não disponível.");
    const target = step.target ?? q.zones.active[0];
    if (
      !target ||
      !board(s, opponent(side)).includes(target) ||
      !ruleFor(s, target, rules)?.hp ||
      !s.state.marks[target]!.faceUp
    )
      throw Error("Alvo sem perfil público de HP. Resolva manualmente.");
    if (a.effect !== "arrow" && !q.zones.active.includes(target))
      throw Error("Este ataque exige o Ativo como alvo.");
    if (
      a.effect === "phantom" &&
      q.zones.bench.some(
        (card) => !ruleFor(s, card, rules)?.hp || !s.state.marks[card]!.faceUp,
      )
    )
      throw Error(
        "Há Pokémon do Banco sem perfil público para distribuir os marcadores.",
      );
    s.state.marks[target]!.damage += damageAmount(s, id, target, a, rules);
    t.attackedAt[side] = s.state.turn;
    if (a.effect === "phantom" && q.zones.bench.length) {
      for (let n = 0; n < 6; n++) {
        const targets = [...q.zones.bench].filter(
          (uid) =>
            s.state.marks[uid]!.damage < (ruleFor(s, uid, rules)!.hp ?? 0),
        );
        const chosen =
          targets.sort(
            (x, y) =>
              (ruleFor(s, x, rules)!.hp ?? 0) -
              s.state.marks[x]!.damage -
              ((ruleFor(s, y, rules)!.hp ?? 0) - s.state.marks[y]!.damage),
          )[0] ?? q.zones.bench[0]!;
        s.state.marks[chosen]!.damage += 10;
      }
    }
    if (a.effect === "family") {
      searchBasics(s, side, rules, 2);
      shuffleDeck(s, side, rng);
    }
    for (const card of [...board(s, opponent(side))])
      knockout(s, card, side, rules);
    return `${r.name ?? "Pokémon"} usou ${a.name}`;
  }
  throw Error("Ação assistida não reconhecida.");
}
