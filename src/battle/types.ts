import { Card, Condition } from "../domain/types";
import type { AssistStep, Rules } from "../assistants/types";
export type Side = 0 | 1;
export const zones = [
  "deck",
  "hand",
  "active",
  "bench",
  "prizes",
  "discard",
  "lost",
  "stadium",
] as const;
export type Zone = (typeof zones)[number];
export const zoneNames: Record<Zone, string> = {
  deck: "Baralho",
  hand: "Mão",
  active: "Ativo",
  bench: "Banco",
  prizes: "Prêmios",
  discard: "Descarte",
  lost: "Zona Perdida",
  stadium: "Estádio",
};
export type LinkKind = "energy" | "tool" | "evolution";
export type CardMark = {
  damage: number;
  conditions: Condition[];
  faceUp: boolean;
  revealed: boolean;
  ability: boolean;
  enteredTurn?: number;
};
export type Player = {
  name: string;
  benchLimit?: 5 | 8;
  zones: Record<Zone, string[]>;
  used: {
    energy: boolean;
    supporter: boolean;
    vstar: boolean;
    gx: boolean;
    ace: boolean;
  };
};
export type BattleState = {
  players: [Player, Player];
  marks: Record<string, CardMark>;
  links: Record<string, { parent: string; kind: LinkKind }>;
  turn: number;
  current: Side;
  study: boolean;
  training?: {
    bot: boolean;
    started: boolean;
    drawnAt: [number, number];
    attackedAt: [number, number];
    checkup: boolean;
    retreatAt?: [number, number];
    winner?: Side;
  };
};
export type Session = {
  id: string;
  mode: "solo" | "duo";
  definitions: Record<string, Card>;
  instances: Record<string, { cardId: string; owner: Side }>;
  state: BattleState;
  history: { before: BattleState; label: string; at: string }[];
  deckNames: [string, string];
};
export type BattleAction =
  | { type: "assist"; step: AssistStep; rules: Rules; random?: () => number }
  | { type: "bench-limit"; side: Side; limit: 5 | 8 }
  | { type: "move"; id: string; zone: Zone; position?: "top" | "bottom" }
  | { type: "draw"; side: Side; count: number }
  | { type: "shuffle"; side: Side; order: string[] }
  | { type: "setup"; orders: [string[], string[]] }
  | { type: "collect"; side: Side }
  | { type: "attach"; id: string; parent: string; kind: LinkKind }
  | { type: "damage"; id: string; delta: number }
  | { type: "condition"; id: string; condition: Condition }
  | { type: "flip" | "reveal" | "ability"; id: string }
  | { type: "used"; side: Side; key: keyof Player["used"] }
  | { type: "turn" }
  | { type: "study"; value: boolean }
  | { type: "note"; text: string };
