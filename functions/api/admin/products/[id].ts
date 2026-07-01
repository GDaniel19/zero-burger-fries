import { isAuthenticated } from '../../../_lib/auth';
import { Env, error, json } from '../../../_lib/responses';
import { deactivateProduct, normalizeProduct, updateProduct } from '../../../_lib/sheets';

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!(await isAuthenticated(request, env))) return error('No autorizado.', 401);
  try {
    const id = String(params.id || '');
    const product = normalizeProduct({ ...(await request.json()), id });
    if (!product.name) return error('El nombre del producto es obligatorio.');
    await updateProduct(env, id, product);
    return json({ product });
  } catch (caught) {
    return error((caught as Error).message || 'No pudimos actualizar el producto.', 502);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!(await isAuthenticated(request, env))) return error('No autorizado.', 401);
  try {
    await deactivateProduct(env, String(params.id || ''));
    return json({ ok: true });
  } catch (caught) {
    return error((caught as Error).message || 'No pudimos desactivar el producto.', 502);
  }
};