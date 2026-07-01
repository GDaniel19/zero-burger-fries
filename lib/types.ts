export type Category = {
  id: string;
  name: string;
  slug: string;
  order: number;
};

export type Product = {
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
  created_at?: string;
  updated_at?: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
  note?: string;
};

export type MenuState = {
  categories: Category[];
  products: Product[];
};