import { createHash, timingSafeEqual } from 'node:crypto';
import { BlobPreconditionFailedError, get, put } from '@vercel/blob';
import type { FamilyMember, FamilyTreeData } from '../../src/types/family';
import { normalizeRelations } from '../../src/utils/exportImport.js';

/**
 * Shared family tree storage.
 *
 * The whole tree lives in one blob (`tree.json`). Its ETag is the "version":
 * a save must name the version it was based on, and Blob's `ifMatch`
 * makes the write atomic, so two people editing at once can't silently
 * overwrite each other — the second save gets a conflict instead.
 *
 * Images arrive from the browser as data URLs; they are moved into separate
 * blobs (`images/<sha1>.<ext>`) so the tree JSON stays small.
 *
 * Without BLOB_READ_WRITE_TOKEN (local `npm run dev`) an in-memory store is used.
 */

const TREE_PATH = 'tree.json';
const BACKUP_TTL_DAYS = 60;

export interface StoredTree {
  version: string | null;
  data: FamilyTreeData | null;
}

export class ConflictError extends Error {
  constructor(public current: StoredTree) {
    super('Version conflict');
  }
}

export class ValidationError extends Error {}

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// ---------- In-memory fallback for local development ----------
const memory: { tree: StoredTree; images: Map<string, string> } = {
  tree: { version: null, data: null },
  images: new Map(),
};
let memoryCounter = 0;

// ---------- Password ----------
export function getEditPassword(): string | null {
  const pw = process.env.EDIT_PASSWORD?.trim();
  if (pw) return pw;
  // Only for local development: never used on Vercel, where the variable is set.
  return useBlob() ? null : process.env.DEV_EDIT_PASSWORD ?? null;
}

export async function checkPassword(raw: string | null): Promise<boolean> {
  const expected = getEditPassword();
  // Stray spaces from copy-paste or phone keyboards shouldn't lock people out.
  const candidate = raw?.trim() ?? null;
  if (!expected || !candidate) {
    await slowDown();
    return false;
  }
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  const ok = timingSafeEqual(a, b);
  if (!ok) await slowDown();
  return ok;
}

// Makes guessing the password by brute force impractically slow.
function slowDown() {
  return new Promise((r) => setTimeout(r, 1200));
}

// ---------- Read ----------
export async function readTree(): Promise<StoredTree> {
  if (!useBlob()) return memory.tree;

  const res = await get(TREE_PATH, { access: 'public', useCache: false });
  if (!res || res.statusCode !== 200) return { version: null, data: null };
  const text = await new Response(res.stream).text();
  return { version: res.blob.etag, data: JSON.parse(text) as FamilyTreeData };
}

// ---------- Write ----------
export async function writeTree(
  incoming: unknown,
  baseVersion: string | null
): Promise<StoredTree> {
  const data = validateTree(incoming);
  const withImages = await moveImagesToStorage(data);
  const json = JSON.stringify(withImages);

  if (!useBlob()) {
    if (memory.tree.version !== baseVersion) throw new ConflictError(memory.tree);
    memory.tree = { version: `mem-${++memoryCounter}`, data: withImages };
    return memory.tree;
  }

  const current = await readTree();
  if (current.version !== baseVersion) throw new ConflictError(current);

  if (current.data) await backupOncePerHour(current.data);

  try {
    const result = await put(TREE_PATH, json, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
      ...(baseVersion ? { ifMatch: baseVersion } : { allowOverwrite: false }),
    });
    return { version: result.etag, data: withImages };
  } catch (err) {
    // Someone saved between our read and our write.
    if (err instanceof BlobPreconditionFailedError || isAlreadyExists(err)) {
      throw new ConflictError(await readTree());
    }
    throw err;
  }
}

function isAlreadyExists(err: unknown) {
  return err instanceof Error && /already exists/i.test(err.message);
}

/** Keeps the state from before the first save of each hour, for recovery. */
async function backupOncePerHour(previous: FamilyTreeData) {
  const hour = new Date().toISOString().slice(0, 13); // e.g. 2026-11-16T15
  try {
    await put(`backups/tree-${hour}.json`, JSON.stringify(previous), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: false,
      ttlDays: BACKUP_TTL_DAYS,
    });
  } catch {
    // Already backed up this hour (or backup failed) — never block the save.
  }
}

// ---------- Validation ----------
function validateTree(input: unknown): FamilyTreeData {
  if (!input || typeof input !== 'object') throw new ValidationError('Пустые данные древа.');
  const raw = input as Partial<FamilyTreeData>;
  if (!raw.members || typeof raw.members !== 'object' || Array.isArray(raw.members)) {
    throw new ValidationError('В данных нет списка членов семьи.');
  }
  const members: Record<string, FamilyMember> = {};
  for (const [id, m] of Object.entries(raw.members)) {
    if (!m || typeof m !== 'object') continue;
    const member = m as FamilyMember;
    if (typeof member.firstName !== 'string') continue;
    members[id] = member;
  }
  const normalized = normalizeRelations(members);
  return {
    familyName:
      typeof raw.familyName === 'string' && raw.familyName.trim()
        ? raw.familyName.slice(0, 200)
        : 'Родовое древо',
    anchorPersonId:
      typeof raw.anchorPersonId === 'string' && normalized[raw.anchorPersonId]
        ? raw.anchorPersonId
        : null,
    members: normalized,
  };
}

// ---------- Images ----------
const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/;

async function moveImagesToStorage(data: FamilyTreeData): Promise<FamilyTreeData> {
  const members: Record<string, FamilyMember> = {};
  for (const [id, m] of Object.entries(data.members)) {
    members[id] = {
      ...m,
      avatar: m.avatar ? await storeImage(m.avatar) : undefined,
      gallery: await Promise.all(
        m.gallery.map(async (g) => ({ ...g, dataUrl: await storeImage(g.dataUrl) }))
      ),
    };
  }
  return { ...data, members };
}

async function storeImage(src: string): Promise<string> {
  const match = DATA_URL_RE.exec(src);
  if (!match) return src; // already a URL (or a bundled demo image path)

  const [, contentType, base64] = match;
  const bytes = Buffer.from(base64, 'base64');
  const ext = contentType.split('/')[1].replace('jpeg', 'jpg');
  const path = `images/${createHash('sha1').update(bytes).digest('hex')}.${ext}`;

  if (!useBlob()) {
    // Dev: keep the data URL as is; just remember we "stored" it.
    memory.images.set(path, src);
    return src;
  }

  const result = await put(path, bytes, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true, // same content → same name, overwriting is harmless
  });
  return result.url;
}
