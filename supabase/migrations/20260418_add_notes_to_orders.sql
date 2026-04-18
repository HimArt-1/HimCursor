-- [20260418] Final POS Orders Schema Fix
-- This migration adds the missing 'notes' column and ensures 'payment_status' is present.

-- 1. Add notes column to pos_orders if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_orders' AND column_name = 'notes') THEN
        ALTER TABLE public.pos_orders ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 2. Safety check: Add payment_status if it's missing (though it should be handled by previous fix)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_orders' AND column_name = 'payment_status') THEN
        ALTER TABLE public.pos_orders ADD COLUMN payment_status TEXT DEFAULT 'paid';
    END IF;
END $$;

-- 3. Data cleanup: Ensure all existing orders have a status
UPDATE public.pos_orders SET payment_status = 'paid' WHERE payment_status IS NULL;

-- 4. CRITICAL: Trigger PostgREST schema reload
-- This is necessary to let the API know about new columns immediately.
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.pos_orders.notes IS 'Order notes for internal or customer reference';
COMMENT ON COLUMN public.pos_orders.payment_status IS 'Current payment state of the order (paid, unpaid, etc.)';
