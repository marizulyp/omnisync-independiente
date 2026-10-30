"use client"

import { useState, useEffect, Suspense } from "react"
import { Icon } from "@/components/ui/Icon"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { guardarNuevaPassword } from "./actions"

function RestablecerFormulario() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", updateMousePosition)
    return () => window.removeEventListener("mousemove", updateMousePosition)
  }, [])

  // CORRECCIÓN 1: Se agregó 'async' aquí
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    
    if (!token) {
      setError("Enlace inválido o expirado. Solicita uno nuevo.")
      return
    }

    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden. Por favor verifica.")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      setLoading(false)
      return
    }

    formData.append("token", token)
    const res = await guardarNuevaPassword(formData)

    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => router.push("/login"), 4000)
    }
  } // CORRECCIÓN 2: Esta es la llave que faltaba

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500/30">
      
      <motion.div 
        className="fixed top-0 left-0 w-[600px] h-[600px] bg-emerald-600/15 rounded-full pointer-events-none blur-[120px] z-0" 
        animate={{ x: mousePosition.x - 300, y: mousePosition.y - 300 }} 
        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }} 
      />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      <div className="w-full max-w-[420px] bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(16,185,129,0.05)] relative z-10 overflow-hidden">
        
        <div className="px-8 py-8 border-b border-white/5 bg-white/5 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">
            Crear nueva contraseña
          </h1>
          <p className="text-[14px] text-zinc-400">
            Ingresa tu nueva clave de acceso para continuar.
          </p>
        </div>

        <div className="p-8">
          {success ? (
            <div className="animate-in fade-in zoom-in duration-300 text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 text-emerald-400">
                <Icon name="check_circle" size={32} />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">¡Contraseña actualizada!</h2>
              <p className="text-sm text-zinc-400 mb-6">Tu contraseña se ha cambiado correctamente. Redirigiendo al inicio de sesión...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {!token && (
                <div className="mb-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[13.5px] flex items-start gap-3">
                  <Icon className="shrink-0 mt-0.5" name="warning" size={18} /> 
                  <p>Falta el token de seguridad. Accede a esta página desde el enlace que enviamos a tu correo.</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13.5px] flex items-start gap-3">
                  <Icon className="shrink-0 mt-0.5" name="error" size={18} /> 
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Nueva contraseña</label>
                <div className="relative">
                  <input 
                    name="password" 
                    type={mostrarPassword ? "text" : "password"} 
                    required 
                    minLength={6}
                    placeholder="••••••••" 
                    className="w-full rounded-xl bg-black/50 border border-white/10 pl-4 pr-11 py-3.5 text-[14px] text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-zinc-600" 
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    <Icon name={mostrarPassword ? "visibility_off" : "visibility"} size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Confirmar nueva contraseña</label>
                <div className="relative">
                  <input 
                    name="confirmPassword" 
                    type={mostrarConfirmPassword ? "text" : "password"} 
                    required 
                    minLength={6}
                    placeholder="••••••••" 
                    className="w-full rounded-xl bg-black/50 border border-white/10 pl-4 pr-11 py-3.5 text-[14px] text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-zinc-600" 
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    <Icon name={mostrarConfirmPassword ? "visibility_off" : "visibility"} size={18} />
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || !token} className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-[14px] font-bold text-black hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? "Actualizando..." : "Guardar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RestablecerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Cargando plataforma segura...</div>}>
      <RestablecerFormulario />
    </Suspense>
  )
}