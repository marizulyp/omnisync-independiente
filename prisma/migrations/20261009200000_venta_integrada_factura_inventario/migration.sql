-- AlterTable
ALTER TABLE "cobros" ADD COLUMN     "facturaId" TEXT;

-- AlterTable
ALTER TABLE "factura_items" ADD COLUMN     "productoId" TEXT;

-- AlterTable
ALTER TABLE "movimientos_inventario" ADD COLUMN     "facturaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cobros_facturaId_key" ON "cobros"("facturaId");

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_items" ADD CONSTRAINT "factura_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

