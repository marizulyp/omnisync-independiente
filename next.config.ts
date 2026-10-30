import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // En la red local se accede por http://IP-DEL-SERVIDOR:3001 (ver README).
  // Para varios equipos usar modo producción (npm run build + npm start).
  turbopack: {},
}

export default nextConfig
