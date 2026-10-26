/* =========================================================
   GameCast — CREADORES DE CONTENIDO
   Sección con un directorio curado de creadores de videojuegos
   (principalmente en español) y un buscador. Todo es offline:
   · Filtra el directorio por nombre, juego, género o plataforma.
   · Siempre ofrece "buscar en YouTube / Twitch" para el término
     escrito, así nunca es un callejón sin salida (encuentres o no
     al creador en la lista curada).
   Los enlaces de cada creador abren una BÚSQUEDA en la plataforma
   por su nombre: así nunca quedan rotos aunque cambien de handle.
========================================================= */
(function(){
  'use strict';

  // Directorio curado. tags = palabras clave en minúscula (estilo, géneros,
  // juegos) para que el buscador encuentre por tema. plat = plataformas donde
  // publica (youtube/twitch/tiktok). emoji = avatar generativo.
  var CREATORS = [
    { name:"elrubiusOMG",   emoji:"🎩", plat:["youtube","twitch"],        tags:["variedad","humor","minecraft","gta","terror"] },
    { name:"AuronPlay",     emoji:"🖤", plat:["twitch","youtube"],        tags:["variedad","humor","among us","just chatting"] },
    { name:"Ibai",          emoji:"🎙️", plat:["twitch","youtube"],        tags:["variedad","eventos","futbol","just chatting"] },
    { name:"TheGrefg",      emoji:"⚡", plat:["twitch","youtube"],        tags:["fortnite","variedad","eventos"] },
    { name:"Vegetta777",    emoji:"🐲", plat:["youtube"],                 tags:["minecraft","variedad","terror","aventura"] },
    { name:"Willyrex",      emoji:"🦊", plat:["youtube","twitch"],        tags:["minecraft","fortnite","call of duty","shooter"] },
    { name:"Fernanfloo",    emoji:"😎", plat:["youtube"],                 tags:["variedad","humor","terror","accion"] },
    { name:"JuanSGuarnizo", emoji:"🦅", plat:["twitch","youtube"],        tags:["variedad","minecraft","humor","roleplay"] },
    { name:"DjMaRiiO",      emoji:"⚽", plat:["youtube","twitch"],        tags:["futbol","ea sports fc","fifa","deportes"] },
    { name:"LuzuGames",     emoji:"🎮", plat:["youtube"],                 tags:["variedad","minecraft","aventura"] },
    { name:"Spreen",        emoji:"🟢", plat:["twitch","youtube"],        tags:["variedad","futbol","minecraft"] },
    { name:"IlloJuan",      emoji:"🕹️", plat:["twitch","youtube"],        tags:["variedad","retro","terror","humor"] },
    { name:"Knekro",        emoji:"🔥", plat:["twitch","youtube"],        tags:["league of legends","moba","variedad","rpg"] },
    { name:"AriGameplays",  emoji:"💜", plat:["twitch","youtube","tiktok"], tags:["variedad","valorant","league of legends","shooter"] },
    { name:"ElMariana",     emoji:"🎭", plat:["twitch","youtube"],        tags:["variedad","minecraft","humor"] },
    { name:"Alexby11",      emoji:"🧩", plat:["twitch","youtube"],        tags:["variedad","escape room","puzzle","minecraft"] },
    { name:"Folagor",       emoji:"⚔️", plat:["twitch","youtube"],        tags:["world of warcraft","mmorpg","rpg"] },
    { name:"Werlyb",        emoji:"🛡️", plat:["twitch"],                  tags:["world of warcraft","mmorpg","rpg","estrategia"] },
    { name:"Rivers",        emoji:"🌊", plat:["twitch","youtube"],        tags:["variedad","minecraft","roleplay"] },
    { name:"Nexxuz",        emoji:"🎯", plat:["youtube","twitch"],        tags:["fortnite","minecraft","shooter"] },
    { name:"Mangel",        emoji:"🤙", plat:["youtube"],                 tags:["variedad","gta","minecraft","humor"] },
    { name:"sTaXx",         emoji:"🧨", plat:["youtube"],                 tags:["minecraft","variedad","humor","troll"] },
    { name:"Perxitaa",      emoji:"🥅", plat:["twitch","youtube"],        tags:["futbol","variedad","ea sports fc"] },
    { name:"ElXokas",       emoji:"🗯️", plat:["twitch","youtube"],        tags:["just chatting","variedad","debate"] },
    { name:"Cristinini",    emoji:"✨", plat:["twitch","youtube"],        tags:["variedad","eventos","just chatting"] },
    { name:"Biyin",         emoji:"🎀", plat:["twitch","youtube"],        tags:["variedad","minecraft","aventura"] },
    { name:"Zarcort",       emoji:"🎵", plat:["youtube"],                 tags:["musica","variedad","humor"] },
    { name:"xBuyer",        emoji:"🛒", plat:["youtube"],                 tags:["fortnite","fifa","variedad"] }
  ];

  // Etiqueta y color de plataforma + constructor de URL de búsqueda (nunca rota).
  var PLAT = {
    youtube: { label:"YouTube", search:function(q){ return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q); } },
    twitch:  { label:"Twitch",  search:function(q){ return "https://www.twitch.tv/search?term=" + encodeURIComponent(q); } },
    tiktok:  { label:"TikTok",  search:function(q){ return "https://www.tiktok.com/search?q=" + encodeURIComponent(q); } }
  };

  function $(id){ return document.getElementById(id); }
  function norm(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]; }); }
  // slug = nombre en minúsculas sin símbolos → nombre del archivo de avatar local.
  function slug(name){ return String(name).toLowerCase().replace(/[^a-z0-9]/g, ""); }
  // Creadores sin avatar real horneado (handle no resoluble): se queda el emoji y
  // no pedimos su imagen, para no provocar un 404 en consola. Los 28 ya tienen
  // avatar real en creators/<slug>.jpg; aun así, si alguno faltara, onerror lo
  // quita y deja visible el emoji (degradación limpia).
  var NO_AVATAR = {};

  // Memoiza el "haystack" normalizado por creador (nombre + tags + plataformas).
  function hay(c){
    if(c.__hay === undefined){
      c.__hay = norm(c.name + " " + c.tags.join(" ") + " " + c.plat.join(" "));
    }
    return c.__hay;
  }

  function matches(c, qTokens){
    if(!qTokens.length) return true;
    var h = hay(c);
    return qTokens.every(function(t){ return h.indexOf(t) !== -1; });
  }

  function cardMarkup(c){
    var links = c.plat.map(function(p){
      var def = PLAT[p]; if(!def) return "";
      return '<a class="creator-link creator-link--' + p + '" href="' + esc(def.search(c.name)) +
             '" target="_blank" rel="noopener noreferrer">' + def.label + "</a>";
    }).join("");
    var hue = 0; for(var i=0;i<c.name.length;i++){ hue = (hue + c.name.charCodeAt(i)) % 360; }
    var chips = c.tags.slice(0, 3).map(function(t){
      return '<li class="creator-tag">' + esc(t) + "</li>";
    }).join("");
    var s = slug(c.name);
    // Avatar real horneado en creators/<slug>.jpg; si falta o falla la carga,
    // onerror lo elimina y queda visible el emoji sobre el degradado.
    var pic = NO_AVATAR[s] ? "" :
      '<img class="creator-avatar-img" src="creators/' + s + '.jpg" alt="" loading="lazy" decoding="async" onerror="this.remove()">';
    return (
      '<article class="creator-card" style="--hue:' + hue + '">' +
        '<div class="creator-avatar"><span class="creator-emoji" aria-hidden="true">' + esc(c.emoji) + "</span>" + pic + "</div>" +
        '<div class="creator-info">' +
          '<h3 class="creator-name">' + esc(c.name) + "</h3>" +
          '<ul class="creator-tags" aria-label="Temas de ' + esc(c.name) + '">' + chips + "</ul>" +
          '<div class="creator-links">' + links + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  // Actualiza los botones de búsqueda externa (YouTube/Twitch) según el término.
  function updateExternal(query){
    var q = query.trim();
    var ytLabel = $("ytSearchLabel"), twLabel = $("twSearchLabel");
    var yt = $("ytSearchBtn"), tw = $("twSearchBtn");
    var ytQ = q || "gameplay español";
    var twQ = q || "gameplay";
    if(yt) yt.href = PLAT.youtube.search(ytQ);
    if(tw) tw.href = PLAT.twitch.search(twQ);
    var shown = q ? ('«' + q + '»') : "";
    if(ytLabel) ytLabel.textContent = q ? ("Buscar " + shown + " en YouTube") : "Buscar en YouTube";
    if(twLabel) twLabel.textContent = q ? ("Buscar " + shown + " en Twitch") : "Buscar en Twitch";
  }

  function render(query){
    var grid = $("creatorsGrid"), empty = $("creatorsEmpty");
    if(!grid) return;
    var qTokens = norm(query).split(/[^a-z0-9ñ]+/).filter(function(t){ return t.length > 0; });
    var list = CREATORS.filter(function(c){ return matches(c, qTokens); });
    grid.innerHTML = list.map(cardMarkup).join("");
    if(empty){
      if(list.length === 0){
        empty.hidden = false;
        empty.textContent = query.trim()
          ? "Ningún creador de la lista coincide con «" + query.trim() + "». Prueba con los botones de arriba para buscarlo directamente en YouTube o Twitch."
          : "No hay creadores para mostrar.";
      } else {
        empty.hidden = true;
      }
    }
    updateExternal(query);
  }

  /* ---------- Pestañas Recomendador / Creadores ---------- */
  function setView(view){
    var rec = $("recommenderView"), creators = $("creators");
    var tabs = document.querySelectorAll(".view-tab");
    var isCreators = view === "creators";
    if(rec) rec.hidden = isCreators;
    if(creators) creators.hidden = !isCreators;
    Array.prototype.forEach.call(tabs, function(t){
      var on = t.getAttribute("data-view") === view;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if(isCreators){
      var h = $("creatorsHeading"); if(h && h.focus) h.focus();
    }
  }

  function init(){
    if(!$("creators")) return;
    render(""); // directorio completo al inicio

    var input = $("creatorSearch");
    if(input) input.addEventListener("input", function(){ render(input.value); });

    var tabs = document.querySelectorAll(".view-tab");
    Array.prototype.forEach.call(tabs, function(t){
      t.addEventListener("click", function(){ setView(t.getAttribute("data-view")); });
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
