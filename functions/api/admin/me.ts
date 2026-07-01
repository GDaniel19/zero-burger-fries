import { isAuthenticated } from '../../_lib/auth';
import { Env, error, json } from '../../_lib/responses';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthenticated(request, env))) return error('No autorizado.', 401);
  return json({ ok: true });
};