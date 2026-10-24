# Decisiones de implementación

## Alcance H1

- Se sigue §12: H1 implementa infraestructura, cuatro estados y navegación.
  La estructura de §2.1 se construye al implementar cada módulo, sin archivos
  vacíos, TODOs ni stubs de H2–H6. Las carpetas futuras se documentan aquí:
  `js/physics`, `js/game`, `js/audio`, `js/storage`, `js/debug`, `js/render/draw`
  e `icons`; Git las incorporará cuando contengan implementaciones.
- «Estados vacíos» significa sin reglas de gameplay, persistencia o administración.
  Los estados sí implementan entrada/salida, liberación de listeners, entrada
  unificada y render de un indicador de actividad. `SkeletonScreen` comparte
  ese comportamiento hasta las pantallas definitivas de H4/H5.
- La transición de prueba PLAYING → GAME_OVER se activa con un botón explícito.
  En H3 se conectará al fin del buzzer. El admin tiene acceso visible rotulado
  «PRUEBA H1»; en H5 se reemplazará por el disparador secreto y el PIN. H1 no
  presenta una interfaz administrativa real ni promete protección por PIN.
- README y DECISIONS se crean desde H1 para documentar decisiones y ejecución;
  se completarán y verificarán en H6. No se anticipan SW, manifest, audio,
  física, demo, ranking, leads ni persistencia de errores.
- Renderer base se adelanta para garantizar DPR ≤ 2, transformación fija del
  mundo, resize y fondo que cubre el viewport. El arte completo pertenece a H3.
- `tools/serve.js` usa solo Node y sirve desde la raíz del repositorio, también
  al ejecutarse desde otra carpeta. No hay paquetes que instalar ni lockfile.
  El servidor rechaza rutas ocultas y no permite escritura vía HTTP.
- Los estados invalidan sus listeners con AbortController al salir. Los recursos
  de aplicación se liberan en pagehide; bfcache conserva el esqueleto pausado.
- `IdleWatcher` usa performance.now y un intervalo de 200 ms independiente del
  loop; la cuenta sigue corriendo en horizontal. No reinicia el reloj por resize
  ni por cambio de visibilidad. La revisión se repite al volver del background,
  dado que el navegador puede limitar timers de pestañas ocultas.
- El loop se pausa por visibilidad u orientación y reanuda con reloj limpio.
  Volver de una pestaña oculta descarta PLAYING. Rotar solo pausa y reanuda.
- El fallback de mouse se limita a localhost y debug, con puntero preciso;
  los timestamps del evento filtran mouse emulado durante 800 ms tras touch.
- Los tokens CSS y canvas se mantienen espejados como exige §4.1. El SVG de marca
  es el único texto fijo en inglés que forma parte del arte de marca requerido.
  Todos los mensajes de interfaz están centralizados en `js/i18n/es.js`.

## Verificación

Los 15 tests de H1 cubren transiciones y limpieza, límite del loop, pausa/reanudación,
invocación de las APIs nativas de animación, inactividad, manejo de un único toque
y respuestas HTTP del servidor. Los tests de física, almacenamiento,
CSV y precache se agregan en sus hitos, cuando exista la implementación.

Verificación del 23/10/2026:

- `npm test`: 15 tests aprobados, cero fallos.
- `npm run dev`: inicia en http://127.0.0.1:5173. Chrome headless carga la página
  y todos sus módulos; cero errores de consola, excepciones o recursos fallidos.
- 19 comprobaciones automatizadas de navegador mediante Chrome DevTools Protocol:
  recorrido completo de los estados; CTA con entrada táctil del navegador;
  feedback de coordenadas; CSS kiosk; botones ≥ 88 px; CTA ≥ 70 %;
  DPR limitado a 2; orientación y pausa/reanudación; aviso/retorno por inactividad;
  consumo del gesto que cierra el aviso; cancelación de gestos; 100 ciclos de
  navegación con una sola pantalla visible; un listener por botón activo y cero
  en los botones de los otros tres estados; layout en 360 × 640.
- Para comprobar el handler de visibilidad se simuló `document.hidden` y se
  despachó `visibilitychange`; no se presenta como prueba de cambio de pestaña
  en dispositivo real. Para los umbrales de inactividad se adelantó el reloj de
  actividad mediante el objeto de debug; los tests unitarios cubren 5…1.
- Captura de la portada de 768 × 1024 CSS px inspeccionada visualmente, sin
  recortes ni superposiciones. Los artefactos locales están en `.artifacts/`
  (ignorados por Git, incluido el perfil temporal de Chrome).
