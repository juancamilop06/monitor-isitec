/* ===========================================================
   vistas/alertas.js · Alertas del monitor
   Las alertas no están quemadas: estado.js las deriva de las
   tareas y las facturas cada vez que se pinta la pantalla.
   =========================================================== */

const VistaAlertas = {
  miga: () => '<a href="#/resumen">Inicio</a><span>/</span><strong>Alertas</strong>',

  render () {
    const todas = Estado.alertas();
    const abiertas = todas.filter(a => !a.atendida);
    const atendidas = todas.filter(a => a.atendida);

    return `
      <section class="encabezado">
        <div>
          <h1>Alertas</h1>
          <p class="sub">${abiertas.length} sin atender. Se recalculan solas a partir de las tareas, las horas, los costos y las facturas.</p>
        </div>
      </section>

      <section class="panel" style="margin-bottom:16px">
        <div class="panel-cabeza"><div><h2>Sin atender</h2><p>Requieren una acción tuya</p></div></div>
        ${abiertas.length ? abiertas.map(a => this.fila(a)).join('')
                          : UI.vacio('Nada pendiente', 'No hay alertas abiertas en este momento.')}
      </section>

      ${atendidas.length ? `
      <section class="panel">
        <div class="panel-cabeza"><div><h2>Atendidas</h2><p>Historial de esta sesión</p></div></div>
        ${atendidas.map(a => this.fila(a)).join('')}
      </section>` : ''}
    `;
  },

  fila (a) {
    const estilo = UI.estiloAlerta(a.tipo);

    return `
      <div class="alerta ${a.atendida ? 'atendida' : ''}">
        <span class="icono" style="background:${estilo[0]};color:${estilo[1]}">${estilo[2]}</span>
        <span class="txt">
          <strong>${UI.escapar(a.titulo)}</strong>
          <small>${UI.escapar(a.detalle)}</small>
        </span>
        <a class="boton secundario" href="${a.destino}">${a.proyectoId ? 'Ver proyecto' : 'Ver detalle'}</a>
        ${a.atendida ? '<span class="chip verde">Atendida</span>'
                     : `<button class="boton sutil" data-atender="${a.id}">Marcar atendida</button>`}
      </div>`;
  },

  montar () {
    document.querySelectorAll('[data-atender]').forEach(b =>
      b.addEventListener('click', () => {
        Estado.atenderAlerta(b.dataset.atender);
        UI.toast('Alerta marcada como atendida.');
      }));
  }
};
