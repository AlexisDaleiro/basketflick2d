# ThreeBall 2D · H3 + POV frontal

Ronda jugable en HTML, CSS y JavaScript ES2020, sin bundler ni dependencias.
Requiere Node.js 20 o posterior para las herramientas locales.

## Correr en local

```sh
npm run dev
npm test
```

Abre http://127.0.0.1:5173. En escritorio local con mouse puedes usar cualquier
tamaño de ventana: el mundo vertical se centra y no se pide pantalla completa
automáticamente. En tablet funciona tanto en **vertical como en horizontal**.
No hace falta instalar paquetes. También puede servirse la
carpeta con cualquier servidor estático.

Recorrido: «¡TOCA AQUÍ PARA JUGAR!» → 3, 2, 1, ¡YA! → ronda de **45 s** →
«¡TIEMPO!» → resumen con puntaje y estadísticas → «JUGAR DE NUEVO» o «Saltar».
Cada paso de la cuenta dura 700 ms; la pelota se ve pero no puede lanzarse hasta
terminar «¡YA!». El logo de la esquina superior derecha abre la vista de admin
de prueba; «Salir» vuelve a la portada. Entrar al admin descarta la ronda.
El acceso secreto/PIN llegará en H5. Premios, leads y guardado de partidas llegan
en H4: los resultados de H3 solo se conservan mientras los ves.

En la ronda verás el **tablero de frente y el aro centrado**, con la pelota grande
en primer plano y la cancha en perspectiva. Desliza **desde la pelota hacia arriba**
y suelta. La pelota se aleja y se achica durante el vuelo; la fuerza determina
si llega corta o pasada y el componente lateral controla la dirección.
Comienza sobre la pelota o cerca de ella (radio de agarre 260 u).
Un toque corto o un gesto descendente no lanza y muestra
«¡Desliza hacia el aro!». Desde el primer spawn centrado, un ejemplo de tiro es
mover 180 u recto hacia arriba en 60 ms: vx≈0, vy≈−2214 y vz≈1485 u/s.
No es necesario acertar esos valores exactos para lanzar. Desde spawns laterales
inclina ligeramente el gesto hacia el centro. Prueba primero una potencia media.
El extremo fuerte del gesto se comprime para facilitar tiros al tablero;
los tiros cortos o desviados siguen fallando.

La pelota rebota en aro, tablero y piso. Un contacto de aro/tablero muestra un
destello; al rebotar hacia la cámara, la pelota vuelve a crecer. Una canasta
confirmada muestra la pelota cayendo por la red durante 450 ms, movimiento de
la red, mensaje y puntos. Una canasta suma **+2**, un swish **+3**.
Desde la tercera canasta consecutiva cada una suma **+1 extra**, con medidor,
estela de llamas y ladrido procedural; un fallo corta la racha. Los tiros se
puntúan en el orden en que se resuelven.

Una nueva pelota aparece 450 ms después de lanzar, en una posición aleatoria
entre 380 y 700 u, mientras haya menos de tres en vuelo y un hueco en el pool.
Las pelotas falladas siguen su física y se desvanecen durante 600 ms; las
encestadas completan la caída visual y luego se desvanecen hasta los 600 ms. El pool
tiene seis pelotas y el de partículas doscientas; no crecen con las rondas.

Al llegar a cero se impiden nuevos lanzamientos y se muestra «¡TIEMPO!» al menos
1,2 s. Los tiros ya en vuelo pueden seguir puntuando hasta resolverse o hasta
2,5 s; entonces aparece el resumen. No hay botón de finalizar anticipadamente.
En los últimos cinco segundos el cronómetro pulsa en rojo y emite tics. Si no
lanzas en los primeros tres segundos, una mano SVG muestra el gesto.

Girar la tablet no muestra avisos ni pausa la ronda; la cancha se centra y escala.
Al cambiar de pestaña durante la pantalla de juego y regresar, vuelve a la portada.
Tras 30 s de inactividad en cualquier pantalla excepto la portada, aparece el
aviso con 5…1; a los 35 s regresa a la portada. Tocar el aviso cancela el retorno.

El primer gesto solicita pantalla completa y Wake Lock, si el navegador los
permite. Para salir de pantalla completa en escritorio usa Esc. El mouse funciona
tanto en localhost como en el sitio publicado si hay un puntero preciso. `?debug=1` expone
`window.__TB2D_DEBUG__` para inspeccionar la infraestructura, `round` y `sfx`.

## Diagnóstico

Abre http://127.0.0.1:5173/?debug=1 y entra a jugar. Verás:

- FPS, pasos de física del frame y pelotas activas.
- Velocidad del swipe, antes del clamp, después de los clamps y con asistencia,
  más el ángulo de lanzamiento y la velocidad de profundidad.
- Colisionadores, abertura válida y compuertas A/B.
- Trayectoria del último lanzamiento: puntos cada 1/30 s, con el mismo integrador
  y arrastre, sin predecir rebotes.
- Tecla **R**: reiniciar la ronda desde la cuenta regresiva; **A**: abrir admin.

Sin `?debug=1` no se carga el módulo de debug, no hay objeto global, trayectoria,
overlay ni atajos. El anillo del disparador secreto se conectará en H5, cuando
ese disparador exista. El render actual incluye arena, huellas en movimiento,
luces, cancha, pelota con costuras y rotación, aro por capas, red con resorte,
partículas, llamas e indicador de pelota fuera de pantalla por arriba.

Las duraciones 30/45/60 s, el aro móvil en los últimos diez segundos y sonido
están preparados en `Round.settings`; sus controles persistentes pertenecen a H5.
En debug puedes cambiar, por ejemplo,
`window.__TB2D_DEBUG__.round.settings.movingHoop = true` desde DevTools y pulsar R.
`soundEnabled = false` y R inicia la siguiente ronda silenciada.

## Deploy estático bajo HTTPS

La carpeta puede publicarse en GitHub Pages o Netlify sin compilación.
HTTPS será necesario para Service Worker, Wake Lock y `crypto.subtle`.
H3 todavía **no implementa instalación PWA ni funcionamiento offline**; llegan en H6.

## Instalar como PWA (a partir de H6)

Android: Chrome → «Instalar app». iPad: Safari → Compartir → «Añadir a pantalla de inicio».
Estas instrucciones se verificarán con el manifest y los íconos de H6.

## Bloquear la tablet

Para el stand, habilita **Fijar pantalla** en Android o **Acceso Guiado** en iPadOS.
El bloqueo de gestos de la página no reemplaza estos controles del dispositivo.

## Día del evento (producto completo)

Verificar modo avión después de cargar, brillo al máximo, carga conectada,
PIN cambiado y descarga del CSV al cierre de cada jornada. Estas pruebas
dependen de hitos posteriores; H3 todavía no es apto para operar el stand.

## Calibración posterior

Las constantes de física están en `js/config/constants.js`: GAIN = 0,90,
sensibilidad inicial = 1,00, G = 2600 u/s² y asistencia inicial = 0,15.
Para el POV frontal también están FRONTAL_LIFT_GAIN = 0,82 y
FRONTAL_DEPTH_GAIN = 0,55. La geometría vigente se documenta en §13 de la especificación.
Conviene calibrar GAIN y sensibilidad con gestos reales en tableta antes de tocar
la gravedad. El umbral de premio se calibrará con rondas reales al implementar
la administración; todavía no existe en H3.
