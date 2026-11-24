ALTER TABLE customer_order ADD COLUMN version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0);
ALTER TABLE customer_order ADD CONSTRAINT customer_order_status_check
  CHECK (status IN ('PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED'));
