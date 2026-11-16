import { checkPassword, getEditPassword } from './_lib/treeStore';

/**
 * POST /api/auth — checks the edit password (header `x-edit-password`).
 * 204 when correct, 401 otherwise.
 */
export async function POST(request: Request) {
  if (!getEditPassword()) return new Response(null, { status: 503 });
  const ok = await checkPassword(request.headers.get('x-edit-password'));
  return new Response(null, { status: ok ? 204 : 401 });
}
