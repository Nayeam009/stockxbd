-- Add indexes for frequently queried columns to speed up dashboard loading
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created_at 
  ON pos_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_owner_date 
  ON pos_transactions(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_orders_status_shop 
  ON community_orders(status, shop_id);

CREATE INDEX IF NOT EXISTS idx_community_orders_customer 
  ON community_orders(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
  ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_expenses_date 
  ON daily_expenses(expense_date, owner_id);

CREATE INDEX IF NOT EXISTS idx_customers_owner 
  ON customers(owner_id);

CREATE INDEX IF NOT EXISTS idx_lpg_brands_owner_active 
  ON lpg_brands(owner_id, is_active);