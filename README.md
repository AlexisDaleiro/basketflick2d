# ThreeBall 2D · H6 (PWA) + POV frontal

Juego kiosk en HTML, CSS y JavaScript ES2020, sin bundler ni dependencias.
Se instala como PWA y funciona sin conexión después de la primera carga.
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
«¡TIEMPO!» → resumen con puntaje, estadísticas y formulario → «GUARDAR Y JUGAR
DE NUEVO», «GUARDAR» o «Saltar».
Cada paso de la cuenta dura 700 ms; la pelota se ve pero no puede lanzarse hasta
terminar «¡YA!». Todas las pantallas del jugador llevan arriba el logo de
**Three Dogs** a la izquierda, el nombre del juego al centro y el de **Three Cats**
a la derecha (logos oficiales en `assets/brand/`). Mantén el logo de Three Cats **3 segundos**, sin moverte
más de 20 px, o tócalo **5 veces en 2 segundos** para abrir el PIN del staff.
Un toque normal no hace nada. El PIN inicial es **1234**, ingresado con el teclado
numérico propio; «Cancelar» o «Salir» vuelve a portada. Abrir admin durante una
ronda la descarta sin guardar.

La arena muestra la grada de mascotas, una banda LED con beneficios publicados
en threepetfood.com.br (`es.ledBenefits`), fotos de cuatro bolsas reales (Three Dogs Adultos y Sênior 7+, Three Cats
Filhotes y Castrados, en `assets/brand/`) e ingredientes de las
recetas pintados en la cancha (`es.ingredients`).

La portada muestra una demo silenciosa con tiros cada 2,2 s, el récord diario,
la invitación al premio y un ticker del Top 5 cada 4 s. El resultado se guarda
**inmediatamente al terminar la ronda**, antes de llenar el formulario. «Saltar»
o dejar vencer el idle conserva la partida anónima. Al guardar el nombre se
actualiza ese mismo registro, sin duplicarlo; el agradecimiento dura 2,5 s.

El celular y el correo electrónico son opcionales. El celular acepta `098123456`,
`98123456`, `+59898123456` o `59898123456`, con espacios o guiones, y lo guarda como
`+59898123456`. El correo se guarda en minúsculas y debe tener dominio, por ejemplo
`nombre@correo.com`. Para guardar celular o correo se exige el consentimiento;
los errores aparecen inline.
El nombre admite hasta 24 caracteres y puede quedar vacío (jugador anónimo).
El filtro de nombres del ranking está en `OFFENSIVE_WORDS`; conserva el original
en el registro para la exportación CSV.

Con **24 puntos o más** se gana un premio y se muestra un código `TD-XXXX`.
El límite diario inicial es ilimitado; puedes cambiar el límite y el umbral
en admin. El conteo de ganadores es independiente del reinicio del ranking.
Los empates no muestran «nuevo récord»; el primer registro sí lo muestra.

Los datos permanecen **en este navegador y origen**, con claves `tb2d.v1.*`.
Localhost y Vercel tienen almacenes separados. Si el navegador bloquea el
almacenamiento o se llena, la sesión sigue en memoria con aviso visible en el
resultado y en admin; no se promete conservarla tras recargar. Se pide persistencia
al navegador sin bloquear la entrada. El formulario admite desplazamiento interno
y ajusta su altura y botón primario al teclado mediante `visualViewport`.

Para inspección visual sin completar una ronda ni generar premios reales, abre
`/tests/h4-preview.html`: usa datos ficticios y almacenamiento **solo en memoria**.
Con `?denied=1` simula almacenamiento bloqueado. Permite probar cartel/código,
validación, consentimiento y destinos tras guardar; no modifica tus partidas.

## Administración y CSV

El panel incluye duración 30/45/60 s, umbral de premio, sensibilidad 0,50–1,80,
asistencia 0–40 %, aro móvil, sonido, stock diario, nombre del evento y etiqueta
de tablet. Los sliders se guardan al soltarlos («Guardado»); las otras opciones,
al cambiar. Se aplican a la siguiente ronda. «Probar tiro» usa estos ajustes
durante **20 s**, vuelve al panel y **no guarda partidas, leads ni premios**.

