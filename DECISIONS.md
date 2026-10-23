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
