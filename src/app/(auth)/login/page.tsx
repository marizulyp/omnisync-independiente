"use client"

import { useState, useEffect } from "react"
import { Icon } from "@/components/ui/Icon"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mostrarPassword, setMostrarPassword] = useState(false) // ESTADO PARA EL OJITO
  const router = useRouter()

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", updateMousePosition)
    return () => window.removeEventListener("mousemove", updateMousePosition)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setError("Correo o contraseña incorrectos. Verifica tus datos.")
        setLoading(false)
      } else {
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      setError("Ocurrió un error al intentar ingresar.")
      setLoading(false)
    }
  }

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
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Omni<span className="text-emerald-400">Sync</span>
          </h1>
          <p className="text-[14px] text-zinc-400">Inicia sesión en tu espacio de trabajo</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13.5px] flex items-start gap-3">
              <Icon className="shrink-0 mt-0.5" name="error" size={18} /> 
              <p>{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Correo electrónico</label>
              <input name="email" type="email" required placeholder="correo@ejemplo.com" className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3.5 text-[14px] text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-zinc-600" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] font-medium text-zinc-400">Contraseña</label>
                <Link className="text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors" href="/olvide-password">¿Olvidaste tu contraseña?</Link>
              </div>
              <div className="relative">
                <input 
                  name="password" 
                  type={mostrarPassword ? "text" : "password"} 
                  required 
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

            <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-[14px] font-bold text-black hover:bg-emerald-400 transition-colors disabled:opacity-70">
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </button>
          </div>
        </form>

        <div className="px-8 py-6 bg-black/20 border-t border-white/5 text-center">
          <p className="text-[13.5px] text-zinc-400">
            ¿Aún no tienes tu plataforma? <br/>
            <Link className="text-emerald-400 hover:text-emerald-300 font-bold inline-block mt-1" href="/registro">Regístrate y Crea tu sistema a medida</Link>
          </p>
        </div>

      </div>
    </div>
  )
}