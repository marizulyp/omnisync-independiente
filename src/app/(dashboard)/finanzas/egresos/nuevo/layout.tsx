import { requirePermisoPagina } from "@/lib/permisos-server"

// La página es un componente de cliente: el permiso se valida aquí, en el servidor
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermisoPagina("egresos", "editar")
  return children
}
