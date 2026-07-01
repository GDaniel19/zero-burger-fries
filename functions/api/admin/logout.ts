import { clearSessionCookie } from '../../_lib/auth';
import { Env, json } from '../../_lib/responses';

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  return json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie(new URL(request.url).protocol === 'https:') } });
};