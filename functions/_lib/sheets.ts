import { Env } from './responses';

export type SheetProduct = {
  id: string;
  category: string;
  name: string;
  slug: string;
  description: string;
  ingredients: string[];
  price: number;
  image_url: string;
  is_available: boolean;
  is_new: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  order: number;
  created_at: string;
  updated_at: string;
};

const DEFAULT_SHEET_NAME = 'products';
const COLUMNS = ['id', 'category', 'name', 'slug', 'description', 'ingredients', 'price', 'image_url', 'is_available', 'is_new', 'is_featured', 'is_best_seller', 'order', 'created_at', 'updated_at'];
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getMenu(env: Env, includeUnavailable = false) {
  let products: SheetProduct[];
  if (!includeUnavailable && env.GOOGLE_SHEET_PUBLIC_CSV_URL) {
    try {
      products = await getProductsFromPublicCsv(env.GOOGLE_SHEET_PUBLIC_CSV_URL);
    } catch {
      products = await getProducts(env);
    }
  } else {
    products = await getProducts(env);
  }

  const filtered = includeUnavailable ? products : products.filter((product) => product.is_available);
  return {
    categories: categoriesFromProducts(filtered),
    products: filtered.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  };
}

export async function getProducts(env: Env) {
  if (env.GOOGLE_APPS_SCRIPT_URL) return getProductsFromAppsScript(env);
  const token = await getAccessToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${sheetRange(env, 'A:O')}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Google Sheets no respondio al leer productos.');
  const payload = await response.json() as { values?: string[][] };
  const rows = payload.values || [];
  if (!rows.length) return [];
  const dataRows = rows[0]?.[0] === 'id' ? rows.slice(1) : rows;
  return dataRows.filter((row) => row[0]).map(rowToProduct);
}

export async function appendProduct(env: Env, product: SheetProduct) {
  if (env.GOOGLE_APPS_SCRIPT_URL) {
    await appsScriptRequest(env, { action: 'create', product });
    return;
  }
  await ensureHeader(env);
  const token = await getAccessToken(env);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${sheetRange(env, 'A:O')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [productToRow(product)] })
  });
  if (!response.ok) throw new Error('No pudimos crear el producto en Google Sheets.');
}

export async function updateProduct(env: Env, id: string, product: SheetProduct) {
  if (env.GOOGLE_APPS_SCRIPT_URL) {
    await appsScriptRequest(env, { action: 'update', id, product });
    return;
  }
  const rowNumber = await findRowNumber(env, id);
  if (!rowNumber) throw new Error('Producto no encontrado.');
  const token = await getAccessToken(env);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${sheetRange(env, `A${rowNumber}:O${rowNumber}`)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [productToRow(product)] })
  });
  if (!response.ok) throw new Error('No pudimos actualizar el producto en Google Sheets.');
}

export async function deactivateProduct(env: Env, id: string) {
  if (env.GOOGLE_APPS_SCRIPT_URL) {
    await appsScriptRequest(env, { action: 'delete', id });
    return;
  }
  const products = await getProducts(env);
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error('Producto no encontrado.');
  await updateProduct(env, id, { ...product, is_available: false, updated_at: new Date().toISOString() });
}

type SheetProductInput = Partial<Record<keyof SheetProduct, unknown>>;

export function normalizeProduct(input: SheetProductInput) {
  const now = new Date().toISOString();
  return {
    id: String(input.id || crypto.randomUUID()),
    category: String(input.category || 'Menu'),
    name: String(input.name || '').trim(),
    slug: String(input.slug || slugify(String(input.name || 'producto'))),
    description: String(input.description || ''),
    ingredients: Array.isArray(input.ingredients) ? input.ingredients : String(input.ingredients || '').split(',').map((item) => item.trim()).filter(Boolean),
    price: Number(input.price) || 0,
    image_url: String(input.image_url || '/images/menu/zero-burger.svg'),
    is_available: toBool(input.is_available, true),
    is_new: toBool(input.is_new),
    is_featured: toBool(input.is_featured),
    is_best_seller: toBool(input.is_best_seller),
    order: Number(input.order) || 999,
    created_at: String(input.created_at || now),
    updated_at: now
  } satisfies SheetProduct;
}

