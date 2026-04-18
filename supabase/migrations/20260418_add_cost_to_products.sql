-- WASHA CONTROL - ADD COST TO PRODUCTS
-- This migration adds the 'cost' column to the products table for profit tracking.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost') THEN
        ALTER TABLE public.products ADD COLUMN cost DECIMAL(12,2) NOT NULL DEFAULT 0.00;
    END IF;
END $$;

COMMENT ON COLUMN public.products.cost IS 'The manufacturing/purchase cost per unit for profit calculation.';
