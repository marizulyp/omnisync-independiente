-- CreateTable
CREATE TABLE "registros_actividad" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioNombre" TEXT NOT NULL,
    "usuarioEmail" TEXT NOT NULL,
    "usuarioRol" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "detalle" TEXT,

    CONSTRAINT "registros_actividad_pkey" PRIMARY KEY ("id")
);
