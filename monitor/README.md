# Monitor de seguimiento · ISITEC

Prototipo funcional del cluster F (Seguimiento y control) del proyecto de
Sistemas Empresariales. Grupo 6, Universidad de los Andes.

## Versión en línea (con base de datos)

- **URL pública:** https://juancamilop06.github.io/monitor-isitec/
- **Registro:** cada persona crea su cuenta con correo y contraseña (pantalla "Regístrate").
- **Base de datos:** Supabase (Postgres, plan gratis), proyecto `monitor-isitec`.
  Todo el equipo comparte los mismos datos y los cambios de uno aparecen solos en la
  pantalla de los demás (tiempo real).
- **Hosting:** GitHub Pages (gratis), repo `juancamilop06/monitor-isitec`. Cada `git push`
  a `main` republica la página en un par de minutos.

| Pieza | Archivo |
|---|---|
| Llaves de conexión (públicas por diseño) | `js/config.js` |
| Registro, inicio de sesión y sincronización con la BD | `js/nube.js` |
| Tablas, políticas de seguridad (RLS) y trigger de perfiles | `supabase/schema.sql` |

Cómo funciona: `Estado` sigue siendo la única puerta a los datos. Al iniciar sesión,
`nube.js` lee todas las tablas; cada vez que `Estado` guarda, calcula qué filas cambiaron
y solo esas se envían a Postgres. Si la base está vacía, se siembra con los datos de ejemplo.
**Reiniciar datos** ahora reinicia la base compartida (pide confirmación).

Seguridad: las tablas tienen RLS; sin sesión iniciada no se puede leer ni escribir nada.

### Tipos de usuario

| Tipo | Qué ve y qué hace |
|---|---|
| **Líder de proyecto** | Todo: proyectos, tareas, facturación, horas, alertas, reportes internos, responde preguntas y administra **Equipo y accesos** |
| **Trabajador** | Solo los proyectos donde participa. Pantalla **Mis tareas**, completa sus tareas, reporta incidencias y registra horas. No ve costos ni facturas |
| **Cliente** | Solo los proyectos de su empresa: avance real vs. esperado, próximas entregas, riesgos, incidencias y facturas. Hace **preguntas** al líder |

- El **primer usuario** que se registra queda como líder. Los demás eligen al registrarse si son trabajadores o clientes,
  y en su primer ingreso indican quién son en el equipo o de qué empresa son.
- El líder puede cambiar el tipo y el vínculo de cualquiera en **Equipo y accesos**.
- Las reglas están en la base de datos (políticas RLS y funciones `proyecto_visible`, `completar_perfil`,
  `asignar_perfil` en `supabase/schema.sql`), no solo en la pantalla.
- Sin conexión a la base se pueden probar las vistas con `index.html?rol=trabajador` o `?rol=cliente`.

Si `js/config.js` no tiene llaves, la app funciona como antes, en modo local (localStorage).

## Cómo abrirlo sin internet

Abre `index.html` con doble clic. Sin conexión a la base, trabaja en modo local
(salvo las tipografías de Google, que si no cargan se reemplazan por las del sistema).

## Qué cambió frente al prototipo anterior

El profesor señaló que la versión anterior tenía demasiado en una sola pantalla.
Esta versión parte la aplicación en cinco pantallas y deja el resumen con lo mínimo:

| Pantalla | Para qué sirve |
|---|---|
| Resumen | Responde una sola pregunta: ¿qué necesita mi atención hoy? |
| Proyectos | Listado con avance real contra esperado y cierre proyectado |
| Detalle de proyecto | Avance, SPI, CPI y margen proyectado; pestañas de tareas, riesgos, horas, calidad y facturación |
| Alertas | Lo que el sistema detectó solo, con opción de marcar como atendida |
| Facturación | Facturas por cobrar, vencidas y facturado contra avance |
| Horas y equipo | Ocupación por persona, productividad (horas vs avance) e ingreso por horas facturables |
| Calidad y pruebas | Incidencias por proyecto, horas para atenderlas y evolución semanal |
| Exportar reporte | PDF para el cliente o de uso interno, y CSV; cada exportación queda registrada |

Además, ahora la aplicación **funciona de verdad**: las acciones cambian los datos
y quedan guardadas en el navegador, no son solo mensajes en pantalla.

## Estructura del código

```
index.html              Esqueleto: menú lateral, barra superior y contenedor de vistas
css/styles.css          Toda la hoja de estilos, dividida en secciones
js/config.js            URL y llave pública de Supabase
js/nube.js              Cuentas (registro/login) y sincronización con Postgres
js/datos.js             Datos de ejemplo (semilla de la base de datos)
supabase/schema.sql     Esquema de la base de datos
js/estado.js            Estado, persistencia y cálculos (avance, desviación, alertas)
js/ui.js                Utilidades: formato, toast, modal, descarga de archivos
js/reporte.js           Reporte PDF (cliente / interno) y CSV
js/vistas/*.js          Una vista por pantalla
js/app.js               Enrutador y acciones de la barra superior
```

La regla es simple: **las vistas nunca tocan los datos directamente**, siempre pasan
por `Estado`. Así, cuando conectemos el sistema contable y el registro de horas,
solo cambia `datos.js` y el resto sigue igual.

## Cómo agregar una pantalla nueva

1. Crea `js/vistas/mivista.js` con un objeto que tenga `miga()`, `render()` y, si
   necesita eventos, `montar()`.
2. Agrégalo al `<script>` en `index.html` y al objeto `RUTAS` en `js/app.js`.
3. Agrega el enlace en el menú lateral con `data-ruta="mivista"`.

## Cálculos que ya están implementados

- **Avance esperado**: qué porcentaje del cronograma ya transcurrió
- **Desviación**: avance real menos avance esperado, en puntos
- **Semáforo**: en tiempo (−5 o mejor), en riesgo (−15 a −5), crítico (peor que −15)
- **Cierre proyectado**: al ritmo actual, en qué fecha termina y cuántos días se desvía
- **Alertas**: se derivan de las tareas vencidas, los bloqueos y las facturas vencidas

## Qué falta

Ver `TODO.md`, con seis tareas repartibles.
