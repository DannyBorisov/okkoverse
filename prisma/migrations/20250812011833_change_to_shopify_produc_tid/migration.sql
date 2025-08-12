/*
  Warnings:

  - You are about to drop the column `shopifyId` on the `RoasteryProduct` table. All the data in the column will be lost.
  - Added the required column `shopifyProductId` to the `RoasteryProduct` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoasteryProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopifyProductId" TEXT NOT NULL,
    "shop" TEXT NOT NULL
);
INSERT INTO "new_RoasteryProduct" ("id", "shop") SELECT "id", "shop" FROM "RoasteryProduct";
DROP TABLE "RoasteryProduct";
ALTER TABLE "new_RoasteryProduct" RENAME TO "RoasteryProduct";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
