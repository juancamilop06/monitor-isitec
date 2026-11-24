/* ===========================================================
   datos.js · Datos semilla del monitor
   -----------------------------------------------------------
   Todo sale de aquí. Cuando conectemos las fuentes reales de
   ISITEC (sistema contable y registro de horas), este archivo
   se reemplaza por las llamadas al API y el resto de la app
   no cambia, porque siempre lee a través de estado.js.
   =========================================================== */

/* Fechas relativas a hoy, para que la demo siempre tenga
   sentido sin importar el día en que se presente. */
function enDias(n){
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}

const DATOS_SEMILLA = {
  version: 4,

  personas: [
    { id:'ap', nombre:'Angie Polanía',  iniciales:'AP', color:'c-coral',   rol:'Consultora sénior',  horasDisponibles:160 },
    { id:'jr', nombre:'Julián Ramos',   iniciales:'JR', color:'c-morado',  rol:'Consultor SAP',      horasDisponibles:160 },
    { id:'js', nombre:'José Parra',     iniciales:'JP', color:'c-azul',    rol:'Analista de datos',  horasDisponibles:120 },
    { id:'cp', nombre:'Camilo Panadero',iniciales:'CP', color:'c-verde',   rol:'Gerente de proyecto',horasDisponibles:160 },
    { id:'ss', nombre:'Sergio Soler',   iniciales:'SS', color:'c-naranja', rol:'Consultor júnior',   horasDisponibles:160 }
  ],

  clientes: [
    { id:'natura', nombre:'Natura Colombia' },
    { id:'cafam',  nombre:'Cafam' },
    { id:'andes',  nombre:'Andes Logistics' },
    { id:'monge',  nombre:'Grupo Monge' }
  ],

  /* avanceReal lo reporta el líder del proyecto.
     El avance esperado y la proyección de cierre los calcula
     estado.js a partir de las fechas.
     costoPlaneado (presupuesto de costo total) y costoReal (costo
     ejecutado a la fecha) vendrán del sistema contable; por ahora
     son datos de ejemplo, "Por validar" con ISITEC. */
  proyectos: [
    { id:'portal', nombre:'Portal de autogestión', clienteId:'natura', liderId:'ap',
      inicio:enDias(-95), finPlan:enDias(35), avanceReal:78,
      horasPresupuesto:1200, valorContrato:180000000,
      costoPlaneado:126000000, costoReal:92000000 },

    { id:'erp', nombre:'Implementación ERP', clienteId:'cafam', liderId:'jr',
      inicio:enDias(-130), finPlan:enDias(25), avanceReal:72,
      horasPresupuesto:2400, valorContrato:420000000,
      costoPlaneado:300000000, costoReal:205000000 },

    { id:'datos', nombre:'Migración de datos', clienteId:'andes', liderId:'js',
      inicio:enDias(-70), finPlan:enDias(10), avanceReal:34,
      horasPresupuesto:800, valorContrato:95000000,
      costoPlaneado:68000000, costoReal:36000000 },

    { id:'planeacion', nombre:'Planeación financiera Prophix', clienteId:'monge', liderId:'cp',
      inicio:enDias(-40), finPlan:enDias(80), avanceReal:31,
      horasPresupuesto:1500, valorContrato:260000000,
      costoPlaneado:182000000, costoReal:50000000 }
  ],

  /* Una tarea en riesgo guarda SIEMPRE su causa. Son las tres
     que definió Oscar Panadero en la validación del 4 de nov:
     'sin_avance' | 'espera_cliente' | 'espera_proveedor'      */
  tareas: [
    { id:'t1', proyectoId:'erp', nombre:'Validar catálogo de productos', responsableId:'jr',
      fechaLimite:enDias(-3), prioridad:'alta', estado:'pendiente',
      riesgo:{ causa:'sin_avance', mitigacion:'Revisar el catálogo con el líder del proyecto y acordar una nueva fecha de validación.' }, esIncidencia:false },

    { id:'t2', proyectoId:'datos', nombre:'Confirmar fuentes de migración', responsableId:'js',
      fechaLimite:enDias(0), prioridad:'alta', estado:'pendiente',
      riesgo:{ causa:'espera_cliente', mitigacion:'Escalar al patrocinador del cliente y confirmar las fuentes antes de la próxima carga.' },
      esIncidencia:false },

    { id:'t3', proyectoId:'portal', nombre:'Enviar acta de comité', responsableId:'ap',
      fechaLimite:enDias(-5), prioridad:'media', estado:'pendiente', riesgo:null, esIncidencia:false },

    { id:'t4', proyectoId:'erp', nombre:'Pruebas de integración con nómina', responsableId:'ss',
      fechaLimite:enDias(-1), prioridad:'alta', estado:'pendiente',
      riesgo:{ causa:'espera_proveedor', mitigacion:'Confirmar la entrega del archivo del proveedor y reservar una sesión de pruebas.' }, esIncidencia:false },

    { id:'t5', proyectoId:'erp', nombre:'Corregir error en carga de terceros', responsableId:'jr',
      fechaLimite:enDias(-2), prioridad:'alta', estado:'pendiente', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-9), fechaCierre:null, horas:6 },

    { id:'t6', proyectoId:'portal', nombre:'Capacitar usuarios clave', responsableId:'ap',
      fechaLimite:enDias(6), prioridad:'media', estado:'pendiente', riesgo:null, esIncidencia:false },

    { id:'t7', proyectoId:'datos', nombre:'Mapear tablas maestras', responsableId:'js',
      fechaLimite:enDias(-8), prioridad:'alta', estado:'completada', riesgo:null, esIncidencia:false },

    { id:'t8', proyectoId:'planeacion', nombre:'Levantar modelo de presupuesto', responsableId:'cp',
      fechaLimite:enDias(9), prioridad:'media', estado:'pendiente', riesgo:null, esIncidencia:false },

    { id:'t9', proyectoId:'planeacion', nombre:'Definir jerarquía de centros de costo', responsableId:'ss',
      fechaLimite:enDias(14), prioridad:'baja', estado:'pendiente', riesgo:null, esIncidencia:false },

    { id:'t10', proyectoId:'portal', nombre:'Se agotó el tiempo de espera al generar reportes', responsableId:'ap',
      fechaLimite:enDias(2), prioridad:'alta', estado:'pendiente', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-4), fechaCierre:null, horas:3 },

    { id:'t11', proyectoId:'datos', nombre:'Validar integridad de datos migrados', responsableId:'js',
      fechaLimite:enDias(4), prioridad:'alta', estado:'pendiente', riesgo:null, esIncidencia:false },

    { id:'t12', proyectoId:'erp', nombre:'Documentar parametrización final', responsableId:'ss',
      fechaLimite:enDias(12), prioridad:'baja', estado:'pendiente', riesgo:null, esIncidencia:false },

    /* Incidencias: tareas con esIncidencia. Guardan cuándo se
       reportaron, cuándo se cerraron y cuántas horas tomó
       atenderlas (indicador de calidad que pidió Oscar). */
    { id:'i1', proyectoId:'portal', nombre:'Error de permisos en perfil aprobador', responsableId:'ap',
      fechaLimite:enDias(-47), prioridad:'media', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-52), fechaCierre:enDias(-47), horas:8 },

    { id:'i2', proyectoId:'erp', nombre:'Descuadre en asiento contable de nómina', responsableId:'jr',
      fechaLimite:enDias(-38), prioridad:'alta', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-45), fechaCierre:enDias(-38), horas:14 },

    { id:'i3', proyectoId:'erp', nombre:'Campo NIT no acepta dígito de verificación', responsableId:'ss',
      fechaLimite:enDias(-39), prioridad:'baja', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-40), fechaCierre:enDias(-39), horas:3 },

    { id:'i4', proyectoId:'datos', nombre:'Duplicados en maestro de clientes', responsableId:'js',
      fechaLimite:enDias(-26), prioridad:'alta', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-33), fechaCierre:enDias(-26), horas:12 },

    { id:'i5', proyectoId:'portal', nombre:'Correo de notificación sin plantilla', responsableId:'ap',
      fechaLimite:enDias(-29), prioridad:'baja', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-30), fechaCierre:enDias(-29), horas:2 },

    { id:'i6', proyectoId:'erp', nombre:'Interfaz bancaria rechaza archivo plano', responsableId:'jr',
      fechaLimite:enDias(-17), prioridad:'alta', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-26), fechaCierre:enDias(-17), horas:18 },

    { id:'i7', proyectoId:'datos', nombre:'Fechas migradas con formato incorrecto', responsableId:'js',
      fechaLimite:enDias(-16), prioridad:'media', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-20), fechaCierre:enDias(-16), horas:9 },

    { id:'i8', proyectoId:'portal', nombre:'Lentitud en consulta de pedidos', responsableId:'cp',
      fechaLimite:enDias(-10), prioridad:'media', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-17), fechaCierre:enDias(-10), horas:7 },

    { id:'i9', proyectoId:'datos', nombre:'Registros huérfanos tras la carga', responsableId:'js',
      fechaLimite:enDias(-1), prioridad:'alta', estado:'pendiente', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-12), fechaCierre:null, horas:10 },

    { id:'i10', proyectoId:'erp', nombre:'Reporte de cartera con totales errados', responsableId:'ss',
      fechaLimite:enDias(-3), prioridad:'media', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-8), fechaCierre:enDias(-3), horas:5 },

    { id:'i11', proyectoId:'planeacion', nombre:'Error en fórmula de distribución de gastos', responsableId:'cp',
      fechaLimite:enDias(-4), prioridad:'media', estado:'completada', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-6), fechaCierre:enDias(-4), horas:4 },

    { id:'i12', proyectoId:'datos', nombre:'Pérdida de decimales en saldos migrados', responsableId:'ss',
      fechaLimite:enDias(2), prioridad:'alta', estado:'pendiente', riesgo:null, esIncidencia:true,
      fechaReporte:enDias(-3), fechaCierre:null, horas:2 }
  ],

  /* Insumo del módulo de facturación (pendiente: ver TODO.md) */
  facturas: [
    { id:'f1', proyectoId:'erp',        numero:'FE-2041', monto:18500000, emision:enDias(-40), vencimiento:enDias(-10), estado:'pendiente' },
    { id:'f2', proyectoId:'portal',     numero:'FE-2048', monto:12300000, emision:enDias(-25), vencimiento:enDias(5),  estado:'pendiente' },
    { id:'f3', proyectoId:'datos',      numero:'FE-2052', monto:9400000,  emision:enDias(-18), vencimiento:enDias(12), estado:'pendiente' },
    { id:'f4', proyectoId:'planeacion', numero:'FE-2060', monto:8000000,  emision:enDias(-6),  vencimiento:enDias(24), estado:'pendiente' },
    { id:'f5', proyectoId:'portal',     numero:'FE-2033', monto:15000000, emision:enDias(-70), vencimiento:enDias(-40), estado:'pagada' }
  ],

  /* Registro de horas (Clockify, hoy en migración).
     'mes' indica el periodo: 0 = mes en curso, -1 = mes anterior...
     La capacidad de cada persona (horasDisponibles) es mensual, así
     que la ocupación se mide solo contra el mes en curso; el consumo
     del proyecto se mide con todo el acumulado.
     'facturable' es la bandera que Oscar pidió para alimentar el ingreso. */
  registroHoras: [
    /* mes en curso */
    { id:'h1',  mes:0,  personaId:'ap', proyectoId:'portal',     horas:96,  facturable:true  },
    { id:'h2',  mes:0,  personaId:'ap', proyectoId:'portal',     horas:14,  facturable:false },
    { id:'h3',  mes:0,  personaId:'jr', proyectoId:'erp',        horas:132, facturable:true  },
    { id:'h4',  mes:0,  personaId:'jr', proyectoId:'erp',        horas:21,  facturable:false },
    { id:'h5',  mes:0,  personaId:'js', proyectoId:'datos',      horas:88,  facturable:true  },
    { id:'h6',  mes:0,  personaId:'cp', proyectoId:'planeacion', horas:54,  facturable:true  },
    { id:'h7',  mes:0,  personaId:'ss', proyectoId:'erp',        horas:71,  facturable:true  },
    { id:'h8',  mes:0,  personaId:'ss', proyectoId:'planeacion', horas:26,  facturable:true  },

    /* mes -1 */
    { id:'h9',  mes:-1, personaId:'jr', proyectoId:'erp',        horas:125, facturable:true  },
    { id:'h10', mes:-1, personaId:'jr', proyectoId:'erp',        horas:15,  facturable:false },
    { id:'h11', mes:-1, personaId:'jr', proyectoId:'datos',      horas:20,  facturable:false },
    { id:'h12', mes:-1, personaId:'ss', proyectoId:'erp',        horas:64,  facturable:true  },
    { id:'h13', mes:-1, personaId:'ss', proyectoId:'datos',      horas:50,  facturable:true  },
    { id:'h14', mes:-1, personaId:'ss', proyectoId:'planeacion', horas:46,  facturable:true  },
    { id:'h15', mes:-1, personaId:'ap', proyectoId:'portal',     horas:138, facturable:true  },
    { id:'h16', mes:-1, personaId:'ap', proyectoId:'portal',     horas:12,  facturable:false },
    { id:'h17', mes:-1, personaId:'cp', proyectoId:'portal',     horas:47,  facturable:true  },
    { id:'h18', mes:-1, personaId:'cp', proyectoId:'planeacion', horas:110, facturable:true  },
    { id:'h19', mes:-1, personaId:'js', proyectoId:'datos',      horas:105, facturable:true  },
    { id:'h20', mes:-1, personaId:'js', proyectoId:'datos',      horas:15,  facturable:false },

    /* mes -2 */
    { id:'h21', mes:-2, personaId:'jr', proyectoId:'erp',        horas:145, facturable:true  },
    { id:'h22', mes:-2, personaId:'jr', proyectoId:'erp',        horas:12,  facturable:false },
    { id:'h23', mes:-2, personaId:'ss', proyectoId:'erp',        horas:100, facturable:true  },
    { id:'h24', mes:-2, personaId:'ap', proyectoId:'portal',     horas:140, facturable:true  },
    { id:'h25', mes:-2, personaId:'ap', proyectoId:'portal',     horas:15,  facturable:false },
    { id:'h26', mes:-2, personaId:'cp', proyectoId:'portal',     horas:60,  facturable:true  },
    { id:'h27', mes:-2, personaId:'cp', proyectoId:'datos',      horas:50,  facturable:true  },
    { id:'h28', mes:-2, personaId:'js', proyectoId:'datos',      horas:110, facturable:true  },
    { id:'h29', mes:-2, personaId:'js', proyectoId:'datos',      horas:10,  facturable:false },

    /* mes -3 */
    { id:'h30', mes:-3, personaId:'jr', proyectoId:'erp',        horas:150, facturable:true  },
    { id:'h31', mes:-3, personaId:'ss', proyectoId:'erp',        horas:105, facturable:true  },
    { id:'h32', mes:-3, personaId:'ap', proyectoId:'portal',     horas:150, facturable:true  },
    { id:'h33', mes:-3, personaId:'cp', proyectoId:'portal',     horas:60,  facturable:true  },
    { id:'h34', mes:-3, personaId:'js', proyectoId:'portal',     horas:60,  facturable:true  },

    /* mes -4 */
    { id:'h35', mes:-4, personaId:'jr', proyectoId:'erp',        horas:140, facturable:true  },
    { id:'h36', mes:-4, personaId:'ss', proyectoId:'erp',        horas:120, facturable:true  },
    { id:'h37', mes:-4, personaId:'ap', proyectoId:'erp',        horas:140, facturable:true  },
    { id:'h38', mes:-4, personaId:'js', proyectoId:'erp',        horas:100, facturable:true  }
  ],

  /* Registro de los reportes exportados ("queda registro de la acción",
     journey futuro, actividad 6) */
  reportes: [
    { id:'r1', fecha:enDias(-7), alcance:'todos', formato:'pdf', interno:true }
  ],

  /* Preguntas que el cliente le hace al líder desde su portal */
  preguntas: [
    { id:'q1', proyectoId:'erp', autorNombre:'Cafam', texto:'¿Cuándo empiezan las pruebas con los usuarios de nómina?',
      fecha:enDias(-6), respuesta:'Arrancan apenas el proveedor entregue el archivo de interfaz; estimamos la próxima semana.',
      respondidaPor:'Julián Ramos', fechaRespuesta:enDias(-5), estado:'respondida' },
    { id:'q2', proyectoId:'datos', autorNombre:'Andes Logistics', texto:'¿El retraso en la migración afecta la fecha de salida en vivo?',
      fecha:enDias(-1), respuesta:null, respondidaPor:null, fechaRespuesta:null, estado:'abierta' }
  ],

  /* ids de alertas que el usuario ya marcó como atendidas */
  alertasAtendidas: []
};
