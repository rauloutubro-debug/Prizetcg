import type { Side } from "../battle/types";
export type Energy =
  | "Fire"
  | "Psychic"
  | "Water"
  | "Grass"
  | "Lightning"
  | "Fighting"
  | "Darkness"
  | "Metal"
  | "Colorless";
export type Attack = {
  name: string;
  cost: Energy[];
  damage: number;
  effect?: "phantom" | "family" | "arrow";
};
export type Rule = {
  kind: "pokemon" | "energy" | "item" | "supporter" | "tool";
  retreat?: number;
  hp?: number;
  stage?: 0 | 1 | 2;
  name?: string;
  from?: string;
  basic?: string;
  type?: Energy | "Dragon";
  energy?: Energy;
  prizes?: 1 | 2 | 3;
  weakness?: string;
  resistance?: string;
  attacks?: Attack[];
  ability?: "recon" | "quick-search";
  effect?:
    | "nest"
    | "poffin"
    | "ultra"
    | "candy"
    | "draw3"
    | "research"
    | "iono"
    | "arven";
  manual?: string;
};
export type Rules = Record<string, Rule>;
export type AssistStep =
  | { kind: "begin" | "draw-turn" | "pass" | "checkup" | "bot-off"; side: Side }
  | {
      kind: "bench" | "promote" | "energy" | "evolve" | "retreat";
      side: Side;
      id: string;
      target?: string;
    }
  | { kind: "trainer" | "ability"; side: Side; id: string; target?: string }
  | { kind: "attack"; side: Side; id: string; attack: number; target?: string };
