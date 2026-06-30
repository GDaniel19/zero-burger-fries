import { Category, Product } from './types';
import { slugify } from './format';

export const categories: Category[] = [
  { id: 'hamburguesas', name: 'Hamburguesas', slug: 'hamburguesas', order: 1 },
  { id: 'fries', name: 'Papas / Fries', slug: 'fries', order: 2 },
  { id: 'hot-dogs', name: 'Hot Dogs', slug: 'hot-dogs', order: 3 },
  { id: 'entradas', name: 'Entradas', slug: 'entradas', order: 4 },
  { id: 'adiciones', name: 'Adiciones', slug: 'adiciones', order: 5 }
];

const burgerIngredients = ['Pan artesanal', 'Carne Zero 150g', 'Fusion de quesos', 'Vegetales frescos'];
const friesIngredients = ['Papitas a la francesa', 'Queso rallado', 'Tocineta crispy'];

const imageMap = {
  burger: '/images/menu/zero-burger.svg',
  classic: '/images/menu/classic-burger.svg',
  bacon: '/images/menu/bacon-cheese.svg',
  fries: '/images/menu/loaded-fries.svg',
  dog: '/images/menu/hot-dog.svg',
  nachos: '/images/menu/nachos.svg'
};

let order = 0;

function product(
  category: string,
  name: string,
  price: number,
  ingredients: string[],
  image_url: string,
  flags: Partial<Pick<Product, 'is_new' | 'is_featured' | 'is_best_seller'>> = {}
): Product {
  order += 1;
  return {
    id: slugify(`${category}-${name}`),
    category,
    name,
    slug: slugify(name),
    description: `${name} con sello Zero: sabores intensos, salsas de la casa y porcion generosa.`,
    ingredients,
    price,
    image_url,
    is_available: true,
    is_new: Boolean(flags.is_new),
    is_featured: Boolean(flags.is_featured),
    is_best_seller: Boolean(flags.is_best_seller),
    order
  };
}

export const products: Product[] = [
  product('Hamburguesas', 'Zero', 30500, [...burgerIngredients, 'Salsa Zero de la casa'], imageMap.burger, { is_featured: true, is_best_seller: true }),
  product('Hamburguesas', 'Clasica', 27500, [...burgerIngredients, 'Queso cheddar'], imageMap.classic),
  product('Hamburguesas', 'Chori', 29500, [...burgerIngredients, 'Chorizo parrillero', 'Salsa BBQ'], imageMap.burger),
  product('Hamburguesas', 'Bacon Cheese', 29500, [...burgerIngredients, 'Triple tocineta', 'Deditos de queso apanados'], imageMap.bacon, { is_best_seller: true }),
  product('Hamburguesas', 'Detodito', 29500, [...burgerIngredients, 'Pollo desmechado', 'Aritos de cebolla'], imageMap.bacon),
  product('Hamburguesas', 'Mi Tierra', 29000, [...burgerIngredients, 'Arepa blanca', 'Cebolla caramelizada'], imageMap.classic),
  product('Hamburguesas', 'Frida', 30000, [...burgerIngredients, 'Carne desmechada', 'Pico de gallo', 'Guacamole'], imageMap.burger, { is_new: true }),
  product('Hamburguesas', 'Sabrosa', 29500, [...burgerIngredients, 'Carne desmechada', 'Aritos de cebolla'], imageMap.bacon),
  product('Hamburguesas', 'Carnitas', 29500, ['Pan artesanal', 'Doble carne Zero 150g', 'Fusion de quesos', 'Tocineta'], imageMap.classic),
  product('Hamburguesas', 'Boluda', 29000, [...burgerIngredients, 'Filete de pechuga', 'Chorizo parrillero'], imageMap.burger),
  product('Hamburguesas', 'Parchadita', 29500, [...burgerIngredients, 'Pollo desmechado', 'Rodajas de chorizo', 'Aritos de cebolla'], imageMap.bacon),
  product('Papas / Fries', 'Parrillera', 36500, [...friesIngredients, 'Lomito de carne en cubos', 'Chorizo parrillero', 'Maiz tierno'], imageMap.fries, { is_featured: true }),
  product('Papas / Fries', 'Rechiken', 29500, [...friesIngredients, 'Pollo crunch en cubitos'], imageMap.fries, { is_best_seller: true }),
  product('Papas / Fries', 'Carnudas', 30500, [...friesIngredients, 'Carne desmechada', 'Rodajas de chorizo'], imageMap.fries),
  product('Papas / Fries', 'American', 32500, [...friesIngredients, 'Pollo desmechado', 'Queso cheddar gratinado'], imageMap.fries),
  product('Papas / Fries', 'Chapo', 31500, [...friesIngredients, 'Carne desmechada', 'Jalapenos apanados', 'Guacamole'], imageMap.fries),
  product('Papas / Fries', 'Burger', 37500, [...friesIngredients, 'Pollo desmechado', 'Carne burger Zero', 'Aritos de cebolla'], imageMap.fries),
  product('Papas / Fries', 'Chori Zero', 23000, ['Papitas a la francesa', 'Doble chorizo parrillero', 'Queso rallado', 'Salsa tartara'], imageMap.fries),
  product('Papas / Fries', 'Carlangas', 38500, ['Papitas a la francesa', 'Pollo desmechado', 'Chicharron 250g', 'Salchicha en rodajas'], imageMap.fries, { is_new: true, is_featured: true }),
  product('Hot Dogs', 'Barbacoa', 25500, ['Pan artesanal', 'Chorizo parrillero', 'Lomito de carne en cubos', 'Maiz tierno'], imageMap.dog, { is_featured: true }),
  product('Hot Dogs', 'Firulais', 25500, ['Pan artesanal', 'Salchicha tipo americana', 'Carne o pollo desmechada', 'Tocineta crispy'], imageMap.dog),
  product('Hot Dogs', 'Lupita', 25500, ['Pan artesanal', 'Carne desmechada', 'Pico de gallo', 'Guacamole', 'Rodajas de chorizo'], imageMap.dog, { is_new: true }),
  product('Entradas', 'Empanaditas', 10000, ['Empanaditas x5', 'Aji de la casa'], imageMap.nachos),
  product('Entradas', 'Nachos', 19500, ['Nachos de maiz crocante', 'Carne desmechada', 'Pico de gallo', 'Guacamole'], imageMap.nachos, { is_best_seller: true }),
  product('Adiciones', 'Enchuladas', 7500, ['Mas papitas', 'Queso rallado', 'Tocineta crispy', 'Chorizo en rodajas'], imageMap.fries, { is_featured: true })
];