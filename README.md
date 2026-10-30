# Centro Veterinario

Sistema de gestión para clínicas veterinarias: pacientes, historia clínica, vacunas, agenda, fórmulas médicas, inventario, facturación, finanzas, recordatorios e informes. Funciona en la red local de la clínica (no requiere internet) y se puede instalar como app en tablets y computadores.

**Tecnología:** Next.js 16 · React 19 · PostgreSQL + Prisma 7 · Auth.js (NextAuth v5) · Tailwind 4

## Instalación

Requisitos: Node.js 20+ y PostgreSQL.

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y completa:
   - `DATABASE_URL`: la conexión a PostgreSQL. La base se llama `centro_veterinario` por defecto.
   - `AUTH_SECRET`: un secreto aleatorio. Se genera con `openssl rand -base64 32`.
   - `AUTH_TRUST_HOST=true`: déjalo así. Hace que cada equipo use la dirección con la que entró (localhost o la IP del servidor). **No definas `NEXTAUTH_URL`**: forzaría una sola dirección y rompería el acceso desde otros equipos.

3. Genera el cliente de Prisma, crea las tablas y el usuario administrador:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npm run db:seed
   ```

4. (Opcional) Carga datos ficticios para hacer demostraciones:

   ```bash
   npm run db:seed-demo
   ```

5. Inicia la app:
   - En desarrollo: `npm run dev`.
   - En producción: `npm run build` y luego `npm start`.

   En los dos casos queda en el puerto **3001**.

### Usuarios iniciales (`npm run db:seed`)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@centroveterinario.com | admin1234 |
| Veterinario | veterinario@centroveterinario.com | demo1234 |
| Enfermería | enfermeria@centroveterinario.com | demo1234 |
| Recepción | recepcion@centroveterinario.com | demo1234 |

⚠️ En una instalación real, cambia estas contraseñas o desactiva los usuarios demo desde *Equipo y usuarios*.

## Uso en la red local de la clínica

Un computador hace de **servidor**: tiene PostgreSQL, la app, los datos y los archivos adjuntos. Los demás computadores, tablets y celulares solo usan el navegador, conectados al mismo router o Wi-Fi. No se necesita hosting ni internet.

**Todos trabajan sobre los mismos datos.**
- Lo que se guarda en un equipo (una cita, un paciente, un movimiento de inventario) queda en el servidor al instante, y los demás lo ven al abrir o recargar la pantalla.
- La **Agenda** se actualiza sola cada 30 segundos y el **Inicio** cada 60.
- Los movimientos de inventario son seguros aunque dos equipos registren salidas del mismo producto a la vez.

**Funciona sin internet.** Fuentes e íconos se sirven desde el propio servidor: la clínica solo necesita su red local. Internet hace falta únicamente para instalar o actualizar (`npm install`, `npm run build`).

**Se adapta a celulares y tablets.** En pantallas pequeñas el menú lateral se oculta y se abre con el botón ☰; las tablas anchas se deslizan de lado.

### Instalación del servidor (una sola vez)

1. **Instala en una carpeta local**, por ejemplo `C:\CentroVeterinario`, y **no dentro de OneDrive**. OneDrive bloquea archivos mientras sincroniza, no está disponible antes de iniciar sesión y subiría a la nube los adjuntos de los pacientes.

   ```bash
   git clone https://github.com/davidcm1017-oss/Centro-Veterinario.git C:\CentroVeterinario
   ```

   Después sigue la sección **Instalación** de arriba.

2. **Compila la versión de producción:**

   ```bash
   npm run build
   ```

   En el servidor no uses `npm run dev`: Next.js 16 en modo desarrollo bloquea los recursos que se piden desde otros equipos.

3. **Configura el arranque automático y los respaldos.** Abre PowerShell **como administrador** en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\servidor\instalar-tareas.ps1 -DestinoRespaldos "D:\Respaldos Centro Veterinario" -SinSuspension
   ```

   Esto deja configurado:
   - La tarea **"Centro Veterinario - Servidor"**: inicia la app al encender el equipo, sin necesidad de iniciar sesión. Si la app se cierra, la vuelve a iniciar a los 15 segundos.
   - La tarea **"Centro Veterinario - Respaldo"**: copia diaria de la base de datos y los adjuntos a las 22:00, conservando 30 días. Si el equipo estaba apagado a esa hora, se ejecuta al encenderlo. Usa otro disco o una USB como destino.
   - La regla de firewall para el puerto 3001, **solo para equipos de la red local**.
   - Con `-SinSuspension`, el equipo no se suspende ni hiberna mientras está conectado a la corriente.

   Para iniciar la app sin reiniciar:

   ```powershell
   Start-ScheduledTask -TaskName "Centro Veterinario - Servidor"
   ```

   Para deshacer todo, ejecuta el mismo script con `-Quitar`.

4. **Reserva la IP del servidor en el router** (opción "DHCP reservation" o "IP fija" asociada a la MAC del equipo), para que la dirección no cambie. La IP se ve con `ipconfig` ("Dirección IPv4").