async function getProductsFromAppsScript(env: Env) {
  const payload = await appsScriptRequest(env, { action: 'products' });
  const products = Array.isArray((payload as { products?: unknown[] }).products)
    ? (payload as { products: Partial<SheetProduct>[] }).products
    : [];
  return products.map((product) => normalizeProduct(product));
}

async function appsScriptRequest(env: Env, body: Record<string, unknown>) {
  if (!env.GOOGLE_APPS_SCRIPT_URL) throw new Error('Falta GOOGLE_APPS_SCRIPT_URL.');
  const response = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      secret: env.GOOGLE_APPS_SCRIPT_SECRET || '',
      sheetName: env.GOOGLE_SHEET_NAME || DEFAULT_SHEET_NAME,
      ...body
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload as { ok?: boolean }).ok === false) {
    throw new Error((payload as { error?: string }).error || 'Google Apps Script no pudo actualizar la hoja.');
  }
  return payload;
}

async function getProductsFromPublicCsv(csvUrl: string) {
  const response = await fetch(csvUrl, {
    headers: { accept: 'text/csv,text/plain,*/*' }
  });
  if (!response.ok) throw new Error('No pudimos leer el CSV publicado de Google Sheets.');
  const csv = await response.text();
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const header = rows[0].map((cell) => cell.trim());
  const dataRows = header[0] === 'id' ? rows.slice(1) : rows;
  return dataRows.filter((row) => row[0]).map((row) => {
    const byHeader = Object.fromEntries(header.map((key, index) => [key, row[index] || '']));
    return rowToProduct(header[0] === 'id' ? COLUMNS.map((key) => byHeader[key] || '') : row);
  });
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

async function ensureHeader(env: Env) {
  const token = await getAccessToken(env);
  const current = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${sheetRange(env, 'A1:O1')}`, { headers: { authorization: `Bearer ${token}` } });
  const payload = await current.json().catch(() => ({})) as { values?: string[][] };
  if (payload.values?.[0]?.[0] === 'id') return;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${sheetRange(env, 'A1:O1')}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [COLUMNS] })
  });
}

async function findRowNumber(env: Env, id: string) {
  const products = await getProducts(env);
  const index = products.findIndex((product) => product.id === id);
  return index === -1 ? null : index + 2;
}

function sheetRange(env: Env, range: string) {
  return `${encodeURIComponent(env.GOOGLE_SHEET_NAME || DEFAULT_SHEET_NAME)}!${range}`;
}

function rowToProduct(row: string[]): SheetProduct {
  return normalizeProduct({
    id: row[0],
    category: row[1],
    name: row[2],
    slug: row[3],
    description: row[4],
    ingredients: row[5],
    price: Number(row[6]),
    image_url: row[7],
    is_available: row[8],
    is_new: row[9],
    is_featured: row[10],
    is_best_seller: row[11],
    order: Number(row[12]),
    created_at: row[13],
    updated_at: row[14]
  });
}

function productToRow(product: SheetProduct) {
  return [
    product.id,
    product.category,
    product.name,
    product.slug,
    product.description,
    product.ingredients.join(', '),
    product.price,
    product.image_url,
    product.is_available,
    product.is_new,
    product.is_featured,
    product.is_best_seller,
    product.order,
    product.created_at,
    product.updated_at
  ];
}

function categoriesFromProducts(products: SheetProduct[]) {
  const names = Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
  return names.map((name, index) => ({ id: name, name, slug: slugify(name), order: index + 1 }));
}

async function getAccessToken(env: Env) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const claim = base64UrlJson({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  });
  const unsigned = `${header}.${claim}`;
  const signature = await signJwt(unsigned, env.GOOGLE_PRIVATE_KEY);
  const assertion = `${unsigned}.${signature}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!response.ok) throw new Error('No pudimos autenticar la cuenta de servicio de Google.');
  const payload = await response.json() as { access_token: string; expires_in: number };
  cachedToken = { token: payload.access_token, expiresAt: Date.now() + payload.expires_in * 1000 };
  return cachedToken.token;
}

async function signJwt(value: string, privateKey: string) {
  const key = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(value));
  return base64Url(signature);
}

function pemToArrayBuffer(privateKey: string) {
  const pem = privateKey.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(pem);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function base64UrlJson(value: unknown) {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function toBool(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'si', 'yes', 'x'].includes(String(value).toLowerCase());
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}



