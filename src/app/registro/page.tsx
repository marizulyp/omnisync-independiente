"use client"

import { useState, useEffect } from "react"
import { Icon } from "@/components/ui/Icon"
import { registrarNegocio } from "./actions"
import Link from "next/link"
import { motion } from "framer-motion"

const MODULOS_POR_NEGOCIO: Record<string, any[]> = {
  veterinaria: [
    { id: "agenda", label: "Agenda de Citas", desc: "Programa consultas, cirugías y peluquería." },
    { id: "fichas", label: "Pacientes", desc: "Perfiles de mascotas y dueños." },
    { id: "atenciones", label: "Historia Clínica", desc: "Consultas, vacunas y desparasitaciones." },
    { id: "inventario", label: "Inventario", desc: "Control de medicamentos y alimentos." },
    { id: "finanzas", label: "Facturación", desc: "Cobros, egresos y recibos PDF." },
  ],
  taller: [
    { id: "agenda", label: "Agenda", desc: "Programa mantenimientos y revisiones." },
    { id: "fichas", label: "Vehículos", desc: "Perfiles de carros/motos y dueños." },
    { id: "atenciones", label: "Órdenes de Trabajo", desc: "Registro de reparaciones y diagnósticos." },
    { id: "inventario", label: "Inventario", desc: "Control de repuestos, aceites y herramientas." },
    { id: "finanzas", label: "Facturación", desc: "Cobros, cotizaciones y egresos." },
  ],
  barberia: [
    { id: "agenda", label: "Agenda", desc: "Programa turnos para cortes y barbería." },
    { id: "fichas", label: "Fichas de Clientes", desc: "Preferencias de corte y datos de contacto." },
    { id: "atenciones", label: "Historial de Servicios", desc: "Registro de los cortes realizados." },
    { id: "inventario", label: "Inventario", desc: "Control de pomadas, lociones y tintes." },
    { id: "finanzas", label: "Facturación", desc: "Cobros diarios y cuadre de caja." },
  ]
}