5. **Desde los demás equipos**, abre `http://IP-DEL-SERVIDOR:3001`, por ejemplo `http://192.168.1.13:3001`. En celulares y tablets, la opción "Agregar a pantalla principal" de Chrome deja un acceso directo.

### Registros, detener y actualizar

- **Registros:**
  - `logs\servidor-AAAA-MM.log`: arranques, reinicios y errores.
  - `logs\app-*.log`: lo que escribe la app.
  - `logs\respaldo-AAAA-MM.log`: resultado de cada respaldo.
- **Detener la app:** en PowerShell como administrador:

  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\servidor\detener-servidor.ps1
  ```

- **Actualizar a una versión nueva:**
  1. Detén la app con el comando anterior.
  2. Ejecuta `git pull`, `npm install`, `npx prisma generate`, `npx prisma migrate deploy` y `npm run build`.
  3. Inicia la app con `Start-ScheduledTask -TaskName "Centro Veterinario - Servidor"`.

### Respaldos y restauración

Para hacer un respaldo manual en cualquier momento:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\servidor\respaldo.ps1 -Destino "D:\Respaldos Centro Veterinario"
```

Cada respaldo genera dos archivos:
- `centro_veterinario_AAAA-MM-DD_HHmm.dump`: la base de datos.
- `adjuntos_AAAA-MM-DD_HHmm.zip`: los archivos adjuntos.

Para **restaurar**, haz lo siguiente con la app detenida y desde la carpeta `bin` de PostgreSQL, por ejemplo `C:\Program Files\PostgreSQL\17\bin`:

1. Restaura la base de datos. Esto **reemplaza los datos actuales** por los del respaldo:

   ```powershell
   .\pg_restore.exe -h localhost -U postgres -d centro_veterinario --clean --if-exists --no-owner "D:\Respaldos Centro Veterinario\centro_veterinario_AAAA-MM-DD_HHmm.dump"
   ```

2. Descomprime el `.zip` de adjuntos en `uploads\adjuntos\` dentro de la carpeta del proyecto.

### Si no conecta

- Comprueba que todos los equipos estén en la misma red y no en la "red de invitados", que suele aislar los dispositivos.
- Desde otro equipo, ejecuta `Test-NetConnection IP-DEL-SERVIDOR -Port 3001`. Debe decir `TcpTestSucceeded : True`; si no, revisa el firewall o la IP.
- Si la página carga pero los botones no responden, el servidor está en `npm run dev`: usa la versión de producción.
- Si iniciaste la app a mano en una ventana de PowerShell y el título dice "Seleccionar", presiona Esc: Windows pausa el programa mientras la consola está en modo selección.
- Revisa `logs\servidor-AAAA-MM.log`.

## Personalizar para cada clínica

Todo se configura en **`src/config/clinica.ts`**:
- nombre comercial y razón social;
- NIT, dirección, teléfonos y correo;
- logo.

Esos datos se usan en el menú, el login, el título del navegador, la app instalable, las facturas, las fórmulas, las historias clínicas imprimibles, los informes y los nombres de los archivos Excel.

- **Logo:** por defecto se genera uno genérico con el nombre de la clínica. Para usar el logo del cliente, copia la imagen en `public/` (por ejemplo `public/logo.png`, proporción 4:3) y pon `logo: "/logo.png"` en el archivo de configuración.
- **Iconos de la app instalable:** se reemplazan en `public/icons/icon-192.png` y `icon-512.png`.

## Roles y permisos

Los permisos se definen en un solo lugar: el objeto `PERMISOS` de **`src/lib/permisos.ts`**. Con esa matriz se controla:
- el menú lateral;
- el acceso a cada página (si no hay permiso, se redirige con el aviso "Acceso restringido");
- los botones de crear, editar y eliminar;
- las validaciones en el servidor (server actions y API).

| Módulo | Admin | Veterinario | Enfermería | Recepción |
|---|---|---|---|---|
| Clientes y mascotas | todo | ver/editar | ver | ver/editar |
| Consultas e historia clínica | todo | ver/editar | ver | ver |
| Vacunas y desparasitaciones | todo | ver/editar | ver/editar | ver |
| Fórmulas médicas | todo | ver/editar | ver | ver |
| Adjuntos | subir/eliminar | subir/eliminar | subir | subir |
| Agenda y recordatorios | todo | todo | todo | todo |
| Inventario | todo | ver/movimientos | ver/movimientos | ver |
| Facturas y cobros | todo | ver | — | ver/editar |
| Egresos y panel de finanzas | todo | — | — | — |
| Informes, actividad, usuarios | todo | — | — | — |

## Documentación

Los documentos Word (técnico, de proyecto y manual de usuario) están en la raíz del proyecto. Se regeneran así:

```bash
cd scripts
npm ci
node generar-doc-tecnico.cjs
node generar-documento.cjs
node generar-manual-usuario.cjs
```

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3001) |
| `npm run build` / `npm start` | Compilar e iniciar en producción |
| `npm run lint` | Revisión de código |
| `npm run db:seed` | Usuario administrador y usuarios demo |
| `npm run db:seed-demo` | Datos ficticios para demostraciones |
| `npm run db:studio` | Explorar la base de datos |
