/* ===========================================================
   vistas/preguntas.js · Preguntas del cliente al líder
   El cliente pregunta sobre sus proyectos; el líder responde.
   También se usa como pestaña dentro del detalle del proyecto.
   =========================================================== */

const VistaPreguntas = {
  filtro: 'todas',

  miga: () => '<a href="#/resumen">Inicio</a><span>/</span><strong>Preguntas</strong>',

  render () {
    const todas = Estado.preguntas();
    const abiertas = todas.filter(q => q.estado !== 'respondida');
    const lista = this.filtro === 'abiertas' ? abiertas
      : this.filtro === 'respondidas' ? todas.filter(q => q.estado === 'respondida') : todas;
    const cliente = Rol.esCliente();

    return `
      <section class="encabezado">
        <div>
          <h1>Preguntas</h1>
          <p class="sub">${cliente
            ? 'Pregúntale al líder lo que necesites sobre tus proyectos. La respuesta aparece aquí.'
            : `${abiertas.length} sin responder. Los clientes preguntan desde su portal.`}</p>
        </div>
        ${cliente ? '<button class="boton primario" data-preguntar>Hacer una pregunta</button>' : ''}
      </section>

      <section class="panel">
        <div class="panel-cabeza">
          <div><h2>${lista.length} pregunta${lista.length === 1 ? '' : 's'}</h2></div>
          <div class="segmento">
            ${[['todas','Todas'],['abiertas','Sin responder'],['respondidas','Respondidas']].map(([k, t]) =>
              `<button class="${this.filtro === k ? 'activo' : ''}" data-filtro-preg="${k}">${t}</button>`).join('')}
          </div>
        </div>
        ${this.lista(lista, true)}
      </section>`;
  },

  /* Lista reutilizable (también en la pestaña del proyecto) */
  lista (lista, mostrarProyecto) {
    if (!lista.length) return UI.vacio('Sin preguntas',
      Rol.esCliente() ? 'Cuando tengas una duda, usa "Hacer una pregunta".' : 'Todavía no hay preguntas de clientes.');
    const orden = [...lista].sort((a, b) => (a.estado === 'respondida') - (b.estado === 'respondida')
      || String(b.fecha).localeCompare(String(a.fecha)));
    return `<div class="preguntas">${orden.map(q => {
      const p = Estado.proyecto(q.proyectoId);
      const resp = q.estado === 'respondida';
      return `
        <article class="pregunta ${resp ? '' : 'abierta'}">
          <div class="pregunta-top">
            <span class="chip ${resp ? 'verde' : 'ambar'}">${resp ? 'Respondida' : 'Sin responder'}</span>
            ${mostrarProyecto && p ? `<a class="sub" href="#/proyecto/${p.id}">${UI.escapar(p.nombre)}</a>` : ''}
            <small class="sub">${UI.escapar(q.autorNombre || 'Cliente')} · ${UI.fecha(q.fecha)}</small>
          </div>
          <p class="pregunta-texto">${UI.escapar(q.texto)}</p>
          ${resp ? `
            <div class="respuesta">
              <b>${UI.escapar(q.respondidaPor || 'Líder')} · ${UI.fecha(q.fechaRespuesta)}</b>
              <p>${UI.escapar(q.respuesta)}</p>
            </div>` : ''}
          ${Rol.esLider() ? `<div style="margin-top:10px">
            <button class="boton sutil" data-responder="${q.id}">${resp ? 'Editar respuesta' : 'Responder'}</button></div>` : ''}
        </article>`;
    }).join('')}</div>`;
  },

  montar () {
    const raiz = document.querySelector('#vista');
    raiz.querySelectorAll('[data-filtro-preg]').forEach(b => b.addEventListener('click', () => {
      this.filtro = b.dataset.filtroPreg; App.render();
    }));
    VistaPreguntas.montarAcciones(raiz);
  },

  montarAcciones (raiz) {
    raiz.querySelectorAll('[data-preguntar]').forEach(b => b.addEventListener('click', () =>
      VistaPreguntas.abrirPregunta(b.dataset.preguntar || null)));
    raiz.querySelectorAll('[data-responder]').forEach(b => b.addEventListener('click', () =>
      VistaPreguntas.abrirRespuesta(b.dataset.responder)));
  },

  abrirPregunta (proyectoId) {
    const proyectos = Estado.proyectos();
    if (!proyectos.length) { UI.toast('No tienes proyectos asignados todavía.'); return; }
    UI.modal(`
      <h2>Hacer una pregunta</h2>
      <p class="modal-sub">Le llega al líder del proyecto. Verás la respuesta en Preguntas.</p>
      <label class="campo">Proyecto
        <select id="pq_proy">${proyectos.map(p =>
          `<option value="${p.id}" ${p.id === proyectoId ? 'selected' : ''}>${UI.escapar(p.nombre)}</option>`).join('')}</select>
      </label>
      <label class="campo">Tu pregunta
        <textarea id="pq_texto" rows="4" placeholder="Ej. ¿Se mantiene la fecha de entrega de la fase 2?"></textarea>
      </label>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="pq_ok">Enviar pregunta</button>
      </div>`,
      dlg => {
        dlg.querySelector('#pq_texto').focus();
        dlg.querySelector('#pq_ok').addEventListener('click', () => {
          const texto = dlg.querySelector('#pq_texto').value.trim();
          if (!texto) { dlg.querySelector('#pq_texto').focus(); return; }
          Estado.crearPregunta({ proyectoId: dlg.querySelector('#pq_proy').value, texto });
          UI.cerrarModal();
          UI.toast('Pregunta enviada al líder.');
        });
      });
  },

  abrirRespuesta (id) {
    const q = Estado.preguntas().find(x => x.id === id);
    if (!q) return;
    UI.modal(`
      <h2>Responder</h2>
      <p class="modal-sub">${UI.escapar(q.autorNombre || 'Cliente')}: ${UI.escapar(q.texto)}</p>
      <label class="campo">Respuesta
        <textarea id="rq_texto" rows="4">${UI.escapar(q.respuesta || '')}</textarea>
      </label>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="rq_ok">Enviar respuesta</button>
      </div>`,
      dlg => {
        dlg.querySelector('#rq_texto').focus();
        dlg.querySelector('#rq_ok').addEventListener('click', () => {
          const texto = dlg.querySelector('#rq_texto').value.trim();
          if (!texto) { dlg.querySelector('#rq_texto').focus(); return; }
          Estado.responderPregunta(id, texto);
          UI.cerrarModal();
          UI.toast('Respuesta enviada.');
        });
      });
  }
};