El PIN admite 4–6 dígitos y puede cambiarse desde admin, ingresándolo dos veces
con el mismo teclado. Tres intentos fallidos bloquean el acceso por **30 s**,
incluso cerrando el modal o recargando. Se guarda un hash hexadecimal de
SHA-256(salt + PIN), con sal de 16 bytes; sin Web Crypto se usa FNV-1a de 64 bits
y se conserva ese formato al volver a abrirlo. Si un hash SHA ya existente no
puede verificarse por falta de API, se muestra un error; no se convierte ni se
acepta otro PIN. **Es una medida disuasoria local, no seguridad real**: quien
controle DevTools o los datos del navegador puede alterar el acceso.

El Top 20 muestra celular y correo enmascarados y permite marcar cada premio «Entregado».
Los contadores diarios e históricos incluyen partidas, leads y premios.
«Reiniciar ranking diario» requiere una segunda confirmación: oculta las
partidas anteriores sin borrarlas y no repone el stock de premios.
«Borrar todos los datos» exige escribir **BORRAR**, ofrece exportar antes y
restablece también configuración y PIN; actúa solo sobre las claves `tb2d.*`.

«Descargar CSV · Solo hoy» y «Todo el evento» preparan el archivo con nombre
de evento/tablet actuales. El CSV incluye la columna `email` tras `telefono` y usa UTF-8 con BOM, `;`, CRLF, teléfono local
con espacios y protección contra fórmulas. Incluye las partidas ocultadas del
ranking y los nombres originales. Ofrece descarga, compartir archivo si la API
lo admite, copiar y texto de solo lectura como último recurso. Verifica el
archivo recibido antes de borrar datos, especialmente en iPad standalone.

Sistema muestra versión, cache/SW realmente disponible, persistencia, bytes y
los últimos 50 errores con opción de copia. Cualquier excepción no capturada o
promesa rechazada se registra ahí con el estado en que ocurrió; si pasa durante
una ronda, la ronda se descarta sin guardar y se vuelve a la portada. Un error que
se repite en cada frame se guarda una vez por ráfaga. Cuando hay una versión nueva
publicada, el worker nuevo queda en espera y aparece «Actualizar app»: solo ese
botón la activa (`SKIP_WAITING`) y recarga la página.

Para pruebas aisladas usa `/tests/h5-preview.html` (datos ficticios en memoria).
`?pin=1` muestra el PIN; `?fallback=1` simula descarga/clipboard bloqueados;
`?denied=1` simula almacenamiento bloqueado. No modifica tus partidas ni tu PIN.

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
confirmada cae con física real: la red la frena y la centra mientras se deforma
a su alrededor (en ≤450 ms ya salió), luego cae, rebota en el piso con un golpe
sordo y se desvanece hasta los 1,4 s. Los golpes de aro balancean la red. Suena la
red y la grada de mascotas detrás del aro festeja (salta, levanta las patas, ruge,
ladra y maúlla). Una canasta suma **+2**, un swish **+3**.
Desde la tercera canasta consecutiva cada una suma **+1 extra**, con medidor,
estela de llamas y ladrido procedural; un fallo corta la racha. Los tiros se
puntúan en el orden en que se resuelven.

Una nueva pelota aparece 450 ms después de lanzar, en una posición aleatoria
entre 380 y 700 u, mientras haya menos de tres en vuelo y un hueco en el pool.
Las pelotas falladas siguen su física y se desvanecen durante 600 ms. Si el pool
está lleno, la pelota resuelta más antigua se recicla para no demorar el spawn. El pool
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
`window.__TB2D_DEBUG__` para inspeccionar la infraestructura, `round`, `sfx` y `storage`.

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
overlay ni atajos. En debug el disparador secreto dibuja su anillo de progreso.

Duración, aro móvil y sonido se configuran desde admin. Para forzar una excepción
de prueba durante una ronda, en `?debug=1` ejecuta desde DevTools mientras juegas:
`setTimeout(() => { throw new Error('prueba') })`. Debe volver a la portada sin
pantalla en blanco y el error debe aparecer en admin → Sistema.

## Offline y Service Worker