- Las verificaciones con HTTP/Chrome necesitaron ejecutarse fuera del aislamiento
  de red del entorno de trabajo para compartir localhost; no se cambió el código
  de la aplicación ni se agregaron dependencias para esa circunstancia.

Comprobación manual adicional en tableta: mantener y cancelar un toque, probar
pinch/doble tap, salir y regresar a la app, rotar, dejar 35 s sin tocar y repetir
con Wake Lock/Fullscreen no disponibles. Las APIs opcionales se detectan y sus
rechazos se capturan, pero su soporte real en Android/Safari se verificará allí.

La prueba de 8 horas, 200 rondas y los 60 fps en Android/iPad reales están
pendientes de H6; no se han ejecutado ni se dan por aprobadas en H1.

## Alcance H2

- Corrección posterior a la prueba del usuario: en escritorio local/debug con
  puntero principal fino se permite una ventana horizontal y se omiten Fullscreen
  y el bloqueo de orientación. El primer clic podía ampliar la vista al monitor
  horizontal y bloquear el juego. Renderer ya centra el mundo lógico vertical;
  no cambian la física ni sus coordenadas. Tablet/emulación con puntero grueso
  conserva el overlay y la pausa horizontal. Es una excepción de desarrollo a
  §2.3/§7, coherente con el fallback de mouse previsto en §1.3.
  Verificación de esta corrección: 50 tests aprobados; en el navegador integrado
  del usuario, recarga y clic real en «Jugar» abren PLAYING sin el aviso de giro,
  con pelota/aro visibles y sin errores de consola.

- Se implementan `Vec2`, `collide`, `World`, `FlickTracker`, `Ball`, `Hoop`,
  `ShotJudge` y `DebugOverlay`, con tests puros en Node. `launch.js` separa el
  vector de lanzamiento y `predict.js` la predicción para diagnóstico.
- `PhysicsLab` y `PhysicsScreen` reemplazan únicamente la vista de PLAYING del
  esqueleto. Proporcionan una prueba de tiro ejecutable sin adelantar `Round`,
  cronómetro, rachas, demo automática, HUD definitivo, audio ni persistencia.
  El +2/+3 que aparece es el resultado del juez por tiro, sin acumulación.
- `World` preasigna seis pelotas, vectores, contacto y evento; todos se reutilizan.
  H2 mantiene una pelota por vez en la prueba. Se repone en el primer paso tras
  terminar el fade de 600 ms, siempre en (360, 1380). El respawn a 450 ms, spawn
  aleatorio y límite de tres pelotas en vuelo son responsabilidad de Round en H3.
- Las entradas conservan event.timeStamp, transformado a unidades del mundo por
  InputManager; los relojes de tiro usan milisegundos de simulación fija. Rotar
  pausa esos relojes y cancela el swipe, mientras la inactividad sigue usando
  tiempo real. Ocultar/volver, salir o ir al admin limpia el mundo y el gesto.
- La asistencia se aplica después de los clamps, como indica §3.3. No se vuelve
  a limitar la magnitud después de corregir vx: hacerlo alteraría vy. El test
  analítico permite aimAssist=1; el valor inicial de la prueba sigue siendo 0,15.
- La abertura para la compuerta A comprueba el centro de la pelota entre puntas
  más/menos el radio de la punta, exactamente como §3.6. La física de contacto
  ya impide que el cuerpo de la pelota atraviese las puntas.
- La compuerta A renueva su timestamp en cada cruce descendente válido. La marca
  upwardThrough impide confirmar tiros que entraron desde abajo; cada resolución
  pasa a dead y dispara el callback una sola vez.
- Hoop prepara geometría previa/actual y velocidad cinemática, con compuertas
  que se mueven junto al aro. En H2 permanece fijo; Round habilitará la oscilación
  de los últimos diez segundos en H3 y el toggle se agregará en H5.
- El tracker mantiene 32 muestras en Float64Array y preserva el inicio fuera del
  ring para distancia/duración. Usa una tolerancia de 1e−8 u en el borde del radio
  de agarre para evitar rechazos por redondeo IEEE-754.
- Los contactos publican sfx:rim/sfx:board mediante el EventBus existente, con
  intensidad de velocidad normal relativa y cooldown de 60 ms por pelota. No hay
  sonido hasta conectar Sfx en H3.
- El render de H2 es geometría procedural mínima. La red respeta el trapecio de
  §3.1 y es visual; no tiene colisionadores. El render completo sigue en H3.
