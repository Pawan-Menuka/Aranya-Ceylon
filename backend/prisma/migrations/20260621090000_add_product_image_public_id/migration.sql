-- AlterTable: add publicId to ProductImage (nullable for existing rows)
ALTER TABLE "ProductImage" ADD COLUMN "publicId" TEXT;
