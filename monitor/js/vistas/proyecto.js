/* ===========================================================
   vistas/proyecto.js · Detalle de un proyecto
   Pestañas: Tareas · Riesgos · Horas · Calidad · Facturación
   Cabecera: avance, desviación y cierre proyectado, más la fila
   de desempeño financiero (SPI, CPI, costo al cierre, margen).
   =========================================================== */

const VistaProyecto = {
  id: null,
  pestana: 'tareas',

  miga () {
    const p = Estado.proyecto(this.id);
    return `<a href="#/resumen">Inicio</a><span>/</span><a href="#/proyectos">Proyectos</a>
            <span>/</span><strong>${UI.escapar(p ? p.nombre : '')}</strong>`;
  },

  render (params) {
    if (params && params.id && params.id !== this.id) { this.id = params.id; this.pestana = 'tareas'; }
    const p = Estado.proyecto(this.id);
    if (!p) return UI.vacio('Proyecto no encontrado', 'Vuelve al listado de proyectos.');

    const c = Estado.cliente(p.clienteId);
    const sem = Estado.semaforo(p);
    const esperado = Estado.avanceEsperado(p);
    const desv = Estado.desviacion(p);
    const proy = Estado.proyeccionCierre(p);
    const tareas = Estado.tareasDe(p.id);
    const riesgos = tareas.filter(Estado.enRiesgo);
    const calidad = Estado.calidadProyecto(p);
    const preguntasAbiertas = Estado.preguntas().filter(q => q.proyectoId === p.id && q.estado !== 'respondida').length;
    if (!this.pestanas().some(([k]) => k === this.pestana)) this.pestana = 'tareas';

    let cierreValor = '—', cierreNota = 'Sin datos suficientes', claseCierre = '';
    if (proy) {
      cierreValor = UI.fecha(proy.fecha);
      const d = proy.desvioDias;
      cierreNota = d > 0 ? `${d} días después del plan` : d < 0 ? `${Math.abs(d)} días antes` : 'En la fecha planeada';
      claseCierre = d > 7 ? 'rojo' : d > 0 ? 'ambar' : 'verde';
    }

    return `
      <div class="detalle-cabeza">
        <div class="detalle-top">
          <div>
            <p class="etiqueta">${UI.escapar(c.nombre)}</p>
            <h1>${UI.escapar(p.nombre)}</h1>
            <p class="cliente">Líder: ${UI.escapar(Estado.persona(p.liderId).nombre)} ·
               ${UI.fechaLarga(p.inicio)} → ${UI.fechaLarga(p.finPlan)}</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            ${UI.chipEstado(sem)}
            ${Rol.esLider() ? `<button class="boton secundario" data-gestion="proyecto:${p.id}">Editar proyecto</button>` : ''}
          </div>
        </div>
        <div class="medidas">
          <div class="medida">
            <span class="m-label">Avance real</span>
            <span class="m-valor">${p.avanceReal}%</span>
            ${UI.barra(p.avanceReal, sem.clave === 'verde' ? '' : sem.clave)}
          </div>
          <div class="medida">
            <span class="m-label">Avance esperado</span>
            <span class="m-valor">${esperado}%</span>
            <span class="m-nota">según el cronograma</span>
          </div>
          <div class="medida">
            <span class="m-label">Desviación</span>
            <span class="m-valor ${desv >= -5 ? 'verde' : desv >= -15 ? 'ambar' : 'rojo'}">${desv >= 0 ? '+' : ''}${desv} pts</span>
            <span class="m-nota">real contra esperado</span>
          </div>
          <div class="medida">
            <span class="m-label">Cierre proyectado</span>
            <span class="m-valor ${claseCierre}">${cierreValor}</span>
            <span class="m-nota">${cierreNota}</span>
          </div>
        </div>
        ${Rol.esLider() ? this.filaFinanciera(p) : ''}
      </div>

      <div class="pestanas">
        ${this.pestanas().map(([k, etiqueta]) => {
          const contador = k === 'tareas' ? `<b>${tareas.length}</b>`
            : k === 'riesgos' ? `<b>${riesgos.length}</b>`
            : k === 'calidad' && calidad.abiertas ? `<b class="b-ambar">${calidad.abiertas}</b>`
            : k === 'preguntas' && preguntasAbiertas ? `<b class="b-ambar">${preguntasAbiertas}</b>` : '';
          return `<button class="pestana ${this.pestana === k ? 'activa' : ''}" data-pestana="${k}">${etiqueta} ${contador}</button>`;
        }).join('')}
      </div>

      <div id="panelPestana">${this.contenidoPestana(p)}</div>
    `;
  },

  /* Pestañas según el tipo de usuario */
  pestanas () {
    if (Rol.esCliente()) return [['tareas','Entregas'],['riesgos','Riesgos'],['calidad','Incidencias'],['facturacion','Facturas'],['preguntas','Preguntas']];
    if (Rol.esTrabajador()) return [['tareas','Tareas'],['riesgos','Riesgos'],['calidad','Calidad']];
    return [['tareas','Tareas'],['riesgos','Riesgos'],['horas','Horas'],['calidad','Calidad'],['facturacion','Facturación'],['preguntas','Preguntas']];
  },

  panelPreguntas (p) {
    const lista = Estado.preguntas().filter(q => q.proyectoId === p.id);
    return `
      <section class="panel">
        <div class="panel-cabeza">
          <div><h2>Preguntas del cliente</h2><p>${Rol.esCliente() ? 'Tus preguntas sobre este proyecto y sus respuestas' : 'Responde para que el cliente lo vea en su portal'}</p></div>
          ${Rol.esCliente() ? `<button class="boton sutil" data-preguntar="${p.id}">+ Hacer una pregunta</button>` : ''}
        </div>
        ${VistaPreguntas.lista(lista, false)}
      </section>`;
  },

  contenidoPestana (p) {
    if (this.pestana === 'preguntas') return this.panelPreguntas(p);
    if (this.pestana === 'tareas')  return this.panelTareas(p);
    if (this.pestana === 'riesgos') return this.panelRiesgos(p);
    if (this.pestana === 'horas')   return this.panelHoras(p);
    if (this.pestana === 'calidad') return this.panelCalidad(p);
    if (this.pestana === 'facturacion') return this.panelFacturacion(p);
    return '';
  },

  /* --- fila de desempeño financiero (SPI, CPI, costo, margen) */
  filaFinanciera (p) {
    const d = Estado.desempeno(p);
    const costoNota = d.vac >= 0
      ? `${UI.dinero(d.vac)} por debajo del presupuesto`
      : `${UI.dinero(-d.vac)} por encima del presupuesto`;
    return `
      <div class="medidas medidas-finanzas">
        <div class="medida">
          <span class="m-label">SPI · cronograma</span>
          <span class="m-valor ${d.claveSpi}">${UI.indice(d.spi)}</span>
          <span class="m-nota">${d.spi === null ? 'sin plan a la fecha' : d.spi >= 1 ? 'adelantado al plan' : `avanza al ${Math.round(d.spi * 100)}% del ritmo planeado`}</span>
        </div>
        <div class="medida">
          <span class="m-label">CPI · costos</span>
          <span class="m-valor ${d.claveCpi}">${UI.indice(d.cpi)}</span>
          <span class="m-nota">${d.cpi === null ? 'sin costo registrado' : `cada $1 gastado rinde $${UI.indice(d.cpi)}`}</span>
        </div>
        <div class="medida">
          <span class="m-label">Costo proyectado al cierre</span>
          <span class="m-valor ${d.claveCosto}">${UI.dinero(d.eac)}</span>
          <span class="m-nota">${costoNota}</span>
        </div>
        <div class="medida">
          <span class="m-label">Margen proyectado</span>
          <span class="m-valor ${d.claveMargen}">${UI.pct(d.margenProyectado)}</span>
          <span class="m-nota">planeado ${UI.pct(d.margenPlan)} · <button class="boton-texto" data-explicar-finanzas>¿Cómo se calcula?</button></span>
        </div>
      </div>`;
  },

  explicarFinanzas (p) {
    const d = Estado.desempeno(p);
    const m = UI.dinero;
    UI.modal(`
      <h2>Cómo se calculan los indicadores</h2>
      <p class="modal-sub">${UI.escapar(p.nombre)} · método de valor ganado</p>
      <div class="tabla-desplazable" tabindex="0"><table class="tabla formulas">
        <tbody>
          <tr><td><b>Presupuesto de costo (BAC)</b><br><small class="sub">dato de ejemplo</small></td><td>${m(d.bac)}</td></tr>
          <tr><td><b>Valor planeado (PV)</b><br><small class="sub">BAC × avance esperado (${Estado.avanceEsperado(p)}%)</small></td><td>${m(d.pv)}</td></tr>
          <tr><td><b>Valor ganado (EV)</b><br><small class="sub">BAC × avance real (${p.avanceReal}%)</small></td><td>${m(d.ev)}</td></tr>
          <tr><td><b>Costo real (AC)</b><br><small class="sub">ejecutado a la fecha</small></td><td>${m(d.ac)}</td></tr>
          <tr><td><b>SPI</b> = EV ÷ PV</td><td class="${d.claveSpi}"><b>${UI.indice(d.spi)}</b></td></tr>
          <tr><td><b>CPI</b> = EV ÷ AC</td><td class="${d.claveCpi}"><b>${UI.indice(d.cpi)}</b></td></tr>
          <tr><td><b>Costo al cierre (EAC)</b> = BAC ÷ CPI</td><td><b>${m(d.eac)}</b></td></tr>
          <tr><td><b>Margen</b> = (contrato − EAC) ÷ contrato<br><small class="sub">contrato ${m(p.valorContrato)}</small></td><td class="${d.claveMargen}"><b>${UI.pct(d.margenProyectado)}</b></td></tr>
        </tbody>
      </table></div>
      <p class="sub" style="font-size:14.5px;margin:14px 0 0">
        Un índice de 1,00 significa que el proyecto va exactamente según el plan. Verde ≥ 0,95 · ámbar ≥ 0,85 · rojo por debajo.
        Los costos son datos de ejemplo hasta conectar el sistema contable de ISITEC.
      </p>
      <div class="modal-acciones"><button class="boton primario" data-cerrar>Entendido</button></div>`);
  },

  /* --- pestaña CALIDAD ------------------------------------- */
  panelCalidad (p) {
    const c = Estado.calidadProyecto(p);
    const lista = Estado.incidencias().filter(t => t.proyectoId === p.id)
      .sort((a, b) => (Estado.incidenciaAbierta(b) - Estado.incidenciaAbierta(a))
                   || String(b.fechaReporte).localeCompare(String(a.fechaReporte)));
    const kpi = (label, valor, nota, clase) => `
      <article class="kpi">
        <div class="kpi-top"><span class="kpi-label">${label}</span></div>
        <strong class="${clase || ''}">${valor}</strong><p>${nota}</p>
      </article>`;
    return `
      <section class="kpis">
        ${kpi('Incidencias', c.total, `${c.abiertas} abiertas · ${c.cerradas} cerradas`)}
        ${kpi('Críticas abiertas', c.criticasAbiertas, 'severidad alta', c.criticasAbiertas ? 'rojo' : '')}
        ${kpi('Horas en incidencias', c.horas + ' h', `${String(c.pctHoras).replace('.', ',')}% de las horas del proyecto`)}
        ${kpi('Resolución promedio', c.diasResolucion === null ? '—' : String(c.diasResolucion).replace('.', ',') + ' días', 'de reportada a cerrada')}
      </section>
      <section class="panel">
        <div class="panel-cabeza">
          <div><h2>Incidencias del proyecto</h2><p>Al cerrarlas se registran las horas que tomó atenderlas</p></div>
          ${Rol.esCliente() ? '' : '<button class="boton sutil" data-reportar-incidencia>+ Reportar incidencia</button>'}
        </div>
        ${lista.length ? VistaCalidad.tablaIncidencias(lista, false)
          : UI.vacio('Sin incidencias', 'Este proyecto no tiene incidencias reportadas.')}
      </section>`;
  },

  /* --- pestaña HORAS --------------------------------------- */
  panelHoras (p) {
    const h = Estado.horasProyecto(p);
    const prod = Estado.productividad(p);
    const u = Estado.UMBRAL_PRODUCTIVIDAD;
    const n = x => x.toLocaleString('es-CO');

    const aviso = prod.clave === 'rojo'
      ? `<div class="alerta" style="border-color:#f3c4c9;background:#fff8f8;margin-bottom:14px">
           <span class="icono" style="background:var(--rojo-claro);color:var(--rojo)">!</span>
           <div class="txt"><strong>Las horas no se están convirtiendo en avance</strong>
             <small>Se ha consumido el ${h.pctConsumo}% de las horas y el proyecto va en ${p.avanceReal}% de avance:
             ${h.brecha} pts de brecha, por encima del umbral de ${u}.</small></div>
         </div>` : '';

    return `
      ${aviso}
      <section class="kpis">
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Horas consumidas</span></div>
          <strong>${n(h.consumidas)}</strong><p>de ${n(h.presupuesto)} presupuestadas</p>
        </article>
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Consumo vs avance</span></div>
          <strong class="${prod.clave}">${h.brecha > 0 ? '+' : ''}${h.brecha} pts</strong>
          <p>${h.pctConsumo}% de horas · ${p.avanceReal}% de avance</p>
        </article>
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Horas facturables</span></div>
          <strong>${n(h.facturables)}</strong><p>${n(h.noFacturables)} h no facturables</p>
        </article>
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Ingreso por horas</span></div>
          <strong>${UI.dinero(h.ingresoHoras)}</strong><p>${UI.dinero(h.sinFacturar)} aún sin facturar</p>
        </article>
      </section>

      <section class="panel">
        <div class="panel-cabeza">
          <div><h2>Horas por persona</h2><p>Acumulado del proyecto y lo registrado este mes</p></div>
          <div style="display:flex;gap:8px;align-items:center">${UI.chipEstado(prod)}
            ${Rol.esLider() ? `<button class="boton sutil" data-gestion="horas:${p.id}">+ Registrar horas</button>` : ''}</div>
        </div>
        ${h.porPersona.length ? `<div class="tabla-desplazable" tabindex="0"><table class="tabla"><thead><tr>
          <th>Persona</th><th>Horas acumuladas</th><th>Facturables</th><th>Este mes</th><th style="width:28%">Participación</th>
        </tr></thead><tbody>${h.porPersona.map(x => {
          const per = Estado.persona(x.personaId);
          const part = h.consumidas ? Math.round(x.horas / h.consumidas * 100) : 0;
          return `<tr>
            <td><span class="persona">${UI.avatar(x.personaId)}
              <span><strong>${UI.escapar(per.nombre)}</strong><br><small class="sub">${UI.escapar(per.rol)}</small></span></span></td>
            <td><strong>${n(x.horas)} h</strong></td>
            <td>${n(x.facturables)} h</td>
            <td>${x.mes ? n(x.mes) + ' h' : '<span class="sub">—</span>'}</td>
            <td class="celda-avance"><div class="rotulos"><span>${part}% del proyecto</span></div>${UI.barra(part)}</td>
          </tr>`;
        }).join('')}</tbody></table></div>`
        : UI.vacio('Sin horas registradas', 'Este proyecto todavía no tiene horas en el registro.')}
        <p class="sub" style="margin:14px 0 0;font-size:14.5px">
          Valor hora aproximado: ${UI.dineroLargo(Math.round(h.valorHora))} (contrato ÷ horas presupuestadas), por validar
          con la tarifa del sistema contable.
        </p>
      </section>`;
  },

  panelFacturacion (p) {
    const facturas = Estado.facturas().filter(f => f.proyectoId === p.id);
    const facturado = facturas.reduce((s, f) => s + f.monto, 0);
    const pendiente = facturas.filter(f => f.estado === 'pendiente').reduce((s, f) => s + f.monto, 0);
    return `
      <section class="panel">
        <div class="panel-cabeza">
          <div><h2>Facturación del proyecto</h2><p>${facturas.length} facturas · ${UI.dineroLargo(facturado)} emitido</p></div>
          ${Rol.esLider() ? `<button class="boton sutil" data-gestion="factura:${p.id}">+ Nueva factura</button>` : ''}
          <span class="chip ${facturado / p.valorContrato * 100 >= p.avanceReal ? 'verde' : 'ambar'}">
            ${Math.round(facturado / p.valorContrato * 100)}% facturado · ${p.avanceReal}% avance
          </span>
        </div>
        <p class="sub" style="margin-bottom:16px">${UI.dineroLargo(pendiente)} pendiente de cobro</p>
        ${facturas.length ? `<div class="tabla-desplazable" tabindex="0"><table class="tabla"><thead><tr>
          <th>Número</th><th>Monto</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th><th></th>
        </tr></thead><tbody>${facturas.map(f => {
          const vencida = f.estado === 'pendiente' && Estado.diasDesdeHoy(f.vencimiento) < 0;
          return `<tr class="${vencida ? 'factura-vencida' : ''}">
            <td><strong>${UI.escapar(f.numero)}</strong></td><td>${UI.dineroLargo(f.monto)}</td>
            <td>${UI.fecha(f.emision)}</td><td class="${vencida ? 'rojo' : ''}">${UI.fecha(f.vencimiento)}
              <br><small>${vencida ? `Vencida hace ${Math.abs(Estado.diasDesdeHoy(f.vencimiento))} días` : UI.vencimiento(f.vencimiento)}</small></td>
            <td>${vencida ? '<span class="chip rojo">Vencida</span>' : f.estado === 'pagada' ? '<span class="chip verde">Pagada</span>' : '<span class="chip ambar">Pendiente</span>'}</td>
            <td style="text-align:right">${f.estado === 'pendiente' && Rol.esLider() ? `<button class="boton-texto" data-pagar-proyecto="${f.id}">Marcar como pagada</button>` : ''}</td>
          </tr>`;
        }).join('')}</tbody></table></div>` : UI.vacio('Sin facturas', 'Este proyecto todavía no tiene facturas registradas.')}
      </section>`;
  },

  /* --- pestaña TAREAS (funcional) -------------------------- */
  panelTareas (p) {
    const tareas = Estado.tareasDe(p.id)
      .sort((a, b) => (a.estado === 'completada') - (b.estado === 'completada')
                   || Estado.diasDesdeHoy(a.fechaLimite) - Estado.diasDesdeHoy(b.fechaLimite));

    if (!tareas.length) return `<section class="panel">${UI.vacio('Sin tareas', Rol.esCliente() ? 'Todavía no hay entregas registradas.' : 'Crea la primera con el botón Nueva tarea.')}</section>`;

    return `
      <section class="panel">
        <div class="tabla-desplazable" tabindex="0"><table class="tabla">
          <thead><tr>
            <th style="width:38%">Tarea</th><th>Responsable</th><th>Fecha límite</th>
            <th>Prioridad</th><th>Riesgo</th><th></th>
          </tr></thead>
          <tbody>
            ${tareas.map(t => {
              const vencida = Estado.estaVencida(t);
              const completada = t.estado === 'completada';
              const colorFecha = completada ? 'var(--suave)' : vencida ? 'var(--rojo)' : '';
              return `
                <tr class="${completada ? 'completada' : ''}">
                  <td>
                    <div class="proyecto-nombre">
                      ${Rol.puedeEditarTarea(t)
                        ? `<button type="button" class="casilla ${completada ? 'marcada' : ''}" data-marcar="${t.id}" aria-label="${completada ? 'Reabrir' : 'Completar'} tarea: ${UI.escapar(t.nombre)}">${completada ? '✓' : ''}</button>`
                        : `<span class="casilla ${completada ? 'marcada' : ''}" aria-hidden="true" style="cursor:default">${completada ? '✓' : ''}</span>`}
                      <strong>${UI.escapar(t.nombre)}</strong>
                      ${t.esIncidencia ? '<span class="chip gris">Incidencia</span>' : ''}
                    </div>
                  </td>
                  <td>${UI.personaLinea(t.responsableId)}</td>
                  <td style="color:${colorFecha};font-size:14.5px">
                    ${UI.fecha(t.fechaLimite)}<br><small>${completada ? 'Completada' : UI.vencimiento(t.fechaLimite)}</small>
                  </td>
                  <td>${UI.chipPrioridad(t.prioridad)}</td>
                  <td>${t.riesgo ? `<span class="chip ambar">${Estado.CAUSAS[t.riesgo.causa]}</span>` : '<span style="color:#b6c0d2">—</span>'}</td>
                  <td style="text-align:right">
                    ${Rol.esLider() ? `<button class="boton-texto" data-reasignar="${t.id}">Reasignar</button>` : ''}
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </section>`;
  },

  /* --- pestaña RIESGOS (funcional) ------------------------- */
  panelRiesgos (p) {
    const riesgos = Estado.tareasDe(p.id).filter(Estado.enRiesgo);

    const explicacion = `
      <section class="panel" style="margin-bottom:14px">
        <div class="panel-cabeza" style="margin-bottom:12px">
          <div>
            <h2>Cómo se marca un riesgo</h2>
            <p>Las tres causas que definió el usuario en la validación</p>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <span class="chip ambar">Sin avance · la tarea no se mueve en el plazo definido</span>
          <span class="chip ambar">Espera del cliente · depende de una entrega del cliente</span>
          <span class="chip ambar">Espera de proveedor · depende de un tercero o fabricante</span>
        </div>
      </section>`;

    if (!riesgos.length) {
      return explicacion + `<section class="panel">${UI.vacio('Sin riesgos abiertos','Ninguna tarea de este proyecto está marcada en riesgo.')}</section>`;
    }

    return explicacion + riesgos.map(t => `
      <article class="riesgo">
        <div class="riesgo-top">
          <i class="punto ambar"></i>
          <strong>${UI.escapar(t.nombre)}</strong>
          <span class="chip ambar">${Estado.CAUSAS[t.riesgo.causa]}</span>
          ${UI.avatar(t.responsableId)}
        </div>
        <div class="mitigacion">
          <b style="font-size:13px;color:#8e9bb3;letter-spacing:.6px">PLAN DE MITIGACIÓN</b><br>
          ${t.riesgo.mitigacion
            ? UI.escapar(t.riesgo.mitigacion)
            : '<em>Sin plan definido todavía.</em>'}
        </div>
        ${!Rol.puedeEditarTarea(t) ? '' : `<div style="margin-top:11px;display:flex;gap:8px">
          <button class="boton sutil" data-mitigar="${t.id}">
            ${t.riesgo.mitigacion ? 'Editar mitigación' : 'Definir mitigación'}
          </button>
          <button class="boton secundario" data-quitar-riesgo="${t.id}">Quitar riesgo</button>
        </div>`}
      </article>`).join('');
  },

  /* --- bloque de trabajo pendiente ------------------------- */
  panelPendiente (titulo, texto, puntos, quien) {
    return `
      <div class="pendiente">
        <h2>${titulo}</h2>
        <p>${texto}</p>
        <ul>${puntos.map(x => `<li>${x}</li>`).join('')}</ul>
        <span class="quien">${quien}</span>
      </div>`;
  },

  /* --- eventos --------------------------------------------- */
  montar () {
    const raiz = document.querySelector('#vista');
    Gestion.montar(raiz);

    raiz.querySelectorAll('.pestana').forEach(b =>
      b.addEventListener('click', () => {
        this.pestana = b.dataset.pestana;
        App.render();
      }));

    raiz.querySelectorAll('[data-marcar]').forEach(el =>
      el.addEventListener('click', () => {
        const actual = Estado.tareas().find(x => x.id === el.dataset.marcar);
        /* Cerrar una incidencia pide las horas que tomó atenderla */
        if (actual && actual.esIncidencia && actual.estado !== 'completada') {
          VistaCalidad.abrirHoras(actual.id, true);
          return;
        }
        const t = Estado.alternarTarea(el.dataset.marcar);
        UI.toast(t.estado === 'completada' ? 'Tarea completada.' : 'Tarea reabierta.');
      }));

    const explicar = raiz.querySelector('[data-explicar-finanzas]');
    if (explicar) explicar.addEventListener('click', () => this.explicarFinanzas(Estado.proyecto(this.id)));

    const reportar = raiz.querySelector('[data-reportar-incidencia]');
    if (reportar) reportar.addEventListener('click', () => VistaCalidad.abrirReportar(this.id));
    VistaCalidad.montarAcciones(raiz);

    VistaPreguntas.montarAcciones(raiz);

    raiz.querySelectorAll('[data-reasignar]').forEach(b =>
      b.addEventListener('click', () => this.abrirReasignar(b.dataset.reasignar)));

    raiz.querySelectorAll('[data-mitigar]').forEach(b =>
      b.addEventListener('click', () => this.abrirMitigacion(b.dataset.mitigar)));

    raiz.querySelectorAll('[data-quitar-riesgo]').forEach(b =>
      b.addEventListener('click', () => {
        Estado.marcarRiesgo(b.dataset.quitarRiesgo, null);
        UI.toast('Riesgo cerrado.');
      }));

    raiz.querySelectorAll('[data-pagar-proyecto]').forEach(b =>
      b.addEventListener('click', () => {
        Estado.marcarFacturaPagada(b.dataset.pagarProyecto);
        UI.toast('Factura marcada como pagada.');
      }));
  },

  abrirReasignar (tareaId) {
    const t = Estado.tareas().find(x => x.id === tareaId);
    UI.modal(`
      <h2>Reasignar tarea</h2>
      <p class="modal-sub">${UI.escapar(t.nombre)}</p>
      <label class="campo">Nuevo responsable
        <select id="nuevoResp">
          ${Estado.personas().map(p =>
            `<option value="${p.id}" ${p.id === t.responsableId ? 'selected' : ''}>${UI.escapar(p.nombre)} · ${UI.escapar(p.rol)}</option>`).join('')}
        </select>
      </label>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="guardarResp">Guardar</button>
      </div>`,
      dlg => dlg.querySelector('#guardarResp').addEventListener('click', () => {
        Estado.reasignarTarea(tareaId, dlg.querySelector('#nuevoResp').value);
        UI.cerrarModal();
        UI.toast('Tarea reasignada.');
      }));
  },

  abrirMitigacion (tareaId) {
    const t = Estado.tareas().find(x => x.id === tareaId);
    UI.modal(`
      <h2>Plan de mitigación</h2>
      <p class="modal-sub">${UI.escapar(t.nombre)} · ${Estado.CAUSAS[t.riesgo.causa]}</p>
      <label class="campo">¿Qué se va a hacer para destrabar esta tarea?
        <textarea id="textoMitiga" rows="4" placeholder="Ej. Escalar al patrocinador del cliente y fijar nueva fecha de entrega.">${UI.escapar(t.riesgo.mitigacion || '')}</textarea>
      </label>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="guardarMitiga">Guardar</button>
      </div>`,
      dlg => dlg.querySelector('#guardarMitiga').addEventListener('click', () => {
        Estado.guardarMitigacion(tareaId, dlg.querySelector('#textoMitiga').value.trim());
        UI.cerrarModal();
        UI.toast('Plan de mitigación guardado.');
      }));
  }
};
