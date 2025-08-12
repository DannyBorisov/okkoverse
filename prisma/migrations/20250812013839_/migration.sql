/*
  Warnings:

  - A unique constraint covering the columns `[shopifyProductId,shop]` on the table `RoasteryProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RoasteryProduct_shopifyProductId_shop_key" ON "RoasteryProduct"("shopifyProductId", "shop");
