# Tareas pendientes · Monitor de seguimiento ISITEC

Lo que ya está construido y lo que falta, para repartir en el equipo.
Cada tarea dice qué archivo tocar y qué datos ya existen.

---

## Lo que YA funciona (no hay que rehacerlo)

- Arquitectura de la app: datos, estado con persistencia y enrutamiento por pantallas
- Pantalla **Resumen**, aligerada según la corrección del profesor
- Pantalla **Proyectos** con filtros por cliente, estado y búsqueda
- **Detalle de proyecto** con avance real contra esperado, desviación y cierre proyectado
- Pestaña **Tareas**: completar, reasignar y crear tareas (se guardan de verdad)
- Pestaña **Riesgos**: causa del riesgo y plan de mitigación editable
- Pantalla **Alertas**, generadas automáticamente de los datos, con "marcar como atendida"
- **Exportar reporte** en PDF (cliente o interno) y CSV, con historial

---

## Tarea 1 · Pantalla de Facturación(Ya lista)
**Archivo:** `js/vistas/facturacion.js`
**Datos listos:** `Estado.facturas()` → id, proyectoId, numero, monto, emision, vencimiento, estado

Los tres indicadores de arriba ya funcionan. Falta:

- [x] Tabla de facturas: número, proyecto, monto, emisión, vencimiento y estado
- [x] Resaltar las vencidas en rojo y mostrar su antigüedad en días
      (usa `Estado.diasDesdeHoy(factura.vencimiento)`)
- [x] Filtro por proyecto y por estado
- [x] Botón "Marcar como pagada" — hay que agregar la mutación en `js/estado.js`,
      siguiendo el patrón de `alternarTarea()`
- [x] Comparar lo facturado contra el avance real del proyecto

También hay que llenar la pestaña **Facturación** dentro del detalle de proyecto
(`js/vistas/proyecto.js` → `contenidoPestana`), con las facturas de ese proyecto.

---

## Tarea 2 · Pantalla de Horas y equipo (Ya lista)
**Archivo:** `js/vistas/horas.js`
**Datos listos:** `Estado.registroHoras()` y `Estado.personas()` (campo `horasDisponibles`)

Responde al feedback de Oscar del 4 de noviembre. Falta:

- [x] Tabla por persona: horas disponibles, invertidas, facturables y % de ocupación
- [x] Tabla por proyecto: horas presupuestadas (`proyecto.horasPresupuesto`) contra consumidas
- [x] **Productividad**: comparar el % de horas consumidas contra el `avanceReal` del proyecto
- [x] Marcar en rojo los proyectos donde el consumo de horas va más de 15 puntos
      por encima del avance
- [x] Horas facturables acumuladas por proyecto, como insumo del ingreso

- [x] Pestaña **Horas** del detalle de proyecto: horas por persona, consumo vs avance e ingreso

Notas de implementación:
- `registroHoras` ahora tiene el campo `mes` (0 = mes en curso, -1 = anterior...).
  La ocupación por persona usa solo el mes en curso; el consumo del proyecto, todo el acumulado.
- Los cálculos están en `js/estado.js`: `horasPersona()`, `horasProyecto()`, `productividad()`.
- El valor hora se aproxima como `valorContrato / horasPresupuesto` hasta tener la tarifa real
  del sistema contable (sigue "Por validar" con ISITEC).
- Se subió `DATOS_SEMILLA.version` a 2: al abrir la app se recargan los datos de ejemplo.

---

## Tarea 3 · Indicadores de calidad y pruebas (Ya lista)
**Archivo:** `js/vistas/calidad.js` + enlace "Calidad y pruebas" en el menú de `index.html`
**Datos:** las incidencias son tareas con `esIncidencia`; usa `Estado.incidencias()`

- [x] Cantidad de incidencias por proyecto y en total
- [x] Tiempo invertido en atender incidencias: cada incidencia tiene `horas`, `fechaReporte`
      y `fechaCierre`. Las horas se piden al reportarla, con "+ Horas" y al cerrarla
      (también al marcarla como completada desde la pestaña Tareas)
