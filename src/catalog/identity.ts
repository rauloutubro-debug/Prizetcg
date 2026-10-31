export const collectorNumber = (number: string) =>
  number
    .split('/')[0]!
    .toUpperCase()
    .replace(/^([A-Z]*)0+(?=\d)/, '$1');
export function exactPrinting<T extends { localId: string }>(
  cards: T[],
  number: string,
): T | undefined {
  const matches = cards.filter(
    (c) => collectorNumber(c.localId) === collectorNumber(number),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
