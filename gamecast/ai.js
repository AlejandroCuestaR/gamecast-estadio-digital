/* =========================================================
   GameCast — ASISTENTE IA LOCAL (modelo ligero en el navegador vía WebLLM)
   Corre 100% en el dispositivo con WebGPU. El modelo se descarga
   bajo demanda la primera vez y luego queda en caché.

   Qué hace el asistente:
   · CHAT con memoria: puedes hacer preguntas de seguimiento.
   · RESUELVE DUDAS sobre videojuegos (comparar, duración,
     dificultad, plataformas, co-op, parecidos, para niños…),
     fundamentadas en los datos reales del catálogo (mini-RAG).
   · USA TU CONTEXTO: respuestas del cuestionario y favoritos.
   · ACCIONABLE: cada juego que menciona se muestra como tarjeta
     real (portada + enlace a la tienda + botón de favorito),
     conectada con el resto de la app vía window.GAMECAST_API.
========================================================= */
(function(){
  'use strict';

  // Modelo ligero por defecto (descarga rápida). Ver tabla AI_MODELS abajo.
  var MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  var engine = null, loading = false, ready = false, greeted = false;
  var history = []; // memoria de la conversación: {role, content}

  /* ---------- Modelo de IA local (WebLLM) ----------
     Priorizamos una DESCARGA RÁPIDA: por defecto un modelo ligero multilingüe
     (habla español) con ventana de contexto 4096 —suficiente para el prompt del
     chat (fichas + sistema + historial)—. Ya NO se auto-escala a modelos de
     varios GB en GPUs potentes: eso ralentizaba la primera carga. IDs y tamaños
     verificados contra el prebuiltAppConfig oficial de WebLLM (config.ts). */
  var AI_MODELS = {
    // ~0,8 GB. Multilingüe oficial de Meta (español sólido). Buen equilibrio.
    "Llama-3.2-1B-Instruct-q4f16_1-MLC" : { low: true, gb: 0.8 },
    // ~0,4 GB. Respaldo aún más ligero (Qwen2.5 multilingüe) si el anterior no cupo.
    "Qwen2.5-0.5B-Instruct-q4f16_1-MLC" : { low: true, gb: 0.4 }
  };
  var MODEL_DEFAULT = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  var MODEL_LOW     = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

  async function detectGpu(){
    try{
      if(!navigator.gpu || !navigator.gpu.requestAdapter) return null;
      var adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if(!adapter) return null;
      var info = adapter.info || null;
      if(!info && typeof adapter.requestAdapterInfo === "function"){
        try{ info = await adapter.requestAdapterInfo(); }catch(e){ info = null; }
      }
      var L = adapter.limits || {};
      return {
        description: info && info.description ? String(info.description) : "",
        maxStorageBufferBindingSize: L.maxStorageBufferBindingSize || 0,
        maxBufferSize: L.maxBufferSize || 0
      };
    }catch(e){ return null; }
  }

  // Elige el modelo. Por defecto el ligero (~0,8 GB) para que la descarga sea
  // rápida; solo baja al mínimo (~0,4 GB) si la GPU es muy limitada o no se pudo
  // sondear. Ambos caben en cualquier GPU con WebGPU, así que NO escalamos hacia
  // arriba (era lo que hacía la primera carga lenta).
  async function pickModel(){
    var gpu = await detectGpu();
    function GiB(b){ return (b || 0) / 1073741824; }
    function pack(id, reason){
      var fb = (id === MODEL_DEFAULT) ? MODEL_LOW : MODEL_DEFAULT;
      var meta = AI_MODELS[id] || {};
      return { model: id, lowResource: !!meta.low, fallback: fb, reason: reason, sizeGb: meta.gb || null };
    }
    if(!gpu) return pack(MODEL_LOW, "sin sondeo de GPU: modelo mínimo");
    var buffer = GiB(gpu.maxBufferSize);
    if(buffer && buffer < 1.0){
      return pack(MODEL_LOW, "GPU muy limitada (buffer~" + buffer.toFixed(1) + " GiB): modelo mínimo");
    }
    return pack(MODEL_DEFAULT, "modelo ligero por defecto" + (gpu.description ? " (" + gpu.description + ")" : ""));
  }

  function $(id){ return document.getElementById(id); }
  function norm(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]; }); }
  function api(){ return window.GAMECAST_API || null; }

  function setStatus(msg, show){
    var el = $("aiStatus");
    if(!el) return;
    el.hidden = (show === false);
    el.textContent = msg || "";
  }
  // Refleja el estado de la IA en la insignia de la cabecera del chat (visible
  // al abrir el widget), para ver el progreso.
  function setBadge(text){ var b = $("aiBadge"); if(b) b.textContent = text; }

  // Estado del botón flotante: "loading" (punto cian parpadeando) /
  // "ready" (punto verde) / vacío.
  function setLauncher(state){
    var l = $("aiLauncher"); if(!l) return;
    l.classList.toggle("is-loading", state === "loading");
    l.classList.toggle("is-ready", state === "ready");
  }

  // Abre o cierra la ventana del chatbot.
  function setOpen(open){
    var win = $("aiWindow"), launcher = $("aiLauncher");
    if(!win) return;
    win.hidden = !open;
    if(launcher) launcher.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("ai-open", open);
    if(open){
      var inp = $("aiInput"), chat = $("aiChat");
      if(inp && !inp.disabled && chat && !chat.hidden) inp.focus();
      scrollDown();
    }
  }

  /* ---------- mini-RAG: candidatos del catálogo ---------- */

  // Selecciona ~22 juegos candidatos según el texto de contexto (consulta +
  // conversación reciente + preferencias). Así la IA funciona bien aunque
  // el catálogo tenga miles de juegos: solo "ve" lo relevante.
  function shortlist(context){
    var games = (window.GAMECAST_DATA && window.GAMECAST_DATA.games) || [];
    var qTokens = norm(context).split(/[^a-z0-9ñ]+/).filter(function(t){ return t.length > 2; });
    function scoreGame(g){
      // Memoiza el "haystack" normalizado por juego: con miles de juegos, evita
      // re-normalizar todo el catálogo en cada mensaje (jank en el hilo principal).
      if(g.__hay === undefined){
        g.__hay = norm([g.title, (g.genres||[]).join(" "), (g.platforms||[]).join(" "), (g.mood||[]).join(" "), g.difficulty, (g.playstyle||[]).join(" ")].join(" "));
      }
      var hay = g.__hay, s = 0;
      qTokens.forEach(function(t){ if(hay.indexOf(t) !== -1) s++; });
      return s;
    }
    var scored = games.map(function(g){ return { g:g, s:scoreGame(g) }; });
    scored.sort(function(a,b){ return b.s - a.s; });
    var top = scored.filter(function(x){ return x.s > 0; }).slice(0, 22);
    if(top.length < 8){ top = scored.slice(0, 16); } // sin coincidencias claras: ofrece variedad
    return top.map(function(x){ return x.g; });
  }

  // Ficha compacta de cada candidato para que el modelo pueda razonar dudas.
  function catalogText(games){
    return games.map(function(g, i){
      var d = g.description ? (" — " + String(g.description).slice(0, 90)) : "";
      return (i + 1) + ". " + g.title +
        " [géneros: " + (g.genres||[]).join("/") +
        "; plataformas: " + (g.platforms||[]).join(",") +
        "; modo: " + (g.playstyle||[]).join(",") +
        (g.mood && g.mood.length ? "; experiencia: " + g.mood.join(",") : "") +
        "; dificultad: " + g.difficulty + "]" + d;
    }).join("\n");
  }

  // Detecta qué candidatos aparecen en la respuesta (coincidencia por límite de
  // palabra, no simple subcadena) para mostrarlos como tarjetas accionables.
  function isWordChar(ch){ return /[a-z0-9ñ]/.test(ch); }
  // Primer índice donde `title` aparece en `hay` flanqueado por borde/no-letra
  // (coincidencia por palabra completa), o -1 si no aparece.
  function titleIndexIn(hay, title){
    var from = 0, idx;
    while((idx = hay.indexOf(title, from)) !== -1){
      var before = idx > 0 ? hay.charAt(idx - 1) : "";
      var after = (idx + title.length) < hay.length ? hay.charAt(idx + title.length) : "";
      if(!isWordChar(before) && !isWordChar(after)) return idx; // flanqueado por no-letra/borde
      from = idx + 1;
    }
    return -1;
  }
  function mentionedGames(reply, candidates){
    var r = norm(reply);
    var seen = {}, hits = [];
    // Procesamos los títulos de MAYOR a menor longitud y "consumimos" (enmascaramos
    // con espacios) el tramo emparejado. Así, si la respuesta dice "Counter-Strike 2",
    // casa ese título y el prefijo "Counter-Strike" ya no re-empareja ese mismo tramo
    // (pero sí casaría una mención independiente de "Counter-Strike" en otra parte).
    var ordered = candidates.slice().sort(function(a, b){ return norm(b.title).length - norm(a.title).length; });
    ordered.forEach(function(g){
      if(seen[g.id]) return;
      var t = norm(g.title);
      // Títulos de UNA sola palabra exigen >=4 caracteres para evitar falsos
      // positivos (p. ej. "Ori" dentro de "historia"); los de varias palabras, >=3.
      var minLen = (t.indexOf(" ") === -1) ? 4 : 3;
      if(t.length < minLen) return;
      var at = titleIndexIn(r, t);
      if(at !== -1){
        seen[g.id] = 1;
        hits.push({ g:g, at:at });
        // Enmascara el tramo para que no lo reclame otro título más corto.
        r = r.slice(0, at) + new Array(t.length + 1).join(" ") + r.slice(at + t.length);
      }
    });
    // Orden final: tal como aparecen mencionados en la respuesta.
    hits.sort(function(a, b){ return a.at - b.at; });
    return hits.slice(0, 6).map(function(h){ return h.g; });
  }

  /* ---------- Interfaz de chat ---------- */

  function scrollDown(){ var m = $("aiMessages"); if(m) m.scrollTop = m.scrollHeight; }

  // Crea una burbuja y devuelve su elemento de texto (su .parentNode es el
  // contenedor donde luego se cuelgan las tarjetas).
  function addBubble(role, text){
    var wrap = document.createElement("div");
    wrap.className = "ai-msg ai-msg--" + role;
    var t = document.createElement("div");
    t.className = "ai-text";
    t.textContent = text || "";
    wrap.appendChild(t);
    var box = $("aiMessages");
    if(box) box.appendChild(wrap);
    scrollDown();
    return t;
  }

  function cardMarkup(g){
    var A = api();
    var link = A ? A.gameLink(g) : { url:"#", label:"Ver" };
    var icon = A ? A.genreIcon(g.genres && g.genres[0]) : "🎮";
    var fav = A ? A.isFavorite(g.id) : false;
    var hue = (g.id * 47) % 360;
    var img = g.image
      ? '<img class="aic-img" src="' + esc(g.image) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">'
      : "";
    return (
      '<div class="ai-card" style="--hue:' + hue + '">' +
        '<div class="aic-thumb"><span class="aic-icon" aria-hidden="true">' + icon + "</span>" + img + "</div>" +
        '<div class="aic-info">' +
          '<a class="aic-title" href="' + esc(link.url) + '" target="_blank" rel="noopener noreferrer">' + esc(g.title) + "</a>" +
          '<p class="aic-meta">' + esc((g.genres||[]).slice(0,2).join(" · ")) + "</p>" +
          '<div class="aic-actions">' +
            '<a class="aic-link" href="' + esc(link.url) + '" target="_blank" rel="noopener noreferrer">' + esc(link.label) + "</a>" +
            '<button type="button" class="aic-fav' + (fav ? " is-fav" : "") + '" data-fav-id="' + esc(String(g.id)) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? "Quitar de" : "Añadir a") + " favoritos" + '" title="Favorito">♥</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function appendCards(wrap, games){
    if(!wrap || !games.length) return;
    var box = document.createElement("div");
    box.className = "ai-cards";
    box.innerHTML = games.map(cardMarkup).join("");
    wrap.appendChild(box);
    scrollDown();
  }

  // Preguntas rápidas sugeridas; la primera depende del cuestionario.
  function suggestions(){
    var A = api();
    var list = [];
    if(A && A.hasAnswers && A.hasAnswers()) list.push("Recomiéndame según mis respuestas");
    list = list.concat([
      "Algo corto y relajante para hoy",
      "Juegos para jugar con amigos",
      "¿Qué hay parecido a Zelda?",
      "Un buen RPG con buena historia"
    ]);
    return list.slice(0, 5);
  }
  function renderSuggest(){
    var box = $("aiSuggest"); if(!box) return;
    box.innerHTML = suggestions().map(function(s){
      return '<button type="button" class="ai-chip" data-q="' + esc(s) + '">' + esc(s) + "</button>";
    }).join("");
    box.hidden = false;
  }
  function hideSuggest(){ var b = $("aiSuggest"); if(b) b.hidden = true; }

  function setComposerEnabled(on){
    var s = $("aiSend"), i = $("aiInput");
    if(s) s.disabled = !on;
    if(i) i.disabled = !on;
  }
  function autoGrow(el){
    if(!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  /* ---------- Motor WebLLM ---------- */

  async function createEngine(mod){
    var progress = function(p){
      var txt = p && p.text ? p.text : (Math.round(((p && p.progress) || 0) * 100) + "%");
      setStatus("Cargando modelo: " + txt, true);
      var pct = p && typeof p.progress === "number" ? Math.round(p.progress * 100) : null;
      setBadge(pct !== null && pct < 100 ? "IA · " + pct + "%" : "IA · cargando…");
    };
    // Preferimos un Web Worker: descarga, compilación e inferencia en un hilo
    // aparte, sin afectar el rendimiento ni la fluidez de la página.
    var worker = null;
    if(typeof Worker !== "undefined" && mod.CreateWebWorkerMLCEngine){
      try{
        var code = 'import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm@0.2.86";' +
                   'const h = new WebWorkerMLCEngineHandler(); self.onmessage = function(e){ h.onmessage(e); };';
        var url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
        worker = new Worker(url, { type: "module" });
        setTimeout(function(){ try{ URL.revokeObjectURL(url); }catch(e){} }, 30000); // libera el Blob URL
        return await mod.CreateWebWorkerMLCEngine(worker, MODEL, { initProgressCallback: progress });
      }catch(e){
        // El worker falló: termínalo para no fugarlo ni dejar VRAM retenida.
        // Caemos al hilo principal (resiliencia ante fallos estructurales del
        // worker, p. ej. CSP). Si fue OOM, este intento también fallará y
        // activate() reintentará con un modelo más ligero.
        try{ if(worker) worker.terminate(); }catch(_){}
      }
    }
    // Respaldo en el hilo principal (Worker no soportado o falló al crearse).
    return await mod.CreateMLCEngine(MODEL, { initProgressCallback: progress });
  }

  async function activate(auto){
    if(loading || ready) return;
    if(!navigator.gpu){
      if(!auto) setStatus("Tu navegador no tiene WebGPU disponible. Usa Chrome o Edge actualizados (y hardware compatible) para activar la IA local.", true);
      setBadge("IA · no disponible");
      return;
    }
    loading = true;
    setLauncher("loading");
    var btn = $("aiActivate");
    if(btn){ btn.disabled = true; btn.textContent = "Cargando IA…"; }
    setStatus("Cargando el modelo de IA… la primera vez se descarga (~0,8 GB); después queda en caché y abre al instante.", true);
    setBadge("IA · cargando…");
    try{
      // Versión FIJADA de web-llm (@0.2.86, última estable verificada que incluye
      // los model-ids Llama-3.2-1B y Qwen2.5-0.5B). Debe coincidir con la del
      // worker de arriba para cargar el mismo build. Evita que un release roto
      // de esm.run tumbe el chat.
      var mod = await import("https://esm.run/@mlc-ai/web-llm@0.2.86");
      var choice = await pickModel();
      MODEL = choice.model;
      console.log("[GameCast IA] Modelo:", MODEL, "·", choice.reason, "· respaldo=" + choice.fallback);
      // Aviso de descarga con el tamaño REAL del modelo elegido.
      var gbTxt = choice.sizeGb ? ("~" + String(choice.sizeGb).replace(".", ",") + " GB") : "menos de 1 GB";
      setStatus("Cargando el modelo de IA… la primera vez se descarga (" + gbTxt + "); después queda en caché y abre al instante.", true);
      try{
        engine = await createEngine(mod);
      }catch(err){
        // Si el modelo elegido no cupo (VRAM/OOM), reintenta con uno más ligero.
        console.warn("[GameCast IA] Falló " + MODEL + " (" + (err && err.message ? err.message : err) + "). Reintentando con " + choice.fallback);
        MODEL = choice.fallback;
        setStatus("Ese modelo no cupo; reintentando con una versión más ligera…", true);
        engine = await createEngine(mod);
      }
      ready = true;
      setStatus("", false);
      setBadge("IA · listo ✓");
      setLauncher("ready");
      if(btn) btn.hidden = true;
      var chat = $("aiChat"); if(chat) chat.hidden = false;
      if(!greeted){
        greeted = true;
        addBubble("assistant", "¡Listo! Soy tu asistente de GameCast 🎮. Pregúntame lo que quieras sobre juegos (comparaciones, duración, dificultad, dónde jugarlos…) o pídeme recomendaciones. Cada juego que mencione te aparecerá como tarjeta con enlace.");
        renderSuggest();
      }
      var inp = $("aiInput"); if(inp) inp.focus();
    }catch(e){
      setLauncher("");
      if(auto){
        // La precarga automática no debe molestar: recupera en silencio para que
        // el usuario pueda activarla a mano cuando abra el chat.
        setBadge("IA · pulsa activar");
        setStatus("", false);
        if(btn){ btn.disabled = false; btn.textContent = "Activar IA (descargar modelo)"; }
      } else {
        setStatus("No se pudo cargar la IA: " + (e && e.message ? e.message : e), true);
        setBadge("IA · error");
        if(btn){ btn.disabled = false; btn.textContent = "Reintentar activar IA"; }
      }
    }finally{
      loading = false;
    }
  }

  /* ---------- Conversación ---------- */

  async function ask(text){
    if(!ready){ setStatus("Primero pulsa «Activar IA».", true); return; }
    var input = $("aiInput");
    var q = (text != null ? text : (input && input.value) || "").trim();
    if(!q) return;

    if(input){ input.value = ""; autoGrow(input); }
    hideSuggest();
    setComposerEnabled(false);
    addBubble("user", q);

    // Contexto para el mini-RAG: consulta + últimos turnos + preferencias.
    var A = api();
    var answersCtx = (A && A.hasAnswers && A.hasAnswers()) ? A.describeAnswers() : "";
    var recent = history.slice(-4).map(function(m){ return m.content; }).join(" ");
    var games = shortlist(recent + " " + q + " " + answersCtx);

    var textEl = addBubble("assistant", "…");
    textEl.classList.add("is-typing");

    var sys = "Eres el asistente de GameCast, experto y cercano en videojuegos. Tu trabajo es: (1) resolver dudas del usuario sobre videojuegos — comparaciones, duración aproximada, dificultad, plataformas, si es cooperativo o para niños, juegos parecidos, etc.— y (2) recomendar juegos. Usa EXCLUSIVAMENTE los juegos de la lista de candidatos; cuando nombres un juego escribe su título EXACTO tal como aparece en la lista. Si el usuario solo charla o pregunta algo general, responde con naturalidad y sugiere 1-3 juegos si viene a cuento. No inventes juegos que no estén en la lista. Responde SIEMPRE en español, claro y conciso.";
    var usr = q + "\n\n[Candidatos del catálogo]\n" + catalogText(games) +
              (answersCtx ? "\n\n[Preferencias del usuario en el cuestionario] " + answersCtx : "");

    var messages = [{ role:"system", content:sys }];
    history.slice(-6).forEach(function(m){ messages.push(m); });
    messages.push({ role:"user", content:usr });
    history.push({ role:"user", content:q });

    try{
      var stream = await engine.chat.completions.create({
        messages: messages,
        temperature: 0.5,
        max_tokens: 640,
        stream: true
      });
      var acc = "";
      // Mantenemos el indicador «escribiendo…» durante TODO el prefill del modelo
      // (la espera más larga) y solo lo quitamos al llegar el primer token real,
      // para que la burbuja no quede vacía mientras tanto.
      for await (const chunk of stream){
        var d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
        if(d){
          if(!acc){ textEl.classList.remove("is-typing"); textEl.textContent = ""; }
          acc += d; textEl.textContent = acc; scrollDown();
        }
      }
      var finalText = acc || "No se me ocurrió una respuesta. Prueba a reformular la pregunta.";
      if(!acc){ textEl.classList.remove("is-typing"); textEl.textContent = finalText; }
      // Guarda en el historial EXACTAMENTE lo mostrado (no el acc vacío).
      history.push({ role:"assistant", content:finalText });
      if(history.length > 40) history = history.slice(-40);
      if(acc) appendCards(textEl.parentNode, mentionedGames(acc, games));
    }catch(e){
      textEl.classList.remove("is-typing");
      var errMsg = "Ups, no pude responder: " + (e && e.message ? e.message : e);
      textEl.textContent = errMsg;
      // Mantiene la alternancia user/assistant en el historial para no romper
      // las peticiones siguientes.
      history.push({ role:"assistant", content:errMsg });
      if(history.length > 40) history = history.slice(-40);
    }finally{
      setComposerEnabled(true);
      var inp = $("aiInput"); if(inp) inp.focus();
      scrollDown();
    }
  }

  /* ---------- Widget / lanzador ---------- */

  function init(){
    if(!$("aiWindow")) return;
    var launcher = $("aiLauncher");
    if(launcher) launcher.addEventListener("click", function(){ setOpen($("aiWindow").hidden); });
    var close = $("aiClose"); if(close) close.addEventListener("click", function(){ setOpen(false); });
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && $("aiWindow") && !$("aiWindow").hidden) setOpen(false);
    });
    var a = $("aiActivate"); if(a) a.addEventListener("click", function(){ activate(false); });
    var s = $("aiSend"); if(s) s.addEventListener("click", function(){ ask(); });

    var input = $("aiInput");
    if(input){
      input.addEventListener("input", function(){ autoGrow(input); });
      // Enter envía; Shift+Enter inserta salto de línea.
      input.addEventListener("keydown", function(e){
        if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); ask(); }
      });
    }

    // Preguntas rápidas (delegación).
    var sug = $("aiSuggest");
    if(sug) sug.addEventListener("click", function(e){
      var chip = e.target.closest(".ai-chip");
      if(chip) ask(chip.getAttribute("data-q"));
    });

    // Favoritos desde las tarjetas del chat (delegación).
    var msgs = $("aiMessages");
    if(msgs) msgs.addEventListener("click", function(e){
      var btn = e.target.closest(".aic-fav");
      if(!btn) return;
      var A = api(); if(!A) return;
      var id = Number(btn.getAttribute("data-fav-id"));
      var now = A.toggleFavorite(id);
      btn.classList.toggle("is-fav", now);
      btn.setAttribute("aria-pressed", String(now));
      btn.setAttribute("aria-label", (now ? "Quitar de" : "Añadir a") + " favoritos");
    });

    // Sincroniza TODAS las tarjetas del chat cuando cambia un favorito (desde el
    // chat o desde la grilla principal), para que no queden corazones desfasados.
    document.addEventListener("gamecast:favchange", function(e){
      if(!e || !e.detail || e.detail.id == null) return;
      var id = e.detail.id, fav = !!e.detail.fav, box = $("aiMessages");
      if(!box) return;
      var btns = box.querySelectorAll('.aic-fav[data-fav-id="' + id + '"]');
      Array.prototype.forEach.call(btns, function(b){
        b.classList.toggle("is-fav", fav);
        b.setAttribute("aria-pressed", String(fav));
        b.setAttribute("aria-label", (fav ? "Quitar de" : "Añadir a") + " favoritos");
      });
    });

    // Precarga automática del modelo al entrar, SIN afectar el rendimiento:
    // se espera a que la página cargue y el hilo principal esté inactivo
    // (requestIdleCallback) y se respeta el modo "ahorro de datos". El propio
    // Web Worker evita bloquear la interfaz.
    var conn = navigator.connection || {};
    if(!navigator.gpu){ setBadge("IA · no disponible"); return; }
    if(conn.saveData){ setBadge("IA · pulsa activar"); return; }

    var kick = function(){
      if(ready || loading) return;
      if("requestIdleCallback" in window) requestIdleCallback(function(){ activate(true); }, { timeout: 6000 });
      else setTimeout(function(){ activate(true); }, 1800);
    };
    if(document.readyState === "complete") setTimeout(kick, 800);
    else window.addEventListener("load", function(){ setTimeout(kick, 1200); });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
