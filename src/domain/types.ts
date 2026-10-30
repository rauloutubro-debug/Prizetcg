export type Category = 'pokemon' | 'trainer' | 'energy';
export type Card = { id: string; name: string; quantity: number; category: Category; set?: string; number?: string };
export type Deck = { name: string; cards: Card[]; raw: string };
export type Condition = 'Envenenado' | 'Queimado' | 'Paralisado' | 'Adormecido' | 'Confuso';
export type Slot = { name: string; damage: number; conditions: Condition[]; abilityUsed: boolean };
export type Match = {
  outside: Record<string, number>;
  confirmed: Record<string, number>;
  taken: Record<string, number>;
  sealed: boolean;
  turn: number;
  slots: Slot[];
  once: { vstar: boolean; gx: boolean; ace: boolean };
};
export type AppState = { version: 1; deck: Deck; match: Match };
