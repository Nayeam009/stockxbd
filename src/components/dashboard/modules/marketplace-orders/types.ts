/**
 * Marketplace Orders Types
 * Shared types for the marketplace orders module
 */

export interface CommunityOrder {
  id: string;
  order_number: string;
  shop_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  division: string;
  district: string;
  thana: string | null;
  order_notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: 'pending' | 'paid';
  rejection_reason: string | null;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
  items?: OrderItem[];
  payment_trx_id?: string;
  return_cylinder_verified?: boolean;
  verified_at?: string;
  customer_cylinder_photo?: string | null;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'dispatched' 
  | 'delivered' 
  | 'cancelled' 
  | 'rejected';

export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'card';

export interface OrderItem {
  id: string;
  product_name: string;
  product_type: string;
  brand_name: string | null;
  weight: string | null;
  quantity: number;
  price: number;
  return_cylinder_qty: number;
  return_cylinder_type: 'empty' | 'leaked' | null;
}

export interface ShopProfile {
  name: string;
  phone: string;
  address: string;
}

export interface OrderAnalytics {
  total: number;
  pending: number;
  confirmed: number;
  dispatched: number;
  delivered: number;
  todayRevenue: number;
  todayOrders: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  items: {
    name: string;
    description?: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
}