- [x] Evolución semanal: gráfica de reportadas contra cerradas (8 semanas), con tooltip,
      lectura de la tendencia y vista como tabla
- [x] Indicador en el detalle de cada proyecto: pestaña **Calidad**
- [x] "Nueva tarea" tiene la casilla "Es una incidencia"
- [x] Alerta automática cuando hay incidencias críticas (severidad alta) abiertas

Cálculos en `js/estado.js`: `calidadProyecto()`, `calidadGlobal()`, `evolucionIncidencias()`,
`cerrarIncidencia()`, `registrarHorasIncidencia()`.

---

## Tarea 4 · SPI y rentabilidad (Ya lista, con datos de ejemplo)
**Archivo:** `js/estado.js` → `desempeno(p)` y la cabecera del detalle de proyecto

- [x] Campos de costo en `datos.js`: `costoPlaneado` y `costoReal` por proyecto
      (datos de ejemplo: **falta confirmar con ISITEC** qué saca el sistema contable)
- [x] **SPI** = valor ganado / valor planeado (equivale a `avanceReal / avanceEsperado`)
- [x] **CPI** = valor ganado / costo real
- [x] Proyección de cierre en costo: EAC = costoPlaneado / CPI
- [x] Rentabilidad: margen planeado y margen proyectado = (valorContrato − EAC) / valorContrato
- [x] Cuarta fila de indicadores en el detalle del proyecto, con el botón "¿Cómo se calcula?"
      que muestra la fórmula con los números del proyecto
- [x] Alerta automática cuando un proyecto se proyecta a pérdida (margen negativo)

Semáforo: índices verde ≥ 0,95 · ámbar ≥ 0,85 · rojo por debajo. Margen rojo < 0 %, ámbar < 15 %.

---

## Tarea 5 · Exportar el reporte en PDF (Ya lista)
**Archivo:** `js/reporte.js` (el botón "Exportar reporte" de la barra superior lo abre)

- [x] PDF con el logo de ISITEC, la fecha y la tabla de proyectos
- [x] Incluye las alertas abiertas y los riesgos con su mitigación, más las incidencias abiertas
- [x] Dos versiones: **para el cliente** (sin costos ni márgenes, con próximas entregas y
      facturas pendientes) y **uso interno** (con SPI, CPI, márgenes, horas y alertas)
- [x] Todos los proyectos o uno solo; desde el detalle de un proyecto lo sugiere por defecto
- [x] Cada exportación queda registrada y se ve en "Últimos reportes" (journey, actividad 6)
- [x] Sigue existiendo la exportación a CSV, ahora con los indicadores nuevos

Se usó la ventana de impresión del navegador ("Guardar como PDF") en lugar de jsPDF:
funciona sin internet y el reporte usa los mismos estilos de la app.

---

## Tarea 6 · Pulido final para la sustentación

- [x] Revisar la vista en Chrome a 1366 × 768 y 1920 × 1080.
- [x] Revisar la visibilidad en el equipo y proyector de la sustentación.
- [x] Ajustar el menú lateral para pantallas pequeñas. Se abre con **Menú** y se
      cierra al navegar o pulsar Escape. Las tablas anchas se desplazan dentro de su panel.
- [x] Revisar los textos de la aplicación y los reportes. Se corrigieron los rótulos
      y se conservó «AI POWERED» como parte del encabezado original del PDF.
- [x] Probar tres recorridos completos seguidos en Chrome sin errores, a 1366 × 768,
      1920 × 1080 y 390 × 844.
- [x] Preparar los datos de ejemplo con proyectos en tiempo, en riesgo y críticos, y
      planes de mitigación listos para mostrar. **Reiniciar datos** restaura esta escena.

El recorrido probado cubrió Resumen, filtros de Proyectos, detalle y fórmulas financieras,
creación, reasignación y cierre de una tarea, edición de una mitigación, gestión de alertas,
facturación, horas, incidencias, exportación a CSV y PDF, persistencia al recargar y reinicio
de los datos.
