import { categories as seedCategories, products as seedProducts } from './seed';
import { Category, MenuState, Product } from './types';

const MENU_CACHE_KEY = 'zero-menu-cache-v3';
const ADMIN_CACHE_KEY = 'zero-admin-products-v3';
const LOCAL_ADMIN_SESSION_KEY = 'zero-admin-local-session';
const MENU_CACHE_TTL = 1000 * 60 * 10;
const LOCAL_ADMIN_USERNAME = 'admin';
const LOCAL_ADMIN_PASSWORD = '123456789';

type CachedMenu = MenuState & { cached_at: number };

export async function loadMenuState(): Promise<MenuState> {
  if (typeof window === 'undefined') {
    return { categories: seedCategories, products: seedProducts };
  }

  const cached = readMenuCache();
  try {
    const response = await fetch('/api/menu', {
      headers: cached ? { 'if-none-match': String(cached.cached_at) } : undefined
    });
    if (!response.ok) throw new Error('No pudimos cargar el menu actualizado.');
    const state = normalizeMenuState(await response.json());
    window.localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({ ...state, cached_at: Date.now() }));
    return state;
  } catch {
    if (cached && Date.now() - cached.cached_at < MENU_CACHE_TTL) {
      return cached;
    }
    return readAdminCache();
  }
}

export async function loadAdminProducts(): Promise<MenuState> {
  try {
    const response = await fetch('/api/admin/products', { credentials: 'include' });
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    if (!response.ok) throw new Error('No pudimos cargar los productos del administrador.');
    const state = normalizeMenuState(await response.json());
    writeAdminCache(state);
    return state;
  } catch (error) {
    if (isLocalAdminSession()) return readAdminCache();
    throw error;
  }
}

export async function saveProduct(product: Product) {
  const isNew = !product.id;
  try {
    const response = await fetch(isNew ? '/api/admin/products' : `/api/admin/products/${product.id}`, {
      method: isNew ? 'POST' : 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'No pudimos guardar el producto.');
    }
    window.localStorage.removeItem(MENU_CACHE_KEY);
  } catch (error) {
    if (!isLocalAdminSession()) throw error;
    const state = readAdminCache();
    const saved = { ...product, id: product.id || crypto.randomUUID() };
    const exists = state.products.some((item) => item.id === saved.id);
    const products = exists
      ? state.products.map((item) => (item.id === saved.id ? saved : item))
      : [...state.products, saved];
    writeAdminCache({ categories: categoriesFromProducts(products), products });
    window.localStorage.removeItem(MENU_CACHE_KEY);
  }
}

export async function deleteProduct(id: string) {
  try {
    const response = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'No pudimos eliminar el producto.');
    }
    window.localStorage.removeItem(MENU_CACHE_KEY);
  } catch (error) {
    if (!isLocalAdminSession()) throw error;
    const state = readAdminCache();
    const products = state.products.map((product) =>
      product.id === id ? { ...product, is_available: false, updated_at: new Date().toISOString() } : product
    );
    writeAdminCache({ categories: categoriesFromProducts(products), products });
    window.localStorage.removeItem(MENU_CACHE_KEY);
  }
}

export async function uploadProductImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    credentials: 'include',
    body: form
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url) throw new Error(payload.error || 'No pudimos subir la imagen a Cloudinary.');
  return payload.url;
}

export async function loginAdmin(username: string, password: string) {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error('Usuario o clave incorrectos.');
  } catch (error) {
    if (username === LOCAL_ADMIN_USERNAME && password === LOCAL_ADMIN_PASSWORD) {
      window.localStorage.setItem(LOCAL_ADMIN_SESSION_KEY, 'true');
      return;
    }
    throw error;
  }
}

export async function logoutAdmin() {
  window.localStorage.removeItem(LOCAL_ADMIN_SESSION_KEY);
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
}

export async function checkAdminSession() {
  if (isLocalAdminSession()) return true;
  const response = await fetch('/api/admin/me', { credentials: 'include' }).catch(() => null);
  return Boolean(response?.ok);
}

export function categoriesFromProducts(products: Product[]): Category[] {
  const names = Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
  return names.map((name, index) => ({
    id: name,
    name,
    slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
    order: index + 1
  }));
}

function readMenuCache(): CachedMenu | null {
  const raw = window.localStorage.getItem(MENU_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedMenu;
  } catch {
    return null;
  }
}

function readAdminCache(): MenuState {
  if (typeof window === 'undefined') return { categories: seedCategories, products: seedProducts };
  const raw = window.localStorage.getItem(ADMIN_CACHE_KEY);
  if (!raw) {
    const initial = { categories: seedCategories, products: seedProducts };
    writeAdminCache(initial);
    return initial;
  }
  try {
    const state = normalizeMenuState(JSON.parse(raw));
    return state.products.length ? state : { categories: seedCategories, products: seedProducts };
  } catch {
    return { categories: seedCategories, products: seedProducts };
  }
}

function writeAdminCache(state: MenuState) {
  window.localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(state));
}

function isLocalAdminSession() {
  return typeof window !== 'undefined' && window.localStorage.getItem(LOCAL_ADMIN_SESSION_KEY) === 'true';
}

function normalizeMenuState(payload: unknown): MenuState {
  const products = Array.isArray((payload as MenuState).products) ? (payload as MenuState).products : [];
  const normalizedProducts = products
    .map(normalizeProduct)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const categories = Array.isArray((payload as MenuState).categories) && (payload as MenuState).categories.length
    ? (payload as MenuState).categories
    : categoriesFromProducts(normalizedProducts);
  return { categories, products: normalizedProducts };
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    category: product.category || 'Menu',
    ingredients: Array.isArray(product.ingredients)
      ? product.ingredients
      : String(product.ingredients || '').split(',').map((item) => item.trim()).filter(Boolean),
    price: Number(product.price) || 0,
    is_available: Boolean(product.is_available),
    is_new: Boolean(product.is_new),
    is_featured: Boolean(product.is_featured),
    is_best_seller: Boolean(product.is_best_seller),
    order: Number(product.order) || 999
  };
}

