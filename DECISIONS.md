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
