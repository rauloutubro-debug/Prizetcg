import { Card, Category, Deck } from './types';

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const categoryOf = (s: string): Category | undefined => {
  const value = normalize(s).replace(/[*:#()\d\-]/g, '').trim();
  if (/^(pokemon|pokemons)$/.test(value)) return 'pokemon';
  if (/^(trainer|trainers|treinador|treinadores)$/.test(value)) return 'trainer';
  if (/^(energy|energies|energia|energias)$/.test(value)) return 'energy';
};

export function parseDeck(raw: string, name: string): { deck?: Deck; errors: string[] } {
  const cards: Card[] = [];
  const errors: string[] = [];
  let category: Category | undefined;
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/);
  lines.forEach((original, index) => {
    const line = original.replace(/^\s*\*\s+/, '').trim();
    if (!line || /^(\*+\s*)?(deck list generated|lista de deck gerada|decklist)/i.test(line)
      || /^(total cards|total de cartas|total)\s*[:\d]/i.test(line) || /^\/\//.test(line)) return;
    const heading = categoryOf(line);
    if (heading) { category = heading; return; }
    const match = /^(\d+)\s*[x×]?\s+(.+?)\s*$/.exec(line);
    if (!match) { errors.push(`Linha ${index + 1}: formato não reconhecido: ${line}`); return; }
    const quantity = Number(match[1]);
    const rest = match[2]!;
    const metadata = /^(.+?)\s+([A-Za-z][A-Za-z0-9-]{1,11})\s+([A-Za-z]{0,4}\d+[a-z]?(?:\/\d+)?)$/i.exec(rest);
    const cardName = metadata ? metadata[1]! : rest;
    const cardCategory = category ?? (/energy|energia/i.test(cardName) ? 'energy' : undefined);
    if (!cardCategory) { errors.push(`Linha ${index + 1}: adicione o cabeçalho Pokémon, Treinador ou Energia antes das cartas.`); return; }
    if (quantity < 1 || quantity > 60) { errors.push(`Linha ${index + 1}: quantidade inválida.`); return; }
    const set = metadata?.[2]?.toUpperCase();
    const number = metadata?.[3];
    const id = `${cardCategory}:${normalize(cardName)}:${set ?? ''}:${number ?? ''}`;
    const existing = cards.find(card => card.id === id);
    if (existing) existing.quantity += quantity;
    else cards.push({ id, name: cardName, quantity, category: cardCategory, set, number });
  });
  const total = cards.reduce((sum, card) => sum + card.quantity, 0);
  if (total !== 60) errors.push(`A lista tem ${total} cartas. São necessárias exatamente 60 para rastrear os 6 Prêmios.`);
  if (!cards.some(card => card.category === 'pokemon')) errors.push('A lista precisa conter Pokémon.');
  if (errors.length) return { errors };
  return { deck: { name: name.trim() || 'Meu deck', cards, raw }, errors };
}
