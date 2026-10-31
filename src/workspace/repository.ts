import { Deck } from '../domain/types';
import { initialWorkspace, validateWorkspace, Workspace } from './model';
export const WORKSPACE_KEY = '@ptcgmap/workspace/v2';
export type StoragePort = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};
export async function readWorkspace(
  storage: StoragePort,
  legacy: Deck,
): Promise<Workspace> {
  const raw = await storage.getItem(WORKSPACE_KEY);
  return raw === null
    ? initialWorkspace(legacy)
    : validateWorkspace(JSON.parse(raw));
}
export function workspaceWriter(storage: StoragePort) {
  let queue = Promise.resolve();
  return {
    write(workspace: Workspace) {
      const value = JSON.stringify(workspace);
      const task = queue
        .catch(() => {})
        .then(() => storage.setItem(WORKSPACE_KEY, value));
      queue = task;
      return task;
    },
    flush: () => queue,
  };
}
