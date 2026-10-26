/* =========================================================
   GameCast — APP (STATE, LOGIC, RENDER, EVENTS, INIT)
   Lee la base de datos y configuración expuesta por data.js
   en `window.GAMECAST_DATA` (data.js debe cargarse antes que
   este script, garantizado por el orden de los <script defer>
   en index.html).
========================================================= */
(function(){
  'use strict';

  // ---- Acceso a los datos expuestos por data.js ----
  const DATA = window.GAMECAST_DATA;
  if(!DATA){
    throw new Error('GameCast: no se encontraron los datos en window.GAMECAST_DATA. Asegúrate de cargar data.js antes de app.js.');
  }

  const GAMES = DATA.games;
  const STEPS = DATA.steps;
  const PLAYSTYLE_LABELS = DATA.playstyleLabels;
  const DIFFICULTY_LABELS = DATA.difficultyLabels;
  const DIFFICULTY_ORDER = DATA.difficultyOrder;
  const GENRE_ICONS = DATA.genreIcons || {};
  const GENRE_OPTIONS = DATA.genreOptions || [];
  const PLATFORM_OPTIONS = DATA.platformOptions || [];
  const PLAYSTYLE_OPTIONS = DATA.playstyleOptions || [];
  const MOOD_OPTIONS = DATA.moodOptions || [];
  const DIFFICULTY_OPTIONS = DATA.difficultyOptions || [];

  // Claves de almacenamiento local (favoritos y tema).
  const FAV_KEY = 'gamecast:favorites';
  const THEME_KEY = 'gamecast:theme';

  /* =========================================================
     SECCIÓN 1: ESTADO (STATE)
     Un único objeto de estado con las respuestas del usuario,
     el paso actual del asistente y la configuración de la
     vista de resultados (orden, filtro, favoritos, expandido).
  ========================================================= */
  const state = {
    currentStep:0,
    answers:{ genres:[], playstyle:"", platforms:[], mood:"", difficulty:"" },
    results:{ all:[], defaultCount:0, isFallback:false, sort:"score", platform:"", favOnly:false, renderLimit:0, query:"" }
  };

  // Conjunto de IDs favoritos, persistido en localStorage.
  let favorites = loadFavorites();

  /* =========================================================
     SECCIÓN 2: UTILIDADES
  ========================================================= */

  // Escapa caracteres especiales de HTML. Buena práctica aunque los
  // datos sean locales y de confianza: evita inyección accidental.
  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g, function(ch){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch];
    });
  }

  // Une un array de strings en una frase natural en español: "a, b y c"
  function formatList(items){
    if(!items || items.length === 0) return "";
    if(items.length === 1) return items[0];
    return items.slice(0,-1).join(", ") + " y " + items[items.length-1];
  }

  function intersect(a,b){
    return a.filter(function(x){ return b.indexOf(x) !== -1; });
  }

  // Normaliza texto para búsquedas: minúsculas y sin acentos, para que
  // "pokemon" encuentre "Pokémon" y "baldur" encuentre "Baldur's Gate".
  function normalizeText(s){
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // --- Favoritos (persistencia en localStorage) ---
  function loadFavorites(){
    try{
      const raw = window.localStorage.getItem(FAV_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    }catch(e){ return new Set(); }
  }
  function persistFavorites(){
    try{ window.localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favorites))); }catch(e){}
  }
  function isFavorite(id){ return favorites.has(id); }
  function toggleFavorite(id){
    if(favorites.has(id)) favorites.delete(id); else favorites.add(id);
    persistFavorites();
  }

  /* =========================================================
     SECCIÓN 3: LÓGICA DE PUNTUACIÓN (LOGIC)
     Algoritmo de recomendación ponderado. Cada criterio aporta
     puntos a un total que se normaliza a un porcentaje 0-100.
  ========================================================= */

  // Pesos de cada criterio (la suma máxima es 100)
  const WEIGHT_GENRE = 45;       // Mayor peso: afinidad de géneros
  const WEIGHT_PLATFORM = 20;    // Debe poder jugarlo en su plataforma
  const WEIGHT_PLAYSTYLE = 15;   // Solo / cooperativo / competitivo
  const WEIGHT_MOOD = 12;        // Tipo de experiencia buscada
  const WEIGHT_DIFFICULTY = 8;   // Proximidad de dificultad

  const MATCH_THRESHOLD = 50; // % mínimo para considerarse "buena" recomendación
  const PLATFORM_MISMATCH_PENALTY = 0.45; // Penalización fuerte, no exclusión total

  // Calcula la puntuación de compatibilidad de un juego contra las
  // respuestas del usuario. Devuelve también los motivos que
  // explican el resultado (para la sección "Por qué te lo recomendamos").
  function scoreGame(game, answers){
    const reasons = [];
    let score = 0;

    // Catálogo masivo de Steam: no tiene metadatos reales de género/mood/estilo/
    // dificultad (sus valores son placeholder), así que NO se puntúa por esos
    // criterios —hacerlo falsearía la recomendación y ahogaría a los juegos
    // curados—. Se le da una relevancia base baja (por debajo de MATCH_THRESHOLD)
    // para que no aparezca en las recomendaciones por defecto, pero siga siendo
    // explorable con «Ver más» y buscable por título.
    if(game.catalog && !game.enriched){
      const platOk = answers.platforms.length === 0 || intersect(answers.platforms, game.platforms).length > 0;
      return { game:game, score:(platOk ? 8 : 0), reasons:[], hasPlatformMatch:platOk, catalog:true };
    }

    // 1) GÉNEROS: proporción de los géneros elegidos por el usuario
    //    que el juego efectivamente cubre.
    const matchedGenres = intersect(answers.genres, game.genres);
    if(answers.genres.length > 0){
      const genreRatio = matchedGenres.length / answers.genres.length;
      score += genreRatio * WEIGHT_GENRE;
      if(matchedGenres.length > 0){
        reasons.push("coincide en " + (matchedGenres.length > 1 ? "los géneros " : "el género ") + formatList(matchedGenres));
      }
    } else {
      score += WEIGHT_GENRE * 0.5; // sin preferencia declarada: puntuación neutra
    }

    // 2) PLATAFORMA: si no comparte ninguna plataforma con el usuario,
    //    no se otorgan puntos de esta categoría y se aplica una
    //    penalización global (ver más abajo), sin excluir el juego.
    const matchedPlatforms = intersect(answers.platforms, game.platforms);
    const hasPlatformMatch = matchedPlatforms.length > 0;
    if(answers.platforms.length > 0){
      if(hasPlatformMatch){
        score += WEIGHT_PLATFORM;
        reasons.push("está disponible en " + formatList(matchedPlatforms));
      }
    } else {
      score += WEIGHT_PLATFORM; // sin preferencia declarada: no penalizar
    }

    // 3) ESTILO DE JUEGO (solo / cooperativo / competitivo / me da igual)
    if(!answers.playstyle || answers.playstyle === "cualquiera"){
      score += WEIGHT_PLAYSTYLE;
    } else if(game.playstyle.indexOf(answers.playstyle) !== -1){
      score += WEIGHT_PLAYSTYLE;
      reasons.push("se disfruta en modo " + PLAYSTYLE_LABELS[answers.playstyle]);
    } else {
      score += WEIGHT_PLAYSTYLE * 0.25; // crédito parcial: es una preferencia, no un bloqueo
    }

    // 4) EXPERIENCIA / MOOD (relajante, competitiva, narrativa, desafiante)
    if(!answers.mood){
      score += WEIGHT_MOOD;
    } else if(game.mood.indexOf(answers.mood) !== -1){
      score += WEIGHT_MOOD;
      reasons.push("ofrece una experiencia " + answers.mood);
    } else {
      score += WEIGHT_MOOD * 0.2;
    }

    // 5) DIFICULTAD: puntuación por cercanía en la escala
    //    casual -> media -> difícil -> muy difícil, no solo por igualdad exacta.
    if(answers.difficulty){
      const userIdx = DIFFICULTY_ORDER.indexOf(answers.difficulty);
      const gameIdx = DIFFICULTY_ORDER.indexOf(game.difficulty);
      const distance = Math.abs(userIdx - gameIdx);
      const proximity = 1 - (distance / (DIFFICULTY_ORDER.length - 1));
      score += Math.max(0, proximity) * WEIGHT_DIFFICULTY;
      if(distance === 0){
        reasons.push("tiene justo el nivel de dificultad (" + DIFFICULTY_LABELS[game.difficulty] + ") que buscas");
      } else if(distance === 1){
        reasons.push("tiene una dificultad cercana a la que buscas");
      }
    } else {
      score += WEIGHT_DIFFICULTY;
    }

    // Penalización fuerte (no exclusión) si el usuario indicó plataformas
    // y el juego no está disponible en ninguna de ellas.
    let finalScore = score;
    if(answers.platforms.length > 0 && !hasPlatformMatch){
      finalScore *= PLATFORM_MISMATCH_PENALTY;
    }

    finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));

    return { game:game, score:finalScore, reasons:reasons, hasPlatformMatch:hasPlatformMatch };
  }

  // Construye la frase final "Por qué te lo recomendamos"
  function buildReasonText(reasons){
    if(reasons.length === 0){
      return "Aunque no coincide demasiado con tus respuestas, sigue siendo una opción sólida dentro de nuestra base de datos.";
    }
    return "Este juego " + formatList(reasons) + ".";
  }

  // Puntúa TODOS los juegos (no solo el top) para poder ordenar, filtrar
  // y ampliar la lista desde la vista de resultados.
  function computeResults(answers){
    const scored = GAMES.map(function(game){ return scoreGame(game, answers); });
    scored.sort(function(a,b){ return b.score - a.score; });

    const bestScore = scored.length ? scored[0].score : 0;
    const aboveThresholdCount = scored.filter(function(s){ return s.score >= MATCH_THRESHOLD; }).length;
    const defaultCount = Math.min(6, Math.max(4, aboveThresholdCount), scored.length);
    const isFallback = bestScore < MATCH_THRESHOLD;

    return { all:scored, defaultCount:defaultCount, isFallback:isFallback, strongCount:aboveThresholdCount };
  }

  /* =========================================================
     SECCIÓN 4: COMPARTIR POR ENLACE (SHARE)
     Las respuestas se codifican en el hash de la URL para poder
     reproducir exactamente las mismas recomendaciones al abrir
     el enlace, sin necesidad de servidor.
  ========================================================= */
  function encodeAnswers(a){
    const p = new URLSearchParams();
    if(a.genres.length) p.set("g", a.genres.join("|"));
    if(a.playstyle) p.set("p", a.playstyle);
    if(a.platforms.length) p.set("pl", a.platforms.join("|"));
    if(a.mood) p.set("m", a.mood);
    if(a.difficulty) p.set("d", a.difficulty);
    return p.toString();
  }

  // Valores permitidos de una lista de opciones (acepta strings o {value,label}).
  function optionValues(opts){
    return (opts || []).map(function(o){ return typeof o === "string" ? o : o.value; });
  }

  function decodeAnswers(hash){
    const p = new URLSearchParams(hash);
    const split = function(v){ return v ? v.split("|").filter(Boolean) : []; };
    // Un enlace compartido llega del exterior: validamos TODOS los campos contra
    // el vocabulario real para que un hash manipulado no inyecte valores inválidos
    // (ni una "razón" falsa en la UI). Lo no reconocido se descarta.
    const inList = function(v, opts){ return v && optionValues(opts).indexOf(v) !== -1 ? v : ""; };
    const validGenres = split(p.get("g")).filter(function(x){ return GENRE_OPTIONS.indexOf(x) !== -1; });
    const validPlatforms = split(p.get("pl")).filter(function(x){ return PLATFORM_OPTIONS.indexOf(x) !== -1; });
    return {
      genres: validGenres,
      playstyle: inList(p.get("p"), PLAYSTYLE_OPTIONS),
      platforms: validPlatforms,
      mood: inList(p.get("m"), MOOD_OPTIONS),
      difficulty: inList(p.get("d"), DIFFICULTY_OPTIONS)
    };
  }

  function buildShareUrl(){
    const base = window.location.href.split("#")[0];
    return base + "#" + encodeAnswers(state.answers);
  }

  // Refleja las respuestas actuales en el hash (sin recargar ni navegar).
  function syncUrlHash(){
    const encoded = encodeAnswers(state.answers);
    try{ window.history.replaceState(null, "", "#" + encoded); }
    catch(e){ window.location.hash = encoded; }
  }

  function copyShareLink(){
    const url = buildShareUrl();
    const done = function(ok){
      el.copyLinkLabel.textContent = ok ? "¡Enlace copiado!" : "Copia manual: revisa la barra";
      announce(ok ? "Enlace copiado al portapapeles." : "No se pudo copiar automáticamente.");
      window.setTimeout(function(){ el.copyLinkLabel.textContent = "Copiar enlace"; }, 2200);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(function(){ done(true); }, function(){ fallbackCopy(url, done); });
    } else {
      fallbackCopy(url, done);
    }
  }

  function fallbackCopy(text, done){
    try{
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      done(ok);
    }catch(e){ done(false); }
  }

  /* =========================================================
     SECCIÓN 5: TEMA (claro / oscuro)
  ========================================================= */
  function applyTheme(theme){
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    if(el.themeToggle){
      el.themeToggle.setAttribute("aria-pressed", t === "light" ? "true" : "false");
      el.themeToggle.setAttribute("title", t === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
    }
  }
  function initTheme(){
    let saved = "dark";
    try{ saved = window.localStorage.getItem(THEME_KEY) || "dark"; }catch(e){}
    applyTheme(saved);
  }
  function toggleTheme(){
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
    try{ window.localStorage.setItem(THEME_KEY, next); }catch(e){}
    announce(next === "light" ? "Modo claro activado." : "Modo oscuro activado.");
  }

  /* =========================================================
     SECCIÓN 6: RENDER / DOM
  ========================================================= */

  const el = {
    stepper: document.getElementById("stepper"),
    progressTrack: document.getElementById("progressTrack"),
    progressFill: document.getElementById("progressFill"),
    progressLabel: document.getElementById("progressLabel"),
    stepsContainer: document.getElementById("stepsContainer"),
    backBtn: document.getElementById("backBtn"),
    nextBtn: document.getElementById("nextBtn"),
    nextBtnLabel: document.getElementById("nextBtnLabel"),
    wizardSection: document.getElementById("wizard"),
    resultsSection: document.getElementById("results"),
    resultsHeading: document.getElementById("resultsHeading"),
    resultsNote: document.getElementById("resultsNote"),
    cardsGrid: document.getElementById("cardsGrid"),
    restartBtn: document.getElementById("restartBtn"),
    liveRegion: document.getElementById("liveRegion"),
    themeToggle: document.getElementById("themeToggle"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    platformFilter: document.getElementById("platformFilter"),
    favFilterBtn: document.getElementById("favFilterBtn"),
    favCount: document.getElementById("favCount"),
    emptyResults: document.getElementById("emptyResults"),
    renderNote: document.getElementById("renderNote"),
    showMoreBtn: document.getElementById("showMoreBtn"),
    showMoreLabel: document.getElementById("showMoreLabel"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
    copyLinkLabel: document.getElementById("copyLinkLabel")
  };

  // Normaliza una opción de paso: puede ser un string ("PC") o un
  // objeto {value,label} (para opciones de selección única).
  function normalizeOption(opt){
    if(typeof opt === "string") return { value:opt, label:opt };
    return opt;
  }

  // Construye el HTML de un paso (fieldset + legend + chips de opciones)
  function buildStepMarkup(step, index){
    const options = step.options.map(normalizeOption);
    const inputType = step.type === "multi" ? "checkbox" : "radio";

    const optionsHtml = options.map(function(opt, i){
      const inputId = "field-" + step.id + "-" + i;
      return (
        '<label class="chip" for="' + inputId + '">' +
          '<input type="' + inputType + '" id="' + inputId + '" name="' + step.id + '" value="' + escapeHtml(opt.value) + '">' +
          "<span>" + escapeHtml(opt.label) + "</span>" +
        "</label>"
      );
    }).join("");

    return (
      '<div class="step" data-step-index="' + index + '"' + (index === 0 ? "" : " hidden") + ">" +
        '<fieldset class="step-fieldset">' +
          "<legend tabindex=\"-1\">" +
            '<span class="step-kicker">Pregunta ' + (index + 1) + " de " + STEPS.length + "</span>" +
            '<span class="step-title">' + escapeHtml(step.title) + "</span>" +
          "</legend>" +
          '<p class="step-hint">' + escapeHtml(step.hint) + "</p>" +
          '<div class="options">' + optionsHtml + "</div>" +
        "</fieldset>" +
      "</div>"
    );
  }

  function buildStepsMarkup(){
    el.stepsContainer.innerHTML = STEPS.map(buildStepMarkup).join("");
  }

  function buildStepperDots(){
    el.stepper.innerHTML = STEPS.map(function(step, i){
      return '<li><span class="stepper-dot" data-index="' + i + '">' + (i + 1) + "</span></li>";
    }).join("");
  }

  // Rellena el desplegable de filtro de plataforma con el vocabulario real.
  function buildPlatformFilter(){
    const opts = ['<option value="">Todas</option>'].concat(PLATFORM_OPTIONS.map(function(p){
      return '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + "</option>";
    }));
    el.platformFilter.innerHTML = opts.join("");
  }

  // Anuncia un mensaje en la región viva para lectores de pantalla
  function announce(message){
    el.liveRegion.textContent = "";
    window.setTimeout(function(){ el.liveRegion.textContent = message; }, 60);
  }

  // Comprueba si el paso indicado tiene una respuesta válida
  function isStepValid(stepIndex){
    const step = STEPS[stepIndex];
    const value = state.answers[step.id];
    return step.type === "multi" ? value.length > 0 : Boolean(value);
  }

  function updateNavButtons(){
    el.backBtn.disabled = state.currentStep === 0;
    const isLast = state.currentStep === STEPS.length - 1;
    el.nextBtnLabel.textContent = isLast ? "Ver recomendaciones" : "Siguiente";
  }

  function updateNextButtonState(){
    el.nextBtn.disabled = !isStepValid(state.currentStep);
  }

  // Refresca la barra de progreso, el texto "Paso X de 5" y los puntos del stepper
  function renderProgress(){
    const current = state.currentStep + 1;
    const total = STEPS.length;
    const pct = Math.round((current / total) * 100);

    el.progressFill.style.width = pct + "%";
    el.progressTrack.setAttribute("aria-valuenow", String(current));
    el.progressLabel.textContent = "Paso " + current + " de " + total;

    const dots = el.stepper.querySelectorAll(".stepper-dot");
    dots.forEach(function(dot, i){
      dot.classList.remove("is-active", "is-done");
      dot.removeAttribute("aria-current");
      if(i < state.currentStep){
        dot.classList.add("is-done");
        dot.setAttribute("aria-label", "Paso " + (i + 1) + ": " + STEPS[i].title + " (completado)");
      } else if(i === state.currentStep){
        dot.classList.add("is-active");
        dot.setAttribute("aria-current", "step");
        dot.setAttribute("aria-label", "Paso " + (i + 1) + ": " + STEPS[i].title + " (actual)");
      } else {
        dot.setAttribute("aria-label", "Paso " + (i + 1) + ": " + STEPS[i].title + " (pendiente)");
      }
    });

    updateNavButtons();
  }

  // Actualiza las clases visuales "is-checked" de los chips de un paso
  function refreshChipVisuals(stepEl){
    stepEl.querySelectorAll(".chip").forEach(function(chip){
      const input = chip.querySelector("input");
      chip.classList.toggle("is-checked", !!(input && input.checked));
    });
  }

  // Lee los inputs marcados de un paso y actualiza el objeto de respuestas
  function syncAnswerFromStep(stepEl, step){
    if(step.type === "multi"){
      const checked = Array.prototype.slice.call(stepEl.querySelectorAll("input:checked")).map(function(i){ return i.value; });
      state.answers[step.id] = checked;
    } else {
      const checkedInput = stepEl.querySelector("input:checked");
      state.answers[step.id] = checkedInput ? checkedInput.value : "";
    }
  }

  // Marca en los inputs del asistente las respuestas dadas (p. ej. al abrir
  // un enlace compartido) para mantener la coherencia del formulario.
  function applyAnswersToInputs(a){
    el.stepsContainer.querySelectorAll("input").forEach(function(input){
      const name = input.name, val = input.value;
      let checked = false;
      if(name === "genres") checked = a.genres.indexOf(val) !== -1;
      else if(name === "platforms") checked = a.platforms.indexOf(val) !== -1;
      else if(name === "playstyle") checked = a.playstyle === val;
      else if(name === "mood") checked = a.mood === val;
      else if(name === "difficulty") checked = a.difficulty === val;
      input.checked = checked;
    });
    el.stepsContainer.querySelectorAll(".step").forEach(refreshChipVisuals);
  }

  // Muestra el paso solicitado y oculta el resto, con una pequeña animación
  function goToStep(newIndex){
    const stepEls = el.stepsContainer.querySelectorAll(".step");
    stepEls.forEach(function(stepEl, i){ stepEl.hidden = i !== newIndex; });
    state.currentStep = newIndex;
    renderProgress();
    updateNextButtonState();
    announce("Paso " + (newIndex + 1) + " de " + STEPS.length + ": " + STEPS[newIndex].title);

    // Reinicia la animación de entrada del paso activo.
    const activeStep = stepEls[newIndex];
    if(activeStep){
      activeStep.classList.remove("step-animate");
      void activeStep.offsetWidth; // fuerza reflow para reiniciar la animación
      activeStep.classList.add("step-animate");
    }

    const activeLegend = activeStep ? activeStep.querySelector("legend") : null;
    if(activeLegend) activeLegend.focus();
  }

  /* --- Renderizado de resultados --- */

  // Portada generativa por juego: gradiente determinista según el id
  // y emoji del género principal. No depende de imágenes externas.
  function posterMarkup(game, scoreHtml){
    const hue = (game.id * 47) % 360;
    const primaryGenre = game.genres[0];
    const icon = GENRE_ICONS[primaryGenre] || "🎮";
    const fav = isFavorite(game.id);
    const favLabel = fav ? "Quitar de favoritos" : "Añadir a favoritos";
    // Portada real (Steam) si existe; si no carga, onerror la elimina y queda
    // visible el póster generativo (emoji sobre degradado) que hay debajo.
    const imgHtml = game.image
      ? '<img class="poster-img" src="' + escapeHtml(game.image) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">'
      : "";
    return (
      '<div class="card-poster" style="--hue:' + hue + '">' +
        '<span class="poster-icon" aria-hidden="true">' + icon + "</span>" +
        imgHtml +
        '<button type="button" class="fav-btn' + (fav ? " is-fav" : "") + '" data-fav-id="' + game.id + '" aria-pressed="' + fav + '" aria-label="' + favLabel + " de " + escapeHtml(game.title) + '" title="' + favLabel + '">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>' +
        "</button>" +
        scoreHtml +
      "</div>"
    );
  }

  function scoreBadgeMarkup(entry){
    const tier = entry.score >= 75 ? "high" : entry.score >= 50 ? "medium" : "low";
    return (
      '<div class="score-badge score-' + tier + '" style="--pct:' + entry.score + '" role="img" aria-label="Coincidencia del ' + entry.score + ' por ciento">' +
        '<span class="score-inner"><span class="score-value">' + entry.score + "%</span></span>" +
      "</div>"
    );
  }

  // Enlace a dónde conseguir el juego: ficha de Steam si está disponible;
  // si no, una búsqueda web que sugiere dónde encontrarlo (Nintendo, móvil, retro…).
  function gameLink(game){
    if(game.steamAppId){
      return { url:"https://store.steampowered.com/app/" + game.steamAppId + "/", label:"Ver en Steam", kind:"steam" };
    }
    return { url:"https://www.google.com/search?q=" + encodeURIComponent(game.title + " videojuego dónde comprar o jugar"), label:"¿Dónde conseguirlo?", kind:"search" };
  }

  function renderCard(entry, index){
    const game = entry.game;
    const link = gameLink(game);

    // Tarjeta de catálogo: sin metadatos reales mostramos una ficha honesta
    // (portada + título + plataforma real + enlace a Steam), sin géneros,
    // descripción ni "por qué" inventados y sin insignia de coincidencia.
    if(game.catalog && !game.enriched){
      return (
        '<article class="card card--catalog" style="animation-delay:' + (index * 55) + 'ms">' +
          posterMarkup(game, "") +
          '<div class="card-body">' +
            '<h3 class="card-title"><a class="title-link" href="' + link.url + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(game.title) + "</a></h3>" +
            '<ul class="tag-list" aria-label="Plataforma de ' + escapeHtml(game.title) + '"><li class="tag tag-platform">PC (Steam)</li></ul>' +
            '<p class="card-desc">Disponible en Steam. Abre su ficha para ver géneros, capturas y detalles.</p>' +
            '<a class="card-link card-link--' + link.kind + '" href="' + link.url + '" target="_blank" rel="noopener noreferrer">' +
              "<span>" + link.label + "</span>" +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"></path></svg>' +
            "</a>" +
          "</div>" +
        "</article>"
      );
    }

    const platformTags = game.platforms.map(function(p){
      return '<li class="tag tag-platform">' + escapeHtml(p) + "</li>";
    }).join("");
    const genreTags = game.genres.map(function(g){
      return '<li class="tag tag-genre">' + escapeHtml(g) + "</li>";
    }).join("");

    return (
      '<article class="card" style="animation-delay:' + (index * 55) + 'ms">' +
        posterMarkup(game, scoreBadgeMarkup(entry)) +
        '<div class="card-body">' +
          '<h3 class="card-title"><a class="title-link" href="' + link.url + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(game.title) + "</a>" + (game.year ? ' <span class="card-year">(' + game.year + ")</span>" : "") + "</h3>" +
          '<ul class="tag-list" aria-label="Plataformas y géneros de ' + escapeHtml(game.title) + '">' + platformTags + genreTags + "</ul>" +
          '<p class="card-desc">' + escapeHtml(game.description) + "</p>" +
          '<p class="card-why"><strong>Por qué te lo recomendamos:</strong> ' + escapeHtml(buildReasonText(entry.reasons)) + "</p>" +
          '<a class="card-link card-link--' + link.kind + '" href="' + link.url + '" target="_blank" rel="noopener noreferrer">' +
            "<span>" + link.label + "</span>" +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"></path></svg>' +
          "</a>" +
        "</div>" +
      "</article>"
    );
  }

  // Aplica filtro (plataforma / favoritos) y orden a la lista completa.
  function getVisibleEntries(){
    let list = state.results.all.slice();

    if(state.results.favOnly){
      list = list.filter(function(e){ return isFavorite(e.game.id); });
    }
    if(state.results.platform){
      list = list.filter(function(e){ return e.game.platforms.indexOf(state.results.platform) !== -1; });
    }
    // Búsqueda por título (sin acentos, por subcadena). Se combina con el
    // resto de filtros activos (plataforma, favoritos) y el orden.
    const q = state.results.query ? normalizeText(state.results.query.trim()) : "";
    if(q){
      list = list.filter(function(e){ return normalizeText(e.game.title).indexOf(q) !== -1; });
    }

    const sort = state.results.sort;
    list.sort(function(a, b){
      if(sort === "year-desc") return (b.game.year || 0) - (a.game.year || 0);
      if(sort === "year-asc") return (a.game.year || 9999) - (b.game.year || 9999);
      if(sort === "title") return a.game.title.localeCompare(b.game.title, "es");
      return b.score - a.score; // "score" por defecto
    });

    return list;
  }

  // Cuántas tarjetas se añaden cada vez que se pulsa "Ver más".
  const RENDER_BATCH = 48;

  // Dibuja la cuadrícula de resultados según el estado de la vista.
  // Render incremental: se muestran `renderLimit` tarjetas y "Ver más" revela
  // otro lote (sin tope duro), de modo que se puede llegar a TODOS los juegos
  // del catálogo sin saturar el DOM de golpe con miles de tarjetas.
  function renderResultsGrid(){
    const list = getVisibleEntries();
    const total = list.length;

    if(!state.results.renderLimit || state.results.renderLimit < state.results.defaultCount){
      state.results.renderLimit = state.results.defaultCount;
    }
    // En "solo favoritos" mostramos todos (suelen ser pocos y curados por ti).
    const limit = state.results.favOnly ? total : Math.min(state.results.renderLimit, total);
    const shown = list.slice(0, limit);

    el.cardsGrid.innerHTML = shown.map(renderCard).join("");
    el.emptyResults.hidden = shown.length !== 0;

    // Aviso del total y de cuántos se ven.
    if(el.renderNote){
      if(total > shown.length){
        el.renderNote.hidden = false;
        el.renderNote.textContent = "Mostrando " + shown.length + " de " + total + " juegos. Pulsa «Ver más» para cargar más, o usa la búsqueda y los filtros para acotar.";
      } else if(total > state.results.defaultCount){
        el.renderNote.hidden = false;
        el.renderNote.textContent = "Mostrando los " + total + " juegos.";
      } else {
        el.renderNote.hidden = true;
      }
    }
    if(shown.length === 0){
      el.emptyResults.textContent = state.results.query
        ? "Ningún juego coincide con «" + state.results.query + "». Prueba con otro título o quita algún filtro."
        : "No hay juegos que coincidan con este filtro. Prueba a quitar el filtro de plataforma o de favoritos.";
    }

    // Botón "Ver más / Ver menos" (no aplica en "solo favoritos").
    const allShown = shown.length >= total;
    const canShowMore = !state.results.favOnly && total > state.results.defaultCount;
    el.showMoreBtn.hidden = !canShowMore;
    if(canShowMore){
      if(allShown){
        el.showMoreLabel.textContent = "Ver menos juegos";
        el.showMoreBtn.classList.add("is-expanded");
      } else {
        const remaining = total - shown.length;
        const next = Math.min(RENDER_BATCH, remaining);
        el.showMoreLabel.textContent = "Ver más juegos (" + next + " de " + remaining + " restantes)";
        el.showMoreBtn.classList.remove("is-expanded");
      }
    }

    updateFavCount();
  }

  function updateFavCount(){
    const n = favorites.size;
    el.favCount.textContent = String(n);
    el.favCount.hidden = n === 0;
  }

  function showResults(){
    const result = computeResults(state.answers);
    state.results.all = result.all;
    state.results.defaultCount = result.defaultCount;
    state.results.isFallback = result.isFallback;
    state.results.renderLimit = result.defaultCount;
    state.results.favOnly = false;
    state.results.platform = "";
    state.results.sort = "score";
    state.results.query = "";

    // Restablece los controles de la barra de herramientas.
    el.searchInput.value = "";
    el.sortSelect.value = "score";
    el.platformFilter.value = "";
    el.favFilterBtn.setAttribute("aria-pressed", "false");
    el.favFilterBtn.classList.remove("is-active");

    el.wizardSection.hidden = true;
    el.resultsSection.hidden = false;

    el.resultsNote.classList.toggle("is-fallback", result.isFallback);
    const strong = result.strongCount || 0;
    el.resultsNote.textContent = result.isFallback
      ? "No encontramos una coincidencia perfecta con tus respuestas, pero estas son las mejores opciones disponibles en nuestra base de datos."
      : "Encontramos " + strong + (strong === 1 ? " juego que coincide" : " juegos que coinciden") + " muy bien con lo que buscas. Usa los filtros o «ver más» para explorar los " + result.all.length + " de la base de datos.";

    renderResultsGrid();
    syncUrlHash();
    announce("Mostrando recomendaciones de videojuegos.");
    el.resultsHeading.focus();
  }

  // Reinicia el cuestionario a su estado inicial
  function restartWizard(){
    state.answers = { genres:[], playstyle:"", platforms:[], mood:"", difficulty:"" };
    state.currentStep = 0;

    el.stepsContainer.querySelectorAll("input").forEach(function(input){ input.checked = false; });
    el.stepsContainer.querySelectorAll(".chip").forEach(function(chip){ chip.classList.remove("is-checked"); });
    el.stepsContainer.querySelectorAll(".step").forEach(function(stepEl, i){ stepEl.hidden = i !== 0; });

    el.resultsSection.hidden = true;
    el.wizardSection.hidden = false;

    try{ window.history.replaceState(null, "", window.location.pathname + window.location.search); }catch(e){}

    renderProgress();
    updateNextButtonState();
    announce("Cuestionario reiniciado. Paso 1 de " + STEPS.length + ": " + STEPS[0].title);

    const firstLegend = el.stepsContainer.querySelector(".step legend");
    if(firstLegend) firstLegend.focus();
  }

  /* =========================================================
     SECCIÓN 7: EVENTOS
  ========================================================= */

  function attachEvents(){
    // Delegación de eventos: un único listener de "change" cubre
    // todos los checkboxes/radios de todos los pasos.
    el.stepsContainer.addEventListener("change", function(e){
      const target = e.target;
      if(!target.matches('input[type="checkbox"], input[type="radio"]')) return;

      const stepEl = target.closest(".step");
      const step = STEPS[Number(stepEl.getAttribute("data-step-index"))];

      refreshChipVisuals(stepEl);
      syncAnswerFromStep(stepEl, step);
      updateNextButtonState();
    });

    el.nextBtn.addEventListener("click", function(){
      if(!isStepValid(state.currentStep)) return;
      if(state.currentStep === STEPS.length - 1){
        showResults();
      } else {
        goToStep(state.currentStep + 1);
      }
    });

    el.backBtn.addEventListener("click", function(){
      if(state.currentStep === 0) return;
      goToStep(state.currentStep - 1);
    });

    el.restartBtn.addEventListener("click", restartWizard);

    // Evita el envío nativo del formulario (por si se pulsa Enter)
    document.getElementById("wizardForm").addEventListener("submit", function(e){
      e.preventDefault();
    });

    // --- Tema claro / oscuro ---
    if(el.themeToggle) el.themeToggle.addEventListener("click", toggleTheme);

    // --- Barra de herramientas de resultados ---
    el.searchInput.addEventListener("input", function(){
      state.results.query = el.searchInput.value;
      state.results.renderLimit = state.results.defaultCount; // cada búsqueda empieza acotada
      renderResultsGrid();
    });
    el.sortSelect.addEventListener("change", function(){
      state.results.sort = el.sortSelect.value;
      renderResultsGrid();
    });
    el.platformFilter.addEventListener("change", function(){
      state.results.platform = el.platformFilter.value;
      state.results.renderLimit = state.results.defaultCount;
      renderResultsGrid();
    });
    el.favFilterBtn.addEventListener("click", function(){
      state.results.favOnly = !state.results.favOnly;
      el.favFilterBtn.setAttribute("aria-pressed", state.results.favOnly ? "true" : "false");
      el.favFilterBtn.classList.toggle("is-active", state.results.favOnly);
      renderResultsGrid();
      announce(state.results.favOnly ? "Mostrando solo tus favoritos." : "Mostrando todas las recomendaciones.");
    });
    el.showMoreBtn.addEventListener("click", function(){
      const total = getVisibleEntries().length;
      if((state.results.renderLimit || state.results.defaultCount) >= total){
        // Ya se muestran todos -> colapsar y volver arriba de la lista.
        state.results.renderLimit = state.results.defaultCount;
        if(el.resultsHeading && el.resultsHeading.scrollIntoView) el.resultsHeading.scrollIntoView({ behavior:"smooth", block:"start" });
      } else {
        state.results.renderLimit = Math.min(total, (state.results.renderLimit || state.results.defaultCount) + RENDER_BATCH);
      }
      renderResultsGrid();
    });
    el.copyLinkBtn.addEventListener("click", copyShareLink);

    // Marcar / desmarcar favoritos desde las tarjetas (delegación).
    el.cardsGrid.addEventListener("click", function(e){
      const btn = e.target.closest(".fav-btn");
      if(!btn) return;
      const id = Number(btn.getAttribute("data-fav-id"));
      toggleFavorite(id);
      const nowFav = isFavorite(id);
      btn.classList.toggle("is-fav", nowFav);
      btn.setAttribute("aria-pressed", String(nowFav));
      updateFavCount();
      fireFavChange(id); // sincroniza las tarjetas del chatbot
      announce(nowFav ? "Añadido a favoritos." : "Quitado de favoritos.");
      // Si estamos filtrando por favoritos, la tarjeta puede desaparecer.
      if(state.results.favOnly) renderResultsGrid();
    });
  }

  /* =========================================================
     SECCIÓN 7b: PUENTE PARA EL ASISTENTE DE IA (ai.js)
     Expone acceso de solo lectura a los datos y a acciones
     compartidas (favoritos, enlaces, preferencias del
     cuestionario) para que la IA muestre tarjetas reales y
     mantenga los favoritos sincronizados con el resto de la app.
  ========================================================= */

  // Índice de títulos (perezoso) para resolver un título -> juego real.
  let titleIndex = null;
  function buildTitleIndex(){
    titleIndex = Object.create(null);
    GAMES.forEach(function(g){ titleIndex[normalizeText(g.title)] = g; });
  }
  function findGame(query){
    if(!query) return null;
    if(!titleIndex) buildTitleIndex();
    const n = normalizeText(String(query).trim());
    if(titleIndex[n]) return titleIndex[n];
    // Coincidencia aproximada: el título del juego contenido en la consulta o viceversa.
    let hit = null;
    GAMES.some(function(g){
      const t = normalizeText(g.title);
      if(t.length >= 4 && (n.indexOf(t) !== -1 || t.indexOf(n) !== -1)){ hit = g; return true; }
      return false;
    });
    return hit;
  }

  // Describe las respuestas actuales del cuestionario en texto natural.
  function describeAnswers(a){
    const parts = [];
    if(a.genres && a.genres.length) parts.push("géneros: " + a.genres.join(", "));
    if(a.platforms && a.platforms.length) parts.push("plataformas: " + a.platforms.join(", "));
    if(a.playstyle) parts.push("modo: " + (PLAYSTYLE_LABELS[a.playstyle] || a.playstyle));
    if(a.mood) parts.push("experiencia: " + a.mood);
    if(a.difficulty) parts.push("dificultad: " + (DIFFICULTY_LABELS[a.difficulty] || a.difficulty));
    return parts.join("; ");
  }

  // Notifica (al chatbot y a quien escuche) que cambió un favorito, para
  // mantener sincronizados los corazones entre la grilla y las tarjetas del chat.
  function fireFavChange(id){
    try{ document.dispatchEvent(new CustomEvent("gamecast:favchange", { detail:{ id:id, fav:isFavorite(id) } })); }catch(e){}
  }

  function exposeApi(){
    window.GAMECAST_API = {
      getGames: function(){ return GAMES; },
      getAnswers: function(){
        const a = state.answers;
        return { genres:a.genres.slice(), platforms:a.platforms.slice(), playstyle:a.playstyle, mood:a.mood, difficulty:a.difficulty };
      },
      describeAnswers: function(){ return describeAnswers(state.answers); },
      hasAnswers: function(){
        const a = state.answers;
        return !!(a.genres.length || a.platforms.length || a.playstyle || a.mood || a.difficulty);
      },
      getFavoriteGames: function(){ return GAMES.filter(function(g){ return favorites.has(g.id); }); },
      findGame: findGame,
      gameLink: gameLink,
      genreIcon: function(g){ return GENRE_ICONS[g] || "🎮"; },
      isFavorite: isFavorite,
      // Marca/desmarca favorito y mantiene en sincronía el contador y la
      // cuadrícula de resultados si está visible.
      toggleFavorite: function(id){
        toggleFavorite(id);
        updateFavCount();
        if(el.resultsSection && !el.resultsSection.hidden) renderResultsGrid();
        fireFavChange(id);
        return isFavorite(id);
      }
    };
  }

  /* =========================================================
     SECCIÓN 8: INICIALIZACIÓN
  ========================================================= */
  function init(){
    initTheme();
    buildStepsMarkup();
    buildStepperDots();
    buildPlatformFilter();
    attachEvents();
    exposeApi();
    renderProgress();
    updateNextButtonState();
    updateFavCount();

    // Si la URL trae respuestas compartidas (y al menos un género válido),
    // reproducimos directamente las recomendaciones.
    const hash = window.location.hash.replace(/^#/, "");
    if(hash){
      const decoded = decodeAnswers(hash);
      if(decoded.genres.length > 0){
        state.answers = decoded;
        applyAnswersToInputs(decoded);
        showResults();
      }
    }
  }

  init();
})();
