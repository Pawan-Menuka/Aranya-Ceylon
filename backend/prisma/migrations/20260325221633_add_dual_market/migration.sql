/*
  Warnings:

  - Added the required column `currency` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `market` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Market" AS ENUM ('LOCAL', 'INTERNATIONAL', 'BOTH');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('LKR', 'USD', 'EUR', 'GBP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currency" "Currency" NOT NULL,
ADD COLUMN     "market" "Market" NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "market" "Market" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'LKR',
ADD COLUMN     "market" "Market" NOT NULL DEFAULT 'BOTH',
ADD COLUMN     "packagingDesc" TEXT,
ADD COLUMN     "packagingType" TEXT;

-- CreateIndex
CREATE INDEX "Product_market_status_idx" ON "Product"("market", "status");

-- CreateIndex
CREATE INDEX "Variant_productId_market_idx" ON "Variant"("productId", "market");
