-- CreateTable
CREATE TABLE "admin_profiles" (
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "role" TEXT,
    "avatar" TEXT,
    "theme" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("username")
);
