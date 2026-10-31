import { Platform } from 'react-native';
import * as FS from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { CardAsset } from '../workspace/model';
const memoryURLs = new Map<string, string>();
const nativePath = (uri: string) =>
  uri.startsWith('native:') ? folder() + uri.slice(7) : uri;
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ptcgmap-images', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onerror = () =>
      reject(
        Error('O navegador não permitiu o armazenamento local de imagens.'),
      );
    request.onsuccess = () => resolve(request.result);
  });
}
async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(Error('Sem espaço para salvar a imagem.'));
      tx.onabort = () => reject(Error('Gravação de imagem interrompida.'));
    });
  } finally {
    db.close();
  }
}
async function readBlob(key: string): Promise<Blob | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction('images').objectStore('images').get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(Error('Imagem local indisponível.'));
    });
  } finally {
    db.close();
  }
}
const folder = () => {
  if (!FS.documentDirectory)
    throw Error('Armazenamento de documentos indisponível.');
  return FS.documentDirectory + 'ptcgmap-images/';
};
export async function localImageURI(asset: CardAsset): Promise<string> {
  if (Platform.OS !== 'web') return nativePath(asset.uri);
  const key = asset.uri.replace(/^local:/, '');
  if (memoryURLs.has(key)) return memoryURLs.get(key)!;
  const blob = await readBlob(key);
  if (!blob) throw Error('Imagem ausente. Baixe ou importe novamente.');
  const uri = URL.createObjectURL(blob);
  memoryURLs.set(key, uri);
  return uri;
}
export async function imageExists(asset: CardAsset): Promise<boolean> {
  try {
    return Platform.OS === 'web'
      ? !!(await readBlob(asset.uri.replace(/^local:/, '')))
      : (await FS.getInfoAsync(nativePath(asset.uri))).exists;
  } catch {
    return false;
  }
}
function validateBlob(blob: Blob) {
  if (
    !blob.type.startsWith('image/') ||
    !blob.size ||
    blob.size > 15 * 1024 * 1024
  )
    throw Error('Escolha uma imagem de até 15 MB.');
}
export async function cacheImage(
  uri: string,
  source: CardAsset['source'],
  metadata: { apiId?: string; url?: string } = {},
  mime = 'image/jpeg',
): Promise<CardAsset> {
  const key = Crypto.randomUUID();
  let stored: string;
  let bytes: number;
  if (Platform.OS === 'web') {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        response = await fetch(uri, { signal: controller.signal });
        if (response.ok) break;
      } catch {
        if (attempt === 2)
          throw Error(
            'Falha ao obter a imagem. Verifique a conexão ou importe o arquivo.',
          );
      } finally {
        clearTimeout(timer);
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
    if (!response) throw Error('Imagem indisponível.');
    if (!response.ok)
      throw Error(
        'Não foi possível obter a imagem. Verifique a conexão e tente novamente.',
      );
    const blob = await response.blob();
    validateBlob(blob);
    await putBlob(key, blob);
    stored = 'local:' + key;
    bytes = blob.size;
  } else {
    await FS.makeDirectoryAsync(folder(), { intermediates: true });
    const extension =
      source === 'tcgdex'
        ? uri.endsWith('.png')
          ? 'png'
          : 'webp'
        : /png/.test(mime)
          ? 'png'
          : /webp/.test(mime)
            ? 'webp'
            : /heic/.test(mime)
              ? 'heic'
              : 'jpg';
    stored = folder() + key + '.' + extension;
    if (source === 'tcgdex') {
      const result = await FS.downloadAsync(uri, stored);
      if (result.status !== 200) {
        await FS.deleteAsync(stored, { idempotent: true });
        throw Error(
          'Download recusado pela fonte. Tente novamente mais tarde.',
        );
      }
    } else await FS.copyAsync({ from: uri, to: stored });
    const info = await FS.getInfoAsync(stored);
    bytes = info.exists && !info.isDirectory ? info.size : 0;
    if (!bytes || bytes > 15 * 1024 * 1024) {
      await FS.deleteAsync(stored, { idempotent: true });
      throw Error('Imagem vazia ou maior que 15 MB.');
    }
  }
  return {
    uri: Platform.OS === 'web' ? stored : 'native:' + stored.split('/').at(-1)!,
    source,
    bytes,
    savedAt: new Date().toISOString(),
    ...metadata,
  };
}
