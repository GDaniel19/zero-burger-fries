'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Edit3, ImageIcon, LogOut, Plus, Save, Trash2, Upload } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { formatCOP, slugify } from '@/lib/format';
import { toGoogleDriveThumbnail } from '@/lib/google-drive';
import { localMenuImages } from '@/lib/images';
import { checkAdminSession, deleteProduct, loadAdminProducts, loginAdmin, logoutAdmin, saveProduct, uploadProductImage } from '@/lib/storage';
import { Category, Product } from '@/lib/types';

const emptyProduct: Product = {
  id: '',
  category: 'Hamburguesas',
  name: '',
  slug: '',
  description: '',
  ingredients: [],
  price: 0,
  image_url: '/images/menu/zero-burger.svg',
  is_available: true,
  is_new: false,
  is_featured: false,
  is_best_seller: false,
  order: 1
};

export function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product>(emptyProduct);
  const [categoryName, setCategoryName] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [uploading, setUploading] = useState(false);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [products]
  );

  useEffect(() => {
    checkAdminSession()
      .then((active) => setLoggedIn(active))
      .finally(() => setLoadingSession(false));
  }, []);

  useEffect(() => {
    if (loggedIn) refresh();
  }, [loggedIn]);

  async function refresh() {
    try {
      const state = await loadAdminProducts();
      setCategories(state.categories);
      setProducts(state.products);
      setEditing((current) => ({
        ...current,
        category: current.category || state.categories[0]?.name || 'Hamburguesas',
        order: current.order || state.products.length + 1
      }));
    } catch (adminError) {
      if ((adminError as Error).message === 'UNAUTHORIZED') setLoggedIn(false);
      else setError('No pudimos cargar Google Sheets. Revisa credenciales y permisos.');
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await loginAdmin(username, password);
      setLoggedIn(true);
    } catch (loginError) {
      setError((loginError as Error).message);
    }
  }

  async function logout() {
    await logoutAdmin();
    setLoggedIn(false);
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const product: Product = {
        ...editing,
        id: editing.id,
        slug: slugify(editing.name),
        updated_at: new Date().toISOString(),
        created_at: editing.created_at || new Date().toISOString(),
        order: Number(editing.order) || products.length + 1
      };
      await saveProduct(product);
      setSuccess('Producto guardado en Google Sheets.');
      setEditing({ ...emptyProduct, category: product.category, order: products.length + 1 });
      setDriveUrl('');
      await refresh();
    } catch (saveError) {
      setError((saveError as Error).message);
    }
  }

  function submitCategory(event: FormEvent) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name || categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) return;
    setCategories((items) => [...items, { id: name, name, slug: slugify(name), order: items.length + 1 }]);
    setEditing((product) => ({ ...product, category: name }));
    setCategoryName('');
  }

  function applyDriveUrl() {
    setImageError('');
    const transformed = toGoogleDriveThumbnail(driveUrl);
    if (!transformed) {
      setImageError('Pega un enlace valido de Google Drive, por ejemplo /file/d/FILE_ID/view.');
      return;
    }
    setEditing((product) => ({ ...product, image_url: transformed }));
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setImageError('');
    try {
      const url = await uploadProductImage(file);
      setEditing((product) => ({ ...product, image_url: url }));
    } catch (uploadError) {
      setImageError((uploadError as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (loadingSession) {
    return <main className="grid min-h-screen place-items-center bg-zero-black text-white">Cargando admin...</main>;
  }

  if (!loggedIn) {
    return (
      <main className="grid min-h-screen place-items-center bg-zero-black px-4 text-white">
        <form onSubmit={login} className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-white/[.05] p-6 shadow-card3d">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[.24em] text-zero-red">Panel privado</p>
            <h1 className="font-display text-5xl uppercase">Zero Admin</h1>
          </div>
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-bold text-white/70">Usuario</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-zero-red" />
          </label>
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-bold text-white/70">Clave</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-zero-red" />
          </label>
          {error && <p className="mb-4 rounded-xl bg-zero-red/15 p-3 text-sm text-red-100">{error}</p>}
          <button className="w-full rounded-full bg-zero-red px-5 py-4 font-black uppercase shadow-glow">Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zero-black px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.24em] text-zero-red">Google Sheets + Cloudinary</p>
            <h1 className="font-display text-5xl uppercase">Zero Admin</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-2 rounded-full border border-white/12 px-4 py-3 font-bold">
            <LogOut size={17} /> Salir
          </button>
        </header>

        {(error || success) && (
          <div className={`mb-5 rounded-2xl p-4 text-sm ${error ? 'bg-zero-red/15 text-red-100' : 'bg-emerald-500/15 text-emerald-100'}`}>
            {error || success}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
          <section className="rounded-[1.25rem] border border-white/10 bg-white/[.045] p-4">
            <h2 className="mb-4 flex items-center gap-2 font-display text-3xl uppercase">
              <Edit3 size={22} className="text-zero-red" /> Producto
            </h2>
            <form onSubmit={submitProduct} className="space-y-3">
              <AdminInput label="Nombre" value={editing.name} onChange={(value) => setEditing({ ...editing, name: value })} />
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-white/58">Categoria</span>
                <input list="category-options" value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 outline-none focus:border-zero-red" />
                <datalist id="category-options">
                  {categories.map((category) => <option key={category.id} value={category.name} />)}
                </datalist>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <AdminInput label="Precio" type="number" value={String(editing.price)} onChange={(value) => setEditing({ ...editing, price: Number(value) })} />
                <AdminInput label="Orden" type="number" value={String(editing.order)} onChange={(value) => setEditing({ ...editing, order: Number(value) })} />
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-white/58">Descripcion</span>
                <textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} rows={3} className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 outline-none focus:border-zero-red" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-white/58">Ingredientes separados por coma</span>
                <textarea value={editing.ingredients.join(', ')} onChange={(event) => setEditing({ ...editing, ingredients: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} rows={3} className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 outline-none focus:border-zero-red" />
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/64">
                  <ImageIcon size={15} /> Imagen
                </p>
                <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zero-red/60 bg-zero-red/10 px-4 py-4 text-sm font-black uppercase">
                  <Upload size={17} /> {uploading ? 'Subiendo...' : 'Subir a Cloudinary'}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadImage(event.target.files?.[0])} disabled={uploading} />
                </label>
                <select value={editing.image_url} onChange={(event) => setEditing({ ...editing, image_url: event.target.value })} className="mb-3 w-full rounded-xl border border-white/10 bg-black px-3 py-3">
                  {localMenuImages.map((image) => <option key={image} value={image}>{image.replace('/images/menu/', '')}</option>)}
                  {editing.image_url.startsWith('https://') && <option value={editing.image_url}>Imagen actual remota</option>}
                </select>
                <div className="flex gap-2">
                  <input value={driveUrl} onChange={(event) => setDriveUrl(event.target.value)} placeholder="Pegar URL de Google Drive" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-3 outline-none focus:border-zero-red" />
                  <button type="button" onClick={applyDriveUrl} className="rounded-xl bg-white px-3 font-black text-zero-black">Usar</button>
                </div>
                {imageError && <p className="mt-2 text-sm text-red-200">{imageError}</p>}
                <div className="relative mt-3 aspect-video overflow-hidden rounded-xl bg-black">
                  <Image src={editing.image_url} alt="Vista previa" fill loading="lazy" className="object-contain p-3" onError={() => setImageError('La imagen no carga. Si es Drive, revisa que este compartida como cualquiera con el enlace puede ver.')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Toggle label="Disponible" value={editing.is_available} onChange={(value) => setEditing({ ...editing, is_available: value })} />
                <Toggle label="Nuevo" value={editing.is_new} onChange={(value) => setEditing({ ...editing, is_new: value })} />
                <Toggle label="Recomendado" value={editing.is_featured} onChange={(value) => setEditing({ ...editing, is_featured: value })} />
                <Toggle label="Mas vendido" value={editing.is_best_seller} onChange={(value) => setEditing({ ...editing, is_best_seller: value })} />
              </div>

              <Preview product={editing} />

              <button className="flex w-full items-center justify-center gap-2 rounded-full bg-zero-red px-5 py-4 font-black uppercase shadow-glow">
                <Save size={18} /> Guardar producto
              </button>
            </form>
          </section>

          <section className="space-y-5">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[.045] p-4">
              <h2 className="mb-4 font-display text-3xl uppercase">Categorias</h2>
              <form onSubmit={submitCategory} className="mb-4 flex gap-2">
                <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Nueva categoria para productos" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-3 outline-none focus:border-zero-red" />
                <button className="grid h-12 w-12 place-items-center rounded-xl bg-zero-red" aria-label="Crear categoria"><Plus size={18} /></button>
              </form>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => <span key={category.id} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/76">{category.name}</span>)}
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[.045]">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <h2 className="font-display text-3xl uppercase">Productos</h2>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{products.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-left text-sm">
                  <thead className="bg-black/45 text-xs uppercase text-white/50">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Orden</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProducts.map((product) => (
                      <motion.tr key={product.id} layout className="border-t border-white/8">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 rounded-xl bg-black">
                              <Image src={product.image_url} alt={product.name} fill loading="lazy" className="object-contain p-1" />
                            </div>
                            <span className="font-bold">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/64">{product.category}</td>
                        <td className="px-4 py-3 font-black text-zero-ember">{formatCOP(product.price)}</td>
                        <td className="px-4 py-3">{product.order}</td>
                        <td className="px-4 py-3">{product.is_available ? 'Disponible' : 'Oculto'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => setEditing(product)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Editar"><Edit3 size={15} /></button>
                            <button onClick={async () => { await deleteProduct(product.id); await refresh(); }} className="grid h-9 w-9 place-items-center rounded-full bg-zero-red" aria-label="Eliminar"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Preview({ product }: { product: Product }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[.2em] text-zero-red">Vista previa</p>
      <div className="flex gap-3">
        <div className="relative h-24 w-24 shrink-0 rounded-xl bg-black">
          <Image src={product.image_url} alt={product.name || 'Producto'} fill loading="lazy" className="object-contain p-2" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-3xl uppercase leading-none">{product.name || 'Nuevo producto'}</h3>
          <p className="mt-1 text-sm text-white/60">{product.category}</p>
          <p className="mt-1 font-black text-zero-ember">{formatCOP(product.price || 0)}</p>
        </div>
      </div>
    </div>
  );
}

function AdminInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase text-white/58">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 outline-none focus:border-zero-red" />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/35 p-3 text-sm font-bold">
      {label}
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-red-600" />
    </label>
  );
}
