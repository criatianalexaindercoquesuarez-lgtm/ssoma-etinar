# Módulo Matriz de Hallazgos — Inspecciones no planeadas SST ETINAR

## 1. Puesta en marcha (una sola vez)

1. **Base de datos** — Supabase → SQL Editor → pegar y ejecutar `supabase/migrations/002_modulo_hallazgos.sql`.
   Conserva los hallazgos existentes (los "abiertos" pasan a "pendiente" y reciben prioridad según su criticidad).
2. **Variables en Netlify** (Site configuration → Environment variables), ver `.env.example`:
   `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` *o* `SENDGRID_API_KEY`, `EMAIL_FROM`, `APP_URL`, `CRON_SECRET`, `PLAZO_AVISO_DIAS`.
3. **Desplegar** (push a `main` o "Deploy site"). La función programada `netlify/functions/plazos-diarios.mts`
   corre todos los días a las 07:00 (Ecuador) y los lunes envía además el resumen semanal a los Coordinadores SST.
4. **Usuarios** — en *Usuarios* asignar rol, cargo (aparece en las firmas) y obra:
   | Rol | Puede |
   |---|---|
   | Administrador / Coordinador SST | Todas las obras, aprobar o rechazar cierres, invitar usuarios |
   | Técnico SSO / Inspector | Registrar inspecciones y hallazgos, verificar cierres |
   | Jefe de Obra / Residente | Su obra: firmar recepción, cargar evidencia, firmar ejecución |
   | Contratista | Solo los hallazgos que se le asignan |
   | Director / Auditor | Consulta de todas las obras |
5. **Obras** — registrar el **código de proyecto** (p. ej. `EDN`): se usa en los códigos `INS-EDN-2026-001` y `H-EDN-0001`.
6. **Logo** (opcional) — subir `public/logo-etinar.png` para que aparezca en el encabezado de los PDF.

## 2. Flujo

```
Inspección (datos generales A)
  └─ Hallazgo (B: identificación + GTC-45, C: medidas, responsable, plazo)  → correo "nuevo hallazgo"
       1. Pendiente ── Residente / Jefe de Obra firma la recepción ──► En proceso
       2. En proceso ── carga fotos DESPUÉS + acciones + firma ──► En verificación → correo a SST
       3. SST aprueba (firma) ──► Cerrado → correo "cierre aprobado"
          SST rechaza (motivo) ──► En proceso → correo "cierre rechazado"
       Vencido = fecha límite superada sin cerrar (se calcula). Aviso automático 2 días antes y al vencer (cada 3 días).
```

Firmas: **Elaborado** (Inspector SST) · **Recibido / Ejecutado** (Residente, Jefe de Obra o Coordinador SST) ·
**Verificado y aprobado** (Coordinador SST). Cada firma registra nombre, cargo, fecha y hora; la firma manuscrita en pantalla es opcional.

## 3. Evaluación GTC-45
NP = ND × NE · NR = NP × NC → Nivel I (600–4000) Crítica · II (150–500) Alta · III (40–120) Media · IV (≤20) Baja.
Plazo sugerido: I = 1 día, II = 3, III = 7, IV = 15 (editable en `src/lib/gtc45.ts`).

## 4. Descargas
| Salida | Dónde | Ruta |
|---|---|---|
| Matriz Excel (5 hojas: Matriz con filtros, Indicadores con fórmulas, Historial, Notificaciones, Evidencias) | Matriz / Inspección / Reportes | `/api/export/matriz.xlsx?…filtros` |
| Matriz PDF horizontal (datos generales, matriz, evidencias antes/después, validaciones) | Matriz / Inspección | `/api/export/matriz.pdf?…filtros` |
| Reporte individual de entrega del hallazgo (PDF) | Detalle del hallazgo · enlace en cada correo | `/api/export/hallazgo/{id}` |
| Reporte semanal / mensual (PDF) | Reportes | `/api/export/reporte.pdf?periodo=semana\|mes&fecha=` |

Filtros: `obra`, `inspeccion`, `desde`, `hasta`, `responsable`, `nivel` (I–IV), `estado`.

## 5. Nuevas modalidades de inspección
Agregar la modalidad en `src/lib/modalidades.ts` (`activa: true`). Hallazgos, seguimiento, evidencias, notificaciones,
cierre, Excel y PDF son comunes y se reutilizan sin duplicar código.

## 6. Prueba de aceptación (caso real)
1. Coordinador SST crea una inspección y un hallazgo con foto inicial → el residente recibe el correo.
2. Residente abre el enlace, firma la recepción, sube foto "después" y envía a verificación → SST recibe correo.
3. SST rechaza con motivo → residente recibe correo; corrige y reenvía.
4. SST aprueba → hallazgo cerrado con días de cierre.
5. Descargar el reporte individual, la matriz PDF y el Excel y comprobar que muestran todos los datos, fotos y firmas.
6. Crear un hallazgo con fecha límite de mañana y ejecutar `/api/cron/plazos` (encabezado `x-cron-secret`) → aviso de plazo próximo.
