/* ===========================================================
   ui.js · Utilidades compartidas de interfaz
   Formato de números y fechas, toast, modal y fragmentos
   de HTML que se repiten en varias vistas.
   =========================================================== */

const UI = (function () {

  /* --- formato --------------------------------------------- */
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  function fecha (iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return `${String(d.getDate()).padStart(2,'0')} ${MESES[d.getMonth()]}`;
  }

  function fechaLarga (iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return `${String(d.getDate()).padStart(2,'0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* 18500000 -> "$18,5M" */
  function dinero (n) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1).replace('.', ',') + 'M';
    if (n >= 1000)    return '$' + Math.round(n / 1000) + 'K';
    return '$' + n;
  }

  function dineroLargo (n) {
    return '$' + n.toLocaleString('es-CO');
  }

  /* "Vencida hace 3 días" / "Hoy" / "En 5 días" */
  function vencimiento (iso) {
    const d = Estado.diasDesdeHoy(iso);
    if (d < -1) return `Vencida hace ${Math.abs(d)} días`;
    if (d === -1) return 'Vencida ayer';
    if (d === 0) return 'Vence hoy';
    if (d === 1) return 'Vence mañana';
    return `En ${d} días`;
  }

  function escapar (s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  /* --- fragmentos reutilizables ---------------------------- */
  function avatar (personaId) {
    const p = Estado.persona(personaId);
    if (!p) return '';
    return `<span class="mini-avatar ${p.color}">${p.iniciales}</span>`;
  }

  function personaLinea (personaId) {
    const p = Estado.persona(personaId);
    if (!p) return '<span class="persona">—</span>';
    const corto = p.nombre.split(' ')[0] + ' ' + p.nombre.split(' ')[1][0] + '.';
    return `<span class="persona">${avatar(personaId)} ${escapar(corto)}</span>`;
  }

  function chipEstado (sem) {
    return `<span class="chip ${sem.clave}"><i class="punto ${sem.clave}"></i>${sem.texto}</span>`;
  }

  function chipPrioridad (p) {
    const mapa = { alta:'rojo', media:'ambar', baja:'gris' };
    return `<span class="chip ${mapa[p] || 'gris'}">${p[0].toUpperCase() + p.slice(1)}</span>`;
  }

  function barra (pct, clase) {
    return `<div class="barra"><span class="${clase || ''}" style="width:${Math.min(100, pct)}%"></span></div>`;
  }

  /* [fondo, tinta, icono] de cada tipo de alerta */
  function estiloAlerta (tipo) {
    return ({
      vencida:    ['var(--rojo-claro)',  'var(--rojo)',    '!'],
      bloqueo:    ['var(--ambar-claro)', 'var(--ambar)',   '△'],
      factura:    ['#efebfb',            'var(--violeta)', '$'],
      horas:      ['var(--rojo-claro)',  'var(--rojo)',    '⏱'],
      costo:      ['var(--rojo-claro)',  'var(--rojo)',    '↓'],
      incidencia: ['var(--ambar-claro)', 'var(--ambar)',   '✱']
    })[tipo] || ['#eef1f6', '#5f6d85', '•'];
  }

  /* 0.6234 -> "0,62" */
  function indice (v) {
    return v === null || v === undefined ? '—' : v.toFixed(2).replace('.', ',');
  }

  function pct (v) {
    return Math.round(v) + '%';
  }

  function vacio (titulo, texto) {
    return `<div class="vacio"><strong>${escapar(titulo)}</strong>${escapar(texto || '')}</div>`;
  }

  /* --- toast ----------------------------------------------- */
  let temporizador;
  function toast (mensaje) {
    const el = document.querySelector('#toast');
    el.textContent = mensaje;
    el.classList.add('ver');
    clearTimeout(temporizador);
    temporizador = setTimeout(() => el.classList.remove('ver'), 2800);
  }

  /* --- modal ----------------------------------------------- */
  function modal (html, alAbrir) {
    const dlg = document.querySelector('#modal');
    dlg.innerHTML = html;
    dlg.showModal();
    dlg.querySelectorAll('[data-cerrar]').forEach(b =>
      b.addEventListener('click', () => dlg.close()));
    if (alAbrir) alAbrir(dlg);
    return dlg;
  }

  function cerrarModal () { document.querySelector('#modal').close(); }

  /* --- descarga de archivos (exportar reporte) -------------- */
  function descargar (nombre, contenido, tipo) {
    const blob = new Blob(['﻿' + contenido], { type: tipo || 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return { fecha, fechaLarga, dinero, dineroLargo, vencimiento, escapar,
           avatar, personaLinea, chipEstado, chipPrioridad, barra, vacio,
           estiloAlerta, indice, pct,
           toast, modal, cerrarModal, descargar };
})();
