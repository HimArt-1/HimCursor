-- [20260418] Fix Production Schema Mismatches

-- 1. Add payment_status to pos_orders if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_orders' AND column_name = 'payment_status') THEN
        ALTER TABLE pos_orders ADD COLUMN payment_status TEXT DEFAULT 'paid';
    END IF;
END $$;

-- 2. Ensure all existing orders have a status
UPDATE pos_orders SET payment_status = 'paid' WHERE payment_status IS NULL;

-- 3. Note on profiles: We decided to remove role_id from the code instead of adding it to the DB 
-- to keep the schema lean and rely on the string-based 'role' column.

COMMENT ON COLUMN pos_orders.payment_status IS 'Status of payment: paid or unpaid';
