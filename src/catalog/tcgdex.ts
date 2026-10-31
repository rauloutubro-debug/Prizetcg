import { Card } from '../domain/types';
import { cacheImage } from './cache';
import { exactPrinting } from './identity';
const API = 'https://api.tcgdex.net/v2/en';
type Print = { id: string; localId: string; image?: string };
type SetData = { id: string; cards: Print[] };
const sets = new Map<string, SetData[]>();
async function json<T>(path: string): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const r = await fetch(API + path, { signal: controller.signal });
      if (r.status === 404)
        throw Error(
          'Impressão não encontrada. Confira coleção e número ou importe sua imagem.',
        );
      if (!r.ok)
        throw Error(
          `Fonte indisponível (${r.status}). Tente novamente mais tarde.`,
        );
      return await r.json();
    } catch (e) {
      last = e;
      if (String(e).includes('Impressão não encontrada')) break;
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }
  throw last instanceof Error && !/fetch|abort|Network/i.test(last.message)
    ? last
    : Error(
        'Falha na conexão com TCGdex. Tente novamente ou importe uma imagem.',
      );
}
export async function downloadCardImage(card: Card, override?: string) {
  let print: Print | undefined;
  const id = override?.trim();
  if (id) {
    if (!/^[a-zA-Z0-9.-]+$/.test(id))
      throw Error('ID TCGdex inválido. Exemplo: sv06-128.');
    print = await json<Print>(`/cards/${encodeURIComponent(id)}`);
  } else {
    if (!card.set || !card.number)
      throw Error(
        'Coleção e número ausentes. Edite a lista ou importe sua imagem.',
      );
    let set = sets.get(card.set);
    if (!set) {
      let found = await json<{ id: string }[]>(
        `/sets?abbreviation.official=${encodeURIComponent(card.set)}`,
      );
      if (!found.length)
        found = await json<{ id: string }[]>(
          `/sets?tcgOnline=${encodeURIComponent(card.set)}`,
        );
      if (!found.length || found.length > 10)
        throw Error(
          'Coleção não identificada com segurança. Informe o ID TCGdex ou importe sua imagem.',
        );
      set = await Promise.all(
        found.map((item) =>
          json<SetData>(`/sets/${encodeURIComponent(item.id)}`),
        ),
      );
      sets.set(card.set, set);
    }
    print = exactPrinting(
      set.flatMap((item) => item.cards),
      card.number,
    );
    if (!print)
      throw Error(
        'Número não encontrado nesta coleção. Confira a lista ou importe sua imagem.',
      );
    if (!print.image)
      print = await json<Print>(`/cards/${encodeURIComponent(print.id)}`);
  }
  if (!print.image || !/^https:\/\/assets\.tcgdex\.net\//.test(print.image))
    throw Error('Sem imagem nesta impressão. Importe uma imagem própria.');
  // Both formats are documented by TCGdex. Some CDN responses have malformed
  // CORS headers for WebP; PNG can remain available to the browser.
  let lastError: unknown;
  for (const format of ['webp', 'png']) {
    const url = `${print.image}/high.${format}`;
    try {
      return await cacheImage(url, 'tcgdex', { apiId: print.id, url });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
