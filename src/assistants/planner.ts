import { execute, visible } from "../battle/engine";
import { Session, Side } from "../battle/types";
import { AssistStep, Rules } from "./types";
import {
  board,
  ruleFor,
  attached,
  canPay,
  damageAmount,
  opponent,
} from "./rules";

export type Plan = {
  steps: AssistStep[];
  title: string;
  reason: string;
  score: number;
};
export const fingerprint = (s: Session) => JSON.stringify([s.id, s.state]);
const name = (s: Session, id: string) =>
  s.definitions[s.instances[id]!.cardId]!.name;
type Candidate = {
  step: AssistStep;
  title: string;
  reason: string;
  score: number;
  terminal?: boolean;
};
/** Only the actor's hand, visible board, and zone COUNTS inform the ranking.
 * Search/draw effects terminate a line: their unknown results are never simulated. */
function candidates(s: Session, side: Side, rules: Rules): Candidate[] {
  const p = s.state.players[side],
    q = s.state.players[opponent(side)],
    t = s.state.training;
  if (
    s.state.current !== side ||
    t?.checkup ||
    t?.winner !== undefined ||
    t?.attackedAt[side] === s.state.turn
  )
    return [];
  const result: Candidate[] = [];
  const add = (
    step: AssistStep,
    title: string,
    score: number,
    reason: string,
    terminal = false,
  ) => result.push({ step, title, score, reason, terminal });
  const targets = board(s, side).filter((id) => visible(s, id, side));
  for (const id of p.zones.hand) {
    const r = ruleFor(s, id, rules);
    if (!r) continue;
    if (r.kind === "pokemon") {
      if (r.stage === 0 && p.zones.bench.length < (p.benchLimit ?? 5))
        add(
          { kind: "bench", side, id },
          `Banco: ${name(s, id)}`,
          p.zones.bench.length < 2 ? 16 : 3,
          "Amplia as opções de evolução e protege contra ficar sem Pokémon.",
        );
      if (!p.zones.active.length && r.stage === 0)
        add(
          { kind: "promote", side, id },
          `Ativo: ${name(s, id)}`,
          90,
          "Preenche o Ativo vazio.",
        );
      for (const target of targets)
        if (r.from === ruleFor(s, target, rules)?.name)
          add(
            { kind: "evolve", side, id, target },
            `Evoluir para ${name(s, id)}`,
            30 + (r.ability ? 12 : 0),
            "Aumenta HP e libera os ataques ou Habilidades conhecidos.",
          );
    }
    if (r.kind === "energy" && !p.used.energy)
      for (const target of targets) {
        const attacks = ruleFor(s, target, rules)?.attacks ?? [];
        const active = p.zones.active.includes(target);
        const currently = attacks.some((a) => canPay(s, target, a, rules));
        const energies = attached(s, target).map(
          (uid) => ruleFor(s, uid, rules)?.energy,
        );
        const useful =
          attacks.some(
            (a) =>
              a.cost.includes(r.energy!) &&
              energies.filter((e) => e === r.energy).length <
                a.cost.filter((e) => e === r.energy).length,
          ) || attacks.some((a) => a.cost.includes("Colorless"));
        const simulation = execute(s, {
          type: "assist",
          step: { kind: "energy", side, id, target },
          rules,
        });
        const unlocks =
          !simulation.error &&
          !currently &&
          attacks.some((a) => canPay(simulation.session, target, a, rules));
        add(
          { kind: "energy", side, id, target },
          `Ligar ${name(s, id)} em ${name(s, target)}`,
          (active ? (useful ? 23 : 3) : useful ? 10 : 2) + (unlocks ? 32 : 0),
          "Usa a ligação do turno para preparar um ataque; a busca compara a sequência com as Energias atuais.",
        );
      }
    if (r.effect && ["item", "supporter"].includes(r.kind)) {
      if (
        r.kind === "supporter" &&
        (p.used.supporter || (side === 0 && s.state.turn === 1))
      )
        continue;
      if (r.effect === "candy") {
        for (const target of targets)
          add(
            { kind: "trainer", side, id, target },
            `Rare Candy em ${name(s, target)}`,
            39,
            "Evolui um Básico elegível usando o Estágio 2 da mão.",
          );
        continue;
      }
      if (
        ["nest", "poffin"].includes(r.effect) &&
        p.zones.bench.length >= (p.benchLimit ?? 5)
      )
        continue;
      if (r.effect === "ultra" && p.zones.hand.length < 3) continue;
      const score = ["nest", "poffin"].includes(r.effect)
        ? p.zones.bench.length < 2
          ? 25
          : 2
        : r.effect === "arven"
          ? 20
          : r.effect === "ultra"
            ? 8
            : p.zones.hand.length <= 4
              ? 24
              : 1;
      add(
        { kind: "trainer", side, id },
        `Usar ${name(s, id)}`,
        score,
        "Resolve o efeito suportado e analisa novamente após a busca ou compra. O conteúdo desconhecido do baralho não é usado na previsão.",
        true,
      );
    }
  }
  if (!p.zones.active.length)
    for (const id of p.zones.bench)
      add(
        { kind: "promote", side, id },
        `Promover ${name(s, id)}`,
        100,
        "É necessário promover um Ativo antes de continuar.",
      );
  const active = p.zones.active[0];
  if (
    active &&
    !ruleFor(s, active, rules)?.attacks?.some((a) =>
      canPay(s, active, a, rules),
    )
  )
    for (const target of p.zones.bench)
      if (
        ruleFor(s, target, rules)?.attacks?.some((a) =>
          canPay(s, target, a, rules),
        )
      )
        add(
          { kind: "retreat", side, id: active, target },
          `Recuar para ${name(s, target)}`,
          24,
          "Troca o Ativo por um Pokémon pronto para atacar, pagando o recuo conhecido.",
        );
  for (const id of targets) {
    const r = ruleFor(s, id, rules);
    if (!r) continue;
    if (
      r.ability &&
      !s.state.marks[id]!.ability &&
      p.zones.deck.length &&
      !(
        r.ability === "quick-search" &&
        targets.some(
          (other) =>
            ruleFor(s, other, rules)?.ability === "quick-search" &&
            s.state.marks[other]!.ability,
        )
      )
    )
      add(
        { kind: "ability", side, id },
        `Habilidade: ${name(s, id)}`,
        28,
        "Obtém recursos legalmente e recalcula com as cartas então conhecidas.",
        true,
      );
    if (
      !p.zones.active.includes(id) ||
      (side === 0 && s.state.turn === 1) ||
      s.state.marks[id]!.conditions.some((c) =>
        ["Adormecido", "Paralisado", "Confuso"].includes(c),
      )
    )
      continue;
    (r.attacks ?? []).forEach((a, attack) => {
      if (!canPay(s, id, a, rules)) return;
      for (const target of a.effect === "arrow"
        ? board(s, opponent(side))
        : q.zones.active) {
        const d = ruleFor(s, target, rules);
        if (!d?.hp || !visible(s, target, side)) continue;
        if (
          a.effect === "phantom" &&
          q.zones.bench.some(
            (uid) => !ruleFor(s, uid, rules)?.hp || !visible(s, uid, side),
          )
        )
          continue;
        const damage = damageAmount(s, id, target, a, rules);
        const ko = damage + s.state.marks[target]!.damage >= d.hp;
        add(
          { kind: "attack", side, id, attack, target },
          `${a.name} → ${name(s, target)}`,
          damage / 4 +
            (ko ? 55 * (d.prizes ?? 1) : 0) +
            (a.effect === "phantom" && q.zones.bench.length ? 15 : 0) +
            (a.effect === "family" && p.zones.bench.length < 3 ? 25 : 0),
          `${damage} de dano previsto${ko ? " e possível Nocaute" : ""}. Considera apenas HP e efeitos suportados; encerra as ações do turno.`,
          true,
        );
      }
    });
  }
  return result;
}
export function analyze(
  s: Session,
  side: Side,
  rules: Rules,
): { plans: Plan[]; searched: number } {
  let searched = 0;
  const all: Plan[] = [];
  let beam = [
    { s, steps: [] as AssistStep[], titles: [] as string[], score: 0 },
  ];
  // Width 6, depth 3, at most 180 evaluations. No stochastic lookahead.
  for (let depth = 0; depth < 3; depth++) {
    const next: typeof beam = [];
    for (const node of beam)
      for (const c of candidates(node.s, side, rules)
        .sort((a, b) => b.score - a.score)
        .slice(0, 70)) {
        if (searched >= 180) break;
        searched++;
        let after = node.s;
        if (!c.terminal) {
          const result = execute(node.s, {
            type: "assist",
            step: c.step,
            rules,
          });
          if (result.error) continue;
          after = result.session;
        }
        const score = node.score + c.score;
        const steps = [...node.steps, c.step],
          titles = [...node.titles, c.title];
        all.push({ steps, title: titles.join(" → "), reason: c.reason, score });
        if (!c.terminal) next.push({ s: after, steps, titles, score });
      }
    beam = next.sort((a, b) => b.score - a.score).slice(0, 6);
    if (searched >= 180) break;
  }
  const seen = new Set<string>();
  const plans = all
    .sort((a, b) => b.score - a.score)
    .filter((p) => {
      const k = JSON.stringify(p.steps[0]);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 3);
  return { plans, searched };
}
export function applyPlan(
  s: Session,
  plan: Plan,
  expected: string,
  rules: Rules,
  rng: () => number,
) {
  if (fingerprint(s) !== expected)
    return {
      session: s,
      error: "A mesa mudou. Analise novamente antes de aplicar.",
    };
  let current = s;
  for (const step of plan.steps) {
    const result = execute(current, {
      type: "assist",
      step,
      rules,
      random: rng,
    });
    if (result.error) return { session: s, error: result.error };
    current = result.session;
  }
  return { session: current };
}
