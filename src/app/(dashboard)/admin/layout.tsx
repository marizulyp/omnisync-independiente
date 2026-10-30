import { requirePermisoPagina } from "@/lib/permisos-server"

// Protege todas las páginas de administración (incluidas las de cliente)
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermisoPagina("usuarios", "ver")
  return children
}
