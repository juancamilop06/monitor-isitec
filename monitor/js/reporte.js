/* ===========================================================
   reporte.js · Exportar el reporte (PDF y CSV)
   -----------------------------------------------------------
   Journey futuro, actividad 6: "Se exporta con un botón y
   queda registro de la acción".
   El PDF se arma como HTML con estilos de impresión y se usa
   la ventana de impresión del navegador ("Guardar como PDF").
   Así funciona sin internet y sin librerías externas.

   Dos tipos de reporte:
   · Interno (gerencia): incluye SPI, CPI, costos, márgenes,
     horas y alertas.
   · Para el cliente: solo estado, entregas, riesgos con su
     mitigación, incidencias y facturas. Nunca muestra costos
     ni márgenes de ISITEC.
   =========================================================== */

const Reporte = (function () {

  /* --- piezas ---------------------------------------------- */
  const e = s => UI.escapar(s);

  function logo () {
    return `
      <div class="r-logo">
        <span class="r-logo-texto">ISITEC</span>
        <span class="r-logo-pill"><b>AI</b><i></i>POWERED</span>
      </div>`;
  }

  function chip (clave, texto) {
    return `<span class="r-chip ${clave}">${e(texto)}</span>`;
  }

  function barra (pct, clave) {
    return `<span class="r-barra"><span class="${clave || ''}" style="width:${Math.min(100, Math.max(0, pct))}%"></span></span>`;
  }

  function kpi (label, valor, nota, clave) {
    return `<div class="r-kpi"><span>${label}</span><strong class="${clave || ''}">${valor}</strong><small>${nota || ''}</small></div>`;
  }

  function seccion (titulo, sub, cuerpo) {
    return `<section class="r-seccion"><h2>${titulo}</h2>${sub ? `<p class="r-sub">${sub}</p>` : ''}${cuerpo}</section>`;
  }

  function cierre (p) {
    const c = Estado.proyeccionCierre(p);
    if (!c) return 'Sin datos';
    const d = c.desvioDias;
    return `${UI.fecha(c.fecha)}<br><small class="${d > 7 ? 'rojo' : d > 0 ? 'ambar' : 'verde'}">${
      d > 0 ? `${d} días después del plan` : d < 0 ? `${-d} días antes` : 'En fecha'}</small>`;
  }

  /* --- secciones ------------------------------------------- */
  function tablaEstado (proyectos) {
    return `
      <table class="r-tabla">
        <thead><tr><th>Proyecto</th><th>Avance real</th><th>Esperado</th><th>Desviación</th><th>Cierre proyectado</th><th>Estado</th></tr></thead>
        <tbody>${proyectos.map(p => {
          const s = Estado.semaforo(p), d = Estado.desviacion(p);
          return `<tr>
            <td><strong>${e(p.nombre)}</strong><br><small>${e(Estado.cliente(p.clienteId).nombre)} · Líder: ${e(Estado.persona(p.liderId).nombre)}</small></td>
            <td><strong>${p.avanceReal}%</strong>${barra(p.avanceReal, s.clave)}</td>
            <td>${Estado.avanceEsperado(p)}%</td>
            <td class="${d >= -5 ? 'verde' : d >= -15 ? 'ambar' : 'rojo'}"><strong>${d >= 0 ? '+' : ''}${d} pts</strong></td>
            <td>${cierre(p)}</td>
            <td>${chip(s.clave, s.texto)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  }

  function tablaFinanzas (proyectos) {
    return `
      <table class="r-tabla">
        <thead><tr><th>Proyecto</th><th>SPI</th><th>CPI</th><th>Costo al cierre</th><th>Margen proyectado</th><th>Horas vs avance</th></tr></thead>
        <tbody>${proyectos.map(p => {
          const d = Estado.desempeno(p), h = Estado.horasProyecto(p), prod = Estado.productividad(p);
          return `<tr>
            <td><strong>${e(p.nombre)}</strong><br><small>Contrato ${UI.dinero(p.valorContrato)} · presupuesto ${UI.dinero(d.bac)}</small></td>
            <td class="${d.claveSpi}"><strong>${UI.indice(d.spi)}</strong></td>
            <td class="${d.claveCpi}"><strong>${UI.indice(d.cpi)}</strong></td>
            <td class="${d.claveCosto}"><strong>${UI.dinero(d.eac)}</strong></td>
            <td class="${d.claveMargen}"><strong>${UI.pct(d.margenProyectado)}</strong><br><small>planeado ${UI.pct(d.margenPlan)}</small></td>
            <td><strong>${h.pctConsumo}%</strong> horas · ${p.avanceReal}% avance<br><small class="${prod.clave}">${h.brecha > 0 ? '+' : ''}${h.brecha} pts · ${e(prod.texto)}</small></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <p class="r-nota">SPI = valor ganado ÷ valor planeado · CPI = valor ganado ÷ costo real · 1,00 = según el plan.
        Costos de ejemplo, por validar con el sistema contable.</p>`;
  }

  function listaAlertas (ids) {
    const lista = Estado.alertasAbiertas().filter(a => !a.proyectoId || ids.includes(a.proyectoId));
    if (!lista.length) return '<p class="r-vacio">Sin alertas abiertas.</p>';
    return `<ul class="r-alertas">${lista.map(a => {
      const [fondo, tinta, icono] = UI.estiloAlerta(a.tipo);
      return `<li><span class="r-icono" style="background:${fondo};color:${tinta}">${icono}</span>
        <span><strong>${e(a.titulo)}</strong><br><small>${e(a.detalle)}</small></span></li>`;
    }).join('')}</ul>`;
  }

  function tablaRiesgos (ids, conProyecto) {
    const lista = Estado.tareasEnRiesgo().filter(t => ids.includes(t.proyectoId));
    if (!lista.length) return '<p class="r-vacio">No hay riesgos abiertos.</p>';
    return `
      <table class="r-tabla">
        <thead><tr><th style="width:30%">Tarea en riesgo</th><th>Causa</th><th>Responsable</th><th style="width:38%">Plan de mitigación</th></tr></thead>
        <tbody>${lista.map(t => `<tr>
          <td><strong>${e(t.nombre)}</strong>${conProyecto ? `<br><small>${e(Estado.proyecto(t.proyectoId).nombre)}</small>` : ''}</td>
          <td>${chip('ambar', Estado.CAUSAS[t.riesgo.causa])}</td>
          <td>${e(Estado.persona(t.responsableId).nombre)}</td>
          <td>${t.riesgo.mitigacion ? e(t.riesgo.mitigacion) : '<em class="rojo">Sin plan definido todavía</em>'}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  }

  function tablaIncidencias (ids, conProyecto) {
    const lista = Estado.incidencias().filter(t => ids.includes(t.proyectoId) && Estado.incidenciaAbierta(t));
    if (!lista.length) return '<p class="r-vacio">No hay incidencias abiertas.</p>';
    return `
      <table class="r-tabla">
        <thead><tr><th style="width:40%">Incidencia</th><th>Severidad</th><th>Responsable</th><th>Reportada</th><th>Fecha compromiso</th></tr></thead>
        <tbody>${lista.map(t => `<tr>
          <td><strong>${e(t.nombre.replace(/^Incidencia:\s*/i, ''))}</strong>${conProyecto ? `<br><small>${e(Estado.proyecto(t.proyectoId).nombre)}</small>` : ''}</td>
          <td>${chip({ alta: 'rojo', media: 'ambar', baja: 'gris' }[t.prioridad], t.prioridad[0].toUpperCase() + t.prioridad.slice(1))}</td>
          <td>${e(Estado.persona(t.responsableId).nombre)}</td>
          <td>${UI.fecha(t.fechaReporte)}</td>
          <td>${UI.fecha(t.fechaLimite)}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  }

  function tablaEntregas (p) {
    const lista = Estado.tareasDe(p.id)
      .filter(t => t.estado !== 'completada' && !t.esIncidencia && Estado.diasDesdeHoy(t.fechaLimite) <= 21)
      .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
    if (!lista.length) return '<p class="r-vacio">No hay entregas en las próximas tres semanas.</p>';
    return `
      <table class="r-tabla">
        <thead><tr><th style="width:50%">Actividad</th><th>Responsable</th><th>Fecha</th><th>Estado</th></tr></thead>
        <tbody>${lista.map(t => {
          const vencida = Estado.estaVencida(t);
          return `<tr>
            <td><strong>${e(t.nombre)}</strong></td>
            <td>${e(Estado.persona(t.responsableId).nombre)}</td>
            <td>${UI.fecha(t.fechaLimite)}</td>
            <td>${vencida ? chip('rojo', 'Atrasada') : t.riesgo ? chip('ambar', 'En riesgo') : chip('verde', 'Al día')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  }

  function tablaFacturas (ids) {
    const lista = Estado.facturas().filter(f => ids.includes(f.proyectoId) && f.estado === 'pendiente');
    if (!lista.length) return '<p class="r-vacio">No hay facturas pendientes de pago.</p>';
    return `
      <table class="r-tabla">
        <thead><tr><th>Factura</th><th>Monto</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th></tr></thead>
        <tbody>${lista.map(f => {
          const vencida = Estado.diasDesdeHoy(f.vencimiento) < 0;
          return `<tr>
            <td><strong>${e(f.numero)}</strong></td>
            <td>${UI.dineroLargo(f.monto)}</td>
            <td>${UI.fecha(f.emision)}</td>
            <td>${UI.fecha(f.vencimiento)}</td>
            <td>${vencida ? chip('rojo', `Vencida hace ${-Estado.diasDesdeHoy(f.vencimiento)} días`) : chip('ambar', 'Pendiente')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  }

  /* --- documento completo ---------------------------------- */
  function html ({ proyectoId, interno }) {
    const proyectos = proyectoId ? [Estado.proyecto(proyectoId)] : Estado.proyectos();
    const ids = proyectos.map(p => p.id);
    const uno = proyectos.length === 1 ? proyectos[0] : null;
    const hoy = Estado.hoyISO();

    const tareas = Estado.tareas().filter(t => ids.includes(t.proyectoId));
    const vencidas = tareas.filter(Estado.estaVencida).length;
    const riesgos = tareas.filter(Estado.enRiesgo).length;
    const incAbiertas = Estado.incidencias().filter(t => ids.includes(t.proyectoId) && Estado.incidenciaAbierta(t)).length;
    const porCobrar = Estado.facturas().filter(f => ids.includes(f.proyectoId) && f.estado === 'pendiente').reduce((s, f) => s + f.monto, 0);

    const titulo = uno ? e(uno.nombre) : 'Estado de los proyectos';
    const subtitulo = uno
      ? `${e(Estado.cliente(uno.clienteId).nombre)} · ${UI.fechaLarga(uno.inicio)} → ${UI.fechaLarga(uno.finPlan)}`
      : `${proyectos.length} proyectos activos · ${[...new Set(proyectos.map(p => Estado.cliente(p.clienteId).nombre))].length} clientes`;

    let kpis;
    if (uno) {
      const s = Estado.semaforo(uno), d = Estado.desviacion(uno), c = Estado.proyeccionCierre(uno);
      kpis = kpi('Avance real', uno.avanceReal + '%', `esperado ${Estado.avanceEsperado(uno)}%`)
           + kpi('Desviación', `${d >= 0 ? '+' : ''}${d} pts`, s.texto, s.clave)
           + kpi('Cierre proyectado', c ? UI.fecha(c.fecha) : '—', c ? (c.desvioDias > 0 ? `${c.desvioDias} días después del plan` : 'dentro del plan') : '')
           + kpi('Riesgos abiertos', riesgos, `${incAbiertas} incidencias abiertas`, riesgos ? 'ambar' : '');
      if (interno) {
        const f = Estado.desempeno(uno);
        kpis += kpi('Margen proyectado', UI.pct(f.margenProyectado), `SPI ${UI.indice(f.spi)} · CPI ${UI.indice(f.cpi)}`, f.claveMargen);
      }
    } else {
      kpis = kpi('Proyectos activos', proyectos.length, `${proyectos.filter(p => Estado.semaforo(p).clave !== 'verde').length} requieren atención`)
           + kpi('Tareas vencidas', vencidas, 'requieren acción', vencidas ? 'rojo' : '')
           + kpi('En riesgo', riesgos, 'con causa identificada', riesgos ? 'ambar' : '')
           + kpi('Incidencias abiertas', incAbiertas, 'en todos los proyectos', incAbiertas ? 'ambar' : '')
           + kpi('Por cobrar', UI.dinero(porCobrar), 'facturación pendiente');
    }

    const cuerpo = [
      seccion(uno ? 'Estado del proyecto' : 'Estado de los proyectos',
              'Avance reportado contra el avance esperado según el cronograma', tablaEstado(proyectos)),
      interno ? seccion('Desempeño financiero y productividad', 'Uso interno de ISITEC', tablaFinanzas(proyectos)) : '',
      uno ? seccion('Próximas entregas', 'Actividades pendientes de las próximas tres semanas', tablaEntregas(uno)) : '',
      seccion('Riesgos y plan de mitigación', 'Cada riesgo con su causa y la acción acordada', tablaRiesgos(ids, !uno)),
      seccion('Incidencias abiertas', 'Reportadas y en atención', tablaIncidencias(ids, !uno)),
      interno ? seccion('Alertas abiertas', 'Detectadas automáticamente por el monitor', listaAlertas(ids)) : '',
      uno ? seccion('Facturación pendiente', '', tablaFacturas(ids)) : ''
    ].join('');

    return `
      <article class="r-doc">
        <header class="r-cabeza">
          ${logo()}
          <div class="r-meta">
            <strong>Reporte de seguimiento</strong>
            <span>${UI.fechaLarga(hoy)}</span>
            <span>Preparado por ${UI.escapar((typeof Nube !== "undefined" && Nube) ? Nube.nombreUsuario() : 'Oscar Panadero')}</span>
            ${interno ? '<span class="r-chip rojo">Uso interno</span>' : '<span class="r-chip azul">Para el cliente</span>'}
          </div>
        </header>
        <div class="r-titulo">
          <h1>${titulo}</h1>
          <p>${subtitulo}</p>
        </div>
        <div class="r-kpis">${kpis}</div>
        ${cuerpo}
        <footer class="r-pie">
          Generado automáticamente por el Monitor de seguimiento ISITEC el ${UI.fechaLarga(hoy)}.
          Los datos salen del cronograma, el registro de horas y la facturación de cada proyecto.
        </footer>
      </article>`;
  }

  /* --- acciones -------------------------------------------- */
  function imprimir (opciones) {
    let caja = document.querySelector('#reporte-impresion');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'reporte-impresion';
      document.body.appendChild(caja);
    }
    caja.innerHTML = html(opciones);

    /* El título del documento es el nombre sugerido del PDF */
    const tituloOriginal = document.title;
    const p = opciones.proyectoId ? Estado.proyecto(opciones.proyectoId) : null;
    document.title = `Reporte ISITEC - ${p ? p.nombre : 'Todos los proyectos'} - ${Estado.hoyISO()}`;
    document.body.classList.add('imprimiendo');

    const limpiar = () => {
      document.body.classList.remove('imprimiendo');
      document.title = tituloOriginal;
      caja.innerHTML = '';
      window.removeEventListener('afterprint', limpiar);
    };
    window.addEventListener('afterprint', limpiar);
    setTimeout(() => window.print(), 60);   // deja que el navegador pinte antes
  }

  function csv ({ proyectoId, interno }) {
    const proyectos = proyectoId ? [Estado.proyecto(proyectoId)] : Estado.proyectos();
    const cab = ['Proyecto', 'Cliente', 'Líder', 'Avance real', 'Avance esperado', 'Desviación', 'Estado',
                 'Cierre proyectado', 'Tareas vencidas', 'Riesgos abiertos', 'Incidencias abiertas'];
    if (interno) cab.push('SPI', 'CPI', 'Costo al cierre', 'Margen proyectado', 'Horas consumidas', 'Horas vs avance (pts)');
    const filas = [cab];
    proyectos.forEach(p => {
      const proy = Estado.proyeccionCierre(p);
      const tareas = Estado.tareasDe(p.id);
      const fila = [
        p.nombre, Estado.cliente(p.clienteId).nombre, Estado.persona(p.liderId).nombre,
        p.avanceReal + '%', Estado.avanceEsperado(p) + '%', Estado.desviacion(p) + ' pts',
        Estado.semaforo(p).texto, proy ? proy.fecha : 'sin dato',
        tareas.filter(Estado.estaVencida).length,
        tareas.filter(Estado.enRiesgo).length,
        tareas.filter(t => t.esIncidencia && Estado.incidenciaAbierta(t)).length
      ];
      if (interno) {
        const d = Estado.desempeno(p), h = Estado.horasProyecto(p);
        fila.push(UI.indice(d.spi), UI.indice(d.cpi), Math.round(d.eac), UI.pct(d.margenProyectado),
                  h.consumidas, h.brecha);
      }
      filas.push(fila);
    });
    const texto = filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const p = proyectoId ? Estado.proyecto(proyectoId) : null;
    UI.descargar(`seguimiento-isitec-${p ? p.id : 'todos'}-${Estado.hoyISO()}.csv`, texto);
  }

  /* --- modal de exportación -------------------------------- */
  function abrir (proyectoSugerido) {
    const historial = Rol.esLider() ? Estado.reportes().slice(0, 3) : [];
    const nombreAlcance = r => r.alcance === 'todos' ? 'Todos los proyectos'
      : (Estado.proyecto(r.alcance) || { nombre: r.alcance }).nombre;

    UI.modal(`
      <h2>Exportar reporte</h2>
      <p class="modal-sub">Arma el reporte con los datos de hoy. Queda registrado en el historial.</p>

      <label class="campo">¿Qué proyectos?
        <select id="ex_alcance">
          <option value="todos">Todos los proyectos</option>
          ${Estado.proyectos().map(p => `<option value="${p.id}" ${p.id === proyectoSugerido ? 'selected' : ''}>${e(p.nombre)} · ${e(Estado.cliente(p.clienteId).nombre)}</option>`).join('')}
        </select>
      </label>

      <span class="campo" style="margin-bottom:8px">¿Para quién es?</span>
      <div class="opciones" id="ex_publico">
        <button class="opcion" data-publico="cliente">
          <strong>Para el cliente</strong><small>Estado, entregas, riesgos e incidencias. Sin costos ni márgenes.</small></button>
        ${Rol.esLider() ? `<button class="opcion" data-publico="interno">
          <strong>Uso interno</strong><small>Agrega SPI, CPI, márgenes, horas y alertas.</small></button>` : ''}
      </div>

      <span class="campo" style="margin:14px 0 8px">Formato</span>
      <div class="segmento" id="ex_formato">
        <button class="activo" data-formato="pdf">PDF</button>
        <button data-formato="csv">CSV (Excel)</button>
      </div>
      <p class="sub" id="ex_ayuda" style="font-size:14.5px;margin:10px 0 0">Se abre la ventana de impresión: elige <b>Guardar como PDF</b>.</p>

      ${historial.length ? `
        <div class="historial">
          <b>Últimos reportes</b>
          ${historial.map(r => `<span>${UI.fecha(r.fecha)} · ${e(nombreAlcance(r))} · ${r.formato.toUpperCase()} · ${r.interno ? 'interno' : 'cliente'}</span>`).join('')}
        </div>` : ''}

      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="ex_generar">Generar PDF</button>
      </div>`,
      dlg => {
        const alcance = dlg.querySelector('#ex_alcance');
        let publico = proyectoSugerido || !Rol.esLider() ? 'cliente' : 'interno';
        let formato = 'pdf';

        const pintar = () => {
          dlg.querySelectorAll('[data-publico]').forEach(b => b.classList.toggle('activo', b.dataset.publico === publico));
          dlg.querySelectorAll('[data-formato]').forEach(b => b.classList.toggle('activo', b.dataset.formato === formato));
          dlg.querySelector('#ex_generar').textContent = formato === 'pdf' ? 'Generar PDF' : 'Descargar CSV';
          dlg.querySelector('#ex_ayuda').innerHTML = formato === 'pdf'
            ? 'Se abre la ventana de impresión: elige <b>Guardar como PDF</b>.'
            : 'Descarga una tabla que se abre en Excel.';
        };
        dlg.querySelectorAll('[data-publico]').forEach(b => b.addEventListener('click', () => { publico = b.dataset.publico; pintar(); }));
        dlg.querySelectorAll('[data-formato]').forEach(b => b.addEventListener('click', () => { formato = b.dataset.formato; pintar(); }));
        /* Un proyecto suele ir al cliente; todos, a gerencia */
        alcance.addEventListener('change', () => { publico = alcance.value === 'todos' && Rol.esLider() ? 'interno' : 'cliente'; pintar(); });
        pintar();

        dlg.querySelector('#ex_generar').addEventListener('click', () => {
          const opciones = {
            proyectoId: alcance.value === 'todos' ? null : alcance.value,
            interno: publico === 'interno'
          };
          UI.cerrarModal();
          if (formato === 'pdf') imprimir(opciones); else csv(opciones);
          Estado.registrarReporte({ alcance: alcance.value, formato, interno: opciones.interno });
          UI.toast(formato === 'pdf' ? 'Reporte listo para guardar como PDF.' : 'Reporte CSV descargado.');
        });
      });
  }

  return { abrir, html, imprimir, csv };
})();
