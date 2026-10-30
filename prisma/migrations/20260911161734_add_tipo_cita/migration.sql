-- CreateEnum
CREATE TYPE "TipoCita" AS ENUM ('consulta', 'cirugia', 'vacunacion', 'control');

-- AlterTable
ALTER TABLE "citas" ADD COLUMN     "tipo" "TipoCita" NOT NULL DEFAULT 'consulta';
