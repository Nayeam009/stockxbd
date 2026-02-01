-- Add valve_size column to community_order_items for accurate inventory matching
ALTER TABLE community_order_items ADD COLUMN IF NOT EXISTS valve_size text;