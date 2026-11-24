/* ===========================================================
   vistas/calidad.js · Calidad y pruebas
   -----------------------------------------------------------
   Responde al feedback de Oscar del 4 de noviembre:
   cantidad de incidencias del proyecto y tiempo invertido en
   atenderlas. Una incidencia es una tarea con esIncidencia;
   guarda fechaReporte, fechaCierre y horas.
   Los cálculos viven en estado.js (calidadProyecto,
   calidadGlobal, evolucionIncidencias).
   =========================================================== */

const VistaCalidad = {
  filtroProyecto: 'todos',
  filtroEstado: 'abiertas',

  miga: () => '<a href="#/resumen">Inicio</a><span>/</span><strong>Calidad y pruebas</strong>',

  render () {
    const pid = this.filtroProyecto === 'todos' ? null : this.filtroProyecto;
    const lista = Estado.incidencias().filter(t => !pid || t.proyectoId === pid);
    const r = pid ? Estado.calidadProyecto(Estado.proyecto(pid)) : Estado.calidadGlobal();

    return `
      <section class="encabezado">
        <div>
          <h1>Calidad y pruebas</h1>
          <p class="sub">Incidencias reportadas, cuánto tiempo toma atenderlas y cómo evolucionan.</p>
        </div>
        <div class="encabezado-acciones">
          <select id="filtroCalidadProyecto" class="selector" aria-label="Filtrar por proyecto">
            <option value="todos">Todos los proyectos</option>
            ${Estado.proyectos().map(p => `<option value="${p.id}" ${this.filtroProyecto === p.id ? 'selected' : ''}>${UI.escapar(p.nombre)}</option>`).join('')}
          </select>
          <button class="boton primario" id="btnReportarIncidencia">+ Reportar incidencia</button>
        </div>
      </section>

      <section class="kpis">
        ${this.kpi('Incidencias', r.total, `${r.abiertas} abiertas · ${r.cerradas} cerradas`, 'azul', '✱')}
        ${this.kpi('Críticas abiertas', r.criticasAbiertas, r.criticasAbiertas ? 'severidad alta, sin cerrar' : 'ninguna pendiente', r.criticasAbiertas ? 'rojo' : 'verde', '!')}
        ${this.kpi('Horas en incidencias', r.horas + ' h', `${String(r.horasPromedio).replace('.', ',')} h en promedio por incidencia`, 'violeta', '⏱')}
        ${this.kpi('Tiempo de resolución', r.diasResolucion === null ? '—' : String(r.diasResolucion).replace('.', ',') + ' días',
                   'promedio, de reportada a cerrada', 'ambar', '↻')}
      </section>

      ${this.panelEvolucion(pid)}

      ${pid ? '' : this.panelPorProyecto()}

      ${this.panelLista(lista)}
    `;
  },

  kpi (label, valor, nota, color, icono) {
    const fondo = { azul:'var(--azul-claro)', rojo:'var(--rojo-claro)', verde:'var(--verde-claro)',
                    ambar:'var(--ambar-claro)', violeta:'#efebfb' }[color];
    const tinta = { azul:'var(--azul)', rojo:'var(--rojo)', verde:'var(--verde)',
                    ambar:'var(--ambar)', violeta:'var(--violeta)' }[color];
    return `
      <article class="kpi">
        <div class="kpi-top">
          <span class="kpi-label">${label}</span>
          <span class="marca" style="background:${fondo};color:${tinta}">${icono}</span>
        </div>
        <strong>${valor}</strong>
        <p>${nota}</p>
      </article>`;
  },

  /* --- Evolución semanal: reportadas vs cerradas ----------- */
  panelEvolucion (pid) {
    const semanas = Estado.evolucionIncidencias(8, pid);
    const primera = semanas[0], ultima = semanas[semanas.length - 1];
    const tendencia = ultima.abiertas > primera.abiertas
      ? `Las abiertas pasaron de <strong>${primera.abiertas}</strong> a <strong>${ultima.abiertas}</strong> en ocho semanas: se reportan más de las que se cierran.`
      : ultima.abiertas < primera.abiertas
        ? `Las abiertas bajaron de <strong>${primera.abiertas}</strong> a <strong>${ultima.abiertas}</strong> en ocho semanas: el equipo cierra más de lo que entra.`
        : `Las abiertas se mantienen en <strong>${ultima.abiertas}</strong>: entran tantas como se cierran.`;

    return `
      <section class="panel" style="margin-bottom:18px">
        <div class="panel-cabeza">
          <div>
            <h2>Evolución semanal</h2>
            <p>Incidencias reportadas contra cerradas en las últimas ocho semanas</p>
          </div>
          <div class="leyenda">
            <span><i style="background:var(--serie-1)"></i>Reportadas</span>
            <span><i style="background:var(--serie-2)"></i>Cerradas</span>
          </div>
        </div>
        <div class="grafica" id="graficaIncidencias">
          ${this.graficaBarras(semanas)}
          <div class="tooltip" id="tooltipIncidencias" role="status"></div>
        </div>
        <p class="lectura">${tendencia}</p>
        <details class="ver-tabla">
          <summary>Ver datos como tabla</summary>
          <div class="tabla-desplazable" tabindex="0"><table class="tabla" style="margin-top:10px">
            <thead><tr><th>Semana</th><th>Reportadas</th><th>Cerradas</th><th>Abiertas al cierre</th></tr></thead>
            <tbody>${semanas.map(s => `<tr><td>${UI.fecha(s.inicio)} – ${UI.fecha(s.fin)}</td>
              <td>${s.reportadas}</td><td>${s.cerradas}</td><td>${s.abiertas}</td></tr>`).join('')}</tbody>
          </table></div>
        </details>
      </section>`;
  },

  /* Columnas agrupadas en SVG: ≤ 24 px, punta redondeada de 4 px,
     base recta, 2 px de aire entre las dos barras de cada semana. */
  graficaBarras (semanas, anchoReal) {
    /* Se dibuja al ancho real del contenedor (1 unidad = 1 px), así
       las barras y el texto no se deforman en pantallas anchas. */
    const W = Math.max(480, Math.round(anchoReal || 1040)), H = 290, m = { t: 14, r: 8, b: 34, l: 34 };
    const ancho = W - m.l - m.r, alto = H - m.t - m.b;
    const maxDato = Math.max(1, ...semanas.map(s => Math.max(s.reportadas, s.cerradas)));
    const tope = Math.max(4, Math.ceil(maxDato / 2) * 2);
    const paso = tope <= 6 ? 1 : 2;
    const y = v => m.t + alto - v / tope * alto;
    const banda = ancho / semanas.length;
    const barra = Math.min(24, (banda - 24) / 2);

    const columna = (x, v, color) => {
      if (!v) return '';
      const top = y(v), h = m.t + alto - top, r = Math.min(4, h, barra / 2);
      return `<path fill="${color}" d="M${x},${m.t + alto} V${top + r} Q${x},${top} ${x + r},${top}
              H${x + barra - r} Q${x + barra},${top} ${x + barra},${top + r} V${m.t + alto} Z"/>`;
    };

    let ejes = '';
    for (let v = 0; v <= tope; v += paso) {
      ejes += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#eef1f6" stroke-width="1"/>
               <text x="${m.l - 10}" y="${y(v) + 5}" text-anchor="end" class="eje">${v}</text>`;
    }

    const grupos = semanas.map((s, i) => {
      const cx = m.l + banda * i + banda / 2;
      const x1 = cx - barra - 1, x2 = cx + 1;
      const esActual = i === semanas.length - 1;
      return `
        <g class="grupo" data-i="${i}">
          <rect class="hit" x="${m.l + banda * i}" y="${m.t}" width="${banda}" height="${alto}" fill="transparent"/>
          ${columna(x1, s.reportadas, 'var(--serie-1)')}
          ${columna(x2, s.cerradas, 'var(--serie-2)')}
          <text x="${cx}" y="${H - 8}" text-anchor="middle" class="eje ${esActual ? 'eje-fuerte' : ''}">${esActual ? 'Esta semana' : UI.fecha(s.inicio)}</text>
        </g>`;
    }).join('');

    this._semanas = semanas;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Incidencias reportadas y cerradas por semana">${ejes}${grupos}</svg>`;
  },

  /* --- Por proyecto ---------------------------------------- */
  panelPorProyecto () {
    return `
      <section class="panel" style="margin-bottom:18px">
        <div class="panel-cabeza">
          <div><h2>Incidencias por proyecto</h2><p>Haz clic en un proyecto para ver sus incidencias</p></div>
        </div>
        <div class="tabla-desplazable" tabindex="0">
          <table class="tabla">
            <thead><tr>
              <th>Proyecto</th><th>Total</th><th>Abiertas</th><th>Críticas abiertas</th>
              <th>Horas invertidas</th><th>% de las horas del proyecto</th><th>Resolución promedio</th>
            </tr></thead>
            <tbody>${Estado.proyectos().map(p => {
              const c = Estado.calidadProyecto(p);
              return `
                <tr class="clic" data-ir-calidad="${p.id}">
                  <td><strong>${UI.escapar(p.nombre)}</strong><br><small class="sub">${UI.escapar(Estado.cliente(p.clienteId).nombre)}</small></td>
                  <td><strong>${c.total}</strong></td>
                  <td>${c.abiertas ? `<span class="chip ambar">${c.abiertas} abierta${c.abiertas > 1 ? 's' : ''}</span>` : '<span class="chip verde">0</span>'}</td>
                  <td>${c.criticasAbiertas ? `<span class="chip rojo">${c.criticasAbiertas}</span>` : '<span class="sub">—</span>'}</td>
                  <td><strong>${c.horas} h</strong></td>
                  <td class="celda-avance">
                    <div class="rotulos"><span><strong>${String(c.pctHoras).replace('.', ',')}%</strong></span></div>
                    ${UI.barra(c.pctHoras * 5, c.pctHoras >= 6 ? 'ambar' : '')}
                  </td>
                  <td>${c.diasResolucion === null ? '—' : String(c.diasResolucion).replace('.', ',') + ' días'}</td>
                </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <p class="sub" style="margin:14px 0 0;font-size:14.5px">
          La barra de "% de las horas" está a escala 1:5 (20% de las horas llena la barra). Más de 6% se marca en ámbar.
        </p>
      </section>`;
  },

  /* --- Lista de incidencias -------------------------------- */
  panelLista (todas) {
    const f = this.filtroEstado;
    const lista = todas
      .filter(t => f === 'todas' || (f === 'abiertas') === Estado.incidenciaAbierta(t))
      .sort((a, b) => (Estado.incidenciaAbierta(b) - Estado.incidenciaAbierta(a))
                   || ({ alta: 0, media: 1, baja: 2 }[a.prioridad] - { alta: 0, media: 1, baja: 2 }[b.prioridad])
                   || String(b.fechaReporte).localeCompare(String(a.fechaReporte)));
    const cuenta = k => todas.filter(t => k === 'todas' || (k === 'abiertas') === Estado.incidenciaAbierta(t)).length;

    return `
      <section class="panel">
        <div class="panel-cabeza">
          <div><h2>Incidencias</h2><p>Al cerrar una incidencia se registran las horas que tomó atenderla</p></div>
          <div class="segmento" role="tablist">
            ${['abiertas', 'cerradas', 'todas'].map(k => `
              <button class="${f === k ? 'activo' : ''}" data-filtro-estado="${k}">
                ${k[0].toUpperCase() + k.slice(1)} <b>${cuenta(k)}</b></button>`).join('')}
          </div>
        </div>
        ${lista.length ? VistaCalidad.tablaIncidencias(lista, true)
          : UI.vacio(f === 'abiertas' ? 'Sin incidencias abiertas' : 'Sin incidencias',
                     f === 'abiertas' ? 'Todo lo reportado ya fue atendido.' : 'No hay incidencias para mostrar.')}
      </section>`;
  },

  /* Tabla reutilizable (también la usa la pestaña Calidad del detalle) */
  tablaIncidencias (lista, mostrarProyecto) {
    return `
      <div class="tabla-desplazable" tabindex="0">
        <table class="tabla">
          <thead><tr>
            <th style="width:34%">Incidencia</th><th>Responsable</th><th>Severidad</th>
            <th>Reportada</th><th>Horas</th><th></th>
          </tr></thead>
          <tbody>${lista.map(t => {
            const abierta = Estado.incidenciaAbierta(t);
            const p = Estado.proyecto(t.proyectoId);
            const edad = t.fechaReporte ? Math.abs(Estado.diasDesdeHoy(t.fechaReporte)) : null;
            const resolucion = !abierta && t.fechaReporte && t.fechaCierre ? Estado.dias(t.fechaReporte, t.fechaCierre) : null;
            return `
              <tr class="${abierta ? '' : 'completada'}">
                <td><strong>${UI.escapar(t.nombre.replace(/^Incidencia:\s*/i, ''))}</strong>
                  ${mostrarProyecto ? `<br><small class="sub">${UI.escapar(p.nombre)}</small>` : ''}</td>
                <td>${UI.personaLinea(t.responsableId)}</td>
                <td>${UI.chipPrioridad(t.prioridad)}</td>
                <td style="font-size:14.5px">${UI.fecha(t.fechaReporte)}<br>
                  <small class="sub">${abierta
                    ? (edad === 0 ? 'Hoy' : `Abierta hace ${edad} día${edad === 1 ? '' : 's'}`)
                    : `Cerrada en ${resolucion} día${resolucion === 1 ? '' : 's'}`}</small></td>
                <td>${Rol.esCliente() ? '—' : `<strong>${t.horas || 0} h</strong>`}</td>
                <td style="text-align:right;white-space:nowrap">${!Rol.puedeEditarTarea(t) ? '' : abierta ? `
                  <button class="boton-texto" data-horas-incidencia="${t.id}">+ Horas</button>
                  <button class="boton sutil" data-cerrar-incidencia="${t.id}" style="margin-left:8px">Cerrar</button>`
                  : `<button class="boton-texto" data-reabrir-incidencia="${t.id}">Reabrir</button>`}</td>
              </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
  },

  /* --- Eventos --------------------------------------------- */
  montar () {
    const raiz = document.querySelector('#vista');
    const sel = raiz.querySelector('#filtroCalidadProyecto');
    sel.addEventListener('change', () => { this.filtroProyecto = sel.value; App.render(); });
    raiz.querySelector('#btnReportarIncidencia').addEventListener('click', () =>
      VistaCalidad.abrirReportar(this.filtroProyecto === 'todos' ? null : this.filtroProyecto));
    raiz.querySelectorAll('[data-filtro-estado]').forEach(b =>
      b.addEventListener('click', () => { this.filtroEstado = b.dataset.filtroEstado; App.render(); }));
    raiz.querySelectorAll('[data-ir-calidad]').forEach(tr =>
      tr.addEventListener('click', () => {
        VistaProyecto.id = tr.dataset.irCalidad;
        VistaProyecto.pestana = 'calidad';
        location.hash = '#/proyecto/' + tr.dataset.irCalidad;
      }));
    VistaCalidad.montarAcciones(raiz);
    this.ajustarGrafica(raiz);
    if (!this._escuchaResize) {
      this._escuchaResize = true;
      let t;
      window.addEventListener('resize', () => {
        clearTimeout(t);
        t = setTimeout(() => { const r = document.querySelector('#vista'); if (r.querySelector('#graficaIncidencias')) this.ajustarGrafica(r); }, 120);
      });
    }
  },

  /* Redibuja la gráfica al ancho que realmente tiene en pantalla */
  ajustarGrafica (raiz) {
    const caja = raiz.querySelector('#graficaIncidencias');
    if (!caja || !this._semanas) return;
    const svg = caja.querySelector('svg');
    svg.outerHTML = this.graficaBarras(this._semanas, caja.clientWidth);
    this.montarTooltip(raiz);
  },

  /* Acciones de la tabla de incidencias (reutilizadas en el detalle) */
  montarAcciones (raiz) {
    raiz.querySelectorAll('[data-cerrar-incidencia]').forEach(b =>
      b.addEventListener('click', () => VistaCalidad.abrirHoras(b.dataset.cerrarIncidencia, true)));
    raiz.querySelectorAll('[data-horas-incidencia]').forEach(b =>
      b.addEventListener('click', () => VistaCalidad.abrirHoras(b.dataset.horasIncidencia, false)));
    raiz.querySelectorAll('[data-reabrir-incidencia]').forEach(b =>
      b.addEventListener('click', () => {
        Estado.alternarTarea(b.dataset.reabrirIncidencia);
        UI.toast('Incidencia reabierta.');
      }));
  },

  montarTooltip (raiz) {
    const caja = raiz.querySelector('#graficaIncidencias');
    const tip = raiz.querySelector('#tooltipIncidencias');
    if (!caja || !tip) return;
    caja.querySelectorAll('.grupo').forEach(g => {
      g.addEventListener('mouseenter', () => {
        const s = this._semanas[+g.dataset.i];
        caja.querySelectorAll('.grupo').forEach(x => x.classList.toggle('apagado', x !== g));
        tip.innerHTML = `
          <strong>${UI.fecha(s.inicio)} – ${UI.fecha(s.fin)}</strong>
          <span><i style="background:var(--serie-1)"></i>Reportadas <b>${s.reportadas}</b></span>
          <span><i style="background:var(--serie-2)"></i>Cerradas <b>${s.cerradas}</b></span>
          <span class="sep">Abiertas al cierre <b>${s.abiertas}</b></span>`;
        tip.classList.add('ver');
      });
      g.addEventListener('mousemove', e => {
        const r = caja.getBoundingClientRect();
        let x = e.clientX - r.left + 14;
        if (x + tip.offsetWidth > r.width) x = e.clientX - r.left - tip.offsetWidth - 14;
        tip.style.left = Math.max(0, x) + 'px';
        tip.style.top = Math.max(0, e.clientY - r.top - 40) + 'px';
      });
    });
    caja.addEventListener('mouseleave', () => {
      tip.classList.remove('ver');
      caja.querySelectorAll('.grupo').forEach(x => x.classList.remove('apagado'));
    });
  },

  /* --- Modales --------------------------------------------- */
  abrirReportar (proyectoId) {
    const enTres = (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); })();
    const pSel = proyectoId || Estado.proyectos()[0].id;
    UI.modal(`
      <h2>Reportar incidencia</h2>
      <p class="modal-sub">Queda registrada con la fecha de hoy y aparece en el indicador de calidad.</p>
      <label class="campo">¿Qué falló?
        <input type="text" id="ri_nombre" placeholder="Ej. El reporte de cartera no cuadra con contabilidad">
      </label>
      <label class="campo">Proyecto
        <select id="ri_proyecto">${Estado.proyectos().map(p =>
          `<option value="${p.id}" ${p.id === pSel ? 'selected' : ''}>${UI.escapar(p.nombre)}</option>`).join('')}</select>
      </label>
      <div class="campos-fila">
        <label class="campo">Responsable
          <select id="ri_responsable">${Estado.personas().map(p => `<option value="${p.id}" ${p.id === Rol.persona() ? 'selected' : ''}>${UI.escapar(p.nombre)}</option>`).join('')}</select>
        </label>
        <label class="campo">Severidad
          <select id="ri_severidad">
            <option value="alta">Alta · bloquea al cliente</option>
            <option value="media" selected>Media</option>
            <option value="baja">Baja · cosmética</option>
          </select>
        </label>
      </div>
      <div class="campos-fila">
        <label class="campo">Fecha límite
          <input type="date" id="ri_fecha" value="${enTres}">
        </label>
        <label class="campo">Horas ya invertidas
          <input type="number" id="ri_horas" min="0" step="0.5" value="0">
        </label>
      </div>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="ri_guardar">Reportar</button>
      </div>`,
      dlg => {
        dlg.querySelector('#ri_nombre').focus();
        dlg.querySelector('#ri_guardar').addEventListener('click', () => {
          const nombre = dlg.querySelector('#ri_nombre').value.trim();
          if (!nombre) { dlg.querySelector('#ri_nombre').focus(); return; }
          Estado.crearTarea({
            nombre,
            proyectoId: dlg.querySelector('#ri_proyecto').value,
            responsableId: dlg.querySelector('#ri_responsable').value,
            fechaLimite: dlg.querySelector('#ri_fecha').value,
            prioridad: dlg.querySelector('#ri_severidad').value,
            esIncidencia: true,
            horas: Math.max(0, parseFloat(dlg.querySelector('#ri_horas').value) || 0)
          });
          UI.cerrarModal();
          UI.toast('Incidencia reportada.');
        });
      });
  },

  /* cerrar = true → registra horas y cierra; false → solo suma horas */
  abrirHoras (id, cerrar) {
    const t = Estado.tareas().find(x => x.id === id);
    if (!t) return;
    UI.modal(`
      <h2>${cerrar ? 'Cerrar incidencia' : 'Registrar horas'}</h2>
      <p class="modal-sub">${UI.escapar(t.nombre)} · lleva <strong>${t.horas || 0} h</strong> registradas</p>
      <label class="campo">${cerrar ? '¿Cuántas horas más tomó resolverla?' : '¿Cuántas horas se le dedicaron?'}
        <input type="number" id="hi_horas" min="0" step="0.5" value="${cerrar ? 0 : 1}">
      </label>
      <div class="atajos">${[1, 2, 4, 8].map(h => `<button class="chip gris" data-atajo="${h}">+${h} h</button>`).join('')}</div>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="hi_guardar">${cerrar ? 'Cerrar incidencia' : 'Guardar horas'}</button>
      </div>`,
      dlg => {
        const campo = dlg.querySelector('#hi_horas');
        campo.focus(); campo.select();
        dlg.querySelectorAll('[data-atajo]').forEach(b => b.addEventListener('click', () => {
          campo.value = (parseFloat(campo.value) || 0) + Number(b.dataset.atajo);
        }));
        dlg.querySelector('#hi_guardar').addEventListener('click', () => {
          const h = Math.max(0, parseFloat(campo.value) || 0);
          UI.cerrarModal();
          if (cerrar) { Estado.cerrarIncidencia(id, h); UI.toast(`Incidencia cerrada · ${(t.horas || 0)} h en total.`); }
          else { Estado.registrarHorasIncidencia(id, h); UI.toast(`${h} h registradas.`); }
        });
      });
  }
};
