/* ===========================================================
   vistas/resumen.js · Pantalla de inicio
   -----------------------------------------------------------
   Corrección del profesor: esta pantalla ya NO muestra todas
   las tablas. Solo responde "¿qué necesita mi atención hoy?".
   El detalle vive en Proyectos, Alertas y Facturación.
   =========================================================== */

const VistaResumen = {
  miga: () => '<strong>Resumen</strong>',

  render () {
    if (Rol.esCliente()) return this.renderCliente();
    if (Rol.esTrabajador()) return this.renderTrabajador();
    const t = Estado.totales();
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

    return `
      <section class="encabezado">
        <div>
          <p class="etiqueta">${UI.fechaLarga(Estado.hoyISO())}</p>
          <h1>${saludo}, ${UI.escapar(((typeof Nube !== "undefined" && Nube) ? Nube.nombreUsuario() : 'Oscar').split(' ')[0])}</h1>
          <p class="sub">Esto es lo que necesita tu atención hoy.</p>
        </div>
      </section>

      <section class="kpis">
        ${this.kpi('Proyectos activos', t.proyectosActivos, '', 'azul', '◇')}
        ${this.kpi('Tareas vencidas', t.tareasVencidas, 'requieren acción', 'rojo', '!')}
        ${this.kpi('En riesgo', t.enRiesgo, 'con causa identificada', 'ambar', '△')}
        ${this.kpi('Facturación pendiente', UI.dinero(t.facturacionPendiente),
                   t.facturasPendientes + ' facturas', 'violeta', '$')}
      </section>

      <div class="dos-columnas">
        <section class="panel">
          <div class="panel-cabeza">
            <div>
              <h2>Necesita tu atención</h2>
              <p>Lo más urgente primero, máximo cinco cosas</p>
            </div>
            <a class="boton-texto" href="#/proyectos">Ver proyectos →</a>
          </div>
          ${this.listaAtencion()}
        </section>

        <section class="panel">
          <div class="panel-cabeza">
            <div>
              <h2>Alertas</h2>
              <p>Generadas automáticamente</p>
            </div>
            <a class="boton-texto" href="#/alertas">Ver todas →</a>
          </div>
          ${this.listaAlertas()}
        </section>
      </div>
    `;
  },

  saludo () {
    const hora = new Date().getHours();
    const s = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const nombre = (typeof Nube !== 'undefined' && Nube.activa) ? Nube.nombreUsuario() : Rol.nombre();
    return `${s}, ${UI.escapar(nombre.split(' ')[0])}`;
  },

  /* --- Portal del cliente: avance, entregas, incidencias y preguntas --- */
  renderCliente () {
    const proyectos = Estado.proyectos();
    const preguntas = Estado.preguntas();
    const sinResp = preguntas.filter(q => q.estado !== 'respondida').length;
    const pendientes = Estado.facturas().filter(f => f.estado === 'pendiente');
    return `
      <section class="encabezado">
        <div>
          <p class="etiqueta">${UI.fechaLarga(Estado.hoyISO())}</p>
          <h1>${this.saludo()}</h1>
          <p class="sub">Así van tus proyectos hoy.</p>
        </div>
      </section>

      <section class="kpis">
        ${this.kpi('Proyectos', proyectos.length, '', 'azul', '◇')}
        ${this.kpi('Incidencias abiertas', Estado.incidencias().filter(Estado.incidenciaAbierta).length, 'en tus proyectos', 'ambar', '✱')}
        ${this.kpi('Preguntas sin responder', sinResp, `${preguntas.length} en total`, 'violeta', '?')}
        ${this.kpi('Por pagar', UI.dinero(pendientes.reduce((x, f) => x + f.monto, 0)), pendientes.length + ' facturas', 'rojo', '$')}
      </section>

      ${proyectos.length ? proyectos.map(p => this.tarjetaCliente(p)).join('')
        : `<section class="panel">${UI.vacio('Sin proyectos', 'Todavía no hay proyectos asociados a tu empresa.')}</section>`}`;
  },

  tarjetaCliente (p) {
    const sem = Estado.semaforo(p);
    const esperado = Estado.avanceEsperado(p);
    const proy = Estado.proyeccionCierre(p);
    const tareas = Estado.tareasDe(p.id);
    const proximas = tareas.filter(t => t.estado !== 'completada' && !t.esIncidencia)
      .sort((a, b) => Estado.diasDesdeHoy(a.fechaLimite) - Estado.diasDesdeHoy(b.fechaLimite)).slice(0, 3);
    const riesgos = tareas.filter(Estado.enRiesgo);
    const incid = tareas.filter(t => t.esIncidencia && Estado.incidenciaAbierta(t)).length;
    return `
      <section class="panel tarjeta-cliente">
        <div class="panel-cabeza">
          <div><h2><a href="#/proyecto/${p.id}">${UI.escapar(p.nombre)}</a></h2>
            <p>Entrega planeada ${UI.fechaLarga(p.finPlan)}${proy ? ` · al ritmo actual ${UI.fechaLarga(proy.fecha)}` : ''}</p></div>
          ${UI.chipEstado(sem)}
        </div>
        <div class="avance-doble">
          <div><span class="m-label">Avance real</span><strong>${p.avanceReal}%</strong>${UI.barra(p.avanceReal, sem.clave === 'verde' ? '' : sem.clave)}</div>
          <div><span class="m-label">Esperado a hoy</span><strong>${esperado}%</strong>${UI.barra(esperado, 'gris')}</div>
        </div>
        <div class="dos-columnas" style="margin-top:14px">
          <div>
            <b class="mini-titulo">Próximas entregas</b>
            ${proximas.length ? `<ul class="lista-simple">${proximas.map(t => `<li><span>${UI.escapar(t.nombre)}</span>
              <small class="${Estado.estaVencida(t) ? 'rojo' : 'sub'}">${UI.vencimiento(t.fechaLimite)}</small></li>`).join('')}</ul>`
              : '<p class="sub">No hay entregas pendientes.</p>'}
          </div>
          <div>
            <b class="mini-titulo">Problemas abiertos</b>
            <ul class="lista-simple">
              <li><span>Incidencias abiertas</span><strong>${incid}</strong></li>
              ${riesgos.map(t => `<li><span>${UI.escapar(t.nombre)}</span><small class="ambar">${Estado.CAUSAS[t.riesgo.causa]}</small></li>`).join('')
                || '<li><span>Riesgos</span><strong>0</strong></li>'}
            </ul>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <a class="boton secundario" href="#/proyecto/${p.id}">Ver detalle</a>
          <button class="boton sutil" data-preguntar="${p.id}">Preguntar sobre este proyecto</button>
        </div>
      </section>`;
  },

  /* --- Trabajador: mis tareas e incidencias --- */
  renderTrabajador () {
    const yo = Rol.persona();
    const mias = Estado.tareas().filter(t => t.responsableId === yo);
    const abiertas = mias.filter(t => t.estado !== 'completada')
      .sort((a, b) => Estado.diasDesdeHoy(a.fechaLimite) - Estado.diasDesdeHoy(b.fechaLimite));
    const vencidas = abiertas.filter(Estado.estaVencida).length;
    const incid = abiertas.filter(t => t.esIncidencia).length;
    return `
      <section class="encabezado">
        <div>
          <p class="etiqueta">${UI.fechaLarga(Estado.hoyISO())}</p>
          <h1>${this.saludo()}</h1>
          <p class="sub">Estas son tus tareas pendientes, la más urgente primero.</p>
        </div>
        <button class="boton secundario" data-reportar-incidencia>Reportar incidencia</button>
      </section>

      <section class="kpis">
        ${this.kpi('Mis tareas pendientes', abiertas.length, `${mias.length - abiertas.length} completadas`, 'azul', '◇')}
        ${this.kpi('Vencidas', vencidas, vencidas ? 'ponte al día' : 'todo a tiempo', 'rojo', '!')}
        ${this.kpi('Incidencias a mi cargo', incid, 'abiertas', 'ambar', '✱')}
        ${this.kpi('Mis proyectos', Estado.proyectos().length, '', 'violeta', '▤')}
      </section>

      <section class="panel">
        <div class="panel-cabeza"><div><h2>Mis tareas</h2><p>Márcalas al terminarlas. Las incidencias piden las horas que tomaron.</p></div></div>
        ${abiertas.length ? `<div class="atencion">${abiertas.map(t => {
          const p = Estado.proyecto(t.proyectoId) || { id: t.proyectoId, nombre: '' };
          const vencida = Estado.estaVencida(t);
          return `
            <div class="atencion-item">
              <button type="button" class="casilla" data-marcar-mia="${t.id}" aria-label="Completar: ${UI.escapar(t.nombre)}"></button>
              <span class="txt">
                <strong>${UI.escapar(t.nombre)} ${t.esIncidencia ? '<span class="chip gris">Incidencia</span>' : ''}</strong>
                <small><a href="#/proyecto/${p.id}">${UI.escapar(p.nombre)}</a> ·
                  <span class="${vencida ? 'rojo' : ''}">${UI.vencimiento(t.fechaLimite)}</span></small>
              </span>
              ${UI.chipPrioridad(t.prioridad)}
            </div>`;
        }).join('')}</div>` : UI.vacio('Nada pendiente', 'No tienes tareas abiertas. ¡Bien!')}
      </section>`;
  },

  montar () {
    const raiz = document.querySelector('#vista');
    VistaPreguntas.montarAcciones(raiz);
    const rep = raiz.querySelector('[data-reportar-incidencia]');
    if (rep) rep.addEventListener('click', () => VistaCalidad.abrirReportar(null));
    raiz.querySelectorAll('[data-marcar-mia]').forEach(b => b.addEventListener('click', () => {
      const t = Estado.tareas().find(x => x.id === b.dataset.marcarMia);
      if (t && t.esIncidencia) { VistaCalidad.abrirHoras(t.id, true); return; }
      Estado.alternarTarea(b.dataset.marcarMia);
      UI.toast('Tarea completada.');
    }));
  },

  kpi (label, valor, nota, color, icono) {
    const fondo = { azul:'var(--azul-claro)', rojo:'var(--rojo-claro)',
                    ambar:'var(--ambar-claro)', violeta:'#efebfb' }[color];
    const tinta = { azul:'var(--azul)', rojo:'var(--rojo)',
                    ambar:'var(--ambar)', violeta:'var(--violeta)' }[color];
    return `
      <article class="kpi">
        <div class="kpi-top">
          <span class="kpi-label">${label}</span>
          <span class="marca" style="background:${fondo};color:${tinta}">${icono}</span>
        </div>
        <strong>${valor}</strong>
        <p>${nota || '&nbsp;'}</p>
      </article>`;
  },

  /* Combina tareas vencidas y en riesgo, ordenadas por urgencia */
  listaAtencion () {
    const items = Estado.tareas()
      .filter(t => Estado.estaVencida(t) || Estado.enRiesgo(t))
      .sort((a, b) => Estado.diasDesdeHoy(a.fechaLimite) - Estado.diasDesdeHoy(b.fechaLimite))
      .slice(0, 5);

    if (!items.length) return UI.vacio('Todo al día', 'No hay tareas vencidas ni en riesgo.');

    return '<div class="atencion">' + items.map(t => {
      const p = Estado.proyecto(t.proyectoId);
      const vencida = Estado.estaVencida(t);
      const color = vencida ? 'rojo' : 'ambar';
      const fondo = vencida ? 'var(--rojo-claro)' : 'var(--ambar-claro)';
      const tinta = vencida ? 'var(--rojo)' : 'var(--ambar)';
      const causa = t.riesgo ? ' · ' + Estado.CAUSAS[t.riesgo.causa] : '';
      return `
        <a class="atencion-item" href="#/proyecto/${p.id}">
          <span class="icono" style="background:${fondo};color:${tinta}">${vencida ? '!' : '△'}</span>
          <span class="txt">
            <strong>${UI.escapar(t.nombre)}</strong>
            <small>${UI.escapar(p.nombre)} · ${UI.vencimiento(t.fechaLimite)}${UI.escapar(causa)}</small>
          </span>
          ${UI.avatar(t.responsableId)}
          <span class="flecha">→</span>
        </a>`;
    }).join('') + '</div>';
  },

  listaAlertas () {
    const abiertas = Estado.alertasAbiertas().slice(0, 4);
    if (!abiertas.length) return UI.vacio('Sin alertas', 'El monitoreo automático no encontró nada.');

    return '<div class="atencion">' + abiertas.map(a => {
      const [fondo, tinta, icono] = UI.estiloAlerta(a.tipo);
      const destino = a.destino;
      return `
        <a class="atencion-item" href="${destino}">
          <span class="icono" style="background:${fondo};color:${tinta}">${icono}</span>
          <span class="txt">
            <strong>${UI.escapar(a.titulo)}</strong>
            <small>${UI.escapar(a.detalle)}</small>
          </span>
          <span class="flecha">→</span>
        </a>`;
    }).join('') + '</div>';
  }
};
