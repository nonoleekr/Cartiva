-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "imagePath" VARCHAR(300) NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "product_status_categoryId_createdAt_id_idx" ON "product"("status", "categoryId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma's model types do not express these SQL invariants.
ALTER TABLE "category"
  ADD CONSTRAINT "category_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "category_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "product"
  ADD CONSTRAINT "product_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "product_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT "product_description_check" CHECK (length(btrim("description")) > 0),
  ADD CONSTRAINT "product_price_check" CHECK ("priceMinor" > 0 AND "priceMinor" <= 100000000),
  ADD CONSTRAINT "product_stock_check" CHECK ("stockQuantity" >= 0),
  ADD CONSTRAINT "product_version_check" CHECK ("version" >= 0),
  ADD CONSTRAINT "product_image_check" CHECK ("imagePath" ~ '^/assets/[a-zA-Z0-9/_-]+\.(svg|png|jpg|webp)$');

