import { createSession, sessionCookie } from '../../_lib/auth';
import { Env, error, json } from '../../_lib/responses';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json().catch(() => ({})) as { username?: string; password?: string };
  if (body.username !== env.ADMIN_USERNAME || body.password !== env.ADMIN_PASSWORD) {
    return error('Usuario o clave incorrectos.', 401);
  }
  const token = await createSession(env);
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token, new URL(request.url).protocol === 'https:') } });
};