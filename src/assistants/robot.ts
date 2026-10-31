import { execute } from "../battle/engine";
import { Session, Side } from "../battle/types";
import { Rules, AssistStep } from "./types";
import { ruleFor, cardValue } from "./rules";
import { analyze } from "./planner";

export function prepareRobot(s: Session, rules: Rules) {
  if (!s.state.players[1].zones.active.length) {
    const basic = [...s.state.players[1].zones.hand]
      .filter((id) => ruleFor(s, id, rules)?.stage === 0)
      .sort((a, b) => cardValue(s, b, rules) - cardValue(s, a, rules))[0];
    if (basic)
      s = execute(s, { type: "move", id: basic, zone: "active" }).session;
  }
  return s;
}
/** Explicit button-driven runner. Undo never restarts this loop. */
export function advanceRobot(
  s: Session,
  rules: Rules,
  rng: () => number,
  command: "begin" | "end" | "resume",
) {
  let current = s;
  let message = "";
  const step = (action: AssistStep) => {
    const r = execute(current, {
      type: "assist",
      step: action,
      rules,
      random: rng,
    });
    if (r.error) {
      message = r.error;
      return false;
    }
    current = r.session;
    return true;
  };
  if (command === "begin") {
    current = prepareRobot(current, rules);
    if (!current.state.players[1].zones.active.length)
      return {
        session: current,
        error:
          "Robô sem Básico reconhecido na mão. Resolva o mulligan manualmente ou prepare outra mão.",
      };
    if (!step({ kind: "begin", side: 0 }))
      return { session: current, error: message };
  } else if (command === "end" && current.state.current === 0) {
    if (!step({ kind: "pass", side: 0 }))
      return { session: current, error: message };
  }
  if (!current.state.training?.started)
    return {
      session: current,
      error: "Escolha seu Básico Ativo e inicie a partida assistida.",
    };
  if (current.state.training.checkup)
    return {
      session: current,
      error:
        "Resolva condições e Checkup manualmente, confirme e retome o robô.",
    };
  if (current.state.training.winner !== undefined) return { session: current };
  if (current.state.current === 0) {
    if (current.state.training.drawnAt[0] !== current.state.turn)
      step({ kind: "draw-turn", side: 0 });
    return { session: current, error: message || undefined };
  }
  if (
    current.state.training.drawnAt[1] !== current.state.turn &&
    !step({ kind: "draw-turn", side: 1 })
  )
    return { session: current, error: message };
  for (let n = 0; n < 24 && current.state.training?.winner === undefined; n++) {
    const best = analyze(current, 1, rules).plans[0];
    if (!best) break;
    // Commit one choice, then replan with only resources now legitimately available.
    if (!step(best.steps[0]!))
      return { session: current, error: `Robô pausado: ${message}` };
    if (current.state.training!.attackedAt[1] === current.state.turn) break;
  }
  if (current.state.training?.winner !== undefined) return { session: current };
  if (!step({ kind: "pass", side: 1 }))
    return { session: current, error: `Robô pausado: ${message}` };
  if (!current.state.training?.checkup) step({ kind: "draw-turn", side: 0 });
  return { session: current, error: message || undefined };
}
