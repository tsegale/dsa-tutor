/*
  Warnings:

  - You are about to drop the column `condition` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "condition";

-- DropEnum
DROP TYPE "Condition";
