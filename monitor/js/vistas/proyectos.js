/* ===========================================================
   vistas/proyectos.js · Listado de proyectos
   Muestra avance real contra avance esperado, que fue uno de
   los indicadores que pidió el usuario en la validación.
   =========================================================== */

const VistaProyectos = {
  filtros: { cliente:'all', estado:'all', texto:'' },

  miga: () => '<a href="#/resumen">Inicio</a><span>/</span><strong>Proyectos</strong>',

  render () {
    return `
      <section class="encabezado">
        <div>
          <h1>Proyectos</h1>
          <p class="sub">${Estado.proyectos().length} proyectos activos. Haz clic en uno para ver su detalle.</p>
        </div>
        ${Rol.esLider() ? '<button class="boton primario" data-gestion="proyecto">+ Nuevo proyecto</button>' : ''}
      </section>

      <div class="filtros">
        <select id="fCliente" aria-label="Filtrar por cliente">
          <option value="all">Todos los clientes</option>
          ${Estado.clientes().map(c => `<option value="${c.id}">${UI.escapar(c.nombre)}</option>`).join('')}
        </select>
        <select id="fEstado" aria-label="Filtrar por estado">
          <option value="all">Todos los estados</option>
          <option value="verde">En tiempo</option>
          <option value="ambar">En riesgo</option>
          <option value="rojo">Crítico</option>
        </select>
        <input type="search" id="fTexto" aria-label="Buscar proyectos" placeholder="Buscar proyecto, cliente o líder...">
      </div>

      <section class="panel">
        <div class="tabla-desplazable" tabindex="0"><table class="tabla">
          <thead><tr>
            <th>Proyecto</th><th>Líder</th><th style="width:190px">Avance real vs. esperado</th>
            <th>Estado</th><th>Cierre proyectado</th>
          </tr></thead>
          <tbody id="tbodyProyectos"></tbody>
        </table></div>
      </section>
    `;
  },

  montar () {
    Gestion.montar(document.querySelector('#vista'));
    const campos = { fCliente: 'cliente', fEstado: 'estado', fTexto: 'texto' };
    Object.entries(campos).forEach(([id, filtro]) => {
      const el = document.getElementById(id);
      el.value = this.filtros[filtro];
      el.addEventListener('input', () => {
        this.filtros[filtro] = el.value;
        this.pintarFilas();
      });
    });
    this.pintarFilas();
  },

  pintarFilas () {
    const { cliente, estado, texto } = this.filtros;
    const filas = Estado.proyectos().filter(p => {
      const c = Estado.cliente(p.clienteId);
      const lider = Estado.persona(p.liderId);
      const sem = Estado.semaforo(p);
      if (cliente !== 'all' && p.clienteId !== cliente) return false;
      if (estado !== 'all' && sem.clave !== estado) return false;
      if (texto) {
        const blob = (p.nombre + ' ' + c.nombre + ' ' + lider.nombre).toLowerCase();
        if (!blob.includes(texto.toLowerCase().trim())) return false;
      }
      return true;
    });

    const tbody = document.getElementById('tbodyProyectos');
    if (!filas.length) {
      tbody.innerHTML = `<tr><td colspan="5">${UI.vacio('Sin resultados','Prueba con otro filtro.')}</td></tr>`;
      return;
    }

    tbody.innerHTML = filas.map(p => {
      const c = Estado.cliente(p.clienteId);
      const sem = Estado.semaforo(p);
      const esperado = Estado.avanceEsperado(p);
      const desv = Estado.desviacion(p);
      const proy = Estado.proyeccionCierre(p);
      const claseBarra = sem.clave === 'verde' ? '' : sem.clave;
      const signo = desv >= 0 ? '+' : '';
      const colorDesv = desv >= -5 ? 'var(--verde)' : desv >= -15 ? 'var(--ambar)' : 'var(--rojo)';

      let cierre = '—';
      if (proy) {
        const d = proy.desvioDias;
        const nota = d > 0 ? `${d} días tarde` : d < 0 ? `${Math.abs(d)} días antes` : 'en fecha';
        const col = d > 7 ? 'var(--rojo)' : d > 0 ? 'var(--ambar)' : 'var(--verde)';
        cierre = `<strong>${UI.fecha(proy.fecha)}</strong><br><small style="color:${col}">${nota}</small>`;
      }

      return `
        <tr class="clic proyecto-fila" data-id="${p.id}">
          <td>
            <div class="proyecto-nombre">
              <i class="punto ${sem.clave}"></i>
              <div><strong><a href="#/proyecto/${p.id}">${UI.escapar(p.nombre)}</a></strong><small>${UI.escapar(c.nombre)}</small></div>
            </div>
          </td>
          <td>${UI.personaLinea(p.liderId)}</td>
          <td class="celda-avance">
            <div class="rotulos">
              <span>${p.avanceReal}% real</span>
              <span style="color:${colorDesv};font-weight:700">${signo}${desv} pts</span>
            </div>
            ${UI.barra(p.avanceReal, claseBarra)}
            <div class="rotulos" style="margin:5px 0 0"><span>esperado ${esperado}%</span></div>
          </td>
          <td>${UI.chipEstado(sem)}</td>
          <td style="font-size:14.5px">${cierre}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('tr.clic').forEach(tr =>
      tr.addEventListener('click', e => {
        if (!e.target.closest('a')) location.hash = '#/proyecto/' + tr.dataset.id;
      }));
  }
};
