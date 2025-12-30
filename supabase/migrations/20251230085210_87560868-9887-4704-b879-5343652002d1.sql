-- Add package_price column to product_prices table
ALTER TABLE public.product_prices
ADD COLUMN package_price numeric NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.product_prices.package_price IS 'Price for package/new connection sales';