import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  // 1. LISTA VIP: Rutas que no exigen iniciar sesión
  const rutasPublicas = ["/login", "/registro", "/olvide-password", "/restablecer"]
  const isPublicPage = rutasPublicas.includes(pathname)

  // 2. Si NO ha iniciado sesión y quiere entrar a una ruta privada, lo mandamos al login
  if (!isLoggedIn && !isPublicPage) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Si YA inició sesión y trata de entrar al login o registro, lo mandamos directo a su Dashboard
  if (isLoggedIn && (pathname === "/login" || pathname === "/registro")) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|icons).*)",
  ],
}