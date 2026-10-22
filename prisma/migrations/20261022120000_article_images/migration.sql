-- CreateTable
CREATE TABLE "article_images" (
    "id" SERIAL NOT NULL,
    "article_id" INTEGER NOT NULL,
    "image" BYTEA NOT NULL,
    "image_type" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "notes" TEXT,
    "chosen" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_images_article_id_idx" ON "article_images"("article_id");

-- AddForeignKey
ALTER TABLE "article_images" ADD CONSTRAINT "article_images_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

