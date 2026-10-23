# ThreeBall 2D · H2

Base kiosk y prueba de física/flick en HTML, CSS y JavaScript ES2020, sin bundler ni dependencias.
Requiere Node.js 20 o posterior para las herramientas locales.

## Correr en local

```sh
npm run dev
npm test
```

Abre http://127.0.0.1:5173. En escritorio local con mouse puedes usar cualquier
tamaño de ventana: el mundo vertical se centra y no se pide pantalla completa
automáticamente. En tablet o emulación táctil usa orientación **vertical**.
No hace falta instalar paquetes. También puede servirse la
carpeta con cualquier servidor estático.

Recorrido: «¡TOCA AQUÍ PARA JUGAR!» → «FINALIZAR PRUEBA» → «JUGAR DE NUEVO» o
«Saltar». «ABRIR ADMIN · PRUEBA» permite visitar la cuarta pantalla y «Salir»
vuelve a la portada. La navegación de H1 se conserva; PLAYING ahora muestra una
prueba de física de H2. Todavía no hay ronda cronometrada, puntaje acumulado,
formularios ni PIN.

En la prueba verás una pelota abajo a la izquierda, el aro y tablero a la derecha
y el piso. Desliza **desde la pelota**, mayormente hacia arriba y un poco hacia
la derecha, y suelta. La zona circular teal muestra dónde puede comenzar el
gesto. Un toque corto o un gesto descendente no lanza y muestra
«¡Desliza hacia el aro!». Un ejemplo de tiro válido en el mundo lógico es avanzar
unos 20 u a la derecha y 180 u hacia arriba en 60 ms: la velocidad final ronda
(294, −2700) u/s con la asistencia por defecto. No es necesario acertar esos
valores exactos para lanzar.

La pelota rebota en aro, tablero y piso. Las compuertas detectan canasta (+2) o
swish (+3); el mensaje informa **solo el tiro**, sin acumular puntos. Tras resolverse,
la pelota sigue moviéndose y desaparece durante 600 ms, y se reutiliza para volver
a tirar desde el mismo punto. H3 añadirá el ritmo de múltiples pelotas y los spawns
aleatorios. Si haces el gesto fuera de la pelota, se ignora.

En tablet, prueba la orientación horizontal: aparece «Gira la tableta» y se pausa el loop.
Al cambiar de pestaña durante la pantalla de juego y regresar, vuelve a la portada.
Tras 30 s de inactividad en cualquier pantalla excepto la portada, aparece el
aviso con 5…1; a los 35 s regresa a la portada. Tocar el aviso cancela el retorno.

El primer gesto solicita pantalla completa y Wake Lock, si el navegador los
permite. Para salir de pantalla completa en escritorio usa Esc. El mouse funciona
en localhost (o con `?debug=1`) si hay un puntero preciso. `?debug=1` expone
`window.__TB2D_DEBUG__` para inspeccionar la infraestructura y el laboratorio.

## Diagnóstico H2

Abre http://127.0.0.1:5173/?debug=1 y entra en la prueba. Verás:

- FPS, pasos de física del frame y pelotas activas.
- Velocidad del swipe, antes del clamp, después de los clamps y con asistencia,
  más el ángulo de lanzamiento.
- Colisionadores, abertura válida y compuertas A/B.
- Trayectoria del último lanzamiento: puntos cada 1/30 s, con el mismo integrador
  y arrastre, sin predecir rebotes.
- Tecla **R**: reiniciar la prueba mientras estás en PLAYING; **A**: abrir admin.

Sin `?debug=1` no se carga el módulo de debug, no hay objeto global, trayectoria,
overlay ni atajos. El anillo del disparador secreto se conectará en H5, cuando
ese disparador exista. El dibujo actual es geometría mínima para verificar H2;
la arena, capas y efectos completos pertenecen a H3.

## Deploy estático bajo HTTPS

La carpeta puede publicarse en GitHub Pages o Netlify sin compilación.
HTTPS será necesario para Service Worker, Wake Lock y `crypto.subtle`.
H2 todavía **no implementa instalación PWA ni funcionamiento offline**; llegan en H6.

## Instalar como PWA (a partir de H6)

Android: Chrome → «Instalar app». iPad: Safari → Compartir → «Añadir a pantalla de inicio».
Estas instrucciones se verificarán con el manifest y los íconos de H6.

## Bloquear la tablet

Para el stand, habilita **Fijar pantalla** en Android o **Acceso Guiado** en iPadOS.
El bloqueo de gestos de la página no reemplaza estos controles del dispositivo.

## Día del evento (producto completo)

Verificar modo avión después de cargar, brillo al máximo, carga conectada,
PIN cambiado y descarga del CSV al cierre de cada jornada. Estas pruebas
dependen de hitos posteriores; H2 todavía no es apto para operar el stand.

## Calibración posterior

Las constantes de física están en `js/config/constants.js`: GAIN = 0,90,
sensibilidad inicial = 1,00, G = 2600 u/s² y asistencia inicial = 0,15.
Conviene calibrar GAIN y sensibilidad con gestos reales en tableta antes de tocar
la gravedad. El umbral de premio se calibrará con rondas reales al implementar
el puntaje y la administración; todavía no existe en H2.
