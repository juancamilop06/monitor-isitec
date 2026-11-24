/* ===========================================================
   nube.js · Base de datos y cuentas de usuario (Supabase)
   -----------------------------------------------------------
   - Registro e inicio de sesión con correo y contraseña.
   - Carga los datos de las tablas de Postgres al entrar.
   - Cada vez que Estado guarda, se calcula qué filas cambiaron
     y solo esas se envían (upsert / delete).
   - Tiempo real: si un compañero cambia algo, la pantalla se
     actualiza sola.
   Si config.js no tiene llaves, todo sigue en modo local.
   =========================================================== */

const Nube = (function () {
  const activa = !!((typeof CONFIG !== "undefined" && CONFIG) && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase);
  const sb = activa ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

  let usuario = null;
  let perfil  = null;

  /* Orden padre → hijo (por las llaves foráneas) */
  const TABLAS = [
    { col:'clientes',      tabla:'clientes',       campos:['id','nombre'] },
    { col:'personas',      tabla:'personas',       campos:['id','nombre','iniciales','color','rol','horasDisponibles'] },
    { col:'proyectos',     tabla:'proyectos',      campos:['id','nombre','clienteId','liderId','inicio','finPlan','avanceReal',
                                                           'horasPresupuesto','valorContrato','costoPlaneado','costoReal'] },
    { col:'tareas',        tabla:'tareas',         campos:['id','proyectoId','nombre','responsableId','fechaLimite','prioridad','estado',
                                                           'riesgo','esIncidencia','fechaReporte','fechaCierre','horas'] },
    { col:'facturas',      tabla:'facturas',       campos:['id','proyectoId','numero','monto','emision','vencimiento','estado'] },
    { col:'registroHoras', tabla:'registro_horas', campos:['id','mes','personaId','proyectoId','horas','facturable'] },
    { col:'reportes',      tabla:'reportes',       campos:['id','fecha','alcance','formato','interno','autor'] },
    { col:'preguntas',     tabla:'preguntas',      campos:['id','proyectoId','autorNombre','texto','fecha','respuesta',
                                                           'respondidaPor','fechaRespuesta','estado'] }
  ];

  const snake = k => k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());

  function aFila (obj, campos) {
    const f = {};
    campos.forEach(c => { f[snake(c)] = obj[c] === undefined ? null : obj[c]; });
    return f;
  }
  function deFila (fila, campos) {
    const o = {};
    campos.forEach(c => { o[c] = fila[snake(c)]; });
    return o;
  }

  /* --- foto de lo último que está en la nube ---------------- */
  let foto = {};     // col -> Map(id -> json de la fila)

  function tomarFoto (datos) {
    foto = {};
    TABLAS.forEach(T => {
      foto[T.col] = new Map((datos[T.col] || []).map(o => [o.id, JSON.stringify(aFila(o, T.campos))]));
    });
    foto.alertasAtendidas = new Map((datos.alertasAtendidas || []).map(id => [id, id]));
  }

  /* --- lectura completa ------------------------------------- */
  async function cargarTodo () {
    const respuestas = await Promise.all([
      ...TABLAS.map(T => sb.from(T.tabla).select('*').order('orden', { ascending: T.col !== 'reportes' })),
      sb.from('alertas_atendidas').select('id')
    ]);
    const error = respuestas.find(r => r.error);
    if (error) throw error.error;
    const datos = { version: DATOS_SEMILLA.version };
    TABLAS.forEach((T, i) => { datos[T.col] = respuestas[i].data.map(f => deFila(f, T.campos)); });
    datos.alertasAtendidas = respuestas[TABLAS.length].data.map(f => f.id);
    return datos;
  }

  /* --- escritura: solo lo que cambió ------------------------ */
  let cola = Promise.resolve();
  let pendientes = 0;

  function sincronizar (datos) {
    if (!activa || !usuario) return;
    const cambios = TABLAS.map(T => {
      const anterior = foto[T.col] || new Map();
      const lista = datos[T.col] || [];
      const filas = [], idsActuales = new Set();
      lista.forEach(o => {
        idsActuales.add(o.id);
        const fila = aFila(o, T.campos);
        const json = JSON.stringify(fila);
        if (anterior.get(o.id) !== json) filas.push(fila);
      });
      const borrar = [...anterior.keys()].filter(id => !idsActuales.has(id));
      return { T, filas, borrar, existian: new Set(anterior.keys()) };
    });
    const atendAnt = foto.alertasAtendidas || new Map();
    const atendNuevas = (datos.alertasAtendidas || []).filter(id => !atendAnt.has(id)).map(id => ({ id }));
    const atendBorrar = [...atendAnt.keys()].filter(id => !(datos.alertasAtendidas || []).includes(id));

    const hayAlgo = cambios.some(c => c.filas.length || c.borrar.length) || atendNuevas.length || atendBorrar.length;
    if (!hayAlgo) return;
    tomarFoto(datos);            // optimista: la foto ya refleja lo enviado
    pendientes++;
    marcarSync('guardando');

    cola = cola.then(async () => {
      const lider = perfil && perfil.tipo === 'lider';
      for (const c of cambios) {
        if (!c.filas.length) continue;
        if (lider) {
          const { error } = await sb.from(c.T.tabla).upsert(c.filas);
          if (error) throw error;
          continue;
        }
        /* Trabajador y cliente: insertan lo nuevo y actualizan fila por fila,
           para que la base de datos aplique sus permisos (RLS) */
        const nuevas = c.filas.filter(f => !c.existian.has(f.id));
        const viejas = c.filas.filter(f => c.existian.has(f.id));
        if (nuevas.length) {
          const { error } = await sb.from(c.T.tabla).insert(nuevas);
          if (error) throw error;
        }
        for (const f of viejas) {
          const { data, error } = await sb.from(c.T.tabla).update(f).eq('id', f.id).select('id');
          if (error) throw error;
          if (!data || !data.length) throw new Error('no tienes permiso para cambiar ese registro');
        }
      }
      if (atendNuevas.length) {
        const { error } = await sb.from('alertas_atendidas').upsert(atendNuevas);
        if (error) throw error;
      }
      for (const c of [...cambios].reverse()) {
        if (c.borrar.length) {
          const { error } = await sb.from(c.T.tabla).delete().in('id', c.borrar);
          if (error) throw error;
        }
      }
      if (atendBorrar.length) {
        const { error } = await sb.from('alertas_atendidas').delete().in('id', atendBorrar);
        if (error) throw error;
      }
    }).then(() => {
      pendientes--;
      if (!pendientes) marcarSync('ok');
    }).catch(err => {
      pendientes--;
      console.error('[Nube] error al guardar', err);
      marcarSync('error');
      UI.toast('No se pudo guardar en la base de datos: ' + (err.message || err));
      recargar();                // vuelve a lo que realmente quedó en la nube
    });
  }

  /* --- tiempo real ------------------------------------------ */
  let temporizador;
  function escucharCambios () {
    sb.channel('monitor-cambios')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(temporizador);
        temporizador = setTimeout(recargar, 600);
      })
      .subscribe();
  }

  async function recargar () {
    if (pendientes) { clearTimeout(temporizador); temporizador = setTimeout(recargar, 600); return; }
    try {
      const datos = await cargarTodo();
      tomarFoto(datos);
      Estado.reemplazar(datos);
    } catch (e) { console.error('[Nube] error al recargar', e); }
  }

  /* --- indicador de guardado en la barra lateral ------------ */
  function marcarSync (estado) {
    const el = document.querySelector('#estadoNube');
    if (!el) return;
    el.dataset.estado = estado;
    el.textContent = { guardando: 'Guardando…', ok: 'Guardado en la nube', error: 'Error al guardar' }[estado] || '';
  }

  /* --- cuentas ---------------------------------------------- */
  const MENSAJES = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'Email not confirmed': 'Aún no confirmas tu correo. Revisa tu bandeja de entrada (y spam).',
    'User already registered': 'Ya existe una cuenta con ese correo. Inicia sesión.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'El correo no tiene un formato válido.',
    'email rate limit exceeded': 'Se enviaron demasiados correos en poco tiempo. Espera unos minutos.'
  };
  const traducir = e => {
    const m = (e && e.message) || String(e);
    const clave = Object.keys(MENSAJES).find(k => m.toLowerCase().includes(k.toLowerCase()));
    return clave ? MENSAJES[clave] : m;
  };

  const urlRegreso = () => location.origin + location.pathname;

  function pantallaAcceso (modo, aviso) {
    document.body.classList.remove('cargando');
    document.body.classList.add('sin-sesion');
    const cont = document.querySelector('#acceso');
    const titulos = {
      entrar:   ['Inicia sesión', 'Entra con tu correo para ver el monitor del equipo.'],
      registro: ['Crea tu cuenta', 'Regístrate con tu correo. Todos los datos se guardan en la base de datos compartida.'],
      olvido:   ['Recupera tu contraseña', 'Te enviamos un enlace a tu correo para crear una nueva.'],
      nueva:    ['Nueva contraseña', 'Escribe la contraseña que quieres usar de ahora en adelante.']
    };
    const [titulo, sub] = titulos[modo];
    cont.innerHTML = `
      <form class="acceso-tarjeta" id="formAcceso" novalidate>
        <div class="acceso-marca"><span class="brand-mark">I</span><span><strong>ISITEC</strong><small>MONITOR</small></span></div>
        <h1>${titulo}</h1>
        <p class="modal-sub">${sub}</p>
        ${aviso ? `<p class="acceso-aviso ${aviso.tipo}">${UI.escapar(aviso.texto)}</p>` : ''}
        ${modo === 'registro' ? `
          <label class="campo">Nombre completo
            <input type="text" id="ac_nombre" autocomplete="name" required placeholder="Ej. Ana Gómez"></label>
          <span class="campo" style="margin-bottom:8px">¿Cómo vas a usar el monitor?</span>
          <div class="opciones acceso-tipos" id="ac_tipo">
            <button type="button" class="opcion activo" data-tipo="trabajador">
              <strong>Trabajo en un proyecto</strong><small>Hago tareas y reporto incidencias</small></button>
            <button type="button" class="opcion" data-tipo="cliente">
              <strong>Soy cliente</strong><small>Veo el avance y hago preguntas</small></button>
          </div>
          <p class="acceso-nota">El primer usuario registrado queda como líder de proyecto. El líder puede cambiar el tipo de cualquier cuenta.</p>` : ''}
        ${modo !== 'nueva' ? `
          <label class="campo">Correo
            <input type="email" id="ac_correo" autocomplete="email" required placeholder="tu@correo.com"></label>` : ''}
        ${modo !== 'olvido' ? `
          <label class="campo">Contraseña
            <input type="password" id="ac_clave" autocomplete="${modo === 'entrar' ? 'current-password' : 'new-password'}"
                   minlength="6" required placeholder="${modo === 'entrar' ? '' : 'Mínimo 6 caracteres'}"></label>` : ''}
        <button class="boton primario acceso-boton" type="submit" id="ac_enviar">${
          { entrar:'Entrar', registro:'Crear cuenta', olvido:'Enviar enlace', nueva:'Guardar contraseña' }[modo]}</button>
        <div class="acceso-enlaces">
          ${modo === 'entrar' ? `<a href="#" data-modo="registro">¿No tienes cuenta? <b>Regístrate</b></a>
                                 <a href="#" data-modo="olvido">Olvidé mi contraseña</a>` : ''}
          ${modo === 'registro' || modo === 'olvido' ? `<a href="#" data-modo="entrar">¿Ya tienes cuenta? <b>Inicia sesión</b></a>` : ''}
        </div>
      </form>`;

    cont.querySelectorAll('[data-modo]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); pantallaAcceso(a.dataset.modo);
    }));
    const primero = cont.querySelector('input'); if (primero) primero.focus();
    let tipoElegido = 'trabajador';
    cont.querySelectorAll('[data-tipo]').forEach(b => b.addEventListener('click', () => {
      tipoElegido = b.dataset.tipo;
      cont.querySelectorAll('[data-tipo]').forEach(x => x.classList.toggle('activo', x === b));
    }));

    cont.querySelector('#formAcceso').addEventListener('submit', async e => {
      e.preventDefault();
      const val = id => { const el = cont.querySelector(id); return el ? el.value.trim() : ''; };
      const correo = val('#ac_correo'), clave = cont.querySelector('#ac_clave') ? cont.querySelector('#ac_clave').value : '';
      const boton = cont.querySelector('#ac_enviar');
      const error = texto => pantallaAccesoConservando(modo, { tipo: 'error', texto }, { correo, nombre: val('#ac_nombre') });

      if (modo !== 'nueva' && !/^\S+@\S+\.\S+$/.test(correo)) return error('Escribe un correo válido.');
      if (modo !== 'olvido' && clave.length < 6) return error('La contraseña debe tener al menos 6 caracteres.');
      if (modo === 'registro' && !val('#ac_nombre')) return error('Escribe tu nombre.');

      boton.disabled = true; boton.textContent = 'Un momento…';
      try {
        if (modo === 'entrar') {
          const { data, error: err } = await sb.auth.signInWithPassword({ email: correo, password: clave });
          if (err) throw err;
          await entrar(data.user);
        } else if (modo === 'registro') {
          const { data, error: err } = await sb.auth.signUp({
            email: correo, password: clave,
            options: { data: { nombre: val('#ac_nombre'), tipo: tipoElegido }, emailRedirectTo: urlRegreso() }
          });
          if (err) throw err;
          if (data.session) await entrar(data.user);
          else pantallaAcceso('entrar', { tipo: 'ok',
            texto: `Cuenta creada. Te enviamos un correo a ${correo}: abre el enlace para confirmarla y luego inicia sesión.` });
        } else if (modo === 'olvido') {
          const { error: err } = await sb.auth.resetPasswordForEmail(correo, { redirectTo: urlRegreso() });
          if (err) throw err;
          pantallaAcceso('entrar', { tipo: 'ok', texto: `Si ${correo} tiene cuenta, te llegará un enlace para cambiar la contraseña.` });
        } else if (modo === 'nueva') {
          const { data, error: err } = await sb.auth.updateUser({ password: clave });
          if (err) throw err;
          await entrar(data.user);
          UI.toast('Contraseña actualizada.');
        }
      } catch (err) {
        error(traducir(err));
      }
    });
  }

  function pantallaAccesoConservando (modo, aviso, valores) {
    pantallaAcceso(modo, aviso);
    const c = document.querySelector('#ac_correo'); if (c && valores.correo) c.value = valores.correo;
    const n = document.querySelector('#ac_nombre'); if (n && valores.nombre) n.value = valores.nombre;
  }

  async function cargarPerfil (user) {
    let { data, error } = await sb.from('perfiles').select('*').eq('id', user.id).maybeSingle();
    if (!data && !error) {                     // el trigger puede tardar un instante
      await new Promise(r => setTimeout(r, 800));
      ({ data, error } = await sb.from('perfiles').select('*').eq('id', user.id).maybeSingle());
    }
    if (error) throw error;
    if (!data) throw new Error('no se encontró tu perfil');
    perfil = data;
  }

  /* Trabajador: ¿quién eres en el equipo?  Cliente: ¿de qué empresa? */
  const faltaVinculo = () => perfil && (
    (perfil.tipo === 'trabajador' && !perfil.persona_id) ||
    (perfil.tipo === 'cliente' && !perfil.cliente_id));

  async function pantallaVinculo () {
    document.body.classList.remove('cargando');
    document.body.classList.add('sin-sesion');
    const cliente = perfil.tipo === 'cliente';
    const { data: lista, error } = await sb.from(cliente ? 'clientes' : 'personas').select('id,nombre').order('nombre');
    if (error) throw error;
    const cont = document.querySelector('#acceso');
    return new Promise(resolve => {
      cont.innerHTML = `
        <form class="acceso-tarjeta" id="formVinculo">
          <div class="acceso-marca"><span class="brand-mark">I</span><span><strong>ISITEC</strong><small>MONITOR</small></span></div>
          <h1>Un último paso</h1>
          <p class="modal-sub">${cliente
            ? 'Elige tu empresa para ver solo los proyectos que te corresponden.'
            : 'Dinos quién eres en el equipo para mostrarte tus tareas y proyectos.'}</p>
          <label class="campo">${cliente ? 'Empresa' : 'Soy'}
            <select id="vi_sel">
              ${lista.map(x => `<option value="${UI.escapar(x.id)}">${UI.escapar(x.nombre)}</option>`).join('')}
              ${cliente ? '' : `<option value="__nueva">Soy nuevo en el equipo (${UI.escapar(perfil.nombre)})</option>`}
            </select></label>
          <p class="acceso-aviso error" id="vi_error" hidden></p>
          <button class="boton primario acceso-boton" type="submit" id="vi_ok">Continuar</button>
          <div class="acceso-enlaces"><a href="#" id="vi_salir">Cerrar sesión</a></div>
        </form>`;
      cont.querySelector('#vi_salir').addEventListener('click', async e => { e.preventDefault(); await sb.auth.signOut(); location.reload(); });
      cont.querySelector('#formVinculo').addEventListener('submit', async e => {
        e.preventDefault();
        const v = cont.querySelector('#vi_sel').value;
        const boton = cont.querySelector('#vi_ok');
        boton.disabled = true; boton.textContent = 'Guardando…';
        const { error: err } = await sb.rpc('completar_perfil', {
          p_persona: !cliente && v !== '__nueva' ? v : null,
          p_cliente: cliente ? v : null,
          p_nueva_persona: !cliente && v === '__nueva' ? perfil.nombre : null
        });
        if (err) {
          const aviso = cont.querySelector('#vi_error');
          aviso.hidden = false; aviso.textContent = traducir(err);
          boton.disabled = false; boton.textContent = 'Continuar';
          return;
        }
        resolve();
      });
    });
  }

  /* --- equipo y accesos (solo líder) ------------------------- */
  async function listarPerfiles () {
    const { data, error } = await sb.from('perfiles').select('*').order('creado_en');
    if (error) throw error;
    return data;
  }
  async function asignarPerfil (usuario, tipo, personaId, clienteId) {
    const { error } = await sb.rpc('asignar_perfil', {
      p_usuario: usuario, p_tipo: tipo, p_persona: personaId || null, p_cliente: clienteId || null });
    if (error) throw error;
    if (usuario === perfil.id) location.reload();
  }

  let alListo = null;
  let yaDentro = false;

  let entrando = false;
  async function entrar (user) {
    if (yaDentro || entrando) return;
    entrando = true;
    usuario = user;
    document.body.classList.remove('sin-sesion');
    document.body.classList.add('cargando');
    document.querySelector('#acceso').innerHTML = '';
    try {
      await cargarPerfil(user);
      if (faltaVinculo()) {
        await pantallaVinculo();
        await cargarPerfil(user);
        document.body.classList.remove('sin-sesion');
        document.body.classList.add('cargando');
        document.querySelector('#acceso').innerHTML = '';
      }
      let datos = await cargarTodo();
      if (perfil.tipo === 'lider' && !datos.proyectos.length && !datos.personas.length) {
        /* Base vacía: se siembra con los datos de ejemplo una sola vez */
        tomarFoto({});
        datos = structuredClone(DATOS_SEMILLA);
        Estado.reemplazar(datos, true);
        sincronizar(datos);
        await cola;
      } else {
        tomarFoto(datos);
        Estado.reemplazar(datos, true);
      }
    } catch (e) {
      console.error(e);
      usuario = null; entrando = false;
      document.body.classList.remove('cargando');
      return pantallaAcceso('entrar', { tipo: 'error',
        texto: 'Entraste, pero no se pudo leer la base de datos: ' + (e.message || e) +
               '. ¿Ya se corrió supabase/schema.sql?' });
    }
    yaDentro = true;
    pintarPerfil();
    escucharCambios();
    document.body.classList.remove('cargando');
    marcarSync('ok');
    if (alListo) alListo();
  }

  function pintarPerfil () {
    const el = document.querySelector('.perfil');
    if (!el || !perfil) return;
    const iniciales = perfil.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
    el.innerHTML = `
      <span class="avatar">${UI.escapar(iniciales)}</span>
      <span class="perfil-texto"><strong>${UI.escapar(perfil.nombre)}</strong><small>${UI.escapar(Rol.nombre())}</small></span>
      <button class="perfil-salir" id="btnSalir" title="Cerrar sesión (${UI.escapar(perfil.correo || '')})">Salir</button>`;
    el.querySelector('#btnSalir').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });
  }

  async function iniciar (callback) {
    alListo = callback;
    if (!activa) {                      // modo local, como el prototipo original
      document.body.classList.remove('cargando');
      const el = document.querySelector('#estadoNube');
      if (el) { el.textContent = 'Modo local (sin base de datos)'; el.dataset.estado = 'local'; }
      return callback();
    }
    const esRecuperacion = /type=recovery/.test(location.hash);
    sb.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY') { pantallaAcceso('nueva'); return; }
      if (evento === 'SIGNED_IN' && sesion && !yaDentro && !esRecuperacion && document.body.classList.contains('sin-sesion')) {
        setTimeout(() => entrar(sesion.user), 0);
      }
    });
    const { data: { session } } = await sb.auth.getSession();
    if (esRecuperacion) return pantallaAcceso('nueva');
    if (session) await entrar(session.user);
    else pantallaAcceso('entrar');
  }

  return {
    activa, iniciar, sincronizar, recargar, listarPerfiles, asignarPerfil,
    perfil: () => perfil,
    nombreUsuario: () => (perfil && perfil.nombre) || 'Oscar Panadero'
  };
})();
