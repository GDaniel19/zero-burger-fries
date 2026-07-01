import { getMenu } from '../_lib/sheets';
import { Env, error, json } from '../_lib/responses';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const menu = await getMenu(env, false);
    return json(menu, {
      headers: {
        'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400'
      }
    });
  } catch {
    return error('No pudimos cargar el menu en este momento. Intenta de nuevo en unos minutos.', 502);
  }
};