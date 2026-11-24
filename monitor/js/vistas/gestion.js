/* ===========================================================
   vistas/gestion.js · Formularios de gestión del líder
   Crear / editar / eliminar proyectos, crear clientes y
   personas del equipo, emitir facturas y registrar horas.
   Solo el líder ve estos botones; la base de datos (RLS)
   rechaza estos cambios si los intenta otro tipo de usuario.
   =========================================================== */

const Gestion = {

  /* ---------- Proyecto: crear o editar ---------- */
  abrirProyecto (id) {
    const p = id ? Estado.proyecto(id) : null;
    const hoy = Estado.hoyISO();
    const en3m = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const v = (campo, defecto) => p ? p[campo] : defecto;
    const opcCliente = Estado.clientes().map(c =>
      `<option value="${c.id}" ${v('clienteId') === c.id ? 'selected' : ''}>${UI.escapar(c.nombre)}</option>`).join('');
    const opcLider = Estado.personas().map(x =>
      `<option value="${x.id}" ${v('liderId') === x.id ? 'selected' : ''}>${UI.escapar(x.nombre)}</option>`).join('');

    UI.modal(`
      <h2>${p ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
      <p class="modal-sub">${p ? 'Actualiza el avance, las fechas o las cifras del proyecto.' : 'Los valores en pesos colombianos (COP).'}</p>
      <label class="campo">Nombre del proyecto
        <input type="text" id="gp_nombre" value="${UI.escapar(v('nombre', ''))}" placeholder="Ej. Implementación CRM"></label>
      <div class="fila-2">
        <label class="campo">Cliente
          <select id="gp_cliente">${opcCliente}<option value="__nuevo">+ Nuevo cliente…</option></select></label>
        <label class="campo">Líder del proyecto
          <select id="gp_lider">${opcLider}<option value="__nuevo">+ Nueva persona…</option></select></label>
      </div>
      <label class="campo" id="gp_nuevo_cliente_campo" hidden>Nombre del nuevo cliente
        <input type="text" id="gp_nuevo_cliente" placeholder="Ej. Bancolombia"></label>
      <label class="campo" id="gp_nueva_persona_campo" hidden>Nombre del nuevo líder
        <input type="text" id="gp_nueva_persona" placeholder="Ej. Laura Méndez"></label>
      <div class="fila-2">
        <label class="campo">Inicio<input type="date" id="gp_inicio" value="${v('inicio', hoy)}"></label>
        <label class="campo">Fin planeado<input type="date" id="gp_fin" value="${v('finPlan', en3m)}"></label>
      </div>
      <div class="fila-2">
        <label class="campo">Avance real (%)<input type="number" id="gp_avance" min="0" max="100" value="${v('avanceReal', 0)}"></label>
        <label class="campo">Horas presupuestadas<input type="number" id="gp_horas" min="1" value="${v('horasPresupuesto', 400)}"></label>
      </div>
      <div class="fila-2">
        <label class="campo">Valor del contrato<input type="number" id="gp_valor" min="1" step="1000" value="${v('valorContrato', 50000000)}"></label>
        <label class="campo">Costo planeado<input type="number" id="gp_costo_plan" min="0" step="1000" value="${v('costoPlaneado', 35000000)}"></label>
      </div>
      <label class="campo">Costo real a la fecha<input type="number" id="gp_costo_real" min="0" step="1000" value="${v('costoReal', 0)}"></label>
      <p class="acceso-aviso error" id="gp_error" hidden></p>
      <div class="modal-acciones">
        ${p ? '<button class="boton secundario" id="gp_borrar" style="margin-right:auto;color:var(--rojo)">Eliminar proyecto</button>' : ''}
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="gp_ok">${p ? 'Guardar cambios' : 'Crear proyecto'}</button>
      </div>`,
      dlg => {
        const $ = s => dlg.querySelector(s);
        const toggle = () => {
          $('#gp_nuevo_cliente_campo').hidden = $('#gp_cliente').value !== '__nuevo';
          $('#gp_nueva_persona_campo').hidden = $('#gp_lider').value !== '__nuevo';
        };
        $('#gp_cliente').addEventListener('change', toggle);
        $('#gp_lider').addEventListener('change', toggle);
        toggle();
        $('#gp_nombre').focus();
        const error = t => { $('#gp_error').hidden = false; $('#gp_error').textContent = t; };

        $('#gp_ok').addEventListener('click', () => {
          const nombre = $('#gp_nombre').value.trim();
          const inicio = $('#gp_inicio').value, fin = $('#gp_fin').value;
          const num = s => Number($(s).value);
          if (!nombre) return error('Escribe el nombre del proyecto.');
          if (!inicio || !fin || fin <= inicio) return error('La fecha de fin debe ser posterior a la de inicio.');
          if (num('#gp_valor') <= 0 || num('#gp_horas') <= 0) return error('El valor del contrato y las horas deben ser mayores que cero.');
          if (num('#gp_avance') < 0 || num('#gp_avance') > 100) return error('El avance va de 0 a 100.');

          let clienteId = $('#gp_cliente').value;
          if (clienteId === '__nuevo') {
            const n = $('#gp_nuevo_cliente').value.trim();
            if (!n) return error('Escribe el nombre del nuevo cliente.');
            clienteId = Estado.guardarCliente({ nombre: n }).id;
          }
          let liderId = $('#gp_lider').value;
          if (liderId === '__nuevo') {
            const n = $('#gp_nueva_persona').value.trim();
            if (!n) return error('Escribe el nombre del nuevo líder.');
            liderId = Estado.guardarPersona({ nombre: n, rol: 'Gerente de proyecto' }).id;
          }
          const guardado = Estado.guardarProyecto({
            id: p ? p.id : null, nombre, clienteId, liderId, inicio, finPlan: fin,
            avanceReal: Math.round(num('#gp_avance')), horasPresupuesto: Math.round(num('#gp_horas')),
            valorContrato: Math.round(num('#gp_valor')), costoPlaneado: Math.round(num('#gp_costo_plan')),
            costoReal: Math.round(num('#gp_costo_real'))
          });
          UI.cerrarModal();
          UI.toast(p ? 'Proyecto actualizado.' : 'Proyecto creado.');
          if (!p) location.hash = '#/proyecto/' + guardado.id;
        });

        if (p) $('#gp_borrar').addEventListener('click', () => {
          const boton = $('#gp_borrar');
          if (boton.dataset.confirmar) {
            Estado.eliminarProyecto(p.id);
            UI.cerrarModal();
            UI.toast('Proyecto eliminado.');
            location.hash = '#/proyectos';
            return;
          }
          boton.dataset.confirmar = '1';
          boton.textContent = '¿Seguro? Se borran sus tareas y facturas';
        });
      });
  },

  /* ---------- Factura ---------- */
  abrirFactura (proyectoId) {
    const p = Estado.proyecto(proyectoId);
    const hoy = Estado.hoyISO();
    const en30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const siguiente = 'FE-' + String(Estado.facturas().length + 101).padStart(4, '0');
    UI.modal(`
      <h2>Nueva factura</h2>
      <p class="modal-sub">${UI.escapar(p.nombre)}</p>
      <div class="fila-2">
        <label class="campo">Número<input type="text" id="gf_numero" value="${siguiente}"></label>
        <label class="campo">Monto (COP)<input type="number" id="gf_monto" min="1" step="1000" placeholder="Ej. 12000000"></label>
      </div>
      <div class="fila-2">
        <label class="campo">Emisión<input type="date" id="gf_emision" value="${hoy}"></label>
        <label class="campo">Vencimiento<input type="date" id="gf_venc" value="${en30}"></label>
      </div>
      <p class="acceso-aviso error" id="gf_error" hidden></p>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="gf_ok">Emitir factura</button>
      </div>`,
      dlg => {
        const $ = s => dlg.querySelector(s);
        $('#gf_monto').focus();
        $('#gf_ok').addEventListener('click', () => {
          const monto = Number($('#gf_monto').value);
          const err = t => { $('#gf_error').hidden = false; $('#gf_error').textContent = t; };
          if (!$('#gf_numero').value.trim()) return err('Escribe el número de la factura.');
          if (!(monto > 0)) return err('El monto debe ser mayor que cero.');
          if ($('#gf_venc').value < $('#gf_emision').value) return err('El vencimiento no puede ser antes de la emisión.');
          Estado.crearFactura({ proyectoId, numero: $('#gf_numero').value.trim(), monto,
            emision: $('#gf_emision').value, vencimiento: $('#gf_venc').value });
          UI.cerrarModal();
          UI.toast('Factura emitida.');
        });
      });
  },

  /* ---------- Horas ---------- */
  abrirHoras (proyectoId) {
    const personas = Rol.esLider() ? Estado.personas() : Estado.personas().filter(x => x.id === Rol.persona());
    UI.modal(`
      <h2>Registrar horas</h2>
      <p class="modal-sub">${UI.escapar(Estado.proyecto(proyectoId).nombre)} · mes en curso</p>
      <div class="fila-2">
        <label class="campo">Persona
          <select id="gh_persona">${personas.map(x => `<option value="${x.id}">${UI.escapar(x.nombre)}</option>`).join('')}</select></label>
        <label class="campo">Horas<input type="number" id="gh_horas" min="0.5" step="0.5" value="8"></label>
      </div>
      <label class="campo" style="flex-direction:row;align-items:center;gap:8px">
        <input type="checkbox" id="gh_fact" checked> Facturables al cliente</label>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="gh_ok">Registrar</button>
      </div>`,
      dlg => {
        dlg.querySelector('#gh_ok').addEventListener('click', () => {
          const horas = Number(dlg.querySelector('#gh_horas').value);
          if (!(horas > 0)) { dlg.querySelector('#gh_horas').focus(); return; }
          Estado.registrarHoras({ proyectoId, personaId: dlg.querySelector('#gh_persona').value,
            horas, facturable: dlg.querySelector('#gh_fact').checked });
          UI.cerrarModal();
          UI.toast('Horas registradas.');
        });
      });
  },

  /* ---------- Persona del equipo ---------- */
  abrirPersona (id) {
    const p = id ? Estado.persona(id) : null;
    UI.modal(`
      <h2>${p ? 'Editar persona' : 'Agregar persona al equipo'}</h2>
      <p class="modal-sub">Las personas son quienes se asignan como responsables y líderes.</p>
      <label class="campo">Nombre completo<input type="text" id="gpe_nombre" value="${UI.escapar(p ? p.nombre : '')}"></label>
      <div class="fila-2">
        <label class="campo">Cargo<input type="text" id="gpe_rol" value="${UI.escapar(p ? p.rol : 'Consultor')}"></label>
        <label class="campo">Horas disponibles al mes<input type="number" id="gpe_horas" min="1" value="${p ? p.horasDisponibles : 160}"></label>
      </div>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="gpe_ok">Guardar</button>
      </div>`,
      dlg => {
        dlg.querySelector('#gpe_nombre').focus();
        dlg.querySelector('#gpe_ok').addEventListener('click', () => {
          const nombre = dlg.querySelector('#gpe_nombre').value.trim();
          if (!nombre) { dlg.querySelector('#gpe_nombre').focus(); return; }
          Estado.guardarPersona({ id, nombre, rol: dlg.querySelector('#gpe_rol').value.trim(),
            horasDisponibles: dlg.querySelector('#gpe_horas').value });
          UI.cerrarModal();
          UI.toast(p ? 'Persona actualizada.' : 'Persona agregada.');
        });
      });
  },

  /* ---------- Cliente ---------- */
  abrirCliente (id) {
    const c = id ? Estado.cliente(id) : null;
    UI.modal(`
      <h2>${c ? 'Editar cliente' : 'Nuevo cliente'}</h2>
      <label class="campo">Nombre de la empresa<input type="text" id="gc_nombre" value="${UI.escapar(c ? c.nombre : '')}"></label>
      <div class="modal-acciones">
        <button class="boton secundario" data-cerrar>Cancelar</button>
        <button class="boton primario" id="gc_ok">Guardar</button>
      </div>`,
      dlg => {
        dlg.querySelector('#gc_nombre').focus();
        dlg.querySelector('#gc_ok').addEventListener('click', () => {
          const nombre = dlg.querySelector('#gc_nombre').value.trim();
          if (!nombre) { dlg.querySelector('#gc_nombre').focus(); return; }
          Estado.guardarCliente({ id, nombre });
          UI.cerrarModal();
          UI.toast(c ? 'Cliente actualizado.' : 'Cliente creado.');
        });
      });
  },

  /* Conecta los botones data-gestion="accion:id" de cualquier vista */
  montar (raiz) {
    raiz.querySelectorAll('[data-gestion]').forEach(b => b.addEventListener('click', () => {
      const [accion, id] = b.dataset.gestion.split(':');
      ({ proyecto: () => this.abrirProyecto(id || null),
         factura:  () => this.abrirFactura(id),
         horas:    () => this.abrirHoras(id),
         persona:  () => this.abrirPersona(id || null),
         cliente:  () => this.abrirCliente(id || null) })[accion]();
    }));
  }
};
