import { Deck, Match } from './types';

export function analyzePrizes(deck: Deck, match: Match) {
  const totalOutside = deck.cards.reduce((n, c) => n + (match.outside[c.id] ?? 0), 0);
  const totalMissing = 60 - totalOutside;
  const confirmedTotal = Object.values(match.confirmed).reduce((a, b) => a + b, 0);
  const rows = deck.cards.map(card => {
    const outside = match.outside[card.id] ?? 0;
    const missing = card.quantity - outside;
    const confirmed = match.confirmed[card.id] ?? 0;
    // Exactly six prize cards: all other unobserved copies may occupy the other positions.
    const min = Math.max(confirmed, 6 - (totalMissing - missing));
    const max = Math.min(missing, 6 - (confirmedTotal - confirmed));
    return { ...card, outside, missing, min, max, taken: match.taken[card.id] ?? 0 };
  });
  return { totalOutside, totalMissing, confirmedTotal, exact: totalOutside === 54 || confirmedTotal === 6, rows };
}

export function validateSnapshot(deck: Deck, match: Match): boolean {
  const ids = new Set(deck.cards.map(c => c.id));
  for (const map of [match.outside, match.confirmed, match.taken]) {
    if (Object.entries(map).some(([id, n]) => !ids.has(id) || !Number.isInteger(n) || n < 0)) return false;
  }
  const result = analyzePrizes(deck, match);
  if (result.totalOutside > 54 || result.confirmedTotal > 6) return false;
  return result.rows.every(c => c.outside <= c.quantity && c.min <= c.max && c.taken <= c.min)
    && (!match.sealed || result.exact)
    && (match.sealed || result.rows.every(c => c.taken === 0));
}
