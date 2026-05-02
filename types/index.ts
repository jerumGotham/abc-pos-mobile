export type ProductVariant = {
  id: string;
  label: string;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  variants: ProductVariant[];
};

export type OrderItemPayload = {
  productId: string;
  variantId: string;
  productName?: string;
  variantLabel?: string;
  quantity: number;
  price: number;
};

export type Customer = {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  platform?: string;
};

export type Order = {
  id: string;
  invoiceNo: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  platform?: string;
  deliveryAt?: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  createdAt: string;
  customer?: Customer;
  items: any[];
};
