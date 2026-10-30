-- CreateTable
CREATE TABLE "formulas_medicas" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mascotaId" TEXT NOT NULL,
    "veterinarioId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formulas_medicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_medica_items" (
    "id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "medicamento" TEXT NOT NULL,
    "instrucciones" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,

    CONSTRAINT "formula_medica_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "formulas_medicas" ADD CONSTRAINT "formulas_medicas_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "mascotas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formulas_medicas" ADD CONSTRAINT "formulas_medicas_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_medica_items" ADD CONSTRAINT "formula_medica_items_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "formulas_medicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
