-- CreateTable
CREATE TABLE "comparisons" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "product_a_id" INTEGER NOT NULL,
    "product_b_id" INTEGER NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roundups" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "use_case" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roundups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roundup_items" (
    "roundup_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "label" TEXT,

    CONSTRAINT "roundup_items_pkey" PRIMARY KEY ("roundup_id","product_id")
);

-- CreateTable
CREATE TABLE "llm_calls" (
    "id" SERIAL NOT NULL,
    "purpose" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "key_name" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comparisons_slug_key" ON "comparisons"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "comparisons_product_a_id_product_b_id_key" ON "comparisons"("product_a_id", "product_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "roundups_slug_key" ON "roundups"("slug");

-- CreateIndex
CREATE INDEX "llm_calls_created_at_idx" ON "llm_calls"("created_at");

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_product_a_id_fkey" FOREIGN KEY ("product_a_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_product_b_id_fkey" FOREIGN KEY ("product_b_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roundups" ADD CONSTRAINT "roundups_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roundup_items" ADD CONSTRAINT "roundup_items_roundup_id_fkey" FOREIGN KEY ("roundup_id") REFERENCES "roundups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roundup_items" ADD CONSTRAINT "roundup_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