- Debug se importa dinámicamente solo con ?debug=1. No hay arrays de predicción
  ni listeners de sus atajos en modo normal. R reinicia la prueba H2 en PLAYING;
  A usa la navegación existente al admin, todavía sin PIN según el alcance H5.
- La trayectoria usa el mismo integrador y arrastre, ocho pasos fijos por punto
  a 1/30 s; representa vuelo libre sin colisiones y se calcula una vez por tiro.
  Los textos de diagnóstico se actualizan cada 200 ms; no se formatean por frame.
- El anillo de progreso depende del disparador secreto AdminTrigger (H5). Se
  conecta allí; H2 no simula una zona secreta ni muestra progreso ficticio.

## Verificación H2 · 23/10/2026

- `npm test`: 47 tests aprobados, incluidos los 15 de H1.
- `npm run dev`: arranque en http://127.0.0.1:5173, sin errores del servidor.
- Chrome headless: 25 comprobaciones aprobadas, cero errores de consola,
  excepciones o recursos fallidos. Se verificaron modo normal y ?debug=1.
- Un swipe táctil generado mediante Chrome DevTools Protocol, con event.timeStamp
  de 60 ms, produjo swish en el loop rAF activo; se observaron compuertas,
  feedback, fade y vuelta de la misma pelota a ready. También se probaron tap
  corto, cancelación táctil, R/A, pausa por orientación, limpieza al volver de
  visibilidad oculta e idle, y 100 ciclos de navegación sin acumular listeners.
- Las pruebas de visibilidad e inactividad simulan el evento y adelantan la marca
  de actividad; no equivalen a validación de APIs ni rendimiento en tablet real.
- Se inspeccionaron capturas verticales del modo normal y debug en `.artifacts/`
  (artefactos locales ignorados por Git). Quedan pendientes las pruebas físicas
  en Android/iPad y el soak de H6; no se presentan como ejecutados.

## Alcance H3

- `Round` es un controlador puro, sin DOM: countdown → live → buzzer → complete.
  Los pasos y deadlines se cuentan en ticks enteros de 1/240 s para evitar
  acumulación de error en 700/450/1200/2500 ms. El World sigue usando su tiempo
  de simulación para la física, los tiros, el fade y las animaciones de spawn.
- Countdown muestra 3, 2, 1, ¡YA! durante 700 ms cada uno. No descuenta tiempo
  de los 45 s y bloquea todos los lanzamientos. Se admiten 30/45/60 s mediante
  settings; el panel persistente de configuración pertenece a H5.
- Primera pelota en (360, 1380); las siguientes eligen x entre 200 y 520 u al
  cumplir 450 ms desde el lanzamiento, siempre con menos de tres tiros vivos.
  Si no hay capacidad de vuelo o pool libre, el spawn espera al primer tick con
  capacidad, sin reducir los 450 ms. Los seis objetos de Ball se reutilizan.
- Los resultados se cuentan en orden de resolución de World; dos resoluciones
  en el mismo tick mantienen el orden determinista del pool. La tercera canasta
  consecutiva ya recibe +1; un fallo corta la racha inmediatamente.
- Se resuelve la ambigüedad del buzzer de §3.7/§4.4 mostrando ¡TIEMPO! al menos
  1,2 s. Aunque no quede ningún tiro, se conserva ese aviso antes del resumen;
  si quedan tiros se espera hasta resolverlos o hasta 2,5 s desde cero. Los tiros
  que aún no se resolvieron al deadline se marcan fallo sin más puntaje. No se
  crean pelotas ni se aceptan swipes durante buzzer. El botón de finalizar prueba
  de H2 deja de formar parte del recorrido de juego.
- El aro móvil se activa suavemente desde offset 0 en los últimos diez segundos,
  usando tiempo relativo al inicio de la oscilación. Continúa durante buzzer;
  tablero, puntas y compuertas conservan el movimiento cinemático de H2.
- `PlayingScreen` consume eventos de la ronda y se encarga de sonido, vibración,
  partículas, resorte de la red y HUD, sin mezclar estas APIs con el scoring.
  Sus listeners y la suscripción al bus se retiran al salir. Abrir admin, idle,
  ocultar/volver o salir aborta la ronda y libera su pool sin producir resultados.
- Canvas dibuja fondo extendido (incluido letterbox), patrón de huellas, luces,
  cancha, tablero, aro trasero, pelotas, red trapezoidal con resorte, aro delantero,
  partículas e indicadores superiores. El HUD DOM es la última capa y se alinea
  al mismo rectángulo lógico que Canvas; el logo mide al menos 96 × 96 CSS px.
