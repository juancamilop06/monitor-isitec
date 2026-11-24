/* ===========================================================
   vistas/horas.js · Horas y equipo
   -----------------------------------------------------------
   Responde al feedback de Oscar del 4 de noviembre:
   1. Horas disponibles frente a horas invertidas (por persona)
   2. Productividad: las horas invertidas deben reflejarse en
      avance (por proyecto, con alerta a +15 pts)
   3. Horas facturables como insumo del ingreso del proyecto
   Los cálculos viven en estado.js (horasPersona, horasProyecto,
   productividad); esta vista solo los presenta.
   =========================================================== */

const VistaHoras = {
  miga: () => '<a href="#/resumen">Inicio</a><span>/</span><strong>Horas y equipo</strong>',

  render () {
    const mes = Estado.horasDelMes();
    const invertidas  = mes.reduce((s, r) => s + r.horas, 0);
    const facturables = mes.filter(r => r.facturable).reduce((s, r) => s + r.horas, 0);
    const disponibles = Estado.personas().reduce((s, p) => s + p.horasDisponibles, 0);
    const sobreAvance = Estado.proyectos().filter(p => Estado.productividad(p).clave === 'rojo');

    return `
      <section class="encabezado">
        <div>
          <h1>Horas y equipo</h1>
          <p class="sub">Capacidad del equipo, horas invertidas y productividad por proyecto.</p>
        </div>
      </section>

      <section class="kpis">
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Horas disponibles</span></div>
          <strong>${disponibles}</strong><p>capacidad del equipo este mes</p>
        </article>
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Horas invertidas</span></div>
          <strong>${invertidas}</strong><p>${this.pct(invertidas, disponibles)}% de la capacidad</p>
        </article>
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Horas facturables</span></div>
          <strong>${facturables}</strong><p>${this.pct(facturables, invertidas)}% del total invertido</p>
        </article>
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Consumo sobre el avance</span></div>
          <strong class="${sobreAvance.length ? 'rojo' : ''}">${sobreAvance.length}</strong>
          <p>${sobreAvance.length
            ? `proyecto${sobreAvance.length > 1 ? 's' : ''} con más de ${Estado.UMBRAL_PRODUCTIVIDAD} pts de brecha`
            : 'todos los proyectos convierten horas en avance'}</p>
        </article>
      </section>

      ${this.panelEquipo()}
      ${this.panelProductividad()}
      ${this.panelIngreso()}
    `;
  },

  pct: (a, b) => b ? Math.round(a / b * 100) : 0,

  /* --- 1. Equipo: disponibles vs invertidas (mes en curso) -- */
  panelEquipo () {
    const filas = Estado.personas().map(per => ({ per, h: Estado.horasPersona(per.id) }))
      .sort((a, b) => b.h.ocupacion - a.h.ocupacion);

    return `
      <section class="panel" style="margin-bottom:18px">
        <div class="panel-cabeza">
          <div><h2>Ocupación del equipo</h2><p>Horas del mes en curso contra la capacidad de cada persona</p></div>
        </div>
        <div class="tabla-desplazable" tabindex="0">
          <table class="tabla">
            <thead><tr>
              <th>Persona</th><th>Disponibles</th><th>Invertidas</th><th>Facturables</th>
              <th style="width:24%">Ocupación</th><th>Proyectos</th>
            </tr></thead>
            <tbody>${filas.map(({ per, h }) => {
              const clase = h.ocupacion > 100 ? 'rojo' : h.ocupacion >= 90 ? 'ambar' : '';
              const nota  = h.ocupacion > 100 ? 'Sobrecargado'
                          : h.ocupacion >= 90 ? 'Al límite'
                          : `${h.libres} h libres`;
              return `
                <tr>
                  <td><span class="persona">${UI.avatar(per.id)}
                    <span><strong>${UI.escapar(per.nombre)}</strong><br><small class="sub">${UI.escapar(per.rol)}</small></span></span></td>
                  <td>${h.disponibles} h</td>
                  <td><strong>${h.invertidas} h</strong></td>
                  <td>${h.facturables} h <small class="sub">· ${h.pctFacturable}%</small></td>
                  <td class="celda-avance">
                    <div class="rotulos"><span class="${clase}"><strong>${h.ocupacion}%</strong></span><span>${nota}</span></div>
                    ${UI.barra(h.ocupacion, clase)}
                  </td>
                  <td>${h.proyectos.length
                    ? h.proyectos.map(id => `<span class="chip gris">${UI.escapar(Estado.proyecto(id).nombre)}</span>`).join(' ')
                    : '<span class="sub">—</span>'}</td>
                </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </section>`;
  },

  /* --- 2. Productividad: % horas consumidas vs % avance ---- */
  panelProductividad () {
    const u = Estado.UMBRAL_PRODUCTIVIDAD;
    return `
      <section class="panel" style="margin-bottom:18px">
        <div class="panel-cabeza">
          <div>
            <h2>Productividad por proyecto</h2>
            <p>Horas consumidas del presupuesto contra el avance real. Si se gastan horas sin avanzar, la brecha crece.</p>
          </div>
          <span class="chip rojo">Rojo: consumo &gt; avance + ${u} pts</span>
        </div>
        <div class="tabla-desplazable" tabindex="0">
          <table class="tabla">
            <thead><tr>
              <th>Proyecto</th><th>Presupuestadas</th><th>Consumidas</th>
              <th style="width:26%">Consumo de horas vs avance</th><th>Brecha</th><th>Estado</th>
            </tr></thead>
            <tbody>${Estado.proyectos().map(p => {
              const h = Estado.horasProyecto(p);
              const prod = Estado.productividad(p);
              return `
                <tr class="clic ${prod.clave === 'rojo' ? 'fila-alerta' : ''}" data-ir-horas="${p.id}">
                  <td><strong>${UI.escapar(p.nombre)}</strong><br><small class="sub">${UI.escapar(Estado.cliente(p.clienteId).nombre)}</small></td>
                  <td>${h.presupuesto.toLocaleString('es-CO')} h</td>
                  <td><strong>${h.consumidas.toLocaleString('es-CO')} h</strong><br>
                    <small class="${h.restantes < 0 ? 'rojo' : 'sub'}">${h.restantes >= 0
                      ? `${h.restantes.toLocaleString('es-CO')} h restantes`
                      : `${Math.abs(h.restantes).toLocaleString('es-CO')} h sobre el presupuesto`}</small></td>
                  <td class="celda-avance">${this.barrasComparadas(h.pctConsumo, p.avanceReal, prod.clave)}</td>
                  <td><strong class="${prod.clave}">${h.brecha > 0 ? '+' : ''}${h.brecha} pts</strong></td>
                  <td>${UI.chipEstado(prod)}</td>
                </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </section>`;
  },

  /* Dos barras: horas consumidas (color según estado) y avance real (azul) */
  barrasComparadas (consumo, avance, clave) {
    return `
      <div class="rotulos"><span>Horas</span><span><strong>${consumo}%</strong></span></div>
      ${UI.barra(consumo, clave === 'verde' ? '' : clave)}
      <div class="rotulos" style="margin-top:6px"><span>Avance</span><span><strong>${avance}%</strong></span></div>
      <div class="barra"><span style="width:${Math.min(100, avance)}%;background:var(--azul)"></span></div>`;
  },

  /* --- 3. Horas facturables como insumo del ingreso -------- */
  panelIngreso () {
    const filas = Estado.proyectos().map(p => ({ p, h: Estado.horasProyecto(p) }));
    const tot = filas.reduce((t, { h }) => ({
      fact: t.fact + h.facturables, noFact: t.noFact + h.noFacturables,
      ingreso: t.ingreso + h.ingresoHoras, facturado: t.facturado + h.facturado,
      sinFacturar: t.sinFacturar + h.sinFacturar
    }), { fact: 0, noFact: 0, ingreso: 0, facturado: 0, sinFacturar: 0 });

    return `
      <section class="panel">
        <div class="panel-cabeza">
          <div>
            <h2>Horas facturables e ingreso</h2>
            <p>Horas facturables acumuladas por proyecto, valorizadas y comparadas con lo ya facturado</p>
          </div>
          <span class="chip ambar">Valor hora por validar con ISITEC</span>
        </div>
        <div class="tabla-desplazable" tabindex="0">
          <table class="tabla">
            <thead><tr>
              <th>Proyecto</th><th>Facturables</th><th>No facturables</th><th>Valor hora</th>
              <th>Ingreso por horas</th><th>Facturado</th><th>Sin facturar</th>
            </tr></thead>
            <tbody>
              ${filas.map(({ p, h }) => `
                <tr>
                  <td><strong>${UI.escapar(p.nombre)}</strong></td>
                  <td><strong>${h.facturables.toLocaleString('es-CO')} h</strong>
                    <br><small class="sub">${this.pct(h.facturables, h.consumidas)}% del consumo</small></td>
                  <td>${h.noFacturables.toLocaleString('es-CO')} h</td>
                  <td>${UI.dinero(h.valorHora)}</td>
                  <td><strong>${UI.dinero(h.ingresoHoras)}</strong></td>
                  <td>${UI.dinero(h.facturado)}</td>
                  <td class="${h.sinFacturar > 0 ? 'ambar' : ''}"><strong>${UI.dinero(h.sinFacturar)}</strong></td>
                </tr>`).join('')}
              <tr style="background:#f7f9fc">
                <td><strong>Total</strong></td>
                <td><strong>${tot.fact.toLocaleString('es-CO')} h</strong></td>
                <td>${tot.noFact.toLocaleString('es-CO')} h</td>
                <td></td>
                <td><strong>${UI.dinero(tot.ingreso)}</strong></td>
                <td><strong>${UI.dinero(tot.facturado)}</strong></td>
                <td><strong>${UI.dinero(tot.sinFacturar)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="sub" style="margin:14px 0 0;font-size:14.5px">
          Mientras no tengamos la tarifa del sistema contable, el valor hora se aproxima como
          valor del contrato ÷ horas presupuestadas. "Sin facturar" es trabajo facturable ya hecho
          que todavía no tiene factura emitida.
        </p>
      </section>`;
  },

  montar () {
    document.querySelectorAll('#vista [data-ir-horas]').forEach(tr =>
      tr.addEventListener('click', () => {
        /* Abre el detalle directamente en la pestaña Horas */
        VistaProyecto.id = tr.dataset.irHoras;
        VistaProyecto.pestana = 'horas';
        location.hash = '#/proyecto/' + tr.dataset.irHoras;
      }));
  }
};
