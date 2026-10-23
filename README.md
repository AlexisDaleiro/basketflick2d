# ThreeBall 2D · H1

Esqueleto ejecutable en HTML, CSS y JavaScript ES2020, sin bundler ni dependencias.
Requiere Node.js 20 o posterior para las herramientas locales.

## Correr en local

```sh
npm run dev
npm test
```

Abre http://127.0.0.1:5173 en una ventana **vertical** o en la emulación de tableta
vertical de DevTools. No hace falta instalar paquetes. También puede servirse la
carpeta con cualquier servidor estático.

Recorrido: «¡TOCA AQUÍ PARA JUGAR!» → «FINALIZAR PRUEBA» → «JUGAR DE NUEVO» o
«Saltar». «ABRIR ADMIN · PRUEBA H1» permite visitar la cuarta pantalla y «Salir»
vuelve a la portada. Son controles de navegación de H1: todavía no hay tiros,
puntajes, formularios ni PIN. Una barra en el borde inferior indica que el loop
está activo. En la pantalla de juego, arrastrar el fondo muestra coordenadas del
mundo de 1080 × 1600 u.

Prueba la orientación horizontal: aparece «Gira la tableta» y se pausa el loop.
Al cambiar de pestaña durante la pantalla de juego y regresar, vuelve a la portada.
Tras 30 s de inactividad en cualquier pantalla excepto la portada, aparece el
aviso con 5…1; a los 35 s regresa a la portada. Tocar el aviso cancela el retorno.

El primer gesto solicita pantalla completa y Wake Lock, si el navegador los
permite. Para salir de pantalla completa en escritorio usa Esc. El mouse funciona
en localhost (o con `?debug=1`) si hay un puntero preciso. `?debug=1` expone
`window.__TB2D_DEBUG__` para inspeccionar la infraestructura; el overlay de debug
pertenece a H2.

## Deploy estático bajo HTTPS

La carpeta puede publicarse en GitHub Pages o Netlify sin compilación.
HTTPS será necesario para Service Worker, Wake Lock y `crypto.subtle`.
H1 todavía **no implementa instalación PWA ni funcionamiento offline**; llegan en H6.

## Instalar como PWA (a partir de H6)

Android: Chrome → «Instalar app». iPad: Safari → Compartir → «Añadir a pantalla de inicio».
Estas instrucciones se verificarán con el manifest y los íconos de H6.

## Bloquear la tablet

Para el stand, habilita **Fijar pantalla** en Android o **Acceso Guiado** en iPadOS.
El bloqueo de gestos de la página no reemplaza estos controles del dispositivo.

## Día del evento (producto completo)

Verificar modo avión después de cargar, brillo al máximo, carga conectada,
PIN cambiado y descarga del CSV al cierre de cada jornada. Estas pruebas
dependen de hitos posteriores; H1 todavía no es apto para operar el stand.

## Calibración posterior

GAIN, sensibilidad, gravedad G y umbral de premio se calibrarán en tableta real
cuando se implementen física, ronda y administración. H1 no introduce sus valores
ni simula resultados.