- El logo del HUD conserva el acceso explícito de prueba al admin para mantener
  el recorrido aprobado de H1/H2. El disparador secreto y su anillo siguen en H5.
  Como botón nativo, no inicia flicks ni consume las muestras de una pelota.
- Las partículas se preasignan en un pool de 200; se descarta emisión si está
  lleno. Cada canasta emite 12–18 huellas. La racha añade llamas cada 50 ms por
  pelota en vuelo; el primer fallo las deja extinguirse con su vida de 300 ms.
  El módulo también sabe dibujar confeti de huesos para las pantallas de H4.
- HUD actualiza strings solo al cambiar un valor o producirse un evento. Usa
  tres huellas para la racha, +puntos flotantes, bump de score, últimos cinco
  segundos rojos a 1 Hz, countdown y una mano SVG a los tres segundos sin tiro.
  Ninguna animación visual de pulso parpadea por encima de 3 Hz.
- `Sfx` crea AudioContext al primer gesto; resume un contexto desbloqueado al
  volver de una pausa. Ruido blanco procedural compartido, master 0,6, ocho slots
  de voz y desconexión de fuentes terminadas. Los AudioScheduledSourceNode son
  necesariamente de un solo uso: se crean por evento de audio, nunca por frame.
  Swish, aro, tablero, beep/¡YA!, tics, buzzer y ladrido no usan archivos externos.
  Ausencia/denegación de Web Audio no interrumpe la ronda; un resume rechazado
  puede reintentarse con otro gesto. soundEnabled se aplica al entrar/reiniciar.
- Se conserva la excepción de escritorio aprobada: en localhost/debug con mouse
  no se fuerza fullscreen ni se bloquea por ventana horizontal. Tablet mantiene
  orientación vertical, pausa y las restricciones de gestos.
- La pantalla GAME_OVER del esqueleto recibe un resumen de score, tiros,
  canastas, acierto, swishes y mejor racha para que H3 quede ejecutable. Conteo
  animado, ranking, premios, leads y Storage se implementan en H4; no se simulan
  ni se guardan resultados todavía. La portada sigue sin DemoPlayer hasta H4.
- PhysicsLab/PhysicsScreen y sus tests de H2 se conservan como harness independiente;
  ya no se cargan en el recorrido normal. Debug usa Round y R reinicia countdown.

## Verificación H3 · 23/10/2026

- `npm test`: 66 tests aprobados, incluidos los 50 de los hitos anteriores.
- Comprobación de sintaxis de todos los módulos con `node --check` y diff sin
  errores de whitespace.
- Navegador integrado: recorrido de entrada 3/¡YA!/live, lanzamiento real con
  mouse que produjo +3, spawn siguiente en x aleatorio y ronda completa de 45 s
  con resultado «3 PUNTOS · 1/1 canastas · 100% de acierto · 1 swishes · Mejor
  racha: 1». Consola sin errores ni warnings durante las pruebas.
- Se verificó el modo debug, FPS/pasos/pelotas, R que vuelve a 3 y 45 s, A que
  descarta la ronda, retorno a cero pelotas y diez ciclos jugar → admin → salir
  sin acumular pantallas ni errores. El HUD se inspeccionó visualmente con cancha,
  pelota, aro, red y logo, manteniendo libre el área de tiro.
- Tests nuevos: duraciones y countdown, respawn, límite de vuelo, scoring y orden
  de racha, scoring posterior al cero, límites mínimo/máximo del buzzer, cancelación,
  movimiento suave y continuidad en buzzer, pools de partículas y voces, efectos
  Web Audio y degradación sin API. El audio se valida con un contexto simulado
  y con ausencia de errores de Web Audio en navegador; la calidad auditiva final,
  vibración y rendimiento sostenido en tablet requieren prueba física.
- El soak de ocho horas, 200 rondas en dispositivos reales, offline/PWA y los
  criterios de hardening siguen pendientes de H6; no se consideran aprobados aquí.

## Corrección temprana de dirección: POV frontal · 23/10/2026

- El usuario pidió explícitamente cambiar la vista de costado por una vista
  frontal en primera persona, aportando dos imágenes de referencia. Esta petición
  sustituye la geometría lateral original. Se añadió §13 a PROMPT_CODEX.md para
  que los hitos siguientes no vuelvan al modelo visual anterior.
- La ronda usa FrontalWorld, FrontalHoop, FrontalShotJudge y frontalLaunch.
  Añaden profundidad física a la misma integración fija y al mismo pool de
  pelotas. Canvas sigue siendo 2D, con proyección de x/y/z y radio por distancia.
  No hay dependencias, imágenes de arte ni WebGL.
