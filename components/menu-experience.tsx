'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Minus, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatCOP } from '@/lib/format';
import { loadMenuState } from '@/lib/storage';
import { categories as seedCategories, products as seedProducts } from '@/lib/seed';
import { CartItem, Category, Product } from '@/lib/types';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573135000256';

export function MenuExperience() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    loadMenuState().then((state) => {
      setCategories(state.categories);
      setProducts(state.products);
    });
  }, []);

  const availableProducts = products.filter((product) => product.is_available);
  const filtered = availableProducts.filter((product) => {
    const matchesCategory = selectedCategory === 'todos' || product.category === selectedCategory;
    const haystack = `${product.name} ${product.description} ${product.ingredients.join(' ')}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  });
  const featured = availableProducts.filter((product) => product.is_featured || product.is_best_seller).slice(0, 6);
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  function addToCart(product: Product) {
    setCart((items) => {
      const exists = items.find((item) => item.product.id === product.id);
      if (exists) {
        return items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...items, { product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((items) =>
      items
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function whatsappForProduct(product: Product) {
    return whatsappUrl(`Hola, quiero pedir una ${product.name} de Zero Burger & Fries.`);
  }

  function whatsappForCart() {
    const lines = cart.map(
      (item) => `- ${item.quantity} x ${item.product.name} (${formatCOP(item.product.price * item.quantity)})`
    );
    return whatsappUrl(`Hola, quiero hacer este pedido en Zero Burger & Fries:\n${lines.join('\n')}\nTotal: ${formatCOP(total)}`);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-zero-black text-white">
      <section className="zero-texture relative min-h-[92svh] px-4 pb-10 pt-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo />
          <button
            onClick={() => setCartOpen(true)}
            className="relative grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur"
            aria-label="Abrir carrito"
          >
            <ShoppingBag size={20} />
            {cart.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-zero-red text-xs font-black">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-8 pt-14 md:grid-cols-[1.05fr_.95fr] md:pt-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <p className="mb-3 inline-flex rounded-full border border-zero-red/60 px-4 py-2 text-xs font-black uppercase tracking-[.22em] text-zero-ember">
              Pura sabrosura urbana
            </p>
            <h1 className="font-display text-6xl uppercase leading-[.84] text-white sm:text-7xl md:text-8xl">
              Zero Burger <span className="block text-zero-red">& Fries</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
              Hamburguesas, fries cargadas, perros y combos con una carta digital pensada para pedir rapido por WhatsApp.
            </p>
            <div className="mt-8 flex gap-3">
              <a
                href="#menu"
                className="rounded-full bg-zero-red px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-glow"
              >
                Ver menu
              </a>
              <a
                href={whatsappUrl('Hola, quiero pedir en Zero Burger & Fries.')}
                className="rounded-full border border-white/18 px-6 py-4 text-sm font-black uppercase tracking-wide"
              >
                WhatsApp
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: .92, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            className="relative mx-auto aspect-square w-full max-w-[440px]"
          >
            <div className="absolute inset-8 rounded-full bg-zero-red blur-3xl opacity-35" />
            <Image src="/images/menu/zero-burger.svg" alt="Zero Burger" fill priority className="object-contain drop-shadow-2xl" />
          </motion.div>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-6xl px-4 py-10">
        <div className="sticky top-0 z-20 -mx-4 border-y border-white/10 bg-zero-black/88 px-4 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            <label className="flex items-center gap-3 rounded-full border border-white/12 bg-white/[.06] px-4 py-3">
              <Search size={18} className="text-zero-ember" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar Zero, Bacon, Chapo..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/42"
              />
            </label>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <FilterButton active={selectedCategory === 'todos'} onClick={() => setSelectedCategory('todos')}>
                Todos
              </FilterButton>
              {categories.map((category) => (
                <FilterButton
                  key={category.id}
                  active={selectedCategory === category.name}
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.name}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>

        {featured.length > 0 && selectedCategory === 'todos' && !query && (
          <section className="py-9">
            <SectionTitle title="Destacados" eyebrow="Los que mas salen" />
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-5">
              {featured.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  compact
                  onOpen={() => setSelectedProduct(product)}
                  onAdd={() => addToCart(product)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="py-4">
          <SectionTitle title="Carta digital" eyebrow={`${filtered.length} productos disponibles`} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onOpen={() => setSelectedProduct(product)}
                onAdd={() => addToCart(product)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[.04] p-8 text-center text-white/64">
              No encontramos productos con esa busqueda.
            </div>
          )}
        </section>
      </section>

      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAdd={() => addToCart(selectedProduct)}
            whatsappUrl={whatsappForProduct(selectedProduct)}
          />
        )}
        {cartOpen && (
          <CartDrawer
            cart={cart}
            total={total}
            onClose={() => setCartOpen(false)}
            onChange={updateQuantity}
            whatsappUrl={cart.length ? whatsappForCart() : whatsappUrl('Hola, quiero pedir en Zero Burger & Fries.')}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-zero-black">
        <span className="font-display text-3xl leading-none">Z</span>
      </div>
      <div className="font-display text-2xl uppercase leading-none">
        Zero
        <span className="block text-xs font-sans font-black tracking-[.25em] text-zero-red">Burger & Fries</span>
      </div>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-3 text-xs font-black uppercase tracking-wide transition ${
        active ? 'bg-zero-red text-white shadow-glow' : 'border border-white/12 bg-white/[.05] text-white/72'
      }`}
    >
      {children}
    </button>
  );
}

