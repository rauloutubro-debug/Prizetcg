import { test } from "node:test";
import assert from "node:assert/strict";
import { demoDeck } from "../src/domain/demo";
import {
  createSession,
  execute,
  assertBattle,
  undo,
  visible,
} from "../src/battle/engine";
import { Session, Side, BattleAction } from "../src/battle/types";
import { defaultRules, printingKey } from "../src/assistants/profiles";
import { analyze, applyPlan, fingerprint } from "../src/assistants/planner";
import { advanceRobot } from "../src/assistants/robot";
import { canPay, ruleFor } from "../src/assistants/rules";
import { AssistStep } from "../src/assistants/types";
let seed = 42;
const rng = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
const fresh = () => {
  const s = createSession(demoDeck, demoDeck, "assistant-test");
  return execute(s, {
    type: "setup",
    orders: s.state.players.map((p) => [...p.zones.deck]) as [
      string[],
      string[],
    ],
  }).session;
};
const run = (s: Session, a: BattleAction) => {
  const r = execute(s, a);
  assert.equal(r.error, undefined);
  assertBattle(r.session);
  return r.session;
};
const act = (s: Session, step: AssistStep) =>
  run(s, { type: "assist", step, rules: defaultRules, random: rng });
function find(s: Session, side: Side, key: string, exclude: string[] = []) {
  const id = Object.keys(s.instances).find(
    (id) =>
      s.instances[id]!.owner === side &&
      printingKey(s.definitions[s.instances[id]!.cardId]!) === key &&
      !exclude.includes(id),
  );
  assert.ok(id, key);
  return id;
}
function ready() {
  let s = fresh();
  for (const side of [0, 1] as Side[]) {
    const id = find(s, side, "TWM:128");
    s = run(s, { type: "move", id, zone: "active" });
  }
  s.state.training = {
    bot: true,
    started: false,
    drawnAt: [0, 0],
    attackedAt: [0, 0],
    checkup: false,
  };
  return s;
}
test("robô começa, compra uma vez e joga turnos reais conservando 120 cópias", () => {
  let s = ready();
  const begun = advanceRobot(s, defaultRules, rng, "begin");
  assert.equal(begun.error, undefined);
  s = begun.session;
  assert.equal(s.state.players[0].zones.hand.length, 7);
  const same = advanceRobot(s, defaultRules, rng, "resume");
  assert.deepEqual(same.session.state, s.state);
  let attacked = false;
  for (let i = 0; i < 8 && s.state.training!.winner === undefined; i++) {
    const r = advanceRobot(s, defaultRules, rng, "end");
    s = r.session;
    assertBattle(s);
    assert.equal(Object.keys(s.instances).length, 120);
    attacked ||= s.history.some((h) => h.label.includes("usou"));
    if (r.error) {
      assert.match(r.error, /promoção|Checkup/);
      break;
    }
    if (s.state.training!.winner === undefined)
      assert.equal(s.state.current, 0);
  }
  assert.ok(attacked, "Robô deve realizar ao menos um ataque");
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  assertBattle(undo(s));
});
test("planner ignora mão inimiga, ordem do próprio baralho e identidades dos Prêmios", () => {
  const s = ready();
  const a = analyze(s, 0, defaultRules);
  const hidden = JSON.parse(JSON.stringify(s)) as Session;
  hidden.state.players[0].zones.deck.reverse();
  hidden.state.players[0].zones.prizes.reverse();
  const enemy = hidden.state.players[1].zones;
  [enemy.hand[0], enemy.deck[0]] = [enemy.deck[0]!, enemy.hand[0]!];
  enemy.prizes.reverse();
  assertBattle(hidden);
  assert.deepEqual(analyze(hidden, 0, defaultRules), a);
  assert.ok(enemy.hand.every((id) => !visible(hidden, id, 0)));
  assert.ok(a.searched <= 180);
});
test("plano obsoleto é recusado e plano válido pode ser desfeito", () => {
  const s = ready(),
    plan = analyze(s, 0, defaultRules).plans[0]!;
  assert.ok(plan);
  const changed = run(s, { type: "note", text: "nota" }); // notes preserve state and don't invalidate a state-based plan
  assert.equal(fingerprint(changed), fingerprint(s));
  const newer = run(s, { type: "draw", side: 0, count: 1 });
  const r = applyPlan(newer, plan, fingerprint(s), defaultRules, rng);
  assert.ok(r.error);
  assert.equal(r.session, newer);
  const valid = applyPlan(s, plan, fingerprint(s), defaultRules, rng);
  assert.equal(valid.error, undefined);
  assertBattle(valid.session);
  let restored = valid.session;
  for (let i = 0; i < plan.steps.length; i++) restored = undo(restored);
  assert.deepEqual(restored.state, s.state);
});
test("custos tipados, ligação única, evolução e primeiro turno são validados atomicamente", () => {
  let s = ready();
  const active = s.state.players[0].zones.active[0]!;
  const fire = find(s, 0, "SVE:2"),
    psychic = find(s, 0, "SVE:5"),
    evo = find(s, 0, "TWM:129");
  for (const id of [fire, psychic, evo])
    s = run(s, { type: "move", id, zone: "hand" });
  s = act(s, { kind: "energy", side: 0, id: fire, target: active });
  assert.equal(
    canPay(
      s,
      active,
      ruleFor(s, active, defaultRules)!.attacks![0]!,
      defaultRules,
    ),
    false,
  );
  assert.ok(
    execute(s, {
      type: "assist",
      step: { kind: "energy", side: 0, id: psychic, target: active },
      rules: defaultRules,
    }).error,
  );
  assert.ok(
    execute(s, {
      type: "assist",
      step: { kind: "evolve", side: 0, id: evo, target: active },
      rules: defaultRules,
    }).error,
  );
  s = run(s, { type: "turn" });
  s = run(s, { type: "turn" });
  s = act(s, { kind: "energy", side: 0, id: psychic, target: active });
  s = act(s, { kind: "evolve", side: 0, id: evo, target: active });
  assert.equal(
    canPay(s, evo, ruleFor(s, evo, defaultRules)!.attacks![0]!, defaultRules),
    true,
  );
});
test("ataque, Nocaute, Prêmios e encerramento de ações usam histórico reversível", () => {
  let s = ready();
  s = run(s, { type: "turn" });
  s = run(s, { type: "turn" });
  const dragon = find(s, 0, "TWM:130");
  s = run(s, {
    type: "move",
    id: s.state.players[0].zones.active[0]!,
    zone: "bench",
  });
  s = run(s, { type: "move", id: dragon, zone: "active" });
  const fire = find(s, 0, "SVE:2"),
    psychic = find(s, 0, "SVE:5");
  for (const id of [fire, psychic])
    s = run(s, { type: "attach", id, parent: dragon, kind: "energy" });
  const target = s.state.players[1].zones.active[0]!;
  const bench = find(s, 1, "MEW:16");
  s = run(s, { type: "move", id: bench, zone: "bench" });
  s.state.training!.started = true;
  const before = s;
  s = act(s, { kind: "attack", side: 0, id: dragon, attack: 1, target });
  assert.ok(s.state.players[1].zones.discard.includes(target));
  assert.ok(s.state.players[1].zones.discard.includes(bench));
  assert.equal(
    s.state.players[0].zones.prizes.length,
    before.state.players[0].zones.prizes.length - 2,
  );
  assert.equal(s.state.training!.winner, 0);
  assert.deepEqual(undo(s).state, before.state);
  assert.ok(
    execute(s, {
      type: "assist",
      step: { kind: "energy", side: 0, id: fire, target: dragon },
      rules: defaultRules,
    }).error,
  );
});
test("promoção conserva dano e anexos; recuo paga custo e limita uma vez por turno", () => {
  let s = ready();
  const old = s.state.players[0].zones.active[0]!,
    bench = find(s, 0, "MEW:16"),
    energy = find(s, 0, "SVE:2");
  s = run(s, { type: "move", id: bench, zone: "bench" });
  s = run(s, { type: "damage", id: bench, delta: 20 });
  s = run(s, { type: "attach", id: energy, parent: old, kind: "energy" });
  s = act(s, { kind: "retreat", side: 0, id: old, target: bench });
  assert.equal(s.state.marks[bench]!.damage, 20);
  assert.ok(s.state.players[0].zones.discard.includes(energy));
  assert.ok(
    execute(s, {
      type: "assist",
      step: { kind: "retreat", side: 0, id: bench, target: old },
      rules: defaultRules,
    }).error,
  );
  s = run(s, { type: "move", id: bench, zone: "bench" });
  s = act(s, { kind: "promote", side: 0, id: bench });
  assert.equal(s.state.marks[bench]!.damage, 20);
});
test("busca encerra a previsão; Checkup e mulligan interrompem o robô sem inventar efeitos", () => {
  let s = ready();
  const nest = find(s, 0, "SVI:181");
  s = run(s, { type: "move", id: nest, zone: "hand" });
  for (const plan of analyze(s, 0, defaultRules).plans)
    for (let i = 0; i < plan.steps.length - 1; i++)
      assert.ok(
        !["ability", "trainer", "attack"].includes(plan.steps[i]!.kind) ||
          (plan.steps[i]!.kind === "trainer" &&
            ruleFor(s, (plan.steps[i] as any).id, defaultRules)?.effect ===
              "candy"),
      );
  s = run(s, {
    type: "condition",
    id: s.state.players[0].zones.active[0]!,
    condition: "Envenenado",
  });
  s.state.training!.started = true;
  const r = advanceRobot(s, defaultRules, rng, "end");
  assert.match(r.error!, /Checkup/);
  assert.equal(r.session.state.training!.checkup, true);
  assertBattle(r.session);
  let none = fresh();
  for (const id of [...none.state.players[1].zones.hand])
    none = run(none, { type: "move", id, zone: "deck" });
  none.state.training = {
    bot: true,
    started: false,
    drawnAt: [0, 0],
    attackedAt: [0, 0],
    checkup: false,
  };
  assert.match(
    advanceRobot(none, defaultRules, rng, "begin").error!,
    /mulligan/,
  );
});
