const VistaFacturacion = {
  filtroProyecto: 'todos',
  filtroEstado: 'todos',

  miga: () => '<a href="#/resumen">Inicio</a><span>/</span><strong>Facturación</strong>',

  render () {
    const f = Estado.facturas();
    const pendientes = f.filter(x => x.estado === 'pendiente');
    const total = pendientes.reduce((s, x) => s + x.monto, 0);
    const filtradas = f.filter(factura => {
      const vencida = factura.estado === 'pendiente' && Estado.diasDesdeHoy(factura.vencimiento) < 0;
      const coincideProyecto = this.filtroProyecto === 'todos' || factura.proyectoId === this.filtroProyecto;
      const coincideEstado = this.filtroEstado === 'todos'
        || factura.estado === this.filtroEstado
        || (this.filtroEstado === 'vencida' && vencida);
      return coincideProyecto && coincideEstado;
    });

    return `
      <section class="encabezado">
        <div>
          <h1>Facturación</h1>
          <p class="sub">Estado de cobro de los proyectos activos.</p>
        </div>
      </section>

      <section class="kpis kpis-tres">
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Por cobrar</span></div>
          <strong>${UI.dinero(total)}</strong><p>${pendientes.length} facturas pendientes</p>
        </article>
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Vencidas</span></div>
          <strong class="rojo">${pendientes.filter(x => Estado.diasDesdeHoy(x.vencimiento) < 0).length}</strong>
          <p>pasaron su fecha de vencimiento</p>
        </article>
        <article class="kpi">
          <div class="kpi-top"><span class="kpi-label">Cobradas</span></div>
          <strong>${f.filter(x => x.estado === 'pagada').length}</strong><p>en lo corrido del proyecto</p>
        </article>
      </section>

      ${this.panelTabla(filtradas)}
    `;
  },

  panelTabla (facturas) {
    return `
      <section class="panel">
        <div class="filtros">
          <select id="filtroFacturaProyecto" aria-label="Filtrar por proyecto">
            <option value="todos">Todos los proyectos</option>
            ${Estado.proyectos().map(p => `<option value="${p.id}" ${this.filtroProyecto === p.id ? 'selected' : ''}>${UI.escapar(p.nombre)}</option>`).join('')}
          </select>
          <select id="filtroFacturaEstado" aria-label="Filtrar por estado">
            <option value="todos" ${this.filtroEstado === 'todos' ? 'selected' : ''}>Todos los estados</option>
            <option value="pendiente" ${this.filtroEstado === 'pendiente' ? 'selected' : ''}>Pendientes</option>
            <option value="vencida" ${this.filtroEstado === 'vencida' ? 'selected' : ''}>Vencidas</option>
            <option value="pagada" ${this.filtroEstado === 'pagada' ? 'selected' : ''}>Pagadas</option>
          </select>
          <span class="sub">${facturas.length} factura${facturas.length === 1 ? '' : 's'}</span>
        </div>
        ${facturas.length ? `
          <div class="tabla-desplazable" tabindex="0">
            <table class="tabla">
              <thead><tr>
                <th>Número</th><th>Proyecto</th><th>Monto</th><th>Emisión</th>
                <th>Vencimiento</th><th>Estado</th><th>Facturado vs avance</th><th></th>
              </tr></thead>
              <tbody>${facturas.map(f => this.filaFactura(f)).join('')}</tbody>
            </table>
          </div>
        ` : UI.vacio('Sin facturas', 'No hay facturas que coincidan con los filtros seleccionados.')}
      </section>`;
  },

  filaFactura (factura) {
    const p = Estado.proyecto(factura.proyectoId);
    const vencida = factura.estado === 'pendiente' && Estado.diasDesdeHoy(factura.vencimiento) < 0;
    const facturado = p ? Estado.facturas().filter(f => f.proyectoId === p.id).reduce((s, f) => s + f.monto, 0) : 0;
    const porcentajeFacturado = p && p.valorContrato ? Math.round(facturado / p.valorContrato * 100) : 0;
    const diferencia = porcentajeFacturado - (p ? p.avanceReal : 0);
    const estado = vencida
      ? '<span class="chip rojo">Vencida</span>'
      : factura.estado === 'pagada'
        ? '<span class="chip verde">Pagada</span>'
        : '<span class="chip ambar">Pendiente</span>';
    return `
      <tr class="${vencida ? 'factura-vencida' : ''}">
        <td><strong>${UI.escapar(factura.numero)}</strong></td>
        <td>${UI.escapar(p ? p.nombre : '—')}</td>
        <td><strong>${UI.dineroLargo(factura.monto)}</strong></td>
        <td>${UI.fecha(factura.emision)}</td>
        <td class="${vencida ? 'rojo' : ''}">${UI.fecha(factura.vencimiento)}
          <br><small>${vencida ? `Vencida hace ${Math.abs(Estado.diasDesdeHoy(factura.vencimiento))} días` : UI.vencimiento(factura.vencimiento)}</small>
        </td>
        <td>${estado}</td>
        <td>
          <strong>${porcentajeFacturado}%</strong> facturado · ${p ? p.avanceReal : 0}% avance
          <br><small class="${diferencia < 0 ? 'rojo' : 'verde'}">${diferencia >= 0 ? '+' : ''}${diferencia} pts</small>
        </td>
        <td style="text-align:right">${factura.estado === 'pendiente'
          ? `<button class="boton-texto" data-pagar="${factura.id}">Marcar como pagada</button>` : ''}</td>
      </tr>`;
  },

  montar () {
    const raiz = document.querySelector('#vista');
    const proyecto = raiz.querySelector('#filtroFacturaProyecto');
    const estado = raiz.querySelector('#filtroFacturaEstado');
    if (proyecto) proyecto.addEventListener('change', () => {
      this.filtroProyecto = proyecto.value;
      App.render();
    });
    if (estado) estado.addEventListener('change', () => {
      this.filtroEstado = estado.value;
      App.render();
    });
    raiz.querySelectorAll('[data-pagar]').forEach(b => b.addEventListener('click', () => {
      Estado.marcarFacturaPagada(b.dataset.pagar);
      UI.toast('Factura marcada como pagada.');
    }));
  }
};