function SectionTitle({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-[.22em] text-zero-red">{eyebrow}</p>
      <h2 className="font-display text-4xl uppercase">{title}</h2>
    </div>
  );
}

function ProductCard({
  product,
  index,
  onOpen,
  onAdd,
  compact = false
}: {
  product: Product;
  index: number;
  onOpen: () => void;
  onAdd: () => void;
  compact?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: Math.min(index * .04, .28) }}
      className={`card-3d group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#141414] p-4 shadow-card3d ${
        compact ? 'min-w-[78vw] sm:min-w-[360px]' : ''
      }`}
      onClick={onOpen}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(237,28,36,.24),transparent_45%)]" />
      <div className="relative aspect-[1.15] overflow-hidden rounded-2xl bg-black/35">
        <Image src={product.image_url} alt={product.name} fill loading="lazy" className="object-contain p-3" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.is_new && <Badge>Nuevo</Badge>}
          {product.is_best_seller && <Badge>Mas vendido</Badge>}
          {product.is_featured && <Badge>Recomendado</Badge>}
        </div>
      </div>
      <div className="relative mt-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-3xl uppercase leading-none">{product.name}</h3>
          <p className="shrink-0 text-lg font-black text-zero-ember">{formatCOP(product.price)}</p>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/64">{product.description}</p>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black uppercase text-zero-black"
        >
          <Plus size={17} /> Agregar
        </button>
      </div>
    </motion.article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-zero-red px-3 py-1 text-[10px] font-black uppercase tracking-wide">{children}</span>;
}

function ProductModal({
  product,
  onClose,
  onAdd,
  whatsappUrl
}: {
  product: Product;
  onClose: () => void;
  onAdd: () => void;
  whatsappUrl: string;
}) {
  return (
    <motion.div className="fixed inset-0 z-40 bg-black/70 p-4 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="mx-auto mt-8 max-h-[88svh] max-w-2xl overflow-auto rounded-[1.5rem] border border-white/10 bg-[#111] p-4 shadow-card3d"
      >
        <button onClick={onClose} className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-white/10">
          <X size={18} />
        </button>
        <div className="relative aspect-square rounded-3xl bg-black/35">
          <Image src={product.image_url} alt={product.name} fill loading="lazy" className="object-contain p-5" />
        </div>
        <h2 className="mt-5 font-display text-5xl uppercase">{product.name}</h2>
        <p className="mt-2 text-2xl font-black text-zero-ember">{formatCOP(product.price)}</p>
        <p className="mt-3 text-white/70">{product.description}</p>
        <div className="mt-5">
          <p className="mb-2 text-xs font-black uppercase tracking-[.2em] text-zero-red">Ingredientes</p>
          <div className="flex flex-wrap gap-2">
            {product.ingredients.map((ingredient) => (
              <span key={ingredient} className="rounded-full border border-white/12 px-3 py-2 text-sm text-white/76">
                {ingredient}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={onAdd} className="rounded-full bg-white px-5 py-4 font-black uppercase text-zero-black">
            Agregar al carrito
          </button>
          <a href={whatsappUrl} className="flex items-center justify-center gap-2 rounded-full bg-zero-red px-5 py-4 font-black uppercase">
            <MessageCircle size={18} /> Pedir por WhatsApp
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CartDrawer({
  cart,
  total,
  onClose,
  onChange,
  whatsappUrl
}: {
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onChange: (productId: string, delta: number) => void;
  whatsappUrl: string;
}) {
  return (
    <motion.aside
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="ml-auto flex h-full w-full max-w-md flex-col bg-[#101010] p-5 shadow-card3d"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-4xl uppercase">Tu pedido</h2>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 flex-1 space-y-3 overflow-auto">
          {cart.length === 0 && <p className="rounded-2xl bg-white/[.05] p-5 text-white/62">Aun no agregaste productos.</p>}
          {cart.map((item) => (
            <div key={item.product.id} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3">
              <div className="relative h-20 w-20 shrink-0 rounded-xl bg-black/30">
                <Image src={item.product.image_url} alt={item.product.name} fill loading="lazy" className="object-contain p-2" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black">{item.product.name}</p>
                <p className="text-sm text-zero-ember">{formatCOP(item.product.price)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => onChange(item.product.id, -1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
                    <Minus size={14} />
                  </button>
                  <span className="w-7 text-center font-black">{item.quantity}</span>
                  <button onClick={() => onChange(item.product.id, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-zero-red">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-4">
          <div className="mb-4 flex items-center justify-between text-lg font-black">
            <span>Total</span>
            <span className="text-zero-ember">{formatCOP(total)}</span>
          </div>
          <a href={whatsappUrl} className="flex items-center justify-center gap-2 rounded-full bg-zero-red px-5 py-4 font-black uppercase shadow-glow">
            <MessageCircle size={18} /> Enviar pedido
          </a>
        </div>
      </motion.div>
    </motion.aside>
  );
}

function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
