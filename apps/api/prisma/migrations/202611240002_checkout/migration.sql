CREATE TABLE checkout_quote (
  id UUID PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "cartId" UUID NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX checkout_quote_user_expiry_idx ON checkout_quote ("userId", "expiresAt");

CREATE TABLE customer_order (
  id UUID PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  "retryKey" UUID NOT NULL,
  "requestHash" TEXT NOT NULL,
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  shipping JSONB NOT NULL CHECK (jsonb_typeof(shipping) = 'object'),
  "totalMinor" INTEGER NOT NULL CHECK ("totalMinor" >= 0),
  status TEXT NOT NULL DEFAULT 'PLACED',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "retryKey")
);
CREATE INDEX customer_order_owner_history_idx ON customer_order ("userId", "createdAt", id);
