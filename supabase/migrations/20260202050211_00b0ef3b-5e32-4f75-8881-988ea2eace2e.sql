-- Make product_id nullable in pos_transaction_items to support online orders
-- Online orders don't have a product from the local 'products' table
ALTER TABLE public.pos_transaction_items
ALTER COLUMN product_id DROP NOT NULL;