export default function RegistroPage() {
  const [paso, setPaso] = useState(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mostrarPassword, setMostrarPassword] = useState(false) // OJITO CONTRASEÑA 1
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false) // OJITO CONTRASEÑA 2
  
  const [datos, setDatos] = useState({
    nombre: "",
    apellido: "",
    cc: "",
    email: "",
    confirmEmail: "",
    nombreNegocio: "",
    tipoNegocio: "veterinaria",
    password: "",
    confirmPassword: "" // NUEVO CAMPO DE ESTADO
  })
  
  const [modulos, setModulos] = useState<string[]>(["agenda", "fichas", "atenciones", "inventario", "finanzas"])

  // Rastreador del cursor para el efecto de luz
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", updateMousePosition)
    return () => window.removeEventListener("mousemove", updateMousePosition)
  }, [])

  const handleDatos = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDatos({ ...datos, [e.target.name]: e.target.value })
  }

  const toggleModulo = (id: string) => {
    setModulos(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  const avanzarPaso2 = () => {
    if (!datos.nombre || !datos.apellido || !datos.cc || !datos.email || !datos.confirmEmail || !datos.nombreNegocio || !datos.password || !datos.confirmPassword) {
      setError("Todos los campos son obligatorios.")
      return
    }
    if (datos.email !== datos.confirmEmail) {
      setError("Los correos electrónicos no coinciden.")
      return
    }
    if (datos.password !== datos.confirmPassword) {
      setError("Las contraseñas no coinciden. Por favor verifica.")
      return
    }
    if (datos.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    setError("")
    setPaso(2)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData()
    formData.append("nombre", datos.nombre)
    formData.append("apellido", datos.apellido)
    formData.append("cc", datos.cc)
    formData.append("email", datos.email)
    formData.append("nombreNegocio", datos.nombreNegocio)
    formData.append("tipoNegocio", datos.tipoNegocio)
    formData.append("password", datos.password)
    formData.append("modulosActivos", JSON.stringify(modulos))

    const res = await registrarNegocio(formData)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Luz esmeralda que sigue el cursor */}
      <motion.div 
        className="fixed top-0 left-0 w-[600px] h-[600px] bg-emerald-600/15 rounded-full pointer-events-none blur-[120px] z-0" 
        animate={{ x: mousePosition.x - 300, y: mousePosition.y - 300 }} 
        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }} 
      />
      
      {/* Cuadrícula de fondo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      <div className="w-full max-w-[550px] bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(16,185,129,0.05)] relative z-10 overflow-hidden my-8">
        
        <div className="px-8 py-6 border-b border-white/5 bg-white/5 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Omni<span className="text-emerald-400">Sync</span>
          </h1>
          <p className="text-[13px] text-zinc-400 mt-1">Crea tu ecosistema de gestión a medida</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13.5px] flex items-start gap-3">
              <Icon className="shrink-0 mt-0.5" name="error" size={18} /> 
              <p>{error}</p>
            </div>
          )}

          {paso === 1 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Nombre</label>
                  <input name="nombre" value={datos.nombre} onChange={handleDatos} type="text" placeholder="Ej: Juan" className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Apellido</label>
                  <input name="apellido" value={datos.apellido} onChange={handleDatos} type="text" placeholder="Ej: Pérez" className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Cédula (CC)</label>
                <input name="cc" value={datos.cc} onChange={handleDatos} type="text" placeholder="Número de documento" className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Correo electrónico</label>
                  <input name="email" value={datos.email} onChange={handleDatos} type="email" placeholder="correo@ejemplo.com" className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Confirmar correo</label>
                  <input name="confirmEmail" value={datos.confirmEmail} onChange={handleDatos} type="email" placeholder="correo@ejemplo.com" className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Nombre del negocio</label>
                  <input name="nombreNegocio" value={datos.nombreNegocio} onChange={handleDatos} type="text" placeholder="Ej: AutoFix" className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Industria</label>
                  <select name="tipoNegocio" value={datos.tipoNegocio} onChange={handleDatos} className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none">
                    <option value="veterinaria" className="bg-zinc-900 text-white">Veterinaria / Pet Shop</option>
                    <option value="taller" className="bg-zinc-900 text-white">Taller Mecánico</option>
                    <option value="barberia" className="bg-zinc-900 text-white">Barbería / Belleza</option>
                  </select>
                </div>
              </div>

              {/* CONTRASEÑAS CON OJITO */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input 
                      name="password" 
                      value={datos.password} 
                      onChange={handleDatos} 
                      type={mostrarPassword ? "text" : "password"} 
                      minLength={6} 
                      placeholder="••••••••" 
                      className="w-full rounded-xl bg-black/50 border border-white/10 pl-4 pr-11 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" 
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      <Icon name={mostrarPassword ? "visibility_off" : "visibility"} size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-zinc-400 mb-1.5">Confirmar contraseña</label>
                  <div className="relative">
                    <input 
                      name="confirmPassword" 
                      value={datos.confirmPassword} 
                      onChange={handleDatos} 
                      type={mostrarConfirmPassword ? "text" : "password"} 
                      minLength={6} 
                      placeholder="••••••••" 
                      className="w-full rounded-xl bg-black/50 border border-white/10 pl-4 pr-11 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" 
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      <Icon name={mostrarConfirmPassword ? "visibility_off" : "visibility"} size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <button type="button" onClick={avanzarPaso2} className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-[14px] font-bold text-black hover:bg-emerald-400 transition-colors">
                Continuar a Módulos →
              </button>

              <p className="text-center text-[13px] text-zinc-500 mt-2">
                ¿Ya tienes una cuenta? <Link className="text-emerald-400 hover:text-emerald-300 font-medium" href="/login">Inicia sesión</Link>
              </p>
            </div>
          )}

          {paso === 2 && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-[18px] font-bold text-white">Arma tu plan</h2>
              <p className="text-[13px] text-zinc-400 mb-2">Selecciona las herramientas que usarás en tu negocio.</p>
              
              <div className="flex flex-col gap-3">
                {MODULOS_POR_NEGOCIO[datos.tipoNegocio].map((mod) => (
                  <label key={mod.id} className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 ${modulos.includes(mod.id) ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/40"}`}>
                    <div className="pt-0.5">
                      <input type="checkbox" checked={modulos.includes(mod.id)} onChange={() => toggleModulo(mod.id)} className="w-4 h-4 accent-emerald-500" />
                    </div>
                    <div>
                      <p className={`text-[14px] font-bold ${modulos.includes(mod.id) ? "text-emerald-400" : "text-white"}`}>{mod.label}</p>
                      <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">{mod.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setPaso(1)} className="px-5 py-3.5 rounded-xl border border-white/10 bg-white/5 text-[14px] font-bold text-white hover:bg-white/10 transition-colors">
                  ← Volver
                </button>
                <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-emerald-500 py-3.5 text-[14px] font-bold text-black hover:bg-emerald-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                  {loading ? "Generando plataforma..." : "Crear mi sistema"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}