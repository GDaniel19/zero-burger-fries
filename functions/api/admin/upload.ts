import { isAuthenticated } from '../../_lib/auth';
import { Env, error, json } from '../../_lib/responses';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthenticated(request, env))) return error('No autorizado.', 401);
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return error('Selecciona una imagen valida.');

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = 'zero-burger-menu';
    const signature = await sha1(`folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`);
    const uploadForm = new FormData();
    uploadForm.append('file', file);
    uploadForm.append('api_key', env.CLOUDINARY_API_KEY);
    uploadForm.append('timestamp', timestamp);
    uploadForm.append('folder', folder);
    uploadForm.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: uploadForm
    });
    const payload = await response.json() as { secure_url?: string; error?: { message?: string } };
    if (!response.ok || !payload.secure_url) return error(payload.error?.message || 'Cloudinary no pudo subir la imagen.', 502);
    return json({ url: optimizeCloudinaryUrl(payload.secure_url) });
  } catch {
    return error('No pudimos subir la imagen. Intenta de nuevo.', 502);
  }
};

async function sha1(value: string) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function optimizeCloudinaryUrl(url: string) {
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_1000/');
}