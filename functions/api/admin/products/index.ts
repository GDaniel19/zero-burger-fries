import { isAuthenticated } from '../../../_lib/auth';
import { Env, error, json } from '../../../_lib/responses';
import { appendProduct, getMenu, normalizeProduct } from '../../../_lib/sheets';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthenticated(request, env))) return error('No autorizado.', 401);
  try {
    return json(await getMenu(env, true), { headers: { 'cache-control': 'no-store' } });
  } catch (caught) {
    return error((caught as Error).message || 'No pudimos leer Google Sheets.', 502);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthenticated(request, env))) return error('No autorizado.', 401);
  try {
    const product = normalizeProduct(await request.json());
    if (!product.name) return error('El nombre del producto es obligatorio.');
    await appendProduct(env, product);
    return json({ product }, { status: 201 });
  } catch (caught) {
    return error((caught as Error).message || 'No pudimos crear el producto.', 502);
  }
};
