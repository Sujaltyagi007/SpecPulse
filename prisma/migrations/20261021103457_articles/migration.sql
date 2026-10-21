-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('generating', 'failed', 'review', 'published', 'archived');

-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "body_md" TEXT,
    "faq" JSONB NOT NULL DEFAULT '[]',
    "sources" JSONB NOT NULL DEFAULT '[]',
    "related_product_ids" INTEGER[],
    "hero_image" BYTEA,
    "hero_image_type" TEXT,
    "hero_image_alt" TEXT,
    "image_prompt" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'generating',
    "progress" TEXT,
    "error" TEXT,
    "validation_errors" JSONB NOT NULL DEFAULT '[]',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "generator" TEXT,
    "prompt_version" TEXT,
    "created_by" TEXT,
    "reviewed_by" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_status_published_at_idx" ON "articles"("status", "published_at");
