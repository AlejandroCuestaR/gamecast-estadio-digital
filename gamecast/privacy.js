/* =========================================================
   GameCast — MODAL: POLÍTICA DE PRIVACIDAD (uso interno)
   Diálogo accesible abierto desde el pie de página. Autocontenido:
   no depende de otros scripts ni modifica datos de la app.
   · role="dialog" / aria-modal="true", enfoque gestionado y
     devuelto al disparador, trampa de foco (Tab/Shift+Tab),
     cierre con Esc, botón "X" o clic en el fondo.
========================================================= */
(function(){
  'use strict';

  var trigger = document.getElementById('privacyTrigger');
  var overlay = document.getElementById('privacyOverlay');
  var dialog = document.getElementById('privacyDialog');
  var closeBtn = document.getElementById('privacyClose');

  // No lanzar errores si falta algún elemento (por si el marcado cambia).
  if(!trigger || !overlay || !dialog){ return; }

  var lastFocused = null;
  var lastBodyOverflow = '';

  var FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getFocusable(){
    var nodes = dialog.querySelectorAll(FOCUSABLE_SELECTOR);
    return Array.prototype.filter.call(nodes, function(node){
      return node.offsetParent !== null || node === document.activeElement;
    });
  }

  function isOpen(){
    return !overlay.hidden;
  }

  function onKeydown(e){
    if(!isOpen()) return;

    if(e.key === 'Escape' || e.key === 'Esc'){
      e.preventDefault();
      closeDialog();
      return;
    }

    if(e.key === 'Tab'){
      var focusable = getFocusable();
      if(!focusable.length){
        e.preventDefault();
        dialog.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if(e.shiftKey && document.activeElement === first){
        e.preventDefault();
        last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault();
        first.focus();
      } else if(document.activeElement === overlay || document.activeElement === document.body){
        // El foco se salió del diálogo (p. ej. tras cerrar un selector); lo recuperamos.
        e.preventDefault();
        first.focus();
      }
    }
  }

  function onOverlayClick(e){
    // Cierra solo si el clic fue en el fondo, no dentro del propio diálogo.
    if(e.target === overlay){
      closeDialog();
    }
  }

  function openDialog(){
    if(isOpen()) return;

    lastFocused = document.activeElement;
    overlay.hidden = false;

    lastBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', onKeydown, true);

    var focusable = getFocusable();
    (focusable[0] || dialog).focus();
  }

  function closeDialog(){
    if(!isOpen()) return;

    overlay.hidden = true;
    document.body.style.overflow = lastBodyOverflow;

    document.removeEventListener('keydown', onKeydown, true);

    // Devolver el foco a lo que estaba enfocado antes de abrir; si no había nada
    // (document.body, p. ej. al abrir con ratón), volver al disparador para no
    // perder el foco fuera de contexto.
    var target = (lastFocused && lastFocused !== document.body &&
                  typeof lastFocused.focus === 'function') ? lastFocused : trigger;
    if(target && typeof target.focus === 'function'){ target.focus(); }
    lastFocused = null;
  }

  trigger.addEventListener('click', openDialog);
  if(closeBtn){ closeBtn.addEventListener('click', closeDialog); }
  overlay.addEventListener('click', onOverlayClick);

})();
