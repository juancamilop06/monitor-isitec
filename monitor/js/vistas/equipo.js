/* ===========================================================
   vistas/equipo.js · Equipo y accesos (solo líder)
   Lista las cuentas registradas y permite cambiar su tipo
   (líder, trabajador, cliente) y a quién o a qué empresa
   corresponden. Los cambios pasan por la función
   asignar_perfil de la base de datos, que verifica que quien
   los hace sea líder.
   =========================================================== */

const VistaEquipo = {
  perfiles: null,
  error: null,

  miga: () => '<a href="#/resumen">Inicio</a><span>/</span><strong>Equipo y accesos</strong>',

  render () {
    const encabezado = `
      <section class="encabezado">
        <div>
          <h1>Equipo y accesos</h1>
          <p class="sub">Quién entra al monitor y qué puede ver. El trabajador ve sus proyectos y tareas;
             el cliente, el avance de los proyectos de su empresa.</p>
        </div>
      </section>`;

    const catalogos = `
      <div class="dos-columnas" style="grid-template-columns:1fr 1fr">
        <section class="panel">
          <div class="panel-cabeza"><div><h2>Personas del equipo</h2><p>Responsables de tareas y líderes de proyecto</p></div>
            <button class="boton sutil" data-gestion="persona">+ Agregar</button></div>
          <ul class="lista-simple">${Estado.personas().map(x => `<li><span><strong>${UI.escapar(x.nombre)}</strong>
            <small class="sub"> · ${UI.escapar(x.rol || '')} · ${x.horasDisponibles} h/mes</small></span>
            <button class="boton-texto" data-gestion="persona:${x.id}">Editar</button></li>`).join('')}</ul>
        </section>
        <section class="panel">
          <div class="panel-cabeza"><div><h2>Clientes</h2><p>Empresas para las que se hacen los proyectos</p></div>
            <button class="boton sutil" data-gestion="cliente">+ Agregar</button></div>
          <ul class="lista-simple">${Estado.clientes().map(c => `<li><span><strong>${UI.escapar(c.nombre)}</strong>
            <small class="sub"> · ${Estado.proyectos().filter(p => p.clienteId === c.id).length} proyectos</small></span>
            <button class="boton-texto" data-gestion="cliente:${c.id}">Editar</button></li>`).join('')}</ul>
        </section>
      </div>`;

    if (Rol.local()) return encabezado + catalogos + `<section class="panel">${UI.vacio('Modo local',
      'Las cuentas de usuario existen solo cuando la app está conectada a la base de datos.')}</section>`;
    if (this.error) return encabezado + catalogos + `<section class="panel">${UI.vacio('No se pudo cargar el equipo', this.error)}</section>`;
    if (!this.perfiles) return encabezado + catalogos + `<section class="panel"><p class="sub">Cargando cuentas…</p></section>`;

    const vinculo = u => u.tipo === 'cliente'
      ? (Estado.cliente(u.cliente_id) || { nombre: 'Sin empresa' }).nombre
      : u.persona_id ? (Estado.persona(u.persona_id) || { nombre: u.persona_id }).nombre
      : (u.tipo === 'lider' ? '—' : 'Sin vincular');
    const chip = { lider: 'azul', trabajador: 'gris', cliente: 'verde' };

    return encabezado + catalogos + `
      <section class="panel">
        <div class="panel-cabeza"><div><h2>${this.perfiles.length} cuentas</h2>
          <p>Cada persona se registra sola en la pantalla de inicio. Aquí ajustas su acceso.</p></div></div>
        <div class="tabla-desplazable" tabindex="0"><table class="tabla">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Tipo</th><th>Es / Empresa</th><th></th></tr></thead>
          <tbody>${this.perfiles.map(u => `
            <tr>
              <td><strong>${UI.escapar(u.nombre)}</strong></td>
              <td><small>${UI.escapar(u.correo || '')}</small></td>
              <td><span class="chip ${chip[u.tipo] || 'gris'}">${Rol.NOMBRES[u.tipo] || u.tipo}</span></td>
              <td>${UI.escapar(vinculo(u))}</td>
              <td style="text-align:right"><button class="boton-texto" data-editar-acceso="${u.id}">Cambiar acceso</button></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  },

  async cargar () {
    try { this.perfiles = await Nube.listarPerfiles(); this.error = null; }
    catch (e) { this.error = e.message || String(e); }
    if (location.hash.startsWith('#/equipo')) App.render();
  },

  montar () {
    Gestion.montar(document.querySelector('#vista'));
    if (!Rol.local() && !this.perfiles && !this.error && !this._cargando) {
      this._cargando = true;
      this.cargar().finally(() => { this._cargando = false; });
    }
    document.querySelectorAll('[data-editar-acceso]').forEach(b =>
      b.addEventListener('click', () => this.abrirEditar(b.dataset.editarAcceso)));
  },

  abrirEditar (id) {
    const u = this.perfiles.find(x => x.id === id);
    if (!u) return;
    UI.modal(`
      <h2>Cambiar acceso</h2>
      <p class="modal-sub">${UI.escapar(u.nombre)} · ${UI.escapar(u.correo || '')}</p>
      <label class="campo">Tipo de usuario
        <select id="ea_tipo">
          ${Object.entries(Rol.NOMBRES).map(([k, t]) => `<option value="${k}" ${u.tipo === k ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>
      <label class="campo" id="ea_persona_campo">Es en el equipo
        <select id="ea_persona">
          <option value="">— Sin vincular —</option>
          ${Estado.personas().map(p => `<option value="${p.id}" ${u.persona_id === p.id ? 'selected' : ''}>${UI.escapar(p.nombre)}</option>`).join('')}
        </select>
      </label>
      <label class="campo" id="ea_cliente_campo">Empresa
        <select id="ea_cliente">
          ${Estado.clientes().map(c => `<option value="${c.id}" ${u.cliente_id === c.id ? 'selected' : ''}>${UI.escapar(c.nombre)}</option>`).join('')}
        </select>
      </label>
      <p class="acceso-aviso error" id="ea_error" hidden></p>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="ea_ok">Guardar</button>
      </div>`,
      dlg => {
        const tipo = dlg.querySelector('#ea_tipo');
        const pintar = () => {
          dlg.querySelector('#ea_persona_campo').hidden = tipo.value === 'cliente';
          dlg.querySelector('#ea_cliente_campo').hidden = tipo.value !== 'cliente';
        };
        tipo.addEventListener('change', pintar); pintar();
        dlg.querySelector('#ea_ok').addEventListener('click', async () => {
          const boton = dlg.querySelector('#ea_ok');
          boton.disabled = true;
          try {
            await Nube.asignarPerfil(u.id, tipo.value,
              tipo.value === 'cliente' ? null : dlg.querySelector('#ea_persona').value,
              tipo.value === 'cliente' ? dlg.querySelector('#ea_cliente').value : null);
            UI.cerrarModal();
            UI.toast('Acceso actualizado.');
            this.perfiles = null;
            this.cargar();
          } catch (e) {
            const aviso = dlg.querySelector('#ea_error');
            aviso.hidden = false; aviso.textContent = e.message || String(e);
            boton.disabled = false;
          }
        });
      });
  }
};
