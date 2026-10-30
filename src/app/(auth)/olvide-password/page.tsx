"use client"

import { useState, useEffect } from "react"
import { Icon } from "@/components/ui/Icon"
import Link from "next/link"
import { motion } from "framer-motion"
// AQUÍ IMPORTAMOS EL MOTOR REAL DE CORREOS
import { solicitarRecuperacion } from "./actions" 

export default function OlvidePasswordPage() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

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
    
    // AQUÍ LLAMAMOS AL MOTOR REAL EN LUGAR DE SIMULAR
    const res = await solicitarRecuperacion(formData)
    
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setSuccess(true)
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
          <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
            <Icon name="lock_reset" size={24} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">
            Recuperar contraseña
          </h1>
          <p className="text-[14px] text-zinc-400 leading-relaxed">
            Ingresa tu correo electrónico y te enviaremos un enlace seguro para restablecer tu acceso.
          </p>
        </div>

        <div className="p-8">
          {success ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13.5px] flex items-start gap-3">
                <Icon className="shrink-0 mt-0.5" name="mark_email_read" size={18} /> 
                <p>Si el correo existe en nuestro sistema, hemos enviado un enlace de recuperación. <strong>Revisa tu bandeja de entrada o SPAM.</strong></p>
              </div>
              <Link href="/login" className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/10 bg-white/5 py-3.5 text-[14px] font-bold text-white hover:bg-white/10 transition-colors">
                <Icon name="arrow_back" size={16} />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
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

                <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-[14px] font-bold text-black hover:bg-emerald-400 transition-colors disabled:opacity-70">
                  {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
                </button>

                <Link href="/login" className="text-center text-[13px] text-zinc-400 hover:text-white transition-colors mt-2">
                  ← Volver a inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}