- El tablero se dibuja ancho y centrado, con objetivo y huella de marca. El aro
  se ve como una elipse frontal, la cancha como un trapecio y la pelota aparece
  más grande en primer plano, con sombra de piso y reducción durante el viaje.
- Se conservan los módulos y tests puros laterales de H2 como harness histórico;
  no se cargan en la ronda jugable para simular tiros laterales. FlickTracker
  acepta un calculador de lanzamiento inyectado para compartir muestreo/rechazos.
- El primer tiro parte de x=540; los siguientes varían entre 380 y 700. Un gesto
  recto desde el centro puede encestar. No se corrige la profundidad con aimAssist:
  la velocidad del gesto sigue diferenciando tiros cortos, correctos y pasados.
- La canasta exige cruces descendentes físicos de A/B dentro de la abertura
  circular x/z. No basta una coincidencia visual. Las colisiones se resuelven
  como esfera contra tubo del aro, tablero finito o piso, preservando swish,
  restitución/fricción, sonido, fade, puntuación, racha y buzzer.
- Los efectos usan posiciones proyectadas. Se mantiene un array de seis
  referencias para ordenar pelotas de lejos a cerca sin allocations por frame;
  las que están delante del aro se dibujan delante de la red. Los indicadores y
  la trayectoria de debug también usan la proyección frontal.
- Las constantes nuevas están agrupadas como FRONTAL_* para calibrar la nueva
  dirección sin modificar las regresiones históricas de H2. Los tests de Round
  se actualizaron al spawn y a los contactos frontales; se conservan sus reglas.

Verificación: 75 tests aprobados, incluyendo proyección, tamaño por distancia,
lanzamiento recto, predicción, rebote del aro y tablero en profundidad, rechazo
de coincidencia de pantalla a profundidad errónea, gates y reciclaje. En el
navegador integrado se inspeccionó la vista y un tiro real de potencia media
marcó 2 puntos, sin errores ni warnings de consola. La calibración de sensación
del tiro se debe terminar en tableta con el nuevo POV.

## Corrección de rebotes y lectura de canastas · 23/10/2026

- Los gestos fuertes alcanzaban el máximo de potencia y podían pasar por encima
  del tablero. Al bajar por detrás, el dibujo de la pelota quedaba delante del
  panel y parecía atravesarlo. Ahora la oclusión respeta la profundidad del
  tablero, y el aro se dibuja con la misma proyección circular que su collider.
- Se comprime la potencia vertical superior a 2700 u/s con factor 0,25 antes de
  calcular vy/vz. Un gesto fuerte centrado ahora puede rebotar físicamente en el
  tablero y encestar; los tiros débiles o desviados siguen fallando. No se otorgan
  puntos por mera coincidencia de pantalla.
- Se añadió feedback breve de contacto y una caída por la red de 450 ms después
  de que el juez confirma la canasta. La pelota permanece opaca durante la caída
  y desaparece al completar 600 ms. Esa animación no altera el resultado, no
  produce nuevos contactos ni vuelve a puntuar; mantiene el pool existente.
- Verificación: 80 tests aprobados, incluidos rebote con inversión de velocidad
  hacia la cámara, crecimiento aparente, tiro fuerte que encesta tras contacto,
  oclusión, swish con caída visible, reciclaje y tiro débil fallado. En navegador,
  un gesto fuerte recto desde el primer spawn sumó 2 puntos; consola sin errores
  ni warnings. La sensación y el audio en una tablet física siguen pendientes.

## Eliminación del bloqueo de orientación · 23/10/2026

- Por petición explícita del usuario tras publicar en Vercel, se eliminan el
  modal de giro, la pausa y deshabilitación de entrada por orientación, sus
  listeners y el lock de pantalla vertical. El renderer existente centra y
  escala la cancha al cambiar el tamaño, sin detener la ronda.
- La entrada con mouse y la omisión de fullscreen en escritorio dejan de
  depender de localhost/debug; así el sitio publicado también es jugable con
  mouse. El filtrado de mouse emulado tras touch sigue vigente.
- El layout compacto para ventanas bajas también aplica en horizontal. La
  especificación y las instrucciones de PWA futuras usan orientación libre.
- Verificación: 80 tests aprobados, incluyendo fullscreen sin lock de orientación
  y entrada tolerante al rechazo de fullscreen. Arranque y cuenta regresiva en
  navegador local sin errores ni warnings. El despliegue de Vercel necesita
  actualizarse con este commit; no se ha publicado desde esta sesión.
