/* ===========================================================
   permisos.js · Qué puede hacer cada tipo de usuario
   -----------------------------------------------------------
   lider       gestiona todo: proyectos, tareas, facturación,
               horas, alertas, preguntas y accesos del equipo.
   trabajador  ve los proyectos donde participa, completa sus
               tareas, reporta incidencias y registra horas.
   cliente     ve el avance de sus proyectos, las entregas, las
               incidencias y sus facturas, y le hace preguntas
               al líder.
   La base de datos aplica las mismas reglas (RLS en
   supabase/schema.sql); aquí solo se decide qué se muestra.
   En modo local se puede probar con ?rol=trabajador o ?rol=cliente.
   =========================================================== */

const Rol = (function () {
  const NOMBRES = { lider: 'Líder de proyecto', trabajador: 'Trabajador', cliente: 'Cliente' };
  const nube = () => (typeof Nube !== 'undefined' && Nube.activa) ? Nube : null;

  let forzado = null;
  try {
    const p = new URLSearchParams(location.search).get('rol');
    if (p && NOMBRES[p]) forzado = p;
  } catch (e) { /* sin parámetros */ }

  function tipo () {
    const n = nube();
    if (n) return (n.perfil() && n.perfil().tipo) || 'trabajador';
    return forzado || 'lider';
  }
  function persona () {
    const n = nube();
    if (n) return n.perfil() ? n.perfil().persona_id : null;
    return tipo() === 'trabajador' ? 'jr' : null;          // demo local
  }
  function cliente () {
    const n = nube();
    if (n) return n.perfil() ? n.perfil().cliente_id : null;
    return tipo() === 'cliente' ? 'cafam' : null;          // demo local
  }

  const esLider      = () => tipo() === 'lider';
  const esTrabajador = () => tipo() === 'trabajador';
  const esCliente    = () => tipo() === 'cliente';

  /* Pantallas permitidas por tipo */
  const RUTAS = {
    lider:      ['resumen','proyectos','proyecto','alertas','facturacion','horas','calidad','preguntas','equipo'],
    trabajador: ['resumen','proyectos','proyecto','calidad'],
    cliente:    ['resumen','proyectos','proyecto','preguntas']
  };
  const puedeVer = ruta => (RUTAS[tipo()] || []).includes(ruta);

  /* El trabajador solo cambia sus propias tareas */
  const puedeEditarTarea = t => esLider() || (esTrabajador() && !!t && t.responsableId === persona());

  return {
    NOMBRES, tipo, persona, cliente, esLider, esTrabajador, esCliente,
    puedeVer, puedeEditarTarea,
    nombre: () => NOMBRES[tipo()],
    local: () => !nube()
  };
})();
