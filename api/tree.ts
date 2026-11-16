import {
  checkPassword,
  ConflictError,
  getEditPassword,
  readTree,
  ValidationError,
  writeTree,
} from './_lib/treeStore.js';

/**
 * GET /api/tree  — public: anyone can view the shared tree.
 * PUT /api/tree  — requires the edit password (header `x-edit-password`).
 *   body: { baseVersion: string | null, data: FamilyTreeData }
 *   200 { version, data } | 401 | 409 { version, data } (someone saved first)
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function GET() {
  try {
    return json(await readTree());
  } catch (err) {
    console.error('readTree failed', err);
    return json({ error: 'Не удалось загрузить древо с сервера.' }, 500);
  }
}

export async function PUT(request: Request) {
  if (!getEditPassword()) {
    return json({ error: 'Редактирование не настроено на сервере.' }, 503);
  }
  if (!(await checkPassword(request.headers.get('x-edit-password')))) {
    return json({ error: 'Неверный пароль.' }, 401);
  }

  let body: { baseVersion?: unknown; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Некорректный запрос.' }, 400);
  }
  const baseVersion = typeof body.baseVersion === 'string' ? body.baseVersion : null;

  try {
    return json(await writeTree(body.data, baseVersion));
  } catch (err) {
    if (err instanceof ConflictError) return json(err.current, 409);
    if (err instanceof ValidationError) return json({ error: err.message }, 400);
    console.error('writeTree failed', err);
    return json({ error: 'Не удалось сохранить изменения.' }, 500);
  }
}