`sw.js` precachea una lista explícita de archivos (shell, manifest, todo `/js`,
`/css` e `/icons`) en `tb2d-v<APP_VERSION>` con estrategia cache-first. Un test
falla si se agrega un archivo a esas carpetas sin sumarlo a la lista.
Al publicar cambios, sube la versión en `APP_VERSION`, `package.json` y `VERSION`
de `sw.js` (un test exige que coincidan): sin ese cambio las tablets siguen con
la versión cacheada. En desarrollo local el worker también se registra; para ver
ediciones sin subir versión usa DevTools → Application → Service Workers →
«Update on reload» o «Bypass for network».

Para probar offline en local: abre la app una vez, recarga (la página queda
controlada por el worker), detén `npm run dev` o activa «Offline» en DevTools y
vuelve a recargar. Portada, ronda, admin y CSV funcionan sin red. `?debug=1`
también abre offline.

## Deploy estático gratis bajo HTTPS

La carpeta se publica tal cual, sin compilación. HTTPS es obligatorio para
Service Worker, Wake Lock y `crypto.subtle`.

- **GitHub Pages**: sube el repositorio, Settings → Pages → «Deploy from a branch»,
  rama `main`, carpeta `/ (root)`. Funciona también bajo una subruta
  (`usuario.github.io/repo/`) porque todas las rutas son relativas.
- **Netlify**: «Add new site» → «Deploy manually» y arrastra la carpeta, o conecta
  el repositorio sin comando de build y con directorio de publicación `.`.

## Instalar como PWA

- **Android (Chrome)**: abre la URL HTTPS, espera a que cargue la portada y usa
  menú ⋮ → «Instalar app». Se abre a pantalla completa con ícono propio.
- **iPad (Safari)**: Compartir → «Añadir a pantalla de inicio». Abre sin barra
  de Safari. Los datos de la app instalada son independientes de los de Safari.

Después de instalar, abre la app una vez con red para completar el precache.
En admin → Sistema debe verse `Cache: tb2d-v0.7.0 · Cacheado: Sí`.

Los íconos son SVG (`icons/icon.svg`, `icons/icon-maskable.svg`) más PNG
192/512/180. Si cambias los SVG, abre `/tools/make-icons.html`, descarga los
cuatro PNG y reemplázalos en `/icons`.

## Bloquear la tablet

- **Android**: Ajustes → Seguridad → «Fijar pantalla» (o «Fijación de apps»),
  abre la app y fíjala desde Recientes. Pide PIN para soltarla.
- **iPadOS**: Ajustes → Accesibilidad → «Acceso Guiado», actívalo con código;
  abre la app y pulsa tres veces el botón lateral/superior para iniciarlo.

El bloqueo de gestos de la página y el botón «atrás» interceptado no reemplazan
estos controles del dispositivo.

## Checklist del día del evento

1. Con red, abre la app instalada y confirma en admin → Sistema «Cacheado: Sí».
2. Activa **modo avión** y recarga/reabre: la portada debe aparecer igual.
3. **Brillo al máximo** y bloqueo automático de pantalla desactivado.
4. **Cargador conectado** todo el día.
5. **PIN cambiado** (no dejar 1234) y nombre de evento/etiqueta de tablet cargados.
6. Fija la pantalla (Android) o inicia Acceso Guiado (iPad).
7. Al cierre de cada jornada: admin → «Descargar CSV · Solo hoy», y verifica
   que el archivo abra antes de reiniciar el ranking o borrar datos.

## Calibración posterior

Las constantes de física están en `js/config/constants.js`: GAIN = 0,90,
sensibilidad inicial = 1,00, G = 2600 u/s² y asistencia inicial = 0,15.
Para el POV frontal también están FRONTAL_LIFT_GAIN = 0,82 y
FRONTAL_DEPTH_GAIN = 0,55. La geometría vigente se documenta en §13 de la especificación.
Conviene calibrar GAIN y sensibilidad con gestos reales en tableta antes de tocar
la gravedad. El umbral de premio (24 puntos inicial) se ajusta desde admin tras rondas reales. «Probar tiro» permite ajustar
la sensibilidad sin contaminar las estadísticas. Mantén G = 2600 u/s² como
referencia y calibra primero GAIN/sensibilidad con gestos reales.
