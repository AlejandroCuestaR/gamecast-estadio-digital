/* =========================================================
   GameCast — DATA
   Vocabulario controlado de géneros, plataformas, estilos de
   juego, experiencia y dificultad, más la base de datos local
   de 40 juegos reales y la definición de los 5 pasos del
   cuestionario. Nada de esto depende de la red: todo vive en
   este archivo.

   Se expone explícitamente en `window.GAMECAST_DATA` para que
   app.js pueda leerlo de forma fiable (se carga como script
   clásico con `defer`, antes de app.js).
========================================================= */
(function(){
  'use strict';

  const GENRE_OPTIONS = [
    'Acción','Aventura','RPG','Estrategia','Shooter/FPS','Deportes','Carreras',
    'Puzzle/Lógica','Terror','Plataformas','Simulación','Mundo abierto/Sandbox',
    'Indie','MOBA','Lucha'
  ];

  const PLATFORM_OPTIONS = ['PC','PlayStation','Xbox','Nintendo Switch','Móvil','Nintendo 64','SNES/NES','Game Boy','Nintendo DS','PSP'];

  const PLAYSTYLE_OPTIONS = [
    { value:'solo', label:'Solo (un jugador)' },
    { value:'coop', label:'Cooperativo' },
    { value:'competitivo', label:'Competitivo (multijugador)' },
    { value:'cualquiera', label:'Me da igual' }
  ];

  const MOOD_OPTIONS = [
    { value:'relajante', label:'Relajante' },
    { value:'competitiva', label:'Competitiva' },
    { value:'narrativa', label:'Narrativa' },
    { value:'desafiante', label:'Desafiante' }
  ];

  const DIFFICULTY_OPTIONS = [
    { value:'casual', label:'Casual / Fácil' },
    { value:'media', label:'Media' },
    { value:'dificil', label:'Difícil' },
    { value:'muy-dificil', label:'Muy difícil' }
  ];

  // Etiquetas legibles usadas al construir las frases de "por qué te lo recomendamos"
  const PLAYSTYLE_LABELS = { solo:'un jugador', coop:'cooperativo', competitivo:'competitivo', cualquiera:'cualquier modo' };
  const DIFFICULTY_LABELS = { casual:'Casual / Fácil', media:'Media', dificil:'Difícil', 'muy-dificil':'Muy difícil' };
  const DIFFICULTY_ORDER = ['casual','media','dificil','muy-dificil'];

  // Icono (emoji) representativo de cada género. Se usa para generar las
  // "portadas" de las tarjetas sin depender de imágenes externas: así la
  // app sigue funcionando totalmente sin conexión.
  const GENRE_ICONS = {
    'Acción':'⚔️','Aventura':'🗺️','RPG':'🐉','Estrategia':'♟️','Shooter/FPS':'🎯',
    'Deportes':'⚽','Carreras':'🏎️','Puzzle/Lógica':'🧩','Terror':'👻','Plataformas':'🍄',
    'Simulación':'🏡','Mundo abierto/Sandbox':'🌍','Indie':'✨','MOBA':'🛡️','Lucha':'🥊'
  };

  // Base de datos curada de 40 juegos reales. Cada uno usa el mismo
  // vocabulario de géneros/plataformas/estilos/experiencia/dificultad
  // definido arriba para que el algoritmo de puntuación pueda comparar.
  const GAMES = [
    { id:1, title:"The Witcher 3: Wild Hunt", genres:["RPG","Aventura","Mundo abierto/Sandbox"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["narrativa","desafiante"], difficulty:"media", year:2015, description:"Una épica aventura de rol en mundo abierto donde Geralt de Rivia busca a su hija adoptiva entre monstruos, intrigas políticas y decisiones con consecuencias reales." },
    { id:2, title:"Stardew Valley", genres:["Simulación","Indie","RPG"], platforms:["PC","PlayStation","Xbox","Nintendo Switch","Móvil"], playstyle:["solo","coop"], mood:["relajante"], difficulty:"casual", year:2016, description:"Gestiona tu propia granja, cultiva, pesca y entabla amistad con los habitantes de un pueblo encantador en este relajante simulador de vida." },
    { id:3, title:"Elden Ring", genres:["RPG","Mundo abierto/Sandbox","Acción"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo","coop"], mood:["desafiante"], difficulty:"muy-dificil", year:2022, description:"Explora las Tierras Intermedias en un vasto mundo abierto repleto de jefes brutales y secretos, con el característico desafío de FromSoftware." },
    { id:4, title:"Dark Souls III", genres:["RPG","Acción"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo","competitivo"], mood:["desafiante"], difficulty:"muy-dificil", year:2016, description:"Un RPG de acción implacable donde cada combate exige paciencia y precisión en un reino en decadencia lleno de enemigos letales." },
    { id:5, title:"Hades", genres:["RPG","Acción","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"dificil", year:2020, description:"Combate tu camino fuera del inframundo griego en este roguelike frenético con una historia llena de personalidad y diálogos memorables." },
    { id:6, title:"Celeste", genres:["Plataformas","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"dificil", year:2018, description:"Escala una montaña implacable en este plataformas de precisión que combina niveles exigentes con una conmovedora historia sobre salud mental." },
    { id:7, title:"Portal 2", genres:["Puzzle/Lógica","Aventura"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo","coop"], mood:["narrativa","desafiante"], difficulty:"media", year:2011, description:"Resuelve ingeniosos puzzles con portales espaciales mientras una IA tan hilarante como siniestra pone a prueba tu ingenio." },
    { id:8, title:"It Takes Two", genres:["Aventura","Plataformas","Acción"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["coop"], mood:["narrativa","relajante"], difficulty:"media", year:2021, description:"Una pareja en proceso de divorcio es convertida en muñecos y debe cooperar para salvar su relación en esta aventura cooperativa llena de creatividad." },
    { id:9, title:"Overcooked! 2", genres:["Simulación","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["coop"], mood:["competitiva","relajante"], difficulty:"media", year:2018, description:"Cocina contrarreloj junto a tus amigos en cocinas cada vez más caóticas en este divertido caos cooperativo." },
    { id:10, title:"Minecraft", genres:["Aventura","Mundo abierto/Sandbox","Simulación"], platforms:["PC","PlayStation","Xbox","Nintendo Switch","Móvil"], playstyle:["solo","coop"], mood:["relajante","narrativa"], difficulty:"casual", year:2011, description:"Construye, explora y sobrevive en un mundo de bloques generado proceduralmente con infinitas posibilidades creativas." },
    { id:11, title:"Terraria", genres:["Aventura","Mundo abierto/Sandbox","Acción","Plataformas"], platforms:["PC","PlayStation","Xbox","Nintendo Switch","Móvil"], playstyle:["solo","coop"], mood:["relajante","desafiante"], difficulty:"media", year:2011, description:"Excava, construye y combate en un mundo 2D lleno de biomas, jefes y crafteo, en solitario o acompañado." },
    { id:12, title:"Hollow Knight", genres:["Plataformas","Acción","Aventura","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"dificil", year:2017, description:"Explora el reino subterráneo de Hallownest en este metroidvania exquisito con combate preciso y una atmósfera melancólica." },
    { id:13, title:"Red Dead Redemption 2", genres:["Aventura","Mundo abierto/Sandbox","Acción"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo"], mood:["narrativa"], difficulty:"media", year:2018, description:"Vive el ocaso del salvaje oeste junto a Arthur Morgan en una de las narrativas más ricas e inmersivas jamás contadas en un videojuego." },
    { id:14, title:"God of War", genres:["Acción","Aventura","RPG"], platforms:["PC","PlayStation"], playstyle:["solo"], mood:["narrativa","desafiante"], difficulty:"dificil", year:2018, description:"Kratos y su hijo Atreus emprenden un viaje por la mitología nórdica repleto de combate brutal y una emotiva relación paternal." },
    { id:15, title:"The Legend of Zelda: Breath of the Wild", genres:["Aventura","Mundo abierto/Sandbox","RPG"], platforms:["Nintendo Switch"], playstyle:["solo"], mood:["narrativa","relajante"], difficulty:"media", year:2017, description:"Explora libremente el reino de Hyrule en una aventura que redefinió el mundo abierto con libertad creativa absoluta." },
    { id:16, title:"Mario Kart 8 Deluxe", genres:["Carreras"], platforms:["Nintendo Switch"], playstyle:["competitivo","coop"], mood:["competitiva","relajante"], difficulty:"casual", year:2017, description:"Carreras de karts llenas de color, power-ups y diversión para toda la familia, perfectas para competir con amigos." },
    { id:17, title:"Animal Crossing: New Horizons", genres:["Simulación","Indie"], platforms:["Nintendo Switch"], playstyle:["solo","coop"], mood:["relajante"], difficulty:"casual", year:2020, description:"Crea tu propia isla paradisíaca a tu ritmo, decorando, pescando y conviviendo con adorables vecinos animales." },
    { id:18, title:"Counter-Strike 2", genres:["Shooter/FPS","Acción"], platforms:["PC"], playstyle:["competitivo"], mood:["competitiva","desafiante"], difficulty:"dificil", year:2023, description:"El shooter táctico competitivo por excelencia, donde la puntería, la estrategia de equipo y los reflejos lo deciden todo." },
    { id:19, title:"Valorant", genres:["Shooter/FPS","Acción"], platforms:["PC"], playstyle:["competitivo"], mood:["competitiva","desafiante"], difficulty:"dificil", year:2020, description:"Shooter táctico por equipos que combina puntería precisa con habilidades únicas de agentes para un competitivo electrizante." },
    { id:20, title:"League of Legends", genres:["MOBA","Estrategia"], platforms:["PC"], playstyle:["competitivo"], mood:["competitiva","desafiante"], difficulty:"dificil", year:2009, description:"El MOBA más popular del mundo, donde la estrategia en equipo y el dominio de campeones definen partidas intensas." },
    { id:21, title:"Dota 2", genres:["MOBA","Estrategia"], platforms:["PC"], playstyle:["competitivo"], mood:["competitiva","desafiante"], difficulty:"muy-dificil", year:2013, description:"Un MOBA profundo y exigente con una curva de aprendizaje empinada, pensado para quienes buscan dominar mecánicas complejas en equipo." },
    { id:22, title:"Rocket League", genres:["Deportes","Carreras"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["competitivo","coop"], mood:["competitiva"], difficulty:"media", year:2015, description:"Fútbol con coches turbo propulsados en partidos frenéticos, fáciles de aprender pero muy difíciles de dominar." },
    { id:23, title:"EA Sports FC 24", genres:["Deportes"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["competitivo","coop"], mood:["competitiva"], difficulty:"media", year:2023, description:"El simulador de fútbol más popular, con clubes, ligas y selecciones reales para competir contra tus amigos o en modo carrera." },
    { id:24, title:"Forza Horizon 5", genres:["Carreras","Mundo abierto/Sandbox"], platforms:["PC","Xbox"], playstyle:["solo","competitivo"], mood:["relajante","competitiva"], difficulty:"casual", year:2021, description:"Recorre un vibrante mundo abierto mexicano al volante de cientos de coches en festivales de velocidad espectaculares." },
    { id:25, title:"Cyberpunk 2077", genres:["RPG","Mundo abierto/Sandbox","Shooter/FPS","Acción"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo"], mood:["narrativa","desafiante"], difficulty:"media", year:2020, description:"Sumérgete en Night City, una metrópolis futurista corrupta y deslumbrante, en una historia de identidad, poder y supervivencia." },
    { id:26, title:"Disco Elysium", genres:["RPG","Aventura","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["narrativa"], difficulty:"media", year:2019, description:"Un RPG narrativo excepcional centrado en el diálogo, donde investigas un crimen mientras reconstruyes tu propia identidad." },
    { id:27, title:"Baldur's Gate 3", genres:["RPG","Estrategia","Aventura"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo","coop"], mood:["narrativa","desafiante"], difficulty:"dificil", year:2023, description:"Un RPG por turnos monumental basado en Dungeons & Dragons, con libertad narrativa, compañeros memorables y decisiones que importan." },
    { id:28, title:"Civilization VI", genres:["Estrategia"], platforms:["PC","PlayStation","Xbox","Nintendo Switch","Móvil"], playstyle:["solo","competitivo"], mood:["desafiante","relajante"], difficulty:"media", year:2016, description:"Guía a tu civilización desde la Edad de Piedra hasta la era espacial en este adictivo juego de estrategia por turnos." },
    { id:29, title:"Age of Empires IV", genres:["Estrategia"], platforms:["PC","Xbox"], playstyle:["solo","competitivo"], mood:["desafiante","competitiva"], difficulty:"dificil", year:2021, description:"Estrategia en tiempo real clásica con civilizaciones históricas, gestión de recursos y batallas tácticas a gran escala." },
    { id:30, title:"Resident Evil Village", genres:["Terror","Acción","Aventura"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"dificil", year:2021, description:"Ethan Winters se adentra en un pueblo gótico infestado de horrores en esta aterradora mezcla de terror y acción en primera persona." },
    { id:31, title:"Dead Space", genres:["Terror","Acción","Shooter/FPS"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"dificil", year:2023, description:"A bordo de la nave Ishimura, enfrenta a los necromorfos en un terror espacial claustrofóbico de tensión constante." },
    { id:32, title:"Among Us", genres:["Puzzle/Lógica","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch","Móvil"], playstyle:["competitivo","coop"], mood:["relajante","competitiva"], difficulty:"casual", year:2018, description:"Descubre quién es el impostor entre tu tripulación en este party game social de deducción, perfecto para jugar en grupo." },
    { id:33, title:"Fall Guys", genres:["Plataformas","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch","Móvil"], playstyle:["competitivo"], mood:["relajante","competitiva"], difficulty:"casual", year:2020, description:"Compite en coloridas carreras de obstáculos multitudinarias donde la torpeza y la diversión están garantizadas." },
    { id:34, title:"Tetris Effect", genres:["Puzzle/Lógica"], platforms:["PC","PlayStation"], playstyle:["solo"], mood:["relajante","desafiante"], difficulty:"media", year:2018, description:"El clásico Tetris reinventado con música y efectos visuales hipnóticos que convierten cada partida en una experiencia sensorial." },
    { id:35, title:"Slay the Spire", genres:["Estrategia","RPG","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["desafiante"], difficulty:"dificil", year:2019, description:"Construye un mazo de cartas único mientras escalas una torre maldita en este roguelike de estrategia profundamente adictivo." },
    { id:36, title:"Sekiro: Shadows Die Twice", genres:["Acción","RPG"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"muy-dificil", year:2019, description:"Domina el arte del combate con espada y el parry perfecto en el Japón feudal en una de las experiencias más exigentes de FromSoftware." },
    { id:37, title:"Cuphead", genres:["Plataformas","Acción","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo","coop"], mood:["desafiante"], difficulty:"muy-dificil", year:2017, description:"Enfréntate a jefes imposibles con la estética de las caricaturas clásicas de los años 30 en este exigente run and gun." },
    { id:38, title:"Street Fighter 6", genres:["Lucha"], platforms:["PC","PlayStation","Xbox"], playstyle:["competitivo"], mood:["competitiva","desafiante"], difficulty:"dificil", year:2023, description:"El referente de los juegos de lucha regresa con combos espectaculares, un elenco carismático y una escena competitiva vibrante." },
    { id:39, title:"Mortal Kombat 1", genres:["Lucha","Acción"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["competitivo"], mood:["competitiva","desafiante"], difficulty:"dificil", year:2023, description:"Fatalities brutales y combos devastadores en un reinicio de la icónica saga de lucha con una historia cargada de fan-service." },
    { id:40, title:"DOOM Eternal", genres:["Shooter/FPS","Acción"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["desafiante","competitiva"], difficulty:"dificil", year:2020, description:"Un shooter en primera persona brutal y vertiginoso contra hordas demoníacas, con un ritmo de combate frenético y adictivo." },
    { id:41, title:"GRIS", genres:["Plataformas","Indie","Aventura"], platforms:["PC","PlayStation","Nintendo Switch","Móvil"], playstyle:["solo"], mood:["relajante","narrativa"], difficulty:"media", year:2018, description:"Una emotiva aventura de plataformas sin texto, de una belleza artística excepcional, que explora el duelo a través del color y la música." },
    { id:42, title:"Ori and the Blind Forest", genres:["Plataformas","Aventura","Indie"], platforms:["PC","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"dificil", year:2015, description:"Un metroidvania precioso y conmovedor con plataformeo exigente, una banda sonora sublime y una historia sobre sacrificio y esperanza." },
    { id:43, title:"Monument Valley", genres:["Puzzle/Lógica","Indie"], platforms:["Móvil"], playstyle:["solo"], mood:["relajante"], difficulty:"casual", year:2014, description:"Resuelve elegantes puzzles de geometría imposible guiando a la princesa Ida por arquitecturas que desafían la perspectiva." },
    { id:44, title:"Clash Royale", genres:["Estrategia","MOBA"], platforms:["Móvil"], playstyle:["competitivo"], mood:["competitiva"], difficulty:"media", year:2016, description:"Duelos de cartas en tiempo real donde despliegas tropas, gestionas tu mazo y derribas las torres del rival en partidas rápidas." },
    { id:45, title:"Genshin Impact", genres:["RPG","Aventura","Mundo abierto/Sandbox"], platforms:["PC","PlayStation","Móvil"], playstyle:["solo","coop"], mood:["narrativa","relajante"], difficulty:"media", year:2020, description:"Explora el vasto mundo de Teyvat en un RPG de acción de mundo abierto con combate elemental, exploración libre y una historia en expansión." },
    { id:46, title:"Pokémon Escarlata y Púrpura", genres:["RPG","Aventura","Mundo abierto/Sandbox"], platforms:["Nintendo Switch"], playstyle:["solo","coop"], mood:["relajante","narrativa"], difficulty:"casual", year:2022, description:"Recorre la región de Paldea en la primera aventura Pokémon de mundo abierto, capturando criaturas y completando tres historias a tu ritmo." },
    { id:47, title:"Super Mario Odyssey", genres:["Plataformas","Aventura"], platforms:["Nintendo Switch"], playstyle:["solo","coop"], mood:["relajante"], difficulty:"media", year:2017, description:"Acompaña a Mario y su gorra viviente Cappy por reinos imaginativos en una obra maestra del plataformeo 3D llena de secretos." },
    { id:48, title:"Tekken 8", genres:["Lucha"], platforms:["PC","PlayStation","Xbox"], playstyle:["competitivo"], mood:["competitiva","desafiante"], difficulty:"dificil", year:2024, description:"El rey de los juegos de lucha 3D regresa con combos devastadores, un plantel icónico y un sistema de combate agresivo y espectacular." },
    { id:49, title:"Gran Turismo 7", genres:["Carreras","Deportes"], platforms:["PlayStation"], playstyle:["solo","competitivo"], mood:["competitiva","relajante"], difficulty:"media", year:2022, description:"El simulador de conducción definitivo con cientos de coches reales, física realista y un amor por la cultura del automóvil." },
    { id:50, title:"NBA 2K24", genres:["Deportes"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["competitivo","coop"], mood:["competitiva"], difficulty:"media", year:2023, description:"El simulador de baloncesto de referencia, con equipos y jugadores reales, modo carrera y un competitivo online muy exigente." },
    { id:51, title:"Phasmophobia", genres:["Terror","Indie"], platforms:["PC"], playstyle:["coop"], mood:["desafiante"], difficulty:"media", year:2020, description:"Investiga casas encantadas junto a tus amigos usando equipo paranormal para identificar al fantasma... antes de que te encuentre a ti." },
    { id:52, title:"Outlast", genres:["Terror","Aventura"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"dificil", year:2013, description:"Sin armas y solo con una cámara de visión nocturna, sobrevive al horror de un psiquiátrico abandonado en este survival horror implacable." },
    { id:53, title:"Los Sims 4", genres:["Simulación"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo"], mood:["relajante"], difficulty:"casual", year:2014, description:"Crea personas, construye casas y controla sus vidas, relaciones y carreras en el simulador social más popular del mundo." },
    { id:54, title:"Factorio", genres:["Simulación","Estrategia","Indie"], platforms:["PC","Nintendo Switch"], playstyle:["solo","coop"], mood:["desafiante"], difficulty:"dificil", year:2020, description:"Construye y automatiza fábricas gigantescas en un planeta alienígena, optimizando cadenas de producción en este adictivo juego de ingeniería." },
    { id:55, title:"Fortnite", genres:["Shooter/FPS","Mundo abierto/Sandbox","Acción"], platforms:["PC","PlayStation","Xbox","Nintendo Switch","Móvil"], playstyle:["competitivo","coop"], mood:["competitiva"], difficulty:"media", year:2017, description:"El battle royale fenómeno cultural, donde construyes estructuras, recoges botín y luchas por ser el último en pie, solo o en equipo." },
    { id:56, title:"Candy Crush Saga", genres:["Puzzle/Lógica"], platforms:["Móvil"], playstyle:["solo"], mood:["relajante"], difficulty:"casual", year:2012, description:"Combina caramelos del mismo color para superar cientos de niveles en el puzzle casual más adictivo para jugar en cualquier momento." },
    { id:57, title:"Diablo IV", genres:["RPG","Acción","Mundo abierto/Sandbox"], platforms:["PC","PlayStation","Xbox"], playstyle:["solo","coop"], mood:["desafiante","narrativa"], difficulty:"dificil", year:2023, description:"Regresa a Santuario en un RPG de acción oscuro y gótico, masacrando demonios y recolectando botín en un vasto mundo compartido." },
    { id:58, title:"Final Fantasy XIV", genres:["RPG","Aventura"], platforms:["PC","PlayStation"], playstyle:["coop","solo"], mood:["narrativa","relajante"], difficulty:"media", year:2013, description:"Un MMORPG monumental con una de las mejores historias del género, mundos enormes que explorar y una comunidad muy acogedora." },
    { id:59, title:"Rainbow Six Siege", genres:["Shooter/FPS","Estrategia","Acción"], platforms:["PC","PlayStation","Xbox"], playstyle:["competitivo"], mood:["competitiva","desafiante"], difficulty:"dificil", year:2015, description:"Shooter táctico de asedio por equipos donde la destrucción del entorno, la coordinación y la información lo son todo." },
    { id:60, title:"Subnautica", genres:["Aventura","Simulación","Mundo abierto/Sandbox","Indie"], platforms:["PC","PlayStation","Xbox","Nintendo Switch"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"media", year:2018, description:"Sobrevive en un océano alienígena construyendo bases y explorando abismos tan hermosos como aterradores en este survival submarino." },

    // --- Clásicos / retro (PSP, Game Boy, Nintendo DS, Nintendo 64, SNES/NES) ---
    { id:61, title:"God of War: Chains of Olympus", genres:["Acción","Aventura"], platforms:["PSP"], playstyle:["solo"], mood:["desafiante","narrativa"], difficulty:"media", year:2008, description:"Precuela portátil donde Kratos desata su furia contra dioses y titanes de la mitología griega, con un combate brutal y espectacular que asombró en PSP." },
    { id:62, title:"Grand Theft Auto: Liberty City Stories", genres:["Acción","Mundo abierto/Sandbox"], platforms:["PSP"], playstyle:["solo"], mood:["narrativa"], difficulty:"media", year:2005, description:"Regreso a Liberty City en formato portátil siguiendo a Toni Cipriani; un mundo abierto criminal repleto de misiones, coches robados y libertad absoluta." },
    { id:63, title:"Patapon", genres:["Estrategia"], platforms:["PSP"], playstyle:["solo"], mood:["desafiante"], difficulty:"media", year:2008, description:"Dirige a una tribu de guerreros al ritmo del tambor; una mezcla hipnótica de estrategia y música que se convirtió en icono de culto de PSP." },
    { id:64, title:"Monster Hunter Freedom Unite", genres:["Acción","RPG"], platforms:["PSP"], playstyle:["solo","coop"], mood:["desafiante"], difficulty:"dificil", year:2009, description:"Caza colosales bestias, fabrica armaduras y mejora tu equipo solo o en grupo; un desafiante referente portátil que definió el género de caza." },
    { id:65, title:"Pokémon Red/Blue", genres:["RPG","Aventura"], platforms:["Game Boy"], playstyle:["solo"], mood:["relajante"], difficulty:"media", year:1996, description:"El inicio de una leyenda: atrapa, entrena y combate con criaturas mientras recorres Kanto para convertirte en el mejor entrenador Pokémon." },
    { id:66, title:"The Legend of Zelda: Link's Awakening", genres:["Aventura","Acción","Puzzle/Lógica"], platforms:["Game Boy"], playstyle:["solo"], mood:["narrativa"], difficulty:"media", year:1993, description:"Náufrago en la isla Koholint, Link explora mazmorras ingeniosas y resuelve enigmas en una aventura onírica e inolvidable para Game Boy." },
    { id:67, title:"Golden Sun", genres:["RPG","Aventura"], platforms:["Game Boy"], playstyle:["solo"], mood:["narrativa"], difficulty:"media", year:2001, description:"Jóvenes adeptos dominan la alquimia y la psinergia en un RPG por turnos de mundo mágico, con rompecabezas elementales y una historia épica." },
    { id:68, title:"Metroid Fusion", genres:["Acción","Aventura","Plataformas"], platforms:["Game Boy"], playstyle:["solo"], mood:["desafiante"], difficulty:"dificil", year:2002, description:"Samus explora una estación espacial infectada mientras un clon letal la persigue; acción y exploración tensa con la atmósfera opresiva del universo Metroid." },
    { id:69, title:"The World Ends with You", genres:["RPG","Acción"], platforms:["Nintendo DS"], playstyle:["solo"], mood:["narrativa"], difficulty:"media", year:2007, description:"Atrapado en un juego mortal en Shibuya, Neku lucha usando la pantalla táctil en un RPG urbano de estilo visual único y banda sonora vibrante." },
    { id:70, title:"Mario Kart DS", genres:["Carreras"], platforms:["Nintendo DS"], playstyle:["solo","competitivo"], mood:["competitiva"], difficulty:"media", year:2005, description:"Carreras frenéticas con objetos caóticos y circuitos retro; su multijugador y la conducción derrapando lo convirtieron en un clásico instantáneo." },
    { id:71, title:"Castlevania: Dawn of Sorrow", genres:["Acción","Aventura","Plataformas"], platforms:["Nintendo DS"], playstyle:["solo"], mood:["desafiante"], difficulty:"media", year:2005, description:"Soma Cruz absorbe las almas de los enemigos para avanzar por un castillo laberíntico; un metroidvania gótico lleno de secretos y acción fluida." },
    { id:72, title:"Professor Layton and the Curious Village", genres:["Puzzle/Lógica","Aventura"], platforms:["Nintendo DS"], playstyle:["solo"], mood:["relajante"], difficulty:"media", year:2007, description:"El elegante profesor y su aprendiz resuelven un misterio en un pueblo repleto de acertijos ingeniosos; aventura relajante con encanto artesanal." },
    { id:73, title:"Super Mario 64", genres:["Plataformas","Aventura"], platforms:["Nintendo 64"], playstyle:["solo"], mood:["desafiante"], difficulty:"media", year:1996, description:"La revolución del plataformas en 3D: salta, corre y explora mundos llenos de estrellas con una libertad de movimiento que cambió los videojuegos." },
    { id:74, title:"The Legend of Zelda: Ocarina of Time", genres:["Aventura","Acción"], platforms:["Nintendo 64"], playstyle:["solo"], mood:["narrativa"], difficulty:"media", year:1998, description:"Link viaja en el tiempo para salvar Hyrule en una aventura épica considerada de las mejores de la historia, con mazmorras memorables y música mágica." },
    { id:75, title:"GoldenEye 007", genres:["Shooter/FPS","Acción"], platforms:["Nintendo 64"], playstyle:["solo","competitivo"], mood:["competitiva"], difficulty:"media", year:1997, description:"El shooter que popularizó el género en consola; campaña de espionaje y un multijugador a pantalla dividida que marcó a toda una generación." },
    { id:76, title:"Super Smash Bros.", genres:["Lucha","Acción"], platforms:["Nintendo 64"], playstyle:["competitivo","solo"], mood:["competitiva"], difficulty:"media", year:1999, description:"Mascotas de Nintendo se enfrentan en combates caóticos y festivos; el origen de una saga de lucha única pensada para jugar entre amigos." },
    { id:77, title:"Super Mario Bros. 3", genres:["Plataformas"], platforms:["SNES/NES"], playstyle:["solo"], mood:["desafiante"], difficulty:"media", year:1988, description:"Mario regresa con trajes, mapas y niveles ingeniosos en una obra cumbre del plataformas clásico que marcó la edad dorada de Nintendo." },
    { id:78, title:"Chrono Trigger", genres:["RPG","Aventura"], platforms:["SNES/NES"], playstyle:["solo"], mood:["narrativa"], difficulty:"media", year:1995, description:"Un grupo de héroes viaja a través del tiempo para evitar el fin del mundo; un RPG legendario de combate ágil, historia inolvidable y múltiples finales." },
    { id:79, title:"The Legend of Zelda: A Link to the Past", genres:["Aventura","Acción"], platforms:["SNES/NES"], playstyle:["solo"], mood:["narrativa"], difficulty:"media", year:1991, description:"Link cruza entre el Mundo de la Luz y el de las Tinieblas en una aventura de mazmorras y secretos que definió la fórmula de la saga Zelda." },
    { id:80, title:"Super Metroid", genres:["Acción","Aventura","Plataformas"], platforms:["SNES/NES"], playstyle:["solo"], mood:["desafiante"], difficulty:"dificil", year:1994, description:"Samus explora el planeta Zebes en una obra maestra de exploración y aislamiento; atmósfera opresiva, mejoras y una ambientación que inspiró a todo un género." }
  ];

  // Portadas oficiales desde la CDN pública de Steam (clave = id del juego,
  // valor = appid de Steam). Se resolvieron una vez con la API gratuita de
  // búsqueda de Steam. Los juegos sin entrada (exclusivos de Nintendo, móvil,
  // Epic, etc.) usan el póster generativo. Si una imagen no carga (sin
  // conexión o appid retirado), la tarjeta cae automáticamente al póster
  // generativo gracias al manejador onerror en app.js.
  const STEAM_COVERS = {
    1:292030, 2:413150, 3:1245620, 4:374320, 5:1145360, 6:504230, 7:620,
    8:1426210, 9:728880, 11:105600, 12:367520, 13:1174180, 14:1593500,
    18:730, 21:570, 24:1551360, 25:1091500, 26:632470, 27:1086940,
    28:289070, 29:1466860, 30:1196590, 31:1693980, 32:945360, 33:1097150,
    34:1003590, 35:646570, 36:814380, 37:268910, 38:1364780, 39:1971870,
    40:782330, 41:683320, 42:261570, 43:1927720, 48:1778820, 51:739630,
    52:238320, 53:1222670, 54:427520, 57:2344520, 58:39210, 59:359550,
    60:264710
  };
  GAMES.forEach(function(g){
    if(STEAM_COVERS[g.id]){
      g.steamAppId = STEAM_COVERS[g.id];
      g.image = "https://cdn.cloudflare.steamstatic.com/steam/apps/" + g.steamAppId + "/header.jpg";
    }
  });

  // Portadas desde Wikipedia (API pública) para juegos que NO están en Steam
  // (exclusivos de Nintendo, móvil y clásicos/retro). Si alguna no carga, la
  // tarjeta cae al póster generativo gracias al manejador onerror en app.js.
  const WIKI_COVERS = {
    15:"https://en.wikipedia.org/wiki/Special:FilePath/The%20Legend%20of%20Zelda%20Breath%20of%20the%20Wild.jpg",
    16:"https://en.wikipedia.org/wiki/Special:FilePath/MarioKart8Boxart.jpg",
    19:"https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/960px-Valorant_logo_-_pink_color_version.svg.png",
    20:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/League_of_Legends_2019_vector.svg/960px-League_of_Legends_2019_vector.svg.png",
    22:"https://en.wikipedia.org/wiki/Special:FilePath/Rocket%20League%20coverart.jpg",
    23:"https://en.wikipedia.org/wiki/Special:FilePath/EA%20FC24%20Cover.jpg",
    44:"https://en.wikipedia.org/wiki/Special:FilePath/Clash%20Royale%202v2.jpg",
    45:"https://en.wikipedia.org/wiki/Special:FilePath/Genshin%20Impact%20gameplay%20elemental%20reaction%20overloaded.png",
    46:"https://en.wikipedia.org/wiki/Special:FilePath/Pok%C3%A9mon%20Scarlet%20and%20Violet%20banner.png",
    56:"https://en.wikipedia.org/wiki/Special:FilePath/Candy%20Crush%20Saga%20game%20setup%20example.jpg",
    64:"https://en.wikipedia.org/wiki/Special:FilePath/MonsterHunterFreedomUnite.jpg",
    66:"https://en.wikipedia.org/wiki/Special:FilePath/The%20Legend%20of%20Zelda%20Link's%20Awakening%20(2019%20video%20game).jpg",
    70:"https://upload.wikimedia.org/wikipedia/en/8/86/Mario_Kart_DS_cover.jpg",
    71:"https://en.wikipedia.org/wiki/Special:FilePath/Castlevania%20Dawn%20of%20Sorrow%20NA%20Cover.jpg",
    72:"https://en.wikipedia.org/wiki/Special:FilePath/Professor%20Layton%20and%20the%20Curious%20Village%20NA%20Boxart.JPG",
    73:"https://en.wikipedia.org/wiki/Special:FilePath/Super%20Mario%2064%20DS%20Coverart.png",
    74:"https://en.wikipedia.org/wiki/Special:FilePath/OcarinaofTime2026.jpeg",
    78:"https://en.wikipedia.org/wiki/Special:FilePath/ChronoTriggerInside.PNG",
    79:"https://en.wikipedia.org/wiki/Special:FilePath/The%20Legend%20of%20Zelda%20A%20Link%20to%20the%20Past%20%26%20Four%20Swords%20Game%20Cover.jpg",
    80:"https://en.wikipedia.org/wiki/Special:FilePath/Smetroidbox.jpg"
  };
  GAMES.forEach(function(g){ if(!g.image && WIKI_COVERS[g.id]) g.image = WIKI_COVERS[g.id]; });

  // Definición de los 5 pasos del cuestionario, en el orden exacto solicitado.
  const STEPS = [
    { id:"genres", type:"multi", title:"¿Qué géneros te gustan?", hint:"Elige uno o varios géneros (mínimo 1).", options:GENRE_OPTIONS },
    { id:"playstyle", type:"single", title:"¿Prefieres jugar solo o con amigos?", hint:"Selecciona una opción.", options:PLAYSTYLE_OPTIONS },
    { id:"platforms", type:"multi", title:"¿En qué plataforma juegas?", hint:"Elige una o varias plataformas (mínimo 1).", options:PLATFORM_OPTIONS },
    { id:"mood", type:"single", title:"¿Qué experiencia buscas?", hint:"Selecciona una opción.", options:MOOD_OPTIONS },
    { id:"difficulty", type:"single", title:"¿Qué tan difícil quieres que sea?", hint:"Selecciona una opción.", options:DIFFICULTY_OPTIONS }
  ];

  // Punto único y explícito de acceso a los datos para app.js.
  // data.js debe cargarse ANTES que app.js (orden garantizado por
  // <script defer> en index.html).
  window.GAMECAST_DATA = {
    genreOptions: GENRE_OPTIONS,
    platformOptions: PLATFORM_OPTIONS,
    playstyleOptions: PLAYSTYLE_OPTIONS,
    moodOptions: MOOD_OPTIONS,
    difficultyOptions: DIFFICULTY_OPTIONS,
    playstyleLabels: PLAYSTYLE_LABELS,
    difficultyLabels: DIFFICULTY_LABELS,
    difficultyOrder: DIFFICULTY_ORDER,
    genreIcons: GENRE_ICONS,
    games: GAMES,
    steps: STEPS
  };
})();
