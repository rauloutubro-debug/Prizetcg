import { Card } from "../domain/types";
import { collectorNumber } from "../catalog/identity";
import { Rules } from "./types";
/** Verified printed data from TCGdex; only explicitly implemented effects execute. */
export const defaultRules: Rules = {
  "TWM:128": {
    retreat: 1,
    kind: "pokemon",
    name: "Dreepy",
    hp: 70,
    stage: 0,
    type: "Dragon",
    prizes: 1,
    attacks: [
      {
        name: "Bite",
        cost: ["Fire", "Psychic"],
        damage: 40,
      },
    ],
    manual:
      "Habilidade ou ataque condicional fora do conjunto automatizado; use os controles manuais.",
  },
  "TWM:129": {
    retreat: 1,
    kind: "pokemon",
    name: "Drakloak",
    hp: 90,
    stage: 1,
    type: "Dragon",
    prizes: 1,
    attacks: [
      {
        name: "Dragon Headbutt",
        cost: ["Fire", "Psychic"],
        damage: 70,
      },
    ],
    from: "Dreepy",
    ability: "recon",
  },
  "TWM:130": {
    retreat: 1,
    kind: "pokemon",
    name: "Dragapult ex",
    hp: 320,
    stage: 2,
    type: "Dragon",
    prizes: 2,
    attacks: [
      {
        name: "Jet Headbutt",
        cost: ["Colorless"],
        damage: 70,
      },
      {
        name: "Phantom Dive",
        cost: ["Fire", "Psychic"],
        damage: 200,
        effect: "phantom",
      },
    ],
    from: "Drakloak",
    basic: "Dreepy",
  },
  "MEW:16": {
    retreat: 1,
    kind: "pokemon",
    name: "Pidgey",
    hp: 50,
    stage: 0,
    type: "Colorless",
    prizes: 1,
    attacks: [
      {
        name: "Call for Family",
        cost: ["Colorless"],
        damage: 0,
        effect: "family",
      },
      {
        name: "Tackle",
        cost: ["Colorless", "Colorless"],
        damage: 20,
      },
    ],
    weakness: "Lightning",
    resistance: "Fighting",
  },
  "OBF:164": {
    retreat: 0,
    kind: "pokemon",
    name: "Pidgeot ex",
    hp: 280,
    stage: 2,
    type: "Colorless",
    prizes: 2,
    attacks: [
      {
        name: "Blustery Wind",
        cost: ["Colorless", "Colorless"],
        damage: 120,
      },
    ],
    from: "Pidgeotto",
    basic: "Pidgey",
    weakness: "Lightning",
    resistance: "Fighting",
    ability: "quick-search",
  },
  "LOR:58": {
    retreat: 1,
    kind: "pokemon",
    name: "Rotom V",
    hp: 190,
    stage: 0,
    type: "Lightning",
    prizes: 2,
    attacks: [],
    manual:
      "Habilidade ou ataque condicional fora do conjunto automatizado; use os controles manuais.",
  },
  "BRS:40": {
    retreat: 1,
    kind: "pokemon",
    name: "Lumineon V",
    hp: 170,
    stage: 0,
    type: "Water",
    prizes: 2,
    attacks: [],
    weakness: "Lightning",
    manual:
      "Habilidade ou ataque condicional fora do conjunto automatizado; use os controles manuais.",
  },
  "SFA:38": {
    retreat: 1,
    kind: "pokemon",
    name: "Fezandipiti ex",
    hp: 210,
    stage: 0,
    type: "Darkness",
    prizes: 2,
    attacks: [
      {
        name: "Cruel Arrow",
        cost: ["Colorless", "Colorless", "Colorless"],
        damage: 100,
        effect: "arrow",
      },
    ],
    weakness: "Fighting",
    manual:
      "Habilidade ou ataque condicional fora do conjunto automatizado; use os controles manuais.",
  },
  "SVE:2": {
    kind: "energy",
    energy: "Fire",
  },
  "SVE:5": {
    kind: "energy",
    energy: "Psychic",
  },
  "SVI:181": {
    kind: "item",
    effect: "nest",
  },
  "TEF:144": {
    kind: "item",
    effect: "poffin",
  },
  "SVI:196": {
    kind: "item",
    effect: "ultra",
  },
  "SVI:191": {
    kind: "item",
    effect: "candy",
  },
  "OBF:186": {
    kind: "supporter",
    effect: "arven",
  },
  "PAL:185": {
    kind: "supporter",
    effect: "iono",
  },
  "SVI:189": {
    kind: "supporter",
    effect: "research",
  },
  "SIT:156": {
    kind: "tool",
    manual: "Forest Seal Stone não automatizada.",
  },
  "TEF:159": {
    kind: "tool",
    manual: "Rescue Board não automatizada.",
  },
};
export const printingKey = (card: Card) =>
  `${card.set?.toUpperCase() ?? "?"}:${collectorNumber(card.number ?? "?")}`;
