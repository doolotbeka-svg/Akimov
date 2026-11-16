import { FamilyTreeData } from '../types/family';

export interface RemoteTree {
  version: string | null;
  data: FamilyTreeData | null;
}

export type SaveResult =
  | { kind: 'saved'; tree: RemoteTree }
  | { kind: 'conflict'; tree: RemoteTree }
  | { kind: 'unauthorized' }
  | { kind: 'error'; message: string };

const PASSWORD_KEY = 'semeyny_albom_edit_password';

export function loadSavedPassword(): string | null {
  try {
    return localStorage.getItem(PASSWORD_KEY);
  } catch {
    return null;
  }
}

export function storePassword(password: string | null) {
  try {
    if (password) localStorage.setItem(PASSWORD_KEY, password);
    else localStorage.removeItem(PASSWORD_KEY);
  } catch {
    // Private mode etc. — the user will just need to log in again next time.
  }
}

/** Loads the shared tree. Returns null when the server is unreachable. */
export async function fetchRemoteTree(): Promise<RemoteTree | null> {
  try {
    const res = await fetch('/api/tree', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as RemoteTree;
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string): Promise<'ok' | 'wrong' | 'error'> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'x-edit-password': password },
    });
    if (res.status === 204) return 'ok';
    if (res.status === 401) return 'wrong';
    return 'error';
  } catch {
    return 'error';
  }
}

export async function saveRemoteTree(
  password: string,
  baseVersion: string | null,
  data: FamilyTreeData
): Promise<SaveResult> {
  let res: Response;
  try {
    res = await fetch('/api/tree', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-edit-password': password },
      body: JSON.stringify({ baseVersion, data }),
    });
  } catch {
    return { kind: 'error', message: 'Нет связи с сервером. Изменения сохранятся, когда связь появится.' };
  }

  if (res.ok) return { kind: 'saved', tree: await res.json() };
  if (res.status === 409) return { kind: 'conflict', tree: await res.json() };
  if (res.status === 401) return { kind: 'unauthorized' };
  if (res.status === 413) {
    return {
      kind: 'error',
      message: 'Слишком много новых фото за один раз. Добавляйте фотографии по нескольку штук.',
    };
  }
  let message = 'Не удалось сохранить изменения.';
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    // keep the default message
  }
  return { kind: 'error', message };
